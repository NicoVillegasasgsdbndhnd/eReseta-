<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\BillingRecord;
use Tests\TestCase;

class BillingSummaryTest extends TestCase
{
    public function test_summary_totals_each_status_correctly(): void
    {
        $admin = $this->user('admin');
        ['patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor]   = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $make = fn (string $status, float $amount) => BillingRecord::create([
            'patient_id'     => $patient->id,
            'appointment_id' => $appointment->id,
            'amount'         => $amount,
            'status'         => $status,
        ]);

        $make('paid', 500);
        $make('paid', 250);
        $make('pending', 100);
        $make('waived', 75);

        $this->actingAs($admin, 'sanctum')
             ->getJson("/api/patients/{$patient->id}/billing-summary")
             ->assertStatus(200)
             ->assertJsonPath('count', 4)
             ->assertJsonPath('total', 925)
             ->assertJsonPath('paid', 750)
             ->assertJsonPath('pending', 100)
             ->assertJsonPath('waived', 75);
    }
}
