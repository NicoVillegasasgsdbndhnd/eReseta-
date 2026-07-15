<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Enums\AppointmentType;
use App\Models\Appointment;
use App\Models\AppointmentRequest;
use App\Models\DoctorLeave;
use App\Notifications\AppointmentRequestApproved;
use App\Notifications\AppointmentRequestReceived;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AppointmentRequestTest extends TestCase
{
    private function futureSlot(int $days = 3, string $time = '09:00:00'): string
    {
        return now()->addDays($days)->format('Y-m-d') . ' ' . $time;
    }

    /** Seed a valid booking OTP for an email and return the code to submit. */
    private function bookingOtp(string $email, string $code = '123456'): string
    {
        Cache::put('booking-otp:' . strtolower($email), Hash::make($code), now()->addMinutes(10));

        return $code;
    }

    public function test_booking_otp_send_has_a_cooldown_per_email(): void
    {
        Notification::fake();

        $this->postJson('/api/public/appointment-requests/send-otp', ['email' => 'cool@example.com'])
            ->assertStatus(200)
            ->assertJsonPath('retry_after', fn ($v) => $v > 0);

        // A second request for the same email within the window is refused with the wait time.
        $this->postJson('/api/public/appointment-requests/send-otp', ['email' => 'cool@example.com'])
            ->assertStatus(429)
            ->assertJsonPath('retry_after', fn ($v) => $v > 0);

        // A different email is unaffected.
        $this->postJson('/api/public/appointment-requests/send-otp', ['email' => 'other@example.com'])
            ->assertStatus(200);
    }

    public function test_request_rejects_an_invalid_mobile_number(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->postJson('/api/public/appointment-requests', [
            'first_name'     => 'Juan',
            'last_name'      => 'Cruz',
            'dob'            => '1990-01-01',
            'sex'            => 'male',
            'mobile'         => 'abc12345',   // letters + wrong length — must be rejected
            'email'          => 'm@example.com',
            'otp'            => $this->bookingOtp('m@example.com'),
            'doctor_id'      => $doctor->id,
            'preferred_date' => $this->futureSlot(),
        ])->assertStatus(422)->assertJsonValidationErrors(['mobile']);
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
            'first_name'     => 'Juan',
            'last_name'      => 'Dela Cruz',
            'dob'            => '1990-05-01',
            'sex'            => 'male',
            'mobile'         => '09171234567',
            'email'          => 'juan@example.com',
            'otp'            => $this->bookingOtp('juan@example.com'),
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
        // The guest receives an email receipt (with reference number) on submission.
        Notification::assertSentOnDemand(AppointmentRequestReceived::class);
    }

    public function test_request_requires_dob_and_sex(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->postJson('/api/public/appointment-requests', [
            'first_name'     => 'No',
            'last_name'      => 'Birthday',
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
            'first_name'     => 'Second',
            'last_name'      => 'Guest',
            'dob'            => '1985-01-01',
            'sex'            => 'female',
            'mobile'         => '09172223333',
            'email'          => 'second@example.com',
            'otp'            => $this->bookingOtp('second@example.com'),
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
            'first_name'     => 'On Leave',
            'last_name'      => 'Day',
            'dob'            => '1985-01-01',
            'sex'            => 'male',
            'mobile'         => '09172223333',
            'email'          => 'leave@example.com',
            'otp'            => $this->bookingOtp('leave@example.com'),
            'doctor_id'      => $doctor->id,
            'preferred_date' => $slot,
        ])->assertStatus(422)->assertJsonValidationErrors(['scheduled_at']);
    }

    public function test_staff_can_approve_a_request_creating_a_guest_appointment(): void
    {
        Notification::fake();
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);
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

    public function test_approved_guest_appointment_carries_the_booking_email_for_registration(): void
    {
        Notification::fake();
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);

        $req = AppointmentRequest::create([
            'reference_no'   => AppointmentRequest::generateReferenceNo(),
            'full_name'      => 'Guesty Guest',
            'dob'            => '1991-02-03',
            'sex'            => 'female',
            'mobile'         => '09171112222',
            'email'          => 'guesty@example.com',
            'doctor_id'      => $doctor->id,
            'preferred_date' => $this->futureSlot(),
            'status'         => 'pending',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/appointment-requests/{$req->id}/approve")
            ->assertStatus(200);

        // The detail the registration form reads must expose the guest's email/dob/sex.
        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/appointments/{$req->fresh()->appointment_id}")
            ->assertStatus(200)
            ->assertJsonPath('guest_email', 'guesty@example.com')
            ->assertJsonPath('guest_dob', '1991-02-03')
            ->assertJsonPath('guest_sex', 'female');
    }

    public function test_staff_can_decline_a_request(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);

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

    public function test_staff_only_see_and_manage_their_assigned_doctors_requests(): void
    {
        ['doctor' => $docA] = $this->makeDoctor();
        ['doctor' => $docB] = $this->makeDoctor();
        $staffA = $this->user('staff', ['assigned_doctor_id' => $docA->id]);

        $reqA = AppointmentRequest::create([
            'reference_no'   => AppointmentRequest::generateReferenceNo(),
            'full_name'      => 'Belongs To A',
            'dob'            => '1990-01-01', 'sex' => 'male', 'mobile' => '09170000001',
            'email'          => 'a@example.com',
            'doctor_id'      => $docA->id,
            'preferred_date' => $this->futureSlot(),
            'status'         => 'pending',
        ]);
        $reqB = AppointmentRequest::create([
            'reference_no'   => AppointmentRequest::generateReferenceNo(),
            'full_name'      => 'Belongs To B',
            'dob'            => '1990-01-01', 'sex' => 'female', 'mobile' => '09170000002',
            'email'          => 'b@example.com',
            'doctor_id'      => $docB->id,
            'preferred_date' => $this->futureSlot(),
            'status'         => 'pending',
        ]);

        // Staff A's list shows only doctor A's request.
        $this->actingAs($staffA, 'sanctum')
            ->getJson('/api/appointment-requests')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $reqA->id);

        // Staff A cannot approve or decline doctor B's request.
        $this->actingAs($staffA, 'sanctum')
            ->postJson("/api/appointment-requests/{$reqB->id}/approve")
            ->assertStatus(403);
        $this->actingAs($staffA, 'sanctum')
            ->postJson("/api/appointment-requests/{$reqB->id}/decline")
            ->assertStatus(403);
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
