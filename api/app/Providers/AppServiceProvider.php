<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\Prescription;
use App\Observers\AuditObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Appointment::observe(AuditObserver::class);
        Patient::observe(AuditObserver::class);
        Prescription::observe(AuditObserver::class);
    }
}
