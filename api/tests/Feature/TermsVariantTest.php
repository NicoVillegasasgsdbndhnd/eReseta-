<?php

namespace Tests\Feature;

use App\Support\Terms;
use Tests\TestCase;

class TermsVariantTest extends TestCase
{
    public function test_every_role_maps_to_the_right_variant(): void
    {
        $this->assertSame('patient',  Terms::variantForRole('patient'));
        $this->assertSame('admin',    Terms::variantForRole('admin'));
        $this->assertSame('employee', Terms::variantForRole('doctor'));
        $this->assertSame('employee', Terms::variantForRole('staff'));
        $this->assertSame('employee', Terms::variantForRole('pharmacist'));
    }

    public function test_staff_and_doctor_and_pharmacist_get_employee_agreement_via_api(): void
    {
        foreach (['staff', 'doctor', 'pharmacist'] as $role) {
            $this->actingAs($this->user($role, ['terms_accepted_version' => null]), 'sanctum')
                ->getJson('/api/me/terms')
                ->assertJsonPath('variant', 'employee')
                ->assertJsonPath('title', 'Employee Confidentiality & Data Security Agreement');
        }
    }
}
