<?php

namespace Tests\Feature;

use Tests\TestCase;

class RoleBoundaryTest extends TestCase
{
    // ── Patient restrictions ──────────────────────────────────────────────────

    public function test_patient_cannot_list_all_patients(): void
    {
        $patient = $this->user('patient');

        $this->actingAs($patient, 'sanctum')
             ->getJson('/api/patients')
             ->assertStatus(403);
    }

    public function test_patient_cannot_delete_a_patient(): void
    {
        $admin   = $this->user('admin');
        ['patient' => $target] = $this->makePatient();

        $this->actingAs($this->user('patient'), 'sanctum')
             ->deleteJson("/api/patients/{$target->id}")
             ->assertStatus(403);
    }

    public function test_patient_cannot_access_reports(): void
    {
        $this->actingAs($this->user('patient'), 'sanctum')
             ->getJson('/api/reports/appointments')
             ->assertStatus(403);
    }

    public function test_patient_cannot_update_appointment_status(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient, 'user' => $patientUser] = $this->makePatient();

        $appointment = \App\Models\Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($patientUser, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
             ->assertStatus(403);
    }

    // ── Pharmacist restrictions ───────────────────────────────────────────────

    public function test_pharmacist_cannot_create_prescription(): void
    {
        $this->actingAs($this->user('pharmacist'), 'sanctum')
             ->postJson('/api/prescriptions', [])
             ->assertStatus(403);
    }

    public function test_pharmacist_cannot_view_patients(): void
    {
        $this->actingAs($this->user('pharmacist'), 'sanctum')
             ->getJson('/api/patients')
             ->assertStatus(403);
    }

    public function test_pharmacist_cannot_view_appointment(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $appointment = \App\Models\Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($this->user('pharmacist'), 'sanctum')
             ->getJson("/api/appointments/{$appointment->id}")
             ->assertStatus(403);
    }

    public function test_pharmacist_cannot_list_appointments(): void
    {
        // A seeded appointment would leak via the index if the pharmacist guard were missing.
        ['doctor' => $doctor]   = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        \App\Models\Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($this->user('pharmacist'), 'sanctum')
             ->getJson('/api/appointments')
             ->assertStatus(403);
    }

    public function test_pharmacist_cannot_list_billing_records(): void
    {
        $this->actingAs($this->user('pharmacist'), 'sanctum')
             ->getJson('/api/billing-records')
             ->assertStatus(403);
    }

    // ── Staff restrictions ────────────────────────────────────────────────────

    public function test_staff_cannot_access_prescriptions(): void
    {
        // Seed a prescription so a missing staff guard would leak it into the index response.
        ['doctor' => $doctor]   = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);
        \App\Models\Prescription::create([
            'reference_no'      => 'RX-STAFF-LEAK',
            'patient_record_id' => $record->id,
            'doctor_id'         => $doctor->id,
            'issued_at'         => now(),
            'status'            => 'issued',
        ]);

        $this->actingAs($this->user('staff'), 'sanctum')
             ->getJson('/api/prescriptions')
             ->assertStatus(403); // staff have no business reading prescriptions (matches show())
    }

    public function test_staff_cannot_create_patient_records(): void
    {
        $this->actingAs($this->user('staff'), 'sanctum')
             ->postJson('/api/patient-records', [])
             ->assertStatus(403);
    }

    public function test_admin_cannot_create_patient_records(): void
    {
        // Records are authored by the attending doctor only — an admin has no doctor profile.
        $this->actingAs($this->user('admin'), 'sanctum')
             ->postJson('/api/patient-records', [])
             ->assertStatus(403);
    }

    public function test_staff_can_register_a_patient_profile(): void
    {
        $this->actingAs($this->user('staff'), 'sanctum')
             ->postJson('/api/patients', [
                 'name'                   => 'Jane Doe',
                 'email'                  => 'jane.doe.staff@example.test',
                 'password'               => 'Welcome1!',
                 'dob'                    => '1990-01-01',
                 'sex'                    => 'female',
                 'address'                => 'Brgy. Sample, Sample City',
                 'contact'                => '09171234567',
                 'preferred_language'     => 'Filipino',
                 'gov_id_type'            => 'UMID',
                 'emergency_contact_name' => 'John Doe',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'jane.doe.staff@example.test']);
    }

    // ── Admin capabilities ────────────────────────────────────────────────────

    public function test_admin_can_list_all_users(): void
    {
        $this->actingAs($this->user('admin'), 'sanctum')
             ->getJson('/api/users')
             ->assertStatus(200);
    }

    public function test_admin_can_delete_patient(): void
    {
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($this->user('admin'), 'sanctum')
             ->deleteJson("/api/patients/{$patient->id}")
             ->assertStatus(204);
    }

    public function test_non_admin_cannot_access_user_list(): void
    {
        foreach (['doctor', 'pharmacist', 'staff', 'patient'] as $role) {
            $this->actingAs($this->user($role), 'sanctum')
                 ->getJson('/api/users')
                 ->assertStatus(403);
        }
    }

    // ── Doctor restrictions ───────────────────────────────────────────────────

    public function test_doctor_cannot_verify_prescription(): void
    {
        ['doctor' => $doctor, 'user' => $doctorUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $record = $this->makePatientRecord($patient->id, $doctor->id);
        $rx     = \App\Models\Prescription::create([
            'reference_no'      => 'RX-TEST-0001',
            'patient_record_id' => $record->id,
            'doctor_id'         => $doctor->id,
            'issued_at'         => now(),
            'status'            => 'issued',
        ]);

        $this->actingAs($doctorUser, 'sanctum')
             ->putJson("/api/prescriptions/{$rx->id}/verify")
             ->assertStatus(403);
    }

    public function test_doctor_cannot_book_appointment(): void
    {
        ['doctor' => $doctor, 'user' => $doctorUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($doctorUser, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => now()->addDay()->toISOString(),
                 'type'         => 'consultation',
             ])
             ->assertStatus(403);
    }
}
