<?php

namespace Tests\Feature;

use Tests\TestCase;

class CompleteProfileTest extends TestCase
{
    public function test_me_reports_incomplete_profile_when_details_are_missing(): void
    {
        // makePatient sets an address but no emergency contact / allergies.
        ['user' => $user] = $this->makePatient();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('profile_complete', false);
    }

    public function test_a_non_patient_is_always_complete(): void
    {
        $this->actingAs($this->user('staff'), 'sanctum')
            ->getJson('/api/auth/me')
            ->assertStatus(200)
            ->assertJsonPath('profile_complete', true);
    }

    public function test_patient_completes_profile_and_flag_flips(): void
    {
        ['user' => $user, 'patient' => $patient] = $this->makePatient();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/me/complete-profile', [
                'address'                 => '123 Real St, Antipolo City',
                'emergency_contact_name'  => 'Jane Doe',
                'emergency_contact_phone' => '09171234567',
                'known_allergies'         => 'None',
            ])
            ->assertStatus(200)
            ->assertJsonPath('profile_complete', true);

        $this->assertSame('Jane Doe', $patient->fresh()->emergency_contact_name);
    }

    public function test_complete_profile_requires_the_deferred_fields(): void
    {
        ['user' => $user] = $this->makePatient();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/me/complete-profile', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'address', 'emergency_contact_name', 'emergency_contact_phone', 'known_allergies',
            ]);
    }

    public function test_staff_can_register_a_patient_without_an_address(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->actingAs($this->user('staff'), 'sanctum')
            ->postJson('/api/patients', [
                'first_name' => 'Noad',
                'last_name'  => 'Dress',
                'email'      => 'noaddress@example.com',
                'dob'        => '1990-01-01',
                'sex'        => 'male',
                'contact'    => '09171234567',
            ])
            ->assertStatus(201);
    }
}
