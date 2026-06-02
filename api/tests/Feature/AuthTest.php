<?php

namespace Tests\Feature;

use App\Models\StaffRequest;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = $this->user('patient', ['password' => bcrypt('password')]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(200)
                 ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = $this->user('patient');

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'nobody@example.com',
            'password' => 'password',
        ]);

        $response->assertStatus(401);
    }

    public function test_pending_staff_cannot_login(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();

        $staffUser = User::factory()->create(['password' => bcrypt('password')]);
        $staffUser->assignRole('staff');
        StaffRequest::create([
            'staff_user_id' => $staffUser->id,
            'doctor_id'     => $doctor->id,
            'status'        => 'pending',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $staffUser->email,
            'password' => 'password',
        ]);

        $response->assertStatus(403)
                 ->assertJsonFragment(['message' => 'Your account is pending approval from the assigned physician. You will be notified once authorized.']);
    }

    public function test_rejected_staff_cannot_login(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();

        $staffUser = User::factory()->create(['password' => bcrypt('password')]);
        $staffUser->assignRole('staff');
        StaffRequest::create([
            'staff_user_id' => $staffUser->id,
            'doctor_id'     => $doctor->id,
            'status'        => 'rejected',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $staffUser->email,
            'password' => 'password',
        ]);

        $response->assertStatus(403)
                 ->assertJsonFragment(['message' => 'Your staff authorization was rejected by the physician. Please contact the administrator.']);
    }

    public function test_authenticated_user_can_logout(): void
    {
        $user = $this->user('patient');

        $response = $this->actingAs($user, 'sanctum')
                         ->postJson('/api/auth/logout');

        $response->assertStatus(200);
    }

    public function test_unauthenticated_request_to_protected_route_returns_401(): void
    {
        $response = $this->getJson('/api/appointments');
        $response->assertStatus(401);
    }

    public function test_unauthenticated_api_request_without_json_header_still_returns_json_401(): void
    {
        // Regression for F-1: a client that does NOT ask for JSON (e.g. a browser or scanner) must
        // still get a 401 JSON body, not a redirect to the undefined `login` route (a 500 + HTML
        // stack trace). Guaranteed by the ForceJsonResponse middleware on the api group.
        $response = $this->get('/api/appointments', ['Accept' => 'text/html']);

        $response->assertStatus(401)
                 ->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_login_is_rate_limited_after_10_attempts(): void
    {
        $user = $this->user('patient');

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', [
                'email'    => $user->email,
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'wrong',
        ]);

        $response->assertStatus(429);
    }
}
