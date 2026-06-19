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
            ['email' => 'doctor@deamhi.test',  'license_no' => 'PRC-2019-001234', 'specialization' => 'General Medicine',  'prc_expiry' => '2027-06-30', 'ptr_no' => 'PTR-2026-04451', 's2_license' => 'S2-0099123', 'signature' => 'Maria L. Santos, M.D.'],
            ['email' => 'doctor2@deamhi.test', 'license_no' => 'PRC-2018-005678', 'specialization' => 'Internal Medicine', 'prc_expiry' => '2026-12-31', 'ptr_no' => 'PTR-2026-04452', 's2_license' => 'S2-0099124', 'signature' => 'Jose P. Rizal, M.D.'],
            ['email' => 'doctor3@deamhi.test', 'license_no' => 'PRC-2020-009012', 'specialization' => 'Pediatrics',        'prc_expiry' => '2028-03-31', 'ptr_no' => 'PTR-2026-04453', 's2_license' => 'S2-0099125', 'signature' => 'Corazon A. Aquino, M.D.'],
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
                    'ptr_no'         => $data['ptr_no'],
                    's2_license'     => $data['s2_license'],
                    'signature'      => $data['signature'],
                ]
            );
        }
    }
}
