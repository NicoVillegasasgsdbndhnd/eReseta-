<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PatientForceChangeTest extends TestCase
{
    public function test_patient_registered_blank_password_is_forced_and_login_reports_it(): void
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
            // no password → temp generated
        ]);
        $res->assertStatus(201);
        $temp = $res->json('temp_password');
        $this->assertNotNull($temp, 'temp_password should be generated');

        // The freshly registered patient logs in — the login response must flag the change.
        $login = $this->postJson('/api/auth/login', [
            'email'    => 'temppatient@deamhi.test',
            'password' => $temp,
        ]);
        $login->assertStatus(200)->assertJsonPath('user.must_change_password', true);
    }
}
