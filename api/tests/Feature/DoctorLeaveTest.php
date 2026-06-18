<?php

namespace Tests\Feature;

use App\Models\DoctorLeave;
use Tests\TestCase;

class DoctorLeaveTest extends TestCase
{
    public function test_doctor_can_block_a_leave_date(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();

        $this->actingAs($doctorUser, 'sanctum')
             ->postJson("/api/doctors/{$doctor->id}/leaves", [
                 'date'   => now()->addDays(5)->toDateString(),
                 'reason' => 'Conference',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('doctor_leaves', ['doctor_id' => $doctor->id, 'reason' => 'Conference']);
    }

    public function test_another_doctor_cannot_block_someone_elses_date(): void
    {
        ['user' => $doctorUserA] = $this->makeDoctor();
        ['doctor' => $doctorB]   = $this->makeDoctor();

        $this->actingAs($doctorUserA, 'sanctum')
             ->postJson("/api/doctors/{$doctorB->id}/leaves", ['date' => now()->addDays(5)->toDateString()])
             ->assertStatus(403);
    }

    public function test_staff_can_block_their_assigned_doctors_date(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);

        $this->actingAs($staff, 'sanctum')
             ->postJson("/api/doctors/{$doctor->id}/leaves", ['date' => now()->addDays(3)->toDateString()])
             ->assertStatus(201);
    }

    public function test_booking_on_a_leave_date_is_rejected(): void
    {
        ['user' => $patientUser] = $this->makePatient();
        ['doctor' => $doctor]    = $this->makeDoctor();

        $leaveDay = now()->addDays(4);
        DoctorLeave::create(['doctor_id' => $doctor->id, 'date' => $leaveDay->toDateString()]);

        $this->actingAs($patientUser, 'sanctum')
             ->postJson('/api/appointments', [
                 'doctor_id'    => $doctor->id,
                 'scheduled_at' => $leaveDay->setTime(10, 0)->toISOString(),
                 'type'         => 'consultation',
             ])
             ->assertStatus(422)
             ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_doctor_can_unblock_a_leave_date(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        $leave = DoctorLeave::create(['doctor_id' => $doctor->id, 'date' => now()->addDays(6)->toDateString()]);

        $this->actingAs($doctorUser, 'sanctum')
             ->deleteJson("/api/doctors/{$doctor->id}/leaves/{$leave->id}")
             ->assertStatus(204);

        $this->assertDatabaseMissing('doctor_leaves', ['id' => $leave->id]);
    }
}
