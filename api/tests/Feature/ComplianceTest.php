<?php

namespace Tests\Feature;

use Tests\TestCase;

class ComplianceTest extends TestCase
{
    public function test_admin_sees_consent_register_but_others_cannot(): void
    {
        $staff = $this->user('staff');
        ['patient' => $p1] = $this->makePatient();
        ['patient' => $p2] = $this->makePatient();
        $p1->consents()->create(['status' => 'given', 'recorded_by' => $staff->id, 'recorded_at' => now()]);

        $this->actingAs($this->user('admin'), 'sanctum')
            ->getJson('/api/compliance/consent-register')
            ->assertStatus(200)
            ->assertJsonPath('summary.given', 1)
            ->assertJsonPath('summary.none', 1);

        $this->actingAs($staff, 'sanctum')
            ->getJson('/api/compliance/consent-register')
            ->assertStatus(403);
    }

    public function test_admin_sees_terms_acceptance_register(): void
    {
        $this->user('doctor', ['terms_accepted_version' => null]); // pending
        $this->user('pharmacist');                                  // up to date (factory default)

        $this->actingAs($this->user('admin'), 'sanctum')
            ->getJson('/api/compliance/terms-acceptance')
            ->assertStatus(200)
            ->assertJsonPath('current_version', \App\Support\Terms::VERSION)
            ->assertJsonStructure(['current_version', 'data', 'summary' => ['up_to_date', 'pending']]);
    }
}
