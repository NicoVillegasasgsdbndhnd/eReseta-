<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticOrderResource;
use App\Http\Resources\PatientRecordResource;
use App\Http\Resources\PrescriptionResource;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\PatientRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only consolidated patient chart for the Patient Records tab.
 * Every access is audited (healthcare "auditing on read" requirement).
 */
class PatientChartController extends Controller
{
    public function show(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasRole('patient') || $user->hasRole('pharmacist'), 403, 'Unauthorized.');

        // Mentor restriction — "The Doctor's Own Medical Record": a clinician may not self-access
        // their own chart through the clinical system; a different physician must view it.
        abort_if(
            $patient->user_id === $user->id,
            403,
            'You cannot access your own medical record here — another physician must view it.'
        );

        $this->auditRead($request, $patient);

        return response()->json($this->chartPayload($patient, $user->doctor));
    }

    /**
     * Patient self-service portal — the authenticated patient's OWN read-only chart. Hard-scoped to
     * their own record; restricted/break-glass data stays hidden (a patient is never an authorized
     * specialist, and the restricted list is omitted entirely here).
     */
    public function myChart(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user->hasRole('patient'), 403, 'Unauthorized.');

        $patient = $user->patient;
        abort_if(! $patient, 404, 'No patient profile found for this account.');

        $this->auditRead($request, $patient);

        $payload = $this->chartPayload($patient, null);
        // Patients don't see the restricted-files listing (existence of sensitive flags).
        $payload['restricted_files'] = [];

        return response()->json($payload);
    }

    /** Auditing on READ — log every chart access (not just writes). */
    private function auditRead(Request $request, Patient $patient): void
    {
        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action'      => 'READ',
            'target_type' => 'PatientChart',
            'target_id'   => $patient->id,
            'ip_address'  => $request->ip(),
        ]);
    }

    /**
     * Build the consolidated chart payload. $viewerDoctor (null for staff/admin/patient) decides
     * which restricted content is unlocked.
     *
     * @return array<string,mixed>
     */
    private function chartPayload(Patient $patient, ?\App\Models\Doctor $viewerDoctor): array
    {
        $patient->load('user');

        // Active medications = full prescriptions (still in effect), rendered as Hospital Rx cards.
        // Hide meds tied to a restricted record the viewer isn't authorized to see.
        $activePrescriptions = $patient->prescriptions()
            ->where('status', '!=', 'expired')
            ->with(['items', 'doctor.user', 'patientRecord.patient.user'])
            ->latest('issued_at')
            ->get()
            ->filter(function ($rx) use ($viewerDoctor) {
                $rec = $rx->patientRecord;
                return ! $rec || $rec->viewableBy($viewerDoctor);
            })
            ->values();

        $allRecords = $patient->records()
            ->with('doctor.user', 'prescriptions.items', 'diagnosticOrders.items')
            ->latest('visit_date')
            ->get();

        // Mentor rule: restricted records are filtered OUT of the main timeline at the DB level and
        // surfaced only in the Restricted Files list — locked unless the viewer is an authorized
        // specialist (or breaks glass).
        $encounters = $allRecords->filter(fn ($r) => ! $r->restriction_category)->values();

        $restrictedFiles = $allRecords
            ->filter(fn ($r) => (bool) $r->restriction_category)
            ->map(function ($r) use ($viewerDoctor) {
                $authorized = $r->viewableBy($viewerDoctor);

                return [
                    'id'                        => $r->id,
                    'visit_date'                => $r->visit_date?->toDateString(),
                    'restriction_category'      => $r->restriction_category,
                    'restriction_label'         => $r->restrictionLabel(),
                    'restricted_specialization' => $r->restricted_specialization,
                    'doctor_name'               => $r->doctor?->user?->name,
                    'locked'                    => ! $authorized,
                    // Clinical content is withheld at the server unless authorized.
                    'record'                    => $authorized ? new PatientRecordResource($r) : null,
                ];
            })
            ->values();

        // Lab/imaging orders inherit their encounter's restriction — hide orders tied to a
        // restricted record the viewer isn't authorized to see (same rule as active_prescriptions).
        $labImaging = $patient->diagnosticOrders()
            ->with('doctor.user', 'items', 'patientRecord')
            ->latest('ordered_at')
            ->get()
            ->filter(function ($order) use ($viewerDoctor) {
                $rec = $order->patientRecord;
                return ! $rec || $rec->viewableBy($viewerDoctor);
            })
            ->values();

        return [
            'patient' => [
                'id'            => $patient->id,
                'name'          => $patient->user?->name,
                'patient_code'  => sprintf('DEAMHI-%s-%05d', $patient->created_at?->year ?? now()->year, $patient->id),
                'sex'           => $patient->sex,
                'dob'           => $patient->dob?->format('Y-m-d'),
                'age'           => $patient->dob?->age,
                'email'         => $patient->user?->email,
                'contact'       => $patient->contact,
                'address'       => $patient->address,
                'philhealth_no' => $patient->philhealth_no,
                'preferred_language'         => $patient->preferred_language,
                'known_allergies'            => $patient->known_allergies,
                'gov_id_type'                => $patient->gov_id_type,
                'gov_id_no'                  => $patient->gov_id_no,
                'hmo_provider'               => $patient->hmo_provider,
                'hmo_policy_no'              => $patient->hmo_policy_no,
                'hmo_group_no'               => $patient->hmo_group_no,
                'copay'                      => $patient->copay,
                'emergency_contact_name'     => $patient->emergency_contact_name,
                'emergency_contact_phone'    => $patient->emergency_contact_phone,
                'emergency_contact_relation' => $patient->emergency_contact_relation,
                'registered_at' => $patient->created_at?->format('Y-m-d'),
                'visits_count'  => $patient->records()->count(),
                'rx_count'      => $patient->prescriptions()->count(),
            ],
            'active_prescriptions' => PrescriptionResource::collection($activePrescriptions),
            'encounters'           => PatientRecordResource::collection($encounters),
            'lab_imaging'          => DiagnosticOrderResource::collection($labImaging),
            // Attached administrative documents (IDs, insurance, intake/HIPAA forms).
            'documents'            => $patient->documents()->latest()->get()->map(fn ($d) => [
                'id'             => $d->id,
                'category'       => $d->category,
                'category_label' => \App\Models\PatientDocument::CATEGORIES[$d->category] ?? 'Document',
                'original_name'  => $d->original_name,
                'url'            => $d->url(),
                'mime'           => $d->mime,
                'size'           => $d->size,
                'uploaded_at'    => $d->created_at?->toDateTimeString(),
            ]),
            // Restricted records (mental-health/genetic/VIP/etc.) — locked unless the viewer is an
            // authorized specialist; clinical content is null when locked. Reveal via break-glass.
            'restricted_files'     => $restrictedFiles,
        ];
    }

    /**
     * Lightweight prescribing-safety lookup: the patient's recorded allergies + their active
     * medication names, so the Rx editor can warn about allergy conflicts and duplicate therapy.
     */
    public function rxSafety(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'Unauthorized.');
        }

        $medications = $patient->prescriptions()
            ->where('status', '!=', 'expired')
            ->with('items:id,prescription_id,drug_name')
            ->get()
            ->flatMap(fn ($rx) => $rx->items->pluck('drug_name'))
            ->filter()
            ->unique()
            ->values();

        return response()->json([
            'known_allergies'    => $patient->known_allergies,
            'active_medications' => $medications,
        ]);
    }

    /**
     * Break-glass: an audited emergency override that reveals one restricted record's content to a
     * doctor who isn't the matching specialist. Requires a written justification.
     */
    public function breakGlass(Request $request, PatientRecord $patientRecord): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user->hasRole('doctor'), 403, 'Only doctors can break-glass restricted records.');
        abort_if(! $patientRecord->restriction_category, 422, 'This record is not restricted.');

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ]);

        AuditLog::create([
            'user_id'     => $user->id,
            'action'      => 'BREAK_GLASS',
            'target_type' => 'PatientRecord',
            'target_id'   => $patientRecord->id,
            'ip_address'  => $request->ip(),
            'context'     => $data['reason'],
        ]);

        return response()->json(
            new PatientRecordResource(
                $patientRecord->load('doctor.user', 'prescriptions.items', 'diagnosticOrders.items')
            )
        );
    }
}
