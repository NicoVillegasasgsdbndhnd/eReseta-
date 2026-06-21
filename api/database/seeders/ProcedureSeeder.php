<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\Procedure;
use Illuminate\Database\Seeder;

class ProcedureSeeder extends Seeder
{
    public function run(): void
    {
        $samples = [
            ['name' => 'Appendectomy',            'category' => 'surgery',   'days' => 220],
            ['name' => 'Wound suturing',          'category' => 'procedure', 'days' => 60],
            ['name' => 'Skin lesion excision',    'category' => 'procedure', 'days' => 30],
            ['name' => 'Cataract surgery',        'category' => 'surgery',   'days' => 400],
        ];

        $count = 0;
        foreach (Patient::with('records')->take(4)->get() as $i => $patient) {
            $s = $samples[$i % count($samples)];
            Procedure::firstOrCreate(
                ['patient_id' => $patient->id, 'name' => $s['name']],
                [
                    'patient_record_id' => $patient->records->first()?->id,
                    'doctor_id'         => $patient->records->first()?->doctor_id,
                    'category'          => $s['category'],
                    'performed_at'      => now()->subDays($s['days'])->toDateString(),
                    'notes'             => 'Performed at DEAMHI Hospital. Recovery uneventful.',
                ],
            );
            $count++;
        }

        $this->command?->info("ProcedureSeeder: seeded procedures for {$count} patient(s).");
    }
}
