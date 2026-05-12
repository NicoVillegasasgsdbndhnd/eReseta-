<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            UserSeeder::class,
            PatientSeeder::class,
            DoctorSeeder::class,
            AppointmentSeeder::class,
            PatientRecordSeeder::class,
            PrescriptionSeeder::class,
            BillingSeeder::class,
        ]);
    }
}
