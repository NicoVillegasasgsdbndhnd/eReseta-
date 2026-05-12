<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;

class PatientSeeder extends Seeder
{
    public function run(): void
    {
        $patients = [
            ['email' => 'patient@deamhi.test',  'dob' => '1990-05-15', 'sex' => 'male',   'address' => 'Brgy. San Jose, Manila',       'philhealth_no' => 'PH-001-234-567', 'contact' => '09171234567'],
            ['email' => 'patient2@deamhi.test', 'dob' => '1985-08-22', 'sex' => 'female', 'address' => 'Brgy. Sta. Cruz, Quezon City', 'philhealth_no' => 'PH-002-345-678', 'contact' => '09182345678'],
            ['email' => 'patient3@deamhi.test', 'dob' => '1978-03-10', 'sex' => 'male',   'address' => 'Brgy. Poblacion, Makati',      'philhealth_no' => 'PH-003-456-789', 'contact' => '09193456789'],
            ['email' => 'patient4@deamhi.test', 'dob' => '1995-11-30', 'sex' => 'female', 'address' => 'Brgy. Bagong Silang, Caloocan','philhealth_no' => null,             'contact' => '09204567890'],
            ['email' => 'patient5@deamhi.test', 'dob' => '2001-07-04', 'sex' => 'male',   'address' => 'Brgy. Talipapa, Quezon City',  'philhealth_no' => 'PH-005-678-901', 'contact' => '09215678901'],
            ['email' => 'patient6@deamhi.test', 'dob' => '1972-12-19', 'sex' => 'female', 'address' => 'Brgy. Pinyahan, Quezon City',  'philhealth_no' => 'PH-006-789-012', 'contact' => '09226789012'],
            ['email' => 'patient7@deamhi.test', 'dob' => '1968-04-03', 'sex' => 'male',   'address' => 'Brgy. Bagumbayan, Taguig',     'philhealth_no' => 'PH-007-890-123', 'contact' => '09237890123'],
        ];

        foreach ($patients as $data) {
            $user = User::where('email', $data['email'])->first();
            if (! $user) continue;

            Patient::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'dob'           => $data['dob'],
                    'sex'           => $data['sex'],
                    'address'       => $data['address'],
                    'philhealth_no' => $data['philhealth_no'],
                    'contact'       => $data['contact'],
                ]
            );
        }
    }
}
