<?php

namespace Tests\Feature;

use Tests\TestCase;

class TermsAcceptanceTest extends TestCase
{
    /** A user who hasn't accepted the current terms is blocked from the app but can view/accept them. */
    public function test_unaccepted_user_blocked_then_unlocked_after_accepting(): void
    {
        $user = $this->user('doctor', ['terms_accepted_version' => null]);

        // Blocked on a normal endpoint by the terms gate.
        $this->actingAs($user, 'sanctum')->getJson('/api/doctors')->assertStatus(403);

        // Can fetch their agreement.
        $this->actingAs($user, 'sanctum')->getJson('/api/me/terms')
            ->assertStatus(200)
            ->assertJsonPath('variant', 'employee')
            ->assertJsonPath('version', 'v1')
            ->assertJsonPath('accepted', false);

        // Accept it.
        $this->actingAs($user, 'sanctum')->postJson('/api/me/terms/accept')
            ->assertStatus(200)->assertJsonPath('accepted', true);

        // Now the app is unlocked.
        $this->actingAs($user, 'sanctum')->getJson('/api/doctors')->assertStatus(200);

        // Recorded + audited (evidence).
        $this->assertDatabaseHas('users', ['id' => $user->id, 'terms_accepted_version' => 'v1']);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $user->id, 'action' => 'TERMS_ACCEPTED']);
    }

    public function test_agreement_variant_matches_role(): void
    {
        $this->actingAs($this->user('patient', ['terms_accepted_version' => null]), 'sanctum')
            ->getJson('/api/me/terms')->assertJsonPath('variant', 'patient');

        $this->actingAs($this->user('admin', ['terms_accepted_version' => null]), 'sanctum')
            ->getJson('/api/me/terms')->assertJsonPath('variant', 'admin');

        $this->actingAs($this->user('pharmacist', ['terms_accepted_version' => null]), 'sanctum')
            ->getJson('/api/me/terms')->assertJsonPath('variant', 'employee');
    }

    public function test_login_reports_terms_accepted_flag(): void
    {
        $user = $this->user('patient', ['terms_accepted_version' => null, 'password' => 'Str0ng@Pass1', 'must_change_password' => false]);

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Str0ng@Pass1'])
            ->assertStatus(200)
            ->assertJsonPath('user.terms_accepted', false);
    }
}
