<?php

namespace Tests\Feature;

use Tests\TestCase;

class PatientChartTest extends TestCase
{
    public function test_doctor_can_read_chart_and_the_read_is_audited(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->makePatientRecord($patient->id, $doctor->id);

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200)
            ->assertJsonStructure(['patient', 'active_medications', 'encounters', 'procedures', 'lab_imaging']);

        // Auditing on READ — the chart access must be logged.
        $this->assertDatabaseHas('audit_logs', [
            'user_id'     => $doctorUser->id,
            'action'      => 'READ',
            'target_type' => 'PatientChart',
            'target_id'   => $patient->id,
        ]);
    }

    public function test_pharmacist_cannot_read_chart(): void
    {
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($this->user('pharmacist'), 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403);
    }
}
