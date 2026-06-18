<?php

namespace Tests\Feature;

use App\Models\Doctor;
use Tests\TestCase;

class DoctorRxProfileTest extends TestCase
{
    public function test_admin_can_create_doctor_with_rx_profile_fields(): void
    {
        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
             ->postJson('/api/users', [
                 'name'           => 'Dr. Test Physician',
                 'email'          => 'rxdoc@deamhi.test',
                 'password'       => 'Str0ng#Pass1',
                 'role'           => 'doctor',
                 'specialization' => 'Cardiology',
                 'license_no'     => 'PRC-2021-111222',
                 'prc_expiry'     => '2028-01-01',
                 'ptr_no'         => 'PTR-2026-55555',
                 's2_license'     => 'S2-0042000',
                 'signature'      => 'Test Physician, M.D.',
             ])
             ->assertStatus(201);

        $this->assertDatabaseHas('doctors', [
            'license_no' => 'PRC-2021-111222',
            'ptr_no'     => 'PTR-2026-55555',
            's2_license' => 'S2-0042000',
            'signature'  => 'Test Physician, M.D.',
        ]);
    }

    public function test_doctor_rx_fields_are_exposed_on_the_resource(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        $doctor->update(['ptr_no' => 'PTR-9', 's2_license' => 'S2-9', 'signature' => 'Sig N. Ature, M.D.']);

        $this->actingAs($doctorUser, 'sanctum')
             ->getJson("/api/doctors/{$doctor->id}")
             ->assertStatus(200)
             ->assertJsonPath('ptr_no', 'PTR-9')
             ->assertJsonPath('s2_license', 'S2-9')
             ->assertJsonPath('signature', 'Sig N. Ature, M.D.');
    }
}
