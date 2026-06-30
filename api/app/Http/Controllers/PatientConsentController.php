<?php

namespace App\Http\Controllers;

use App\Http\Resources\PatientConsentResource;
use App\Models\Patient;
use App\Models\PatientConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * RA 10173 DPA consent capture (clinic-mediated). Recorded by staff/doctor/admin on the patient's
 * behalf; it is the lawful basis (§13a) that lets non-doctors view a patient's clinical records.
 */
class PatientConsentController extends Controller
{
    /** Current consent status + full history for a patient. */
    public function index(Request $request, Patient $patient): JsonResponse
    {
        $this->authorizeRecorder($request);

        $history = $patient->consents()->with('recordedBy')->get();

        return response()->json([
            'current' => PatientConsentResource::make($history->first()),
            'history' => PatientConsentResource::collection($history),
        ]);
    }

    /** Record a new consent state (given / withdrawn) — append-only. */
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

        return response()->json(PatientConsentResource::make($consent->load('recordedBy')), 201);
    }

    /** Clinic-mediated capture — staff, doctor, or admin (with the patient present). */
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
