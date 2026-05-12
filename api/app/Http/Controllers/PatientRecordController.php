<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRecordRequest;
use App\Http\Requests\UpdatePatientRecordRequest;
use App\Http\Resources\PatientRecordResource;
use App\Models\Patient;
use App\Models\PatientRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PatientRecordController extends Controller
{
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
        $record = PatientRecord::create(array_merge(
            $request->validated(),
            ['doctor_id' => $request->user()->doctor->id]
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
