<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientRecord;
use App\Models\User;
use Illuminate\Database\Seeder;

class PatientRecordSeeder extends Seeder
{
    public function run(): void
    {
        $patients = Patient::with('user')->get()->keyBy(fn ($p) => $p->user->email);
        $doctors  = Doctor::all();

        $records = [
            ['patient' => 'patient@deamhi.test',  'doctor' => 1, 'date' => '2026-04-20', 'complaint' => 'Headache and elevated blood pressure',           'diagnosis' => 'Stage 1 Hypertension',             'notes' => 'Prescribed Amlodipine 5mg OD. Advised low-sodium diet and regular exercise. Follow-up in 2 weeks.'],
            ['patient' => 'patient2@deamhi.test', 'doctor' => 2, 'date' => '2026-04-25', 'complaint' => 'Fatigue, frequent urination, excessive thirst',   'diagnosis' => 'Type 2 Diabetes Mellitus',          'notes' => 'FBS 210 mg/dL. Started on Metformin 500mg BID. Referred for HbA1c and lipid profile.'],
            ['patient' => 'patient3@deamhi.test', 'doctor' => 1, 'date' => '2026-05-05', 'complaint' => 'Productive cough for 5 days, low-grade fever',    'diagnosis' => 'Acute Bronchitis',                  'notes' => 'Prescribed Azithromycin 500mg OD for 3 days and Salbutamol inhaler PRN.'],
            ['patient' => 'patient@deamhi.test',  'doctor' => 2, 'date' => '2026-05-10', 'complaint' => 'Follow-up for hypertension, BP still elevated',   'diagnosis' => 'Stage 1 Hypertension — uncontrolled','notes' => 'BP 150/95. Increased Amlodipine to 10mg OD. Added Losartan 50mg OD.'],
            ['patient' => 'patient4@deamhi.test', 'doctor' => 2, 'date' => '2026-05-08', 'complaint' => 'Abdominal pain and nausea for 2 days',            'diagnosis' => 'Acute Gastroenteritis',             'notes' => 'IV fluids given. Prescribed Metronidazole 500mg TID for 5 days and Loperamide PRN.'],
            ['patient' => 'patient5@deamhi.test', 'doctor' => 3, 'date' => '2026-05-03', 'complaint' => 'Rashes and itching over trunk',                   'diagnosis' => 'Allergic Dermatitis',               'notes' => 'Prescribed Cetirizine 10mg OD and Hydrocortisone cream topically.'],
        ];

        foreach ($records as $data) {
            $patient = $patients[$data['patient']] ?? null;
            if (! $patient) continue;

            PatientRecord::create([
                'patient_id'      => $patient->id,
                'doctor_id'       => $data['doctor'],
                'visit_date'      => $data['date'],
                'chief_complaint' => $data['complaint'],
                'diagnosis'       => $data['diagnosis'],
                'notes'           => $data['notes'],
            ]);
        }
    }
}
