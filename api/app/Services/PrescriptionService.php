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

    /**
     * @param array<int, array{id?: int, dispensed_quantity?: int}> $itemQuantities Per-item actual
     *        amounts for partial dispensing. Omit to dispense the full prescribed quantity.
     */
    public function dispense(Prescription $rx, User $pharmacist, array $itemQuantities = []): Prescription
    {
        $byId = collect($itemQuantities)->keyBy('id');

        $completed = DB::transaction(function () use ($rx, $pharmacist, $byId): ?PrescriptionEvent {
            // Cumulative partial dispensing: ADD this round's amount per item, capped at the ordered
            // quantity. Default (no payload) = dispense whatever still remains.
            foreach ($rx->items as $item) {
                $already   = (int) ($item->dispensed_quantity ?? 0);
                $remaining = max(0, (int) $item->quantity - $already);
                $provided  = $byId->get($item->id);
                $now       = isset($provided['dispensed_quantity'])
                    ? max(0, min((int) $provided['dispensed_quantity'], $remaining))
                    : $remaining;
                $item->update(['dispensed_quantity' => $already + $now]);
            }

            // Only "dispensed" (→ history, anchored on-chain) once EVERY item is fully given out.
            // A partial dispense stays 'verified', so it remains in the pharmacist queue.
            $rx->load('items');
            $fullyDispensed = $rx->items->every(
                fn ($item) => (int) ($item->dispensed_quantity ?? 0) >= (int) $item->quantity
            );

            if (! $fullyDispensed) {
                return null;
            }

            $rx->update(['status' => PrescriptionStatus::Dispensed]);

            return PrescriptionEvent::create([
                'prescription_id' => $rx->id,
                'event_type'      => PrescriptionEventType::Dispensed,
                'actor_id'        => $pharmacist->id,
                'occurred_at'     => now(),
            ]);
        });

        // Anchor only the completing dispense (the lifecycle's terminal "dispensed" event).
        if ($completed !== null) {
            $this->recordOnLedger($rx, PrescriptionEventType::Dispensed, $completed);
        }

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
