<?php

namespace Tests\Feature;

use App\Models\StaffRequest;
use Tests\TestCase;

class StaffRequestTest extends TestCase
{
    /** Rejecting a staff member mid-session must immediately revoke their active token. */
    public function test_rejecting_staff_revokes_their_active_tokens(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();

        // Approved staff member holding a live session token.
        $staffUser = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);
        $staffRequest = StaffRequest::create([
            'staff_user_id' => $staffUser->id,
            'doctor_id'     => $doctor->id,
            'status'        => 'approved',
        ]);
        $staffToken = $staffUser->createToken('api')->plainTextToken;

        // Token works before rejection.
        $this->withToken($staffToken)->getJson('/api/appointments')->assertStatus(200);
        $this->app['auth']->forgetGuards(); // re-resolve auth for the next bearer token (test-only)

        // The assigned doctor rejects the staff member.
        $doctorToken = $doctorUser->createToken('api')->plainTextToken;
        $this->withToken($doctorToken)
            ->postJson("/api/staff-requests/{$staffRequest->id}/reject")
            ->assertStatus(200);
        $this->app['auth']->forgetGuards();

        // The staff member's previously-issued token is now dead.
        $this->withToken($staffToken)->getJson('/api/appointments')->assertStatus(401);
        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $staffUser->id,
        ]);
    }
}
