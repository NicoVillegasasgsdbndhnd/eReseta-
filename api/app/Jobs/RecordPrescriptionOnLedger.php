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
use Illuminate\Http\Client\RequestException;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;









class RecordPrescriptionOnLedger implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    /**
     * Marker stored in blockchain_tx_id when a prescription is confirmed already on the
     * ledger but its original tx id was never captured (the ledger query returns state, not
     * the tx id). Stops reconcile from re-issuing it forever.
     */
    public const ALREADY_ON_LEDGER = 'already-on-ledger';

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

        try {
            $txId = match ($this->eventType) {
                PrescriptionEventType::Issued    => $gateway->issue($rx),
                PrescriptionEventType::Verified  => $gateway->verify($rx, $event->actor),
                PrescriptionEventType::Dispensed => $gateway->dispense($rx, $event->actor),
            };
        } catch (RequestException $e) {
            // A write can fail with a generic endorsement error when the prescription is
            // already on the ledger (e.g. an old event whose tx id was never saved back).
            // Confirm against the ledger: if it's genuinely already recorded, mark the event
            // reconciled instead of retrying forever. Any other failure rethrows for retry.
            if (! $gateway->exists($rx->reference_no)) {
                throw $e;
            }

            $txId = self::ALREADY_ON_LEDGER;

            Log::warning('Prescription already on ledger — marking event reconciled without a tx id', [
                'prescription_id' => $this->prescriptionId,
                'event_id'        => $this->eventId,
                'reference_no'    => $rx->reference_no,
            ]);
        }

        // Only fill an empty value — never overwrite an existing tx id. This stops a duplicate
        // or retrying job from clobbering a real hash with the "already-on-ledger" marker.
        PrescriptionEvent::where('id', $this->eventId)
            ->whereNull('blockchain_tx_id')
            ->update(['blockchain_tx_id' => $txId]);

        if ($this->eventType === PrescriptionEventType::Issued) {
            Prescription::where('id', $this->prescriptionId)
                ->whereNull('blockchain_tx_id')
                ->update(['blockchain_tx_id' => $txId]);
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
