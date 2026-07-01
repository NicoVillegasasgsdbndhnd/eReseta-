<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientConsentResource;
use App\Models\AuditLog;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Patient-facing RA 10173 transparency portal. Lets a patient see who accessed their records
 * (append-only, read-only), their consent status, and withdraw consent themselves (their right
 * as a data subject). All hard-scoped to the authenticated patient's own record.
 */
class PatientPrivacyController extends Controller
{
    /** Current consent + history for the authenticated patient. */
    public function consent(Request $request): JsonResponse
    {
        $patient = $this->self($request);
        $history = $patient->consents()->with('recordedBy')->get();

        return response()->json([
            'current' => PatientConsentResource::make($history->first()),
            'history' => PatientConsentResource::collection($history),
        ]);
    }

    /** The patient withdraws their own DPA consent — re-locks non-doctor access instantly. */
    public function withdraw(Request $request): JsonResponse
    {
        $patient = $this->self($request);

        $consent = $patient->consents()->create([
            'status'          => 'withdrawn',
            'notes'           => 'Withdrawn by the patient via the privacy portal.',
            'recorded_by'     => $request->user()->id,
            'consent_version' => 'v1',
            'recorded_at'     => now(),
        ]);

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'CONSENT_WITHDRAWN',
            'target_type' => 'Patient',
            'target_id'   => $patient->id,
            'ip_address'  => $request->ip(),
            'context'     => 'DPA consent withdrawn by patient',
        ]);

        return response()->json(PatientConsentResource::make($consent->load('recordedBy')), 201);
    }

    /**
     * "Who accessed my records" — the patient's own read-only slice of the audit trail. Excludes
     * the patient's own chart views (not "someone accessed my records"); keeps consent + break-glass
     * events (including the patient's own withdrawal).
     */
    public function log(Request $request): JsonResponse
    {
        $patient = $this->self($request);
        $selfId  = $request->user()->id;

        $rows = AuditLog::with('user')
            ->whereIn('target_type', ['PatientChart', 'Patient'])
            ->where('target_id', $patient->id)
            ->whereIn('action', ['READ', 'READ_BREAK_GLASS', 'BREAK_GLASS', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN'])
            ->where(function ($q) use ($selfId) {
                // hide the patient's own record reads; keep everything else
                $q->where('user_id', '!=', $selfId)
                  ->orWhereNotIn('action', ['READ', 'READ_BREAK_GLASS']);
            })
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (AuditLog $l) => [
                'id'         => $l->id,
                'actor_name' => $l->user?->name ?? 'System',
                'actor_role' => $l->user?->getRoleNames()->first(),
                'action'     => $l->action,
                'context'    => $l->context,
                'at'         => $l->created_at,
            ]);

        return response()->json(['data' => $rows]);
    }

    private function self(Request $request): Patient
    {
        abort_unless($request->user()->hasRole('patient'), 403, 'Unauthorized.');
        $patient = $request->user()->patient;
        abort_unless($patient, 404, 'No patient profile found for this account.');

        return $patient;
    }
}
