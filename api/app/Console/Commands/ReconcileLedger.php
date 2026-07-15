<?php

namespace App\Console\Commands;

use App\Jobs\RecordPrescriptionOnLedger;
use App\Models\PrescriptionEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Catch-up sync for the blockchain ledger.
 *
 * If the Fabric network/gateway is down, prescription events are still saved in MySQL
 * (the source of truth) but their ledger write fails. Each un-synced event is marked by
 * a NULL blockchain_tx_id. This command finds those and re-queues them, so any backlog —
 * whether the outage lasted minutes, hours, or days — is written to the ledger once it
 * recovers. The write job is idempotent, so re-queuing is always safe.
 */
class ReconcileLedger extends Command
{
    protected $signature = 'blockchain:reconcile {--limit=150 : Max events to re-queue per run} {--now : Include just-created events (skip the 5-minute safety delay)}';

    protected $description = 'Re-queue prescription events that never made it onto the ledger (e.g. during a blockchain outage).';

    public function handle(): int
    {
        if (! config('services.fabric.enabled')) {
            $this->info('Blockchain disabled (BLOCKCHAIN_ENABLED=false) — nothing to reconcile.');

            return self::SUCCESS;
        }

        $limit = max(1, (int) $this->option('limit'));

        $query = PrescriptionEvent::whereNull('blockchain_tx_id');

        // By default only events pending for >5 min, so we don't race with the normal
        // dispatch/retry path that already handles fresh events (3 tries over ~100s).
        // --now overrides this for an immediate manual sync (e.g. a live demo).
        if (! $this->option('now')) {
            $query->where('created_at', '<=', now()->subMinutes(5));
        }

        $pending = $query->orderBy('id')
            ->limit($limit)
            ->get(['id', 'prescription_id', 'event_type']);

        if ($pending->isEmpty()) {
            $this->info('Ledger is up to date — no pending events.');

            return self::SUCCESS;
        }

        foreach ($pending as $event) {
            RecordPrescriptionOnLedger::dispatch($event->prescription_id, $event->event_type, $event->id);
        }

        $count = $pending->count();

        Log::info('Ledger reconciliation re-queued pending prescription events', ['count' => $count]);
        $this->info("Re-queued {$count} pending prescription event(s) to the ledger.");

        return self::SUCCESS;
    }
}
