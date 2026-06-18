<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Notifications\AppointmentBooked;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AppointmentTest extends TestCase
{
    public function test_staff_can_confirm_their_assigned_doctors_appointment(): void
    {
        ['doctor' => $doctor]   = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($staff, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
             ->assertStatus(200)
             ->assertJsonPath('status', 'confirmed');
    }

    public function test_staff_cannot_manage_another_doctors_appointment(): void
    {
        ['doctor' => $doctorA]  = $this->makeDoctor();
        ['doctor' => $doctorB]  = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctorA->id]);

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctorB->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($staff, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
             ->assertStatus(403);
    }

    public function test_double_booking_same_slot_is_rejected(): void
    {
        ['user' => $patientUser1] = $this->makePatient();
        ['user' => $patientUser2] = $this->makePatient();
        ['doctor' => $doctor]     = $this->makeDoctor();

        $slot = now()->addDays(3)->setTime(10, 0)->toISOString();

        $this->actingAs($patientUser1, 'sanctum')
             ->postJson('/api/appointments', ['doctor_id' => $doctor->id, 'scheduled_at' => $slot, 'type' => 'consultation'])
             ->assertStatus(201);

        // Second patient grabs the same doctor + datetime → rejected.
        $this->actingAs($patientUser2, 'sanctum')
             ->postJson('/api/appointments', ['doctor_id' => $doctor->id, 'scheduled_at' => $slot, 'type' => 'consultation'])
             ->assertStatus(422)
             ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_patient_can_cancel_their_own_appointment(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($patientUser, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'cancelled'])
             ->assertStatus(200)
             ->assertJsonPath('status', 'cancelled');
    }

    public function test_patient_cannot_confirm_their_own_appointment(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        // Patients may only cancel/rebook — confirming is a clinic action.
        $this->actingAs($patientUser, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
             ->assertStatus(403);
    }

    public function test_patient_cannot_cancel_another_patients_appointment(): void
    {
        ['user' => $patientUser1] = $this->makePatient();
        ['patient' => $patient2]  = $this->makePatient();
        ['doctor' => $doctor]     = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient2->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($patientUser1, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'cancelled'])
             ->assertStatus(403);
    }

    public function test_booking_sends_confirmation_email(): void
    {
        Notification::fake();

        ['user' => $patientUser] = $this->makePatient();
        ['doctor' => $doctor]    = $this->makeDoctor();

        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => now()->addDays(2)->toISOString(),
                 'type'         => 'consultation',
             ])
             ->assertStatus(201);

        Notification::assertSentTo($patientUser, AppointmentBooked::class);
    }

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
