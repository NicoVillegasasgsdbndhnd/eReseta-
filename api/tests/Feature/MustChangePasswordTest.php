<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\AccountProvisioned;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MustChangePasswordTest extends TestCase
{
    public function test_admin_creating_user_without_password_generates_temp_and_forces_change(): void
    {
        Notification::fake();
        $admin = $this->user('admin');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name'  => 'New Pharmacist',
            'email' => 'newpharm@deamhi.test',
            'role'  => 'pharmacist',
            // no password → temp generated
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('temp_password', fn ($v) => is_string($v) && strlen($v) >= 8);

        $this->assertDatabaseHas('users', [
            'email'                => 'newpharm@deamhi.test',
            'must_change_password' => true,
        ]);
        Notification::assertSentTo(
            User::where('email', 'newpharm@deamhi.test')->first(),
            AccountProvisioned::class
        );
    }

    public function test_admin_creating_user_with_password_does_not_force_change(): void
    {
        Notification::fake();
        $admin = $this->user('admin');

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'name'     => 'Set Pw Admin',
            'email'    => 'setpwadmin@deamhi.test',
            'role'     => 'admin',
            'password' => 'Str0ng#Pass1',
        ]);

        $response->assertStatus(201)->assertJsonPath('temp_password', null);
        $this->assertDatabaseHas('users', [
            'email'                => 'setpwadmin@deamhi.test',
            'must_change_password' => false,
        ]);
        Notification::assertNothingSent();
    }

    public function test_user_must_change_password_is_blocked_until_changed(): void
    {
        $admin = $this->user('admin', [
            'password'             => Hash::make('Temp@Pass1'),
            'must_change_password' => true,
        ]);

        // Locked out of every authenticated endpoint except the password change.
        $this->actingAs($admin, 'sanctum')->getJson('/api/users')->assertStatus(403);

        // Allowed to set a permanent password.
        $this->actingAs($admin, 'sanctum')->putJson('/api/profile', [
            'password'         => 'Brandnew#Pass2',
            'current_password' => 'Temp@Pass1',
        ])->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id'                   => $admin->id,
            'must_change_password' => false,
        ]);

        // Access restored now that the flag is cleared.
        $this->actingAs($admin->fresh(), 'sanctum')->getJson('/api/users')->assertStatus(200);
    }
}
