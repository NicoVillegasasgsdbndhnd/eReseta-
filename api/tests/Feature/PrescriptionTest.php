<?php

namespace Tests\Feature;

use App\Models\Prescription;
use Tests\TestCase;

class PrescriptionTest extends TestCase
{
    private function issuedPrescription(): array
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $rx = Prescription::create([
            'reference_no'      => 'RX-TEST-0001',
            'patient_record_id' => $record->id,
            'doctor_id'         => $doctor->id,
            'issued_at'         => now(),
            'status'            => 'issued',
        ]);

        return compact('doctorUser', 'doctor', 'patient', 'record', 'rx');
    }

    public function test_doctor_can_create_prescription(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $response = $this->actingAs($doctorUser, 'sanctum')
                         ->postJson('/api/prescriptions', [
                             'patient_record_id' => $record->id,
                             'items' => [[
                                 'drug_name'    => 'Paracetamol',
                                 'dosage'       => '500mg',
                                 'quantity'     => 10,
                                 'frequency'    => 'Every 8 hours',
                                 'duration'     => '3 days',
                                 'instructions' => 'Take after meals.',
                             ]],
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'issued');
    }

    public function test_patient_cannot_create_prescription(): void
    {
        ['user' => $patientUser] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/prescriptions', [])
             ->assertStatus(403);
    }

    public function test_pharmacist_can_verify_issued_prescription(): void
    {
        ['rx' => $rx] = $this->issuedPrescription();
        $pharmacist   = $this->user('pharmacist');

        $response = $this->actingAs($pharmacist, 'sanctum')
                         ->putJson("/api/prescriptions/{$rx->id}/verify");

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'verified');
    }

    public function test_pharmacist_can_dispense_verified_prescription(): void
    {
        ['rx' => $rx] = $this->issuedPrescription();
        $pharmacist   = $this->user('pharmacist');

        // Verify first
        $rx->update(['status' => 'verified']);

        $response = $this->actingAs($pharmacist, 'sanctum')
                         ->putJson("/api/prescriptions/{$rx->id}/dispense");

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'dispensed');
    }

    public function test_pharmacist_cannot_dispense_unverified_prescription(): void
    {
        ['rx' => $rx] = $this->issuedPrescription();
        $pharmacist   = $this->user('pharmacist');

        // Prescription is still 'issued', not 'verified'
        $response = $this->actingAs($pharmacist, 'sanctum')
                         ->putJson("/api/prescriptions/{$rx->id}/dispense");

        $response->assertStatus(422);
    }

    public function test_patient_cannot_view_another_patients_prescription(): void
    {
        ['rx' => $rx] = $this->issuedPrescription();
        ['user' => $otherPatientUser] = $this->makePatient();

        $this->actingAs($otherPatientUser, 'sanctum')
             ->getJson("/api/prescriptions/{$rx->id}")
             ->assertStatus(403);
    }

    public function test_full_prescription_lifecycle(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record     = $this->makePatientRecord($patient->id, $doctor->id);
        $pharmacist = $this->user('pharmacist');

        // Doctor issues prescription
        $createResponse = $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/prescriptions', [
                'patient_record_id' => $record->id,
                'items' => [[
                    'drug_name'    => 'Amoxicillin',
                    'dosage'       => '500mg',
                    'quantity'     => 21,
                    'frequency'    => 'Three times daily',
                    'duration'     => '7 days',
                    'instructions' => 'Complete the full course.',
                ]],
            ]);
        $createResponse->assertStatus(201);
        $rxId = $createResponse->json('id');

        // Pharmacist verifies
        $this->actingAs($pharmacist, 'sanctum')
             ->putJson("/api/prescriptions/{$rxId}/verify")
             ->assertStatus(200)
             ->assertJsonPath('status', 'verified');

        // Pharmacist dispenses
        $this->actingAs($pharmacist, 'sanctum')
             ->putJson("/api/prescriptions/{$rxId}/dispense")
             ->assertStatus(200)
             ->assertJsonPath('status', 'dispensed');
    }
}
