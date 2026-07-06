<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientConsentResource;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\PatientConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;





class PatientConsentController extends Controller
{

    public function index(Request $request, Patient $patient): JsonResponse
    {
        $this->authorizeRecorder($request);

        $history = $patient->consents()->with('recordedBy')->get();

        return response()->json([
            'current' => PatientConsentResource::make($history->first()),
            'history' => PatientConsentResource::collection($history),
        ]);
    }


    public function store(Request $request, Patient $patient): JsonResponse
    {
        $this->authorizeRecorder($request);

        $validated = $request->validate([
            'status' => ['required', 'in:given,withdrawn'],
            'notes'  => ['nullable', 'string', 'max:1000'],
        ]);

        $consent = $patient->consents()->create([
            'status'          => $validated['status'],
            'notes'           => $validated['notes'] ?? null,
            'recorded_by'     => $request->user()->id,
            'consent_version' => 'v1',
            'recorded_at'     => now(),
        ]);


        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => $validated['status'] === 'given' ? 'CONSENT_GIVEN' : 'CONSENT_WITHDRAWN',
            'target_type' => 'Patient',
            'target_id'   => $patient->id,
            'ip_address'  => $request->ip(),
            'context'     => 'DPA consent ' . $validated['status'],
        ]);

        return response()->json(PatientConsentResource::make($consent->load('recordedBy')), 201);
    }


    private function authorizeRecorder(Request $request): void
    {
        $user = $request->user();
        abort_unless(
            $user->hasRole('staff') || $user->hasRole('doctor') || $user->hasRole('admin'),
            403,
            'Only staff, doctors, or administrators can record DPA consent.'
        );
    }
}
