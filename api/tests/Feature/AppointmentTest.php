<?php

namespace Tests\Feature;

use App\Models\Appointment;
use Tests\TestCase;

class AppointmentTest extends TestCase
{
    public function test_patient_can_book_appointment(): void
    {
        ['user' => $patientUser] = $this->makePatient();
        ['doctor' => $doctor]    = $this->makeDoctor();

        $response = $this->actingAs($patientUser, 'sanctum')
                         ->postJson('/api/appointments', [
                             'doctor_id'    => $doctor->id,
                             'scheduled_at' => now()->addDays(3)->toISOString(),
                             'type'         => 'consultation',
                             'notes'        => 'Headache for 3 days.',
                         ]);

        $response->assertStatus(201)
                 ->assertJsonPath('status', 'scheduled');
    }

    public function test_patient_can_only_view_own_appointment(): void
    {
        ['user' => $patientUser1, 'patient' => $patient1] = $this->makePatient();
        ['user' => $patientUser2, 'patient' => $patient2] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient2->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        // Patient 1 tries to view Patient 2's appointment
        $this->actingAs($patientUser1, 'sanctum')
             ->getJson("/api/appointments/{$appointment->id}")
             ->assertStatus(403);
    }

    public function test_doctor_can_confirm_appointment(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $response = $this->actingAs($doctorUser, 'sanctum')
                         ->putJson("/api/appointments/{$appointment->id}/status", [
                             'status' => 'confirmed',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'confirmed');
    }

    public function test_doctor_can_reschedule_appointment(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $newDate = now()->addDays(5)->toISOString();

        $response = $this->actingAs($doctorUser, 'sanctum')
                         ->putJson("/api/appointments/{$appointment->id}/status", [
                             'status'       => 'rescheduled',
                             'scheduled_at' => $newDate,
                             'notes'        => 'Doctor unavailable on original date.',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'rescheduled');
    }

    public function test_doctor_cannot_view_another_doctors_appointment(): void
    {
        ['user' => $doctorUser1] = $this->makeDoctor();
        ['doctor' => $doctor2]   = $this->makeDoctor();
        ['patient' => $patient]  = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor2->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($doctorUser1, 'sanctum')
             ->getJson("/api/appointments/{$appointment->id}")
             ->assertStatus(403);
    }

    public function test_admin_can_cancel_any_appointment(): void
    {
        $admin = $this->user('admin');
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
                         ->putJson("/api/appointments/{$appointment->id}/status", [
                             'status' => 'cancelled',
                         ]);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'cancelled');
    }
}
