<?php

namespace Tests\Feature;

use App\Models\Appointment;
use Tests\TestCase;

class ReportTest extends TestCase
{
    public function test_appointments_report_is_admin_only(): void
    {
        ['user' => $patientUser] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
             ->getJson('/api/reports/appointments')
             ->assertStatus(403);
    }

    public function test_appointments_report_computes_served_rate(): void
    {
        $admin = $this->user('admin');
        ['patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor]   = $this->makeDoctor();

        // 3 served + 1 cancelled = 75% served rate.
        foreach (['served', 'served', 'served', 'cancelled'] as $i => $status) {
            Appointment::create([
                'patient_id'   => $patient->id,
                'doctor_id'    => $doctor->id,
                'scheduled_at' => now()->subDays($i + 1),
                'status'       => $status,
                'type'         => 'consultation',
            ]);
        }

        $this->actingAs($admin, 'sanctum')
             ->getJson('/api/reports/appointments')
             ->assertStatus(200)
             ->assertJsonPath('summary.total', 4)
             ->assertJsonPath('summary.served_rate', 75);
    }
}
