<?php

namespace App\Services;

use App\Enums\PrescriptionEventType;
use App\Enums\PrescriptionStatus;
use App\Jobs\RecordPrescriptionOnLedger;
use App\Models\Prescription;
use App\Models\PrescriptionEvent;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PrescriptionService
{
    public function create(array $data, User $doctor): Prescription
    {
        ['rx' => $rx, 'event' => $event] = DB::transaction(function () use ($data, $doctor): array {
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

            $event = PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Issued,
                'actor_id'        => $doctor->id,
                'occurred_at'     => now(),
            ]);

            return ['rx' => $rx, 'event' => $event];
        });

        $this->recordOnLedger($rx, PrescriptionEventType::Issued, $event);

        return $rx->load('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
    }

    public function verify(Prescription $rx, User $pharmacist): Prescription
    {
        $event = DB::transaction(function () use ($rx, $pharmacist): PrescriptionEvent {
            $rx->update(['status' => PrescriptionStatus::Verified]);

            return PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Verified,
                'actor_id'        => $pharmacist->id,
                'occurred_at'     => now(),
            ]);
        });

        $this->recordOnLedger($rx, PrescriptionEventType::Verified, $event);

        return $rx->fresh('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
    }

    public function dispense(Prescription $rx, User $pharmacist): Prescription
    {
        $event = DB::transaction(function () use ($rx, $pharmacist): PrescriptionEvent {
            $rx->update(['status' => PrescriptionStatus::Dispensed]);

            return PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Dispensed,
                'actor_id'        => $pharmacist->id,
                'occurred_at'     => now(),
            ]);
        });

        $this->recordOnLedger($rx, PrescriptionEventType::Dispensed, $event);

        return $rx->fresh('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor');
    }

    /**
     * Queue the ledger write. Dispatched after the transaction has committed so the
     * worker never races an uncommitted row; the job is a no-op when blockchain is off.
     */
    private function recordOnLedger(Prescription $rx, PrescriptionEventType $type, PrescriptionEvent $event): void
    {
        RecordPrescriptionOnLedger::dispatch($rx->id, $type, $event->id);
    }
}
