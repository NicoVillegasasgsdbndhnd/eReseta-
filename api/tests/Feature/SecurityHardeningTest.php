<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    // ── #1 Privilege escalation via public registration ──────────────────────────

    public function test_public_registration_cannot_create_admin(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Attacker',
            'email'                 => 'attacker@example.com',
            'password'              => 'Passw0rd!',
            'password_confirmation' => 'Passw0rd!',
            'role'                  => 'admin',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('users', ['email' => 'attacker@example.com']);
    }

    public function test_public_registration_creates_patient_only(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name'                  => 'Real Patient',
            'email'                 => 'patient.signup@example.com',
            'password'              => 'Passw0rd!',
            'password_confirmation' => 'Passw0rd!',
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'patient.signup@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('patient'));
        $this->assertFalse($user->hasRole('admin'));
        $this->assertDatabaseHas('patients', ['user_id' => $user->id]);
    }

    // ── #3 Deactivated accounts cannot authenticate ──────────────────────────────

    public function test_deactivated_user_cannot_login(): void
    {
        $user = $this->user('patient', [
            'status'   => UserStatus::Inactive,
            'password' => bcrypt('password'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_deactivating_a_user_revokes_their_tokens(): void
    {
        $admin  = $this->user('admin');
        $target = $this->user('pharmacist');
        $target->createToken('api');

        $this->assertCount(1, $target->tokens()->get());

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$target->id}", ['status' => 'inactive'])
            ->assertStatus(200);

        $this->assertCount(0, $target->fresh()->tokens()->get());
    }

    // ── #5 Secure self-service password change ───────────────────────────────────

    public function test_password_change_rejects_wrong_current_password(): void
    {
        $user = $this->user('patient', ['password' => bcrypt('password')]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', [
                'password'         => 'NewPass@123',
                'current_password' => 'not-the-password',
            ])
            ->assertStatus(422);
    }

    public function test_password_change_succeeds_with_correct_current_password(): void
    {
        $user = $this->user('patient', ['password' => bcrypt('password')]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/profile', [
                'password'         => 'NewPass@123',
                'current_password' => 'password',
            ])
            ->assertStatus(200);

        $this->assertTrue(Hash::check('NewPass@123', $user->fresh()->password));
    }

    // ── #2 Webhook signature hardening ───────────────────────────────────────────

    public function test_webhook_rejected_without_signature_when_secret_configured(): void
    {
        config(['services.paymongo.webhook_secret' => 'whsec_test_secret']);

        $this->postJson('/api/webhooks/paymongo', [
            'data' => ['attributes' => ['type' => 'payment.paid', 'data' => ['id' => 'x']]],
        ])->assertStatus(401);
    }

    public function test_webhook_rejects_replayed_stale_timestamp(): void
    {
        $secret  = 'whsec_test_secret';
        config(['services.paymongo.webhook_secret' => $secret]);

        $payload = json_encode([
            'data' => ['attributes' => ['type' => 'payment.paid', 'data' => ['id' => 'x', 'attributes' => []]]],
        ]);
        $staleTs = (string) (time() - 1000); // > 5 min skew
        $hmac    = hash_hmac('sha256', "{$staleTs}.{$payload}", $secret);
        $sig     = "t={$staleTs},te={$hmac},li={$hmac}";

        $this->call(
            'POST',
            '/api/webhooks/paymongo',
            [], [], [],
            ['HTTP_PAYMONGO_SIGNATURE' => $sig, 'CONTENT_TYPE' => 'application/json'],
            $payload,
        )->assertStatus(401);
    }

    // ── #6 Security response headers ──────────────────────────────────────────────

    public function test_security_headers_present_on_api_responses(): void
    {
        $this->getJson('/api/health')
            ->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }

    // ── #7 Admin cannot lock itself out ───────────────────────────────────────────

    public function test_admin_cannot_delete_own_account(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$admin->id}")
            ->assertStatus(403);
    }

    public function test_admin_cannot_deactivate_own_account(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/users/{$admin->id}", ['status' => 'inactive'])
            ->assertStatus(403);
    }
}
