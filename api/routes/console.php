<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Catch-up sync: re-queue any prescription events that never reached the ledger (e.g. during
// a blockchain outage). Drains the whole backlog after recovery, in safe ~150-event batches.
Schedule::command('blockchain:reconcile')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Notify patients whose 48-hour activation link expired unused, so they can request a new one.
Schedule::command('activation:notify-expired')
    ->hourly()
    ->withoutOverlapping();
