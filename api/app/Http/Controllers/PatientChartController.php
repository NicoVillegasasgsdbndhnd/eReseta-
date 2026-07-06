<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticOrderResource;
use App\Http\Resources\PatientRecordResource;
use App\Http\Resources\PrescriptionResource;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\PatientRecord;
use App\Services\PatientRecordAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;





class PatientChartController extends Controller
{
    public function show(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'You can only view your own chart.');
        }



        abort_if(
            $patient->user_id === $user->id,
            403,
            'You cannot access your own medical record here — another physician must view it.'
        );



        $mode = app(PatientRecordAccess::class)->enforce($user, $patient);

        $this->auditRead($request, $patient, $mode);

        return response()->json($this->chartPayload($patient, $user->doctor));
    }






    public function myChart(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if(! $user->hasRole('patient'), 403, 'Unauthorized.');

        $patient = $user->patient;
        abort_if(! $patient, 404, 'No patient profile found for this account.');

        $this->auditRead($request, $patient);

        $payload = $this->chartPayload($patient, null);

        $payload['restricted_files'] = [];

        return response()->json($payload);
    }


    private function auditRead(Request $request, Patient $patient, ?string $mode = null): void
    {
        AuditLog::create([
            'user_id'     => $request->user()->id,

            'action'      => $mode === 'break_glass' ? 'READ_BREAK_GLASS' : 'READ',
            'target_type' => 'PatientChart',
            'target_id'   => $patient->id,
            'ip_address'  => $request->ip(),
            'context'     => $mode ? "basis:{$mode}" : null,
        ]);
    }







    private function chartPayload(Patient $patient, ?\App\Models\Doctor $viewerDoctor): array
    {
        $patient->load('user');



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

                    'record'                    => $authorized ? new PatientRecordResource($r) : null,
                ];
            })
            ->values();



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


            'restricted_files'     => $restrictedFiles,
        ];
    }





    public function rxSafety(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'Unauthorized.');
        } else {
            app(PatientRecordAccess::class)->enforce($user, $patient);
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
