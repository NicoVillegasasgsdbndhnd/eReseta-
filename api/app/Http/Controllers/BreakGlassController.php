<?php

namespace App\Http\Controllers;

use App\Http\Resources\RecordAccessGrantResource;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Notifications\RecordAccessedByBreakGlass;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * "Break-the-glass" emergency record access. An unlinked doctor justifies an urgent need, gets
 * time-boxed (24h) access to the chart, and the override is written to the append-only audit log
 * for the admin's Security Alerts review. Care is never blocked; every override is accountable.
 */
class BreakGlassController extends Controller
{
    private const GRANT_HOURS = 24;

    /** A doctor requests emergency access to a patient's chart with a mandatory justification. */
    public function store(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('doctor'), 403, 'Only doctors can request break-glass access.');

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
        ]);

        $grant = DB::transaction(function () use ($request, $user, $patient, $validated) {
            $grant = $patient->accessGrants()->create([
                'doctor_user_id' => $user->id,
                'reason'         => $validated['reason'],
                'granted_at'     => now(),
                'expires_at'     => now()->addHours(self::GRANT_HOURS),
            ]);

            // Un-deletable security alert (append-only audit log) for the admin dashboard.
            AuditLog::create([
                'user_id'     => $user->id,
                'action'      => 'BREAK_GLASS',
                'target_type' => 'Patient',
                'target_id'   => $patient->id,
                'ip_address'  => $request->ip(),
                'context'     => "Emergency chart access granted ({$validated['reason']})",
            ]);

            return $grant;
        });

        // RA 10173 transparency — email the patient that their records were accessed for emergency
        // care. Best-effort: never block the emergency access on a mail failure.
        try {
            $patientUser = $patient->user;
            if ($patientUser) {
                $patientUser->notify(new RecordAccessedByBreakGlass(
                    $user->name,
                    $validated['reason'],
                    now()->format('F j, Y \a\t g:i A'),
                ));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(RecordAccessGrantResource::make($grant), 201);
    }

    /** Admin Security Alerts — recent break-glass overrides for review. */
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Only administrators can review break-glass alerts.');

        $grants = \App\Models\RecordAccessGrant::with(['patient.user', 'doctorUser'])
            ->latest('granted_at')
            ->paginate(20);

        return RecordAccessGrantResource::collection($grants);
    }
}
