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

        $records = PatientRecord::with('patient.user', 'doctor.user')
            ->when($user->hasRole('doctor'), fn ($q) =>
                $q->where('doctor_id', $user->doctor->id)
            )
            ->when($user->hasRole('staff'), fn ($q) =>
                $q->where('doctor_id', $user->assigned_doctor_id)
            )
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

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return PatientRecordResource::collection(
            $patient->records()
                ->with('doctor.user', 'prescriptions.items')
                ->latest('visit_date')
                ->get()
        );
    }

    public function store(StorePatientRecordRequest $request): JsonResponse
    {
        $user = $request->user();
        $doctorId = $user->hasRole('staff')
            ? $user->assigned_doctor_id
            : $user->doctor->id;

        $record = PatientRecord::create(array_merge(
            $request->validated(),
            ['doctor_id' => $doctorId]
        ));

        return response()->json(
            new PatientRecordResource($record->load('patient.user', 'doctor.user')),
            201
        );
    }

    public function show(PatientRecord $patientRecord): PatientRecordResource
    {
        return new PatientRecordResource(
            $patientRecord->load('patient.user', 'doctor.user', 'prescriptions.items')
        );
    }

    public function update(UpdatePatientRecordRequest $request, PatientRecord $patientRecord): PatientRecordResource
    {
        $patientRecord->update($request->validated());

        return new PatientRecordResource($patientRecord->fresh('patient.user', 'doctor.user'));
    }
}
