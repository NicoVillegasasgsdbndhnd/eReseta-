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

    public function test_doctor_cannot_change_another_doctors_appointment(): void
    {
        ['user' => $doctorAUser] = $this->makeDoctor();
        ['doctor' => $doctorB]   = $this->makeDoctor();
        ['patient' => $patient]  = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctorB->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        // Doctor A must not be able to mark Doctor B's appointment served/cancelled.
        $this->actingAs($doctorAUser, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'served'])
             ->assertStatus(403);
    }

    public function test_doctor_can_change_their_own_appointment(): void
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

        $this->actingAs($doctorUser, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'served'])
             ->assertStatus(200)
             ->assertJsonPath('status', 'served');
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

    public function test_cannot_double_book_an_already_taken_doctor_slot(): void
    {
        ['doctor' => $doctor]      = $this->makeDoctor();
        ['user' => $patientUser1]  = $this->makePatient();
        ['user' => $patientUser2]  = $this->makePatient();

        $slot = now()->addDays(3)->setTime(10, 0)->toISOString();

        // First patient takes the slot.
        $this->actingAs($patientUser1, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => $slot,
                 'type'         => 'consultation',
             ])
             ->assertStatus(201);

        // A different patient cannot take the same doctor + time.
        $this->actingAs($patientUser2, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => $slot,
                 'type'         => 'consultation',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_same_patient_cannot_book_the_same_slot_twice(): void
    {
        ['doctor' => $doctor]    = $this->makeDoctor();
        ['user' => $patientUser] = $this->makePatient();

        $slot = now()->addDays(4)->setTime(9, 30)->toISOString();
        $payload = ['doctor_id' => $doctor->id, 'scheduled_at' => $slot, 'type' => 'consultation'];

        $this->actingAs($patientUser, 'sanctum')->postJson('/api/appointments', $payload)->assertStatus(201);
        $this->actingAs($patientUser, 'sanctum')->postJson('/api/appointments', $payload)
             ->assertStatus(422)
             ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_patient_cannot_book_two_doctors_at_the_same_time(): void
    {
        ['doctor' => $doctorA]   = $this->makeDoctor();
        ['doctor' => $doctorB]   = $this->makeDoctor();
        ['user' => $patientUser] = $this->makePatient();

        $slot = now()->addDays(6)->setTime(8, 0)->toISOString();

        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/appointments', ['doctor_id' => $doctorA->id, 'scheduled_at' => $slot, 'type' => 'consultation'])
             ->assertStatus(201);

        // Same patient, same time, different doctor — should be rejected.
        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/appointments', ['doctor_id' => $doctorB->id, 'scheduled_at' => $slot, 'type' => 'consultation'])
             ->assertStatus(422)
             ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_cancelled_slot_can_be_rebooked(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();

        $slot = now()->addDays(5)->setTime(11, 0);

        Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => $slot,
            'status'       => 'cancelled',
            'type'         => 'consultation',
        ]);

        // The slot is freed once cancelled, so booking it again succeeds.
        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => $slot->toISOString(),
                 'type'         => 'consultation',
             ])
             ->assertStatus(201);
    }

    public function test_cancel_attribution_is_patient_or_clinic(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();

        $mk = fn () => Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDays(3)->setTime(10, 0),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        // Patient cancels their own → "patient".
        $a = $mk();
        $this->actingAs($patientUser, 'sanctum')
             ->putJson("/api/appointments/{$a->id}/status", ['status' => 'cancelled'])
             ->assertStatus(200);
        $this->actingAs($patientUser, 'sanctum')->getJson("/api/appointments/{$a->id}")
             ->assertJsonPath('cancelled_by', 'patient');

        // Doctor (clinic) cancels → "clinic".
        $b = $mk();
        $this->actingAs($doctorUser, 'sanctum')
             ->putJson("/api/appointments/{$b->id}/status", ['status' => 'cancelled'])
             ->assertStatus(200);
        $this->actingAs($doctorUser, 'sanctum')->getJson("/api/appointments/{$b->id}")
             ->assertJsonPath('cancelled_by', 'clinic');
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

    public function test_scheduled_at_is_serialized_as_wall_clock_without_timezone(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => '2026-06-20 10:00:00',
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        // Must come back as a naive local time string (no trailing "Z"/offset) so the browser
        // renders the booked time, not a UTC-shifted one.
        $this->actingAs($patientUser, 'sanctum')
             ->getJson("/api/appointments/{$appointment->id}")
             ->assertStatus(200)
             ->assertJsonPath('scheduled_at', '2026-06-20T10:00:00');
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

    public function test_staff_can_confirm_appointment_for_assigned_doctor(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);
        ['patient' => $patient] = $this->makePatient();

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

    public function test_staff_cannot_confirm_appointment_for_another_doctor(): void
    {
        ['doctor' => $assignedDoctor] = $this->makeDoctor();
        ['doctor' => $otherDoctor]    = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $assignedDoctor->id]);
        ['patient' => $patient] = $this->makePatient();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $otherDoctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->actingAs($staff, 'sanctum')
             ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
             ->assertStatus(403);
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
