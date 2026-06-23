<?php

namespace Tests\Feature;

use App\Models\Doctor;
use Tests\TestCase;

class DoctorRxProfileTest extends TestCase
{
    public function test_admin_can_create_doctor_with_rx_profile_fields(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
             ->postJson('/api/users', [
                 'name'           => 'Dr. Test Physician',
                 'email'          => 'rxdoc@deamhi.test',
                 'password'       => 'Str0ng#Pass1',
                 'role'           => 'doctor',
                 'specialization' => 'Cardiology',
                 'license_no'     => 'PRC-2021-111222',
                 'prc_expiry'     => '2028-01-01',
                 'ptr_no'         => 'PTR-2026-55555',
                 's2_license'     => 'S2-0042000',
                 'signature'      => 'Test Physician, M.D.',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('doctors', [
            'license_no' => 'PRC-2021-111222',
            'ptr_no'     => 'PTR-2026-55555',
            's2_license' => 'S2-0042000',
            'signature'  => 'Test Physician, M.D.',
        ]);
    }

    public function test_doctor_rx_fields_are_exposed_on_the_resource(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        $doctor->update(['ptr_no' => 'PTR-9', 's2_license' => 'S2-9', 'signature' => 'Sig N. Ature, M.D.']);

        $this->actingAs($doctorUser, 'sanctum')
             ->getJson("/api/doctors/{$doctor->id}")
             ->assertStatus(200)
             ->assertJsonPath('ptr_no', 'PTR-9')
             ->assertJsonPath('s2_license', 'S2-9')
             ->assertJsonPath('signature', 'Sig N. Ature, M.D.');
    }

    public function test_patient_sees_prescriber_credentials_on_own_prescription_but_not_hr_data(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $doctor->update([
            'ptr_no'          => 'PTR-RX', 's2_license' => 'S2-RX', 'signature' => 'Dr. Prescriber',
            'corporate_email' => 'hr.private@deamhi.test', 'tin' => '999-888-777',
        ]);

        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);
        $rx = \App\Models\Prescription::create([
            'reference_no'      => 'RX-VISIBLE-1',
            'patient_record_id' => $record->id,
            'doctor_id'         => $doctor->id,
            'issued_at'         => now(),
            'status'            => 'issued',
        ]);

        $doctorPayload = $this->actingAs($patientUser, 'sanctum')
             ->getJson("/api/prescriptions/{$rx->id}")
             ->assertStatus(200)
             ->assertJsonPath('doctor.license_no', $doctor->license_no)
             ->assertJsonPath('doctor.s2_license', 'S2-RX')
             ->assertJsonPath('doctor.signature', 'Dr. Prescriber')
             ->json('doctor');

        // Printed credentials are present, but the doctor's HR/personal and admin fields must not leak.
        $this->assertArrayNotHasKey('corporate_email', $doctorPayload);
        $this->assertArrayNotHasKey('inpatient_fee', $doctorPayload);
        $this->assertArrayNotHasKey('tin', $doctorPayload);
    }

    public function test_patient_browsing_doctor_directory_does_not_see_credentials(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['user' => $patientUser] = $this->makePatient();

        $payload = $this->actingAs($patientUser, 'sanctum')
             ->getJson("/api/doctors/{$doctor->id}")
             ->assertStatus(200)
             ->json();

        // The directory stays locked down — no prescriber credentials when just browsing doctors.
        $this->assertArrayNotHasKey('license_no', $payload);
        $this->assertArrayNotHasKey('signature', $payload);
    }
}
