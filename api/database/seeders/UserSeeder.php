<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Every demo account has its OWN password — no two accounts share one, matching the
        // system's no-duplicate-password rule. All satisfy the policy: 8+ chars, mixed case,
        // a number and a symbol. Documented in the turnover credentials sheet.
        $users = [

            ['name' => 'Juan dela Cruz',    'email' => 'patient@deamhi.test',   'password' => 'DelaCruz@3141', 'phone' => '09171234567', 'address' => 'Brgy. San Jose, Manila',              'role' => 'patient'],
            ['name' => 'Maria Santos',      'email' => 'patient2@deamhi.test',  'password' => 'Santos@2718',   'phone' => '09182345678', 'address' => 'Brgy. Sta. Cruz, Quezon City',         'role' => 'patient'],
            ['name' => 'Roberto Reyes',     'email' => 'patient3@deamhi.test',  'password' => 'Reyes@1618',    'phone' => '09193456789', 'address' => 'Brgy. Poblacion, Makati',              'role' => 'patient'],
            ['name' => 'Ana Lim',           'email' => 'patient4@deamhi.test',  'password' => 'Lim@141421',    'phone' => '09204567890', 'address' => 'Brgy. Bagong Silang, Caloocan',        'role' => 'patient'],
            ['name' => 'Pedro Garcia',      'email' => 'patient5@deamhi.test',  'password' => 'Garcia@1732',   'phone' => '09215678901', 'address' => 'Brgy. Talipapa, Quezon City',          'role' => 'patient'],
            ['name' => 'Josefa Mendoza',    'email' => 'patient6@deamhi.test',  'password' => 'Mendoza@2236',  'phone' => '09226789012', 'address' => 'Brgy. Pinyahan, Quezon City',          'role' => 'patient'],
            ['name' => 'Ricardo Torres',    'email' => 'patient7@deamhi.test',  'password' => 'Torres@2645',   'phone' => '09237890123', 'address' => 'Brgy. Bagumbayan, Taguig',             'role' => 'patient'],

            ['name' => 'Dr. Maria Santos',  'email' => 'doctor@deamhi.test',    'password' => 'Santos@9081',   'phone' => '09181234567', 'address' => 'Quezon City',                          'role' => 'doctor'],
            ['name' => 'Dr. Jose Rizal',    'email' => 'doctor2@deamhi.test',   'password' => 'Rizal@1896',    'phone' => '09192345678', 'address' => 'Manila',                               'role' => 'doctor'],
            ['name' => 'Dr. Corazon Aquino','email' => 'doctor3@deamhi.test',   'password' => 'Aquino@1986',   'phone' => '09203456789', 'address' => 'Taguig',                               'role' => 'doctor'],

            ['name' => 'Ana Reyes',         'email' => 'pharmacist@deamhi.test','password' => 'Reyes@7325',    'phone' => '09191234567', 'address' => 'Makati',                               'role' => 'pharmacist'],

            ['name' => 'Admin User',        'email' => 'admin@deamhi.test',     'password' => 'Admin@4092',    'phone' => '09201234567', 'address' => 'Pasig',                                'role' => 'admin'],

            ['name' => 'Staff User',        'email' => 'staff@deamhi.test',     'password' => 'Staff@5170',    'phone' => '09211234567', 'address' => 'Taguig',                               'role' => 'staff'],
        ];

        foreach ($users as $data) {
            $role = $data['role'];
            unset($data['role']);

            $user = User::updateOrCreate(
                ['email' => $data['email']],
                array_merge($data, ['password' => Hash::make($data['password']), 'status' => 'active'])
            );
            $user->syncRoles([$role]);
        }
    }
}
