<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRecordRequest;
use App\Http\Requests\UpdatePatientRecordRequest;
use App\Http\Resources\PatientRecordResource;
use App\Models\Patient;
use App\Models\PatientRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientRecordController extends Controller
{
    public function allRecords(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_if($user->hasRole('patient') || $user->hasRole('pharmacist'), 403, 'Unauthorized.');

        // Cross-view records (mentor review): every doctor/staff/admin can see ALL patient
        // records, not just their own — one shared records hub. Optional explicit filters remain.
        $records = PatientRecord::with('patient.user', 'doctor.user')
            ->when($request->patient_id, fn ($q, $id) =>
                $q->where('patient_id', $id)
            )
            ->when($request->doctor_id, fn ($q, $id) =>
                $q->where('doctor_id', $id)
            )
            ->latest('visit_date')
            ->paginate(20);

        return PatientRecordResource::collection($records);
    }

    public function index(Request $request, Patient $patient): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'You can only view your own records.');
        }

        return PatientRecordResource::collection(
            $patient->records()
                ->with('doctor.user', 'prescriptions.items', 'diagnosticOrders.items')
                ->latest('visit_date')
                ->get()
        );
    }

    public function store(StorePatientRecordRequest $request): JsonResponse
    {
        // Authorization (doctor-only) is enforced by StorePatientRecordRequest::authorize(),
        // so the author always has a doctor profile — the record is attributed to them.
        $record = PatientRecord::create(array_merge(
            $request->validated(),
            ['doctor_id' => $request->user()->doctor->id]
        ));

        return response()->json(
            new PatientRecordResource($record->load('patient.user', 'doctor.user')),
            201
        );
    }

    public function show(Request $request, PatientRecord $patientRecord): PatientRecordResource
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patientRecord->patient?->user_id !== $user->id, 403, 'Unauthorized.');
        }

        return new PatientRecordResource(
            $patientRecord->load('patient.user', 'doctor.user', 'prescriptions.items')
        );
    }

    public function update(UpdatePatientRecordRequest $request, PatientRecord $patientRecord): PatientRecordResource
    {
        // Authorization (doctor-only) is enforced by UpdatePatientRecordRequest::authorize().
        $patientRecord->update($request->validated());

        return new PatientRecordResource($patientRecord->fresh('patient.user', 'doctor.user'));
    }
}
