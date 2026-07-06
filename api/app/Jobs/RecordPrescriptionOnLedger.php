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
