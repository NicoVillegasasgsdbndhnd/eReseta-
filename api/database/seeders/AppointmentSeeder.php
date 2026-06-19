<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;

class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $patients = Patient::with('user')->get()->keyBy(fn ($p) => $p->user->email);
        $doctors  = Doctor::all()->keyBy('id');
        $adminUser = User::where('email', 'admin@deamhi.test')->first();

        $records = [
            ['patient' => 'patient@deamhi.test',  'doctor' => 1, 'at' => '2026-05-12 09:00:00', 'status' => 'scheduled',   'type' => 'consultation', 'notes' => 'Follow-up on hypertension management'],
            ['patient' => 'patient2@deamhi.test', 'doctor' => 1, 'at' => '2026-05-12 10:00:00', 'status' => 'confirmed',   'type' => 'follow_up',    'notes' => null],
            ['patient' => 'patient3@deamhi.test', 'doctor' => 2, 'at' => '2026-05-12 11:00:00', 'status' => 'served',      'type' => 'consultation', 'notes' => 'Diabetes monitoring'],
            ['patient' => 'patient4@deamhi.test', 'doctor' => 2, 'at' => '2026-05-13 09:00:00', 'status' => 'scheduled',   'type' => 'consultation', 'notes' => null],
            ['patient' => 'patient5@deamhi.test', 'doctor' => 3, 'at' => '2026-05-11 14:00:00', 'status' => 'cancelled',   'type' => 'follow_up',    'notes' => 'Patient requested cancellation'],
            ['patient' => 'patient@deamhi.test',  'doctor' => 2, 'at' => '2026-05-14 10:00:00', 'status' => 'scheduled',   'type' => 'consultation', 'notes' => null],
            ['patient' => 'patient2@deamhi.test', 'doctor' => 3, 'at' => '2026-05-15 09:00:00', 'status' => 'confirmed',   'type' => 'consultation', 'notes' => 'Pediatric check-up'],
            ['patient' => 'patient3@deamhi.test', 'doctor' => 1, 'at' => '2026-05-10 15:00:00', 'status' => 'rescheduled', 'type' => 'follow_up',    'notes' => 'Rescheduled from May 8'],
            ['patient' => 'patient6@deamhi.test', 'doctor' => 1, 'at' => '2026-05-16 08:00:00', 'status' => 'scheduled',   'type' => 'consultation', 'notes' => null],
            ['patient' => 'patient7@deamhi.test', 'doctor' => 2, 'at' => '2026-05-16 13:00:00', 'status' => 'scheduled',   'type' => 'consultation', 'notes' => 'Chest pain complaint'],
        ];

        foreach ($records as $data) {
            $patient = $patients[$data['patient']] ?? null;
            if (! $patient) continue;

            $appointment = Appointment::create([
                'patient_id'   => $patient->id,
                'doctor_id'    => $data['doctor'],
                'scheduled_at' => $data['at'],
                'status'       => $data['status'],
                'type'         => $data['type'],
                'notes'        => $data['notes'],
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status'    => null,
                'to_status'      => 'scheduled',
                'changed_by'     => $patient->user_id,
            ]);

            if ($data['status'] !== 'scheduled') {
                AppointmentStatusHistory::create([
                    'appointment_id' => $appointment->id,
                    'from_status'    => 'scheduled',
                    'to_status'      => $data['status'],
                    'changed_by'     => $adminUser?->id ?? $patient->user_id,
                ]);
            }
        }
    }
}
