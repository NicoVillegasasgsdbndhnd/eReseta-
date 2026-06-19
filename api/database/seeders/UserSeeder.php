<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // Patients
            ['name' => 'Juan dela Cruz',    'email' => 'patient@deamhi.test',   'phone' => '09171234567', 'address' => 'Brgy. San Jose, Manila',              'role' => 'patient'],
            ['name' => 'Maria Santos',      'email' => 'patient2@deamhi.test',  'phone' => '09182345678', 'address' => 'Brgy. Sta. Cruz, Quezon City',         'role' => 'patient'],
            ['name' => 'Roberto Reyes',     'email' => 'patient3@deamhi.test',  'phone' => '09193456789', 'address' => 'Brgy. Poblacion, Makati',              'role' => 'patient'],
            ['name' => 'Ana Lim',           'email' => 'patient4@deamhi.test',  'phone' => '09204567890', 'address' => 'Brgy. Bagong Silang, Caloocan',        'role' => 'patient'],
            ['name' => 'Pedro Garcia',      'email' => 'patient5@deamhi.test',  'phone' => '09215678901', 'address' => 'Brgy. Talipapa, Quezon City',          'role' => 'patient'],
            ['name' => 'Josefa Mendoza',    'email' => 'patient6@deamhi.test',  'phone' => '09226789012', 'address' => 'Brgy. Pinyahan, Quezon City',          'role' => 'patient'],
            ['name' => 'Ricardo Torres',    'email' => 'patient7@deamhi.test',  'phone' => '09237890123', 'address' => 'Brgy. Bagumbayan, Taguig',             'role' => 'patient'],
            // Doctors
            ['name' => 'Dr. Maria Santos',  'email' => 'doctor@deamhi.test',    'phone' => '09181234567', 'address' => 'Quezon City',                          'role' => 'doctor'],
            ['name' => 'Dr. Jose Rizal',    'email' => 'doctor2@deamhi.test',   'phone' => '09192345678', 'address' => 'Manila',                               'role' => 'doctor'],
            ['name' => 'Dr. Corazon Aquino','email' => 'doctor3@deamhi.test',   'phone' => '09203456789', 'address' => 'Taguig',                               'role' => 'doctor'],
            // Pharmacist
            ['name' => 'Ana Reyes',         'email' => 'pharmacist@deamhi.test','phone' => '09191234567', 'address' => 'Makati',                               'role' => 'pharmacist'],
            // Admin
            ['name' => 'Admin User',        'email' => 'admin@deamhi.test',     'phone' => '09201234567', 'address' => 'Pasig',                                'role' => 'admin'],
            // Staff (formerly IT Admin — role renamed in migration 2026_05_16_000001)
            ['name' => 'Staff User',        'email' => 'staff@deamhi.test',     'phone' => '09211234567', 'address' => 'Taguig',                               'role' => 'staff'],
        ];

        foreach ($users as $data) {
            $role = $data['role'];
            unset($data['role']);

            $user = User::updateOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make('password'), 'status' => 'active'])
            );
            $user->syncRoles([$role]);
        }
    }
}
