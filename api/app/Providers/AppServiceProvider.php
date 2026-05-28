<?php

namespace App\Providers;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\PatientRecord;
use App\Models\Prescription;
use App\Models\User;
use App\Observers\AuditObserver;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Appointment::observe(AuditObserver::class);
        Patient::observe(AuditObserver::class);
        PatientRecord::observe(AuditObserver::class);
        Prescription::observe(AuditObserver::class);
        User::observe(AuditObserver::class);
    }
}
