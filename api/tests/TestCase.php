<?php

namespace Tests;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientRecord;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    protected function user(string $role, array $attrs = []): User
    {
        $user = User::factory()->create($attrs);
        $user->assignRole($role);
        return $user;
    }

    protected function makeDoctor(array $userAttrs = []): array
    {
        $user   = $this->user('doctor', $userAttrs);
        $doctor = Doctor::create([
            'user_id'        => $user->id,
            'specialization' => 'General Medicine',
            'license_no'     => 'PRC-' . fake()->unique()->numerify('#####'),
            'prc_expiry'     => now()->addYear()->toDateString(),
        ]);
        return compact('user', 'doctor');
    }

    protected function makePatient(array $userAttrs = []): array
    {
        $user    = $this->user('patient', $userAttrs);
        $patient = Patient::create([
            'user_id' => $user->id,
            'dob'     => '1990-01-01',
            'sex'     => 'male',
            'address' => 'Test Address, Antipolo City',
            'contact' => '09123456789',
        ]);
        return compact('user', 'patient');
    }

    protected function makePatientRecord(int $patientId, int $doctorId): PatientRecord
    {
        return PatientRecord::create([
            'patient_id'      => $patientId,
            'doctor_id'       => $doctorId,
            'visit_date'      => now()->toDateString(),
            'chief_complaint' => 'Headache',
            'diagnosis'       => 'Tension headache',
            'notes'           => 'Advised rest and hydration.',
        ]);
    }
}
