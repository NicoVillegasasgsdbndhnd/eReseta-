<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\PatientRecord;
use App\Models\Prescription;
use App\Models\PrescriptionEvent;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class PrescriptionSeeder extends Seeder
{
    public function run(): void
    {
        $records   = PatientRecord::all();
        $doctors   = Doctor::with('user')->get()->keyBy('id');
        $pharmacist = User::where('email', 'pharmacist@deamhi.test')->first();

        $prescriptions = [
            [
                'record_index' => 0,
                'doctor_id'    => 1,
                'issued_at'    => '2026-04-20 10:15:00',
                'status'       => 'dispensed',
                'blockchain_tx_id' => 'abc123def456',
                'items' => [
                    ['drug_name' => 'Amlodipine',  'dosage' => '5mg',   'quantity' => 30, 'frequency' => 'Once daily',      'duration' => '1 month',  'instructions' => 'Take in the morning'],
                    ['drug_name' => 'Losartan',     'dosage' => '50mg',  'quantity' => 30, 'frequency' => 'Once daily',      'duration' => '1 month',  'instructions' => null],
                ],
                'events' => [
                    ['type' => 'ISSUED',    'at' => '2026-04-20 10:15:00', 'actor_email' => 'doctor@deamhi.test'],
                    ['type' => 'VERIFIED',  'at' => '2026-04-20 13:00:00', 'actor_email' => 'pharmacist@deamhi.test'],
                    ['type' => 'DISPENSED', 'at' => '2026-04-20 14:10:00', 'actor_email' => 'pharmacist@deamhi.test'],
                ],
            ],
            [
                'record_index' => 1,
                'doctor_id'    => 2,
                'issued_at'    => '2026-04-25 09:45:00',
                'status'       => 'verified',
                'blockchain_tx_id' => 'jkl012mno345',
                'items' => [
                    ['drug_name' => 'Metformin', 'dosage' => '500mg', 'quantity' => 60, 'frequency' => 'Twice daily with meals', 'duration' => '1 month', 'instructions' => 'Take with food to reduce GI side effects'],
                ],
                'events' => [
                    ['type' => 'ISSUED',   'at' => '2026-04-25 09:45:00', 'actor_email' => 'doctor2@deamhi.test'],
                    ['type' => 'VERIFIED', 'at' => '2026-04-26 10:00:00', 'actor_email' => 'pharmacist@deamhi.test'],
                ],
            ],
            [
                'record_index' => 2,
                'doctor_id'    => 1,
                'issued_at'    => '2026-05-05 11:20:00',
                'status'       => 'issued',
                'blockchain_tx_id' => 'pqr678stu901',
                'items' => [
                    ['drug_name' => 'Azithromycin', 'dosage' => '500mg', 'quantity' => 3,  'frequency' => 'Once daily',  'duration' => '3 days',  'instructions' => 'Take on an empty stomach'],
                    ['drug_name' => 'Salbutamol',   'dosage' => '2.5mg', 'quantity' => 1,  'frequency' => 'As needed',   'duration' => '2 weeks', 'instructions' => '2 puffs PRN for wheezing'],
                ],
                'events' => [
                    ['type' => 'ISSUED', 'at' => '2026-05-05 11:20:00', 'actor_email' => 'doctor@deamhi.test'],
                ],
            ],
            [
                'record_index' => 3,
                'doctor_id'    => 2,
                'issued_at'    => '2026-05-10 10:15:00',
                'status'       => 'issued',
                'blockchain_tx_id' => 'stu901vwx234',
                'items' => [
                    ['drug_name' => 'Amlodipine', 'dosage' => '10mg', 'quantity' => 30, 'frequency' => 'Once daily',      'duration' => '1 month', 'instructions' => null],
                    ['drug_name' => 'Losartan',   'dosage' => '50mg', 'quantity' => 30, 'frequency' => 'Once daily',      'duration' => '1 month', 'instructions' => null],
                ],
                'events' => [
                    ['type' => 'ISSUED', 'at' => '2026-05-10 10:15:00', 'actor_email' => 'doctor2@deamhi.test'],
                ],
            ],
        ];

        $users = User::all()->keyBy('email');
        $year  = 2026;
        $seq   = 1;

        foreach ($prescriptions as $data) {
            $record = $records->get($data['record_index']);
            if (! $record) continue;

            $rx = Prescription::create([
                'reference_no'     => sprintf('RX-%d-%04d', $year, $seq++),
                'patient_record_id'=> $record->id,
                'doctor_id'        => $data['doctor_id'],
                'issued_at'        => $data['issued_at'],
                'status'           => $data['status'],
                'blockchain_tx_id' => $data['blockchain_tx_id'],
            ]);

            foreach ($data['items'] as $item) {
                PrescriptionItem::create(array_merge(['prescription_id' => $rx->id], $item));
            }

            foreach ($data['events'] as $event) {
                $actor = $users[$event['actor_email']] ?? null;
                if (! $actor) continue;

                PrescriptionEvent::create([
                    'prescription_id' => $rx->id,
                    'event_type'      => $event['type'],
                    'actor_id'        => $actor->id,
                    'occurred_at'     => $event['at'],
                    'blockchain_tx_id'=> $data['blockchain_tx_id'],
                ]);
            }
        }
    }
}
