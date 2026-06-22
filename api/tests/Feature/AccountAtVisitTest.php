<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Enums\AppointmentType;
use App\Models\Appointment;
use App\Notifications\PatientAccountCreated;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountAtVisitTest extends TestCase
{
    private function guestAppointment(int $doctorId): Appointment
    {
        return Appointment::create([
            'patient_id'    => null,
            'guest_name'    => 'Walk In Guest',
            'guest_contact' => '09171112222',
            'doctor_id'     => $doctorId,
            'scheduled_at'  => now()->addDay()->format('Y-m-d H:i:s'),
            'type'          => AppointmentType::Consultation,
            'status'        => AppointmentStatus::Scheduled,
        ]);
    }

    public function test_staff_completing_intake_without_password_generates_temp_credentials(): void
    {
        Notification::fake();
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff');
        $appointment = $this->guestAppointment($doctor->id);

        $response = $this->actingAs($staff, 'sanctum')->postJson('/api/patients', [
            'name'           => 'Walk In Guest',
            'email'          => 'walkin@example.com',
            'dob'            => '1990-01-01',
            'sex'            => 'male',
            'address'        => 'Brgy. Sample, Antipolo City',
            'contact'        => '09171112222',
            'appointment_id' => $appointment->id,
            // no password → temp generated
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('temp_password', fn ($v) => is_string($v) && strlen($v) >= 8);

        $this->assertDatabaseHas('users', [
            'email'                => 'walkin@example.com',
            'must_change_password' => true,
        ]);
        // The guest appointment is now linked to the new patient.
        $this->assertNotNull($appointment->fresh()->patient_id);
        Notification::assertSentTo(
            \App\Models\User::where('email', 'walkin@example.com')->first(),
            PatientAccountCreated::class
        );
    }

    public function test_staff_set_password_returns_no_temp_password(): void
    {
        Notification::fake();
        $staff = $this->user('staff');

        $response = $this->actingAs($staff, 'sanctum')->postJson('/api/patients', [
            'name'     => 'Set Password Patient',
            'email'    => 'setpw@example.com',
            'password' => 'Str0ng@Pass1',
            'dob'      => '1988-06-06',
            'sex'      => 'female',
            'address'  => 'Brgy. Two, Antipolo City',
            'contact'  => '09173334444',
        ]);

        $response->assertStatus(201)->assertJsonPath('temp_password', null);
        $this->assertDatabaseHas('users', [
            'email'                => 'setpw@example.com',
            'must_change_password' => false,
        ]);
        Notification::assertNothingSent();
    }
}
