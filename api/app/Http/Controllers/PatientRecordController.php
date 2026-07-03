<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRecordRequest;
use App\Http\Requests\UpdatePatientRecordRequest;
use App\Http\Resources\PatientRecordResource;
use App\Models\Patient;
use App\Models\PatientRecord;
use App\Services\AppointmentService;
use App\Services\PatientRecordAccess;
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
            ->when($user->hasRole('doctor'), function ($q) use ($user) {
                $doctor = $user->doctor;

                $q->where(function ($q) use ($doctor) {
                    $q->whereNull('restriction_category');

                    if (! $doctor) {
                        return;
                    }

                    $allowedCategories = collect(PatientRecord::RESTRICTION_SPECIALIZATIONS)
                        ->filter(fn (array $specializations) => in_array($doctor->specialization, $specializations, true))
                        ->keys()
                        ->all();

                    $q->orWhere('restricted_specialization', $doctor->specialization)
                        ->orWhere(function ($q) use ($allowedCategories) {
                            $q->whereNull('restricted_specialization')
                                ->whereIn('restriction_category', $allowedCategories);
                        });
                });
            })
            ->when(! $user->hasRole('doctor'), fn ($q) =>
                $q->whereNull('restriction_category')
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

    public function index(Request $request, Patient $patient): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'You can only view your own records.');
        } else {
            // RA 10173 gate: doctor needs care relationship (or break-glass), staff/admin need consent.
            app(PatientRecordAccess::class)->enforce($user, $patient);
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
        $doctor = $request->user()->doctor;
        $data   = $request->validated();

        $record = PatientRecord::create(array_merge(
            collect($data)->except(['follow_up_at', 'follow_up_reason'])->all(),
            ['doctor_id' => $doctor->id]
        ));

        // Optional: the doctor scheduled the return visit right here → book the follow-up
        // appointment on their calendar, linked to this consultation. Slot/leave conflicts
        // surface as a 422 (booking is rolled back but the record is already saved).
        if (! empty($data['follow_up_at'])) {
            app(AppointmentService::class)->createFollowUp([
                'patient_id'       => $record->patient_id,
                'doctor_id'        => $doctor->id,
                'scheduled_at'     => $data['follow_up_at'],
                'reason'           => $data['follow_up_reason'] ?? null,
                'source_record_id' => $record->id,
            ], $request->user());
        }

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
