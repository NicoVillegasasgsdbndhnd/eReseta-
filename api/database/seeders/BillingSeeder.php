<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\BillingRecord;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Database\Seeder;

class BillingSeeder extends Seeder
{
    public function run(): void
    {
        $appointments = Appointment::with('patient')->get();
        $patients     = Patient::with('user')->get()->keyBy(fn ($p) => $p->user->email);

        $billingData = [
            ['appt_index' => 2, 'patient' => 'patient3@deamhi.test', 'amount' => 500.00,  'status' => 'paid',    'paid_at' => '2026-05-12 12:00:00'],
            ['appt_index' => 0, 'patient' => 'patient@deamhi.test',  'amount' => 350.00,  'status' => 'pending', 'paid_at' => null],
            ['appt_index' => 1, 'patient' => 'patient2@deamhi.test', 'amount' => 450.00,  'status' => 'pending', 'paid_at' => null],
            ['appt_index' => 7, 'patient' => 'patient3@deamhi.test', 'amount' => 300.00,  'status' => 'waived',  'paid_at' => null],
        ];

        foreach ($billingData as $data) {
            $appointment = $appointments->get($data['appt_index']);
            $patient     = $patients[$data['patient']] ?? null;

            if (! $appointment || ! $patient) continue;

            BillingRecord::create([
                'patient_id'     => $patient->id,
                'appointment_id' => $appointment->id,
                'amount'         => $data['amount'],
                'status'         => $data['status'],
                'paid_at'        => $data['paid_at'],
            ]);
        }
    }
}
