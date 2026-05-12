<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Database\Seeder;

class DoctorSeeder extends Seeder
{
    public function run(): void
    {
        $doctors = [
            ['email' => 'doctor@deamhi.test',  'license_no' => 'PRC-2019-001234', 'specialization' => 'General Medicine',  'prc_expiry' => '2027-06-30'],
            ['email' => 'doctor2@deamhi.test', 'license_no' => 'PRC-2018-005678', 'specialization' => 'Internal Medicine', 'prc_expiry' => '2026-12-31'],
            ['email' => 'doctor3@deamhi.test', 'license_no' => 'PRC-2020-009012', 'specialization' => 'Pediatrics',        'prc_expiry' => '2028-03-31'],
        ];

        foreach ($doctors as $data) {
            $user = User::where('email', $data['email'])->first();
            if (! $user) continue;

            Doctor::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'license_no'     => $data['license_no'],
                    'specialization' => $data['specialization'],
                    'prc_expiry'     => $data['prc_expiry'],
                ]
            );
        }
    }
}
