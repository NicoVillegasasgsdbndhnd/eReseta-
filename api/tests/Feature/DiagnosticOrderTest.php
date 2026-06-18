<?php

namespace Tests\Feature;

use App\Models\DiagnosticTest;
use Tests\TestCase;

class DiagnosticOrderTest extends TestCase
{
    public function test_doctor_can_order_a_diagnostic_test(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);
        $test = DiagnosticTest::create(['name' => 'Chest X-ray (PA)', 'category' => 'imaging']);

        $response = $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/diagnostic-orders', [
                'patient_record_id' => $record->id,
                'notes'             => 'Rule out pneumonia.',
                'items'             => [
                    ['test_name' => 'Chest X-ray (PA)', 'diagnostic_test_id' => $test->id, 'clinical_reason' => 'Productive cough x1 week'],
                    ['test_name' => 'Complete Blood Count (CBC)'],
                ],
            ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'ordered')
                 ->assertJsonCount(2, 'items');

        $this->assertDatabaseHas('diagnostic_orders', ['patient_record_id' => $record->id, 'doctor_id' => $doctor->id]);
        $this->assertDatabaseHas('diagnostic_order_items', ['test_name' => 'Complete Blood Count (CBC)']);
    }

    public function test_patient_cannot_order_a_diagnostic_test(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $this->actingAs($patientUser, 'sanctum')
            ->postJson('/api/diagnostic-orders', [
                'patient_record_id' => $record->id,
                'items'             => [['test_name' => 'CBC']],
            ])
            ->assertStatus(403);
    }

    public function test_diagnostic_orders_appear_on_the_patient_record(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/diagnostic-orders', [
                'patient_record_id' => $record->id,
                'items'             => [['test_name' => 'Urinalysis']],
            ])->assertStatus(201);

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/records")
            ->assertStatus(200)
            ->assertJsonPath('0.diagnostic_orders.0.items.0.test_name', 'Urinalysis');
    }

    public function test_admin_can_add_and_toggle_a_catalog_test(): void
    {
        $admin = $this->user('admin');

        $created = $this->actingAs($admin, 'sanctum')
            ->postJson('/api/diagnostic-tests', ['name' => 'MRI — Lumbar', 'category' => 'imaging'])
            ->assertStatus(201)
            ->json('id');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/diagnostic-tests/{$created}/availability", ['is_available' => false])
            ->assertStatus(200)
            ->assertJsonPath('is_available', false);
    }

    public function test_non_admin_cannot_manage_the_catalog(): void
    {
        ['user' => $doctorUser] = $this->makeDoctor();

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/diagnostic-tests', ['name' => 'Unauthorized Test'])
            ->assertStatus(403);
    }
}
