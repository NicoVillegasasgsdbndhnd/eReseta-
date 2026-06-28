<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Enums\AppointmentType;
use App\Models\Appointment;
use App\Models\AppointmentRequest;
use App\Models\DoctorLeave;
use App\Notifications\AppointmentRequestApproved;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AppointmentRequestTest extends TestCase
{
    private function futureSlot(int $days = 3, string $time = '09:00:00'): string
    {
        return now()->addDays($days)->format('Y-m-d') . ' ' . $time;
    }

    public function test_public_doctor_directory_exposes_no_pii(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->getJson('/api/public/doctors')
            ->assertStatus(200)
            ->assertJsonFragment(['specialization' => $doctor->specialization])
            ->assertJsonMissingPath('data.0.license_no');
    }

    public function test_guest_can_submit_an_appointment_request(): void
    {
        Notification::fake();
        ['doctor' => $doctor] = $this->makeDoctor();

        $response = $this->postJson('/api/public/appointment-requests', [
            'full_name'      => 'Juan Dela Cruz',
            'dob'            => '1990-05-01',
            'sex'            => 'male',
            'mobile'         => '09171234567',
            'email'          => 'juan@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $this->futureSlot(),
            'reason'         => 'Persistent cough',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('reference_no', fn ($v) => str_starts_with($v, 'REQ-'))
            ->assertJsonPath('full_name', 'Juan Dela Cruz')
            ->assertJsonStructure(['reference_no', 'full_name', 'doctor', 'preferred_schedule', 'message']);
        $this->assertDatabaseHas('appointment_requests', [
            'email'  => 'juan@example.com',
            'status' => 'pending',
        ]);
        // No email is sent on submission — the guest sees the confirmation on-screen and
        // only receives an email once staff approve the request.
        Notification::assertNothingSent();
    }

    public function test_request_requires_dob_and_sex(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->postJson('/api/public/appointment-requests', [
            'full_name'      => 'No Birthday',
            'mobile'         => '09171234567',
            'email'          => 'nobd@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $this->futureSlot(),
        ])->assertStatus(422)->assertJsonValidationErrors(['dob', 'sex']);
    }

    public function test_request_rejects_a_taken_slot(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $slot = $this->futureSlot();

        Appointment::create([
            'patient_id'    => null,
            'guest_name'    => 'Existing Guest',
            'guest_contact' => '09170000000',
            'doctor_id'     => $doctor->id,
            'scheduled_at'  => $slot,
            'type'          => AppointmentType::Consultation,
            'status'        => AppointmentStatus::Scheduled,
        ]);

        $this->postJson('/api/public/appointment-requests', [
            'full_name'      => 'Second Guest',
            'dob'            => '1985-01-01',
            'sex'            => 'female',
            'mobile'         => '09172223333',
            'email'          => 'second@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $slot,
        ])->assertStatus(422)->assertJsonValidationErrors(['scheduled_at']);
    }

    public function test_request_rejects_doctor_on_leave(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $slot = $this->futureSlot();

        DoctorLeave::create(['doctor_id' => $doctor->id, 'date' => substr($slot, 0, 10)]);

        $this->postJson('/api/public/appointment-requests', [
            'full_name'      => 'On Leave Day',
            'dob'            => '1985-01-01',
            'sex'            => 'male',
            'mobile'         => '09172223333',
            'email'          => 'leave@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $slot,
        ])->assertStatus(422)->assertJsonValidationErrors(['scheduled_at']);
    }

    public function test_staff_can_approve_a_request_creating_a_guest_appointment(): void
    {
        Notification::fake();
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff');
        $slot  = $this->futureSlot();

        $request = AppointmentRequest::create([
            'reference_no'   => AppointmentRequest::generateReferenceNo(),
            'full_name'      => 'Maria Santos',
            'dob'            => '1992-03-03',
            'sex'            => 'female',
            'mobile'         => '09175556666',
            'email'          => 'maria@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $slot,
            'status'         => 'pending',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/appointment-requests/{$request->id}/approve")
            ->assertStatus(200)
            ->assertJsonPath('status', 'approved');

        $this->assertDatabaseHas('appointments', [
            'appointment_request_id' => $request->id,
            'patient_id'             => null,
            'guest_name'             => 'Maria Santos',
            'guest_contact'          => '09175556666',
            'doctor_id'              => $doctor->id,
        ]);
        $this->assertNotNull($request->fresh()->appointment_id);
        // The guest is emailed only on approval.
        Notification::assertSentOnDemand(AppointmentRequestApproved::class);
    }

    public function test_staff_can_decline_a_request(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff');

        $request = AppointmentRequest::create([
            'reference_no'   => AppointmentRequest::generateReferenceNo(),
            'full_name'      => 'Declined Guy',
            'dob'            => '1980-01-01',
            'sex'            => 'male',
            'mobile'         => '09177778888',
            'email'          => 'declined@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $this->futureSlot(),
            'status'         => 'pending',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/appointment-requests/{$request->id}/decline", ['decline_reason' => 'Fully booked'])
            ->assertStatus(200)
            ->assertJsonPath('status', 'declined');

        $this->assertDatabaseHas('appointment_requests', [
            'id'             => $request->id,
            'status'         => 'declined',
            'decline_reason' => 'Fully booked',
        ]);
    }

    public function test_only_staff_can_manage_requests(): void
    {
        ['user' => $patientUser] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
            ->getJson('/api/appointment-requests')
            ->assertStatus(403);

        $this->actingAs($this->user('admin'), 'sanctum')
            ->getJson('/api/appointment-requests')
            ->assertStatus(403);

        $this->actingAs($this->user('staff'), 'sanctum')
            ->getJson('/api/appointment-requests')
            ->assertStatus(200);
    }
}
