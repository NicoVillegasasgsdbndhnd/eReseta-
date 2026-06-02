<?php

namespace App\Jobs;

use App\Enums\PrescriptionEventType;
use App\Models\Prescription;
use App\Models\PrescriptionEvent;
use App\Services\FabricGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Records a single prescription lifecycle event on the Hyperledger Fabric ledger
 * via the Node gateway, then backfills the returned tx id onto the DB rows.
 *
 * MariaDB is the source of truth; the ledger is an audit layer only. This runs
 * asynchronously so a gateway/ledger failure never blocks a clinical action.
 * No-op when BLOCKCHAIN_ENABLED is off. Idempotent: skips already-recorded events.
 */
class RecordPrescriptionOnLedger implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $prescriptionId,
        public PrescriptionEventType $eventType,
        public int $eventId,
    ) {}

    /** @return array<int, int> seconds to wait between retries */
    public function backoff(): array
    {
        return [10, 30, 60];
    }

    public function handle(FabricGatewayService $gateway): void
    {
        if (! config('services.fabric.enabled')) {
            return;
        }

        $event = PrescriptionEvent::with('actor')->find($this->eventId);

        // Gone, or already anchored on the ledger — nothing to do (idempotent).
        if ($event === null || $event->blockchain_tx_id !== null) {
            return;
        }

        $rx = Prescription::with('items')->find($this->prescriptionId);

        if ($rx === null) {
            return;
        }

        $txId = match ($this->eventType) {
            PrescriptionEventType::Issued    => $gateway->issue($rx),
            PrescriptionEventType::Verified  => $gateway->verify($rx, $event->actor),
            PrescriptionEventType::Dispensed => $gateway->dispense($rx, $event->actor),
        };

        $event->update(['blockchain_tx_id' => $txId]);

        // The ISSUED tx is the anchor the prescription (and the UI panel) keys on.
        if ($this->eventType === PrescriptionEventType::Issued) {
            $rx->update(['blockchain_tx_id' => $txId]);
        }
    }

    public function failed(Throwable $e): void
    {
        Log::error('Failed to record prescription on ledger', [
            'prescription_id' => $this->prescriptionId,
            'event_id'        => $this->eventId,
            'event_type'      => $this->eventType->value,
            'error'           => $e->getMessage(),
        ]);
    }
}
