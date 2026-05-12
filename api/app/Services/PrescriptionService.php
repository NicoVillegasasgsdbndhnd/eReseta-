<?php

namespace App\Services;

use App\Enums\PrescriptionEventType;
use App\Enums\PrescriptionStatus;
use App\Models\Prescription;
use App\Models\PrescriptionEvent;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PrescriptionService
{
    public function create(array $data, User $doctor): Prescription
    {
        return DB::transaction(function () use ($data, $doctor): Prescription {
            $rx = Prescription::create([
                'reference_no'      => Prescription::generateReferenceNo(),
                'patient_record_id' => $data['patient_record_id'],
                'doctor_id'         => $doctor->doctor->id,
                'issued_at'         => now(),
                'status'            => PrescriptionStatus::Issued,
            ]);

            foreach ($data['items'] as $item) {
                PrescriptionItem::create(array_merge(['prescription_id' => $rx->id], $item));
            }

            PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Issued,
                'actor_id'        => $doctor->id,
                'occurred_at'     => now(),
            ]);

            return $rx->load('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
        });
    }

    public function verify(Prescription $rx, User $pharmacist): Prescription
    {
        return DB::transaction(function () use ($rx, $pharmacist): Prescription {
            $rx->update(['status' => PrescriptionStatus::Verified]);

            PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Verified,
                'actor_id'        => $pharmacist->id,
                'occurred_at'     => now(),
            ]);

            return $rx->fresh('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
        });
    }

    public function dispense(Prescription $rx, User $pharmacist): Prescription
    {
        return DB::transaction(function () use ($rx, $pharmacist): Prescription {
            $rx->update(['status' => PrescriptionStatus::Dispensed]);

            PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Dispensed,
                'actor_id'        => $pharmacist->id,
                'occurred_at'     => now(),
            ]);

            return $rx->fresh('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
        });
    }
}
