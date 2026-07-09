<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PatientForceChangeTest extends TestCase
{
    public function test_patient_registered_blank_password_gets_activation_link(): void
    {
        Notification::fake();
        $staff = $this->user('staff');

        $res = $this->actingAs($staff, 'sanctum')->postJson('/api/patients', [
            'first_name' => 'Temp',
            'last_name'  => 'Patient',
            'email'      => 'temppatient@deamhi.test',
            'dob'        => '1990-01-01',
            'sex'        => 'male',
            'contact'    => '09171234567',
            'address'    => 'Test Address, Concepcion, Tarlac',
            // no password → activation link emailed (no temp password shared with staff)
        ]);
        $res->assertStatus(201)->assertJsonPath('activation_sent', true);

        // No temp password is returned; the patient sets their own via the emailed link.
        $this->assertNull($res->json('temp_password'));
        $this->assertDatabaseHas('users', [
            'email'                => 'temppatient@deamhi.test',
            'must_change_password' => true,
        ]);
        Notification::assertSentTo(
            \App\Models\User::where('email', 'temppatient@deamhi.test')->first(),
            \App\Notifications\PatientAccountActivation::class
        );
    }

    public function test_patient_registered_with_staff_typed_password_is_also_forced(): void
    {
        Notification::fake();
        $staff = $this->user('staff');

        $res = $this->actingAs($staff, 'sanctum')->postJson('/api/patients', [
            'first_name' => 'Typed',
            'last_name'  => 'Patient',
            'email'      => 'typedpatient@deamhi.test',
            'dob'        => '1990-01-01',
            'sex'        => 'other',
            'contact'    => '09170000000',
            'address'    => 'Test Address, Concepcion, Tarlac',
            'password'   => 'Password@123', // staff sets an initial password
        ]);
        $res->assertStatus(201);

        // Even a staff-typed initial password is temporary — the patient must still change it.
        $this->assertDatabaseHas('users', [
            'email' => 'typedpatient@deamhi.test', 'must_change_password' => true,
        ]);
        $this->postJson('/api/auth/login', [
            'email' => 'typedpatient@deamhi.test', 'password' => 'Password@123',
        ])->assertStatus(200)->assertJsonPath('user.must_change_password', true);
    }
}
