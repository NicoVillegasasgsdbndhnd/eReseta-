<?php

namespace Database\Seeders;

use App\Models\Medicine;
use App\Models\MedicineBrand;
use Illuminate\Database\Seeder;








class MedicineSeeder extends Seeder
{
    public function run(): void
    {
        $csv = database_path('seeders/data/deamhi_medicines.csv');

        if (! is_file($csv)) {
            $this->command?->warn("MedicineSeeder: {$csv} not found — skipping.");
            return;
        }



        MedicineBrand::query()->delete();
        Medicine::query()->delete();

        $handle = fopen($csv, 'r');
        fgetcsv($handle); // header: generic_name,dosage_form,is_available

        $now = now();
        $chunk = [];
        $total = 0;

        $flush = function () use (&$chunk, &$total) {
            if ($chunk === []) {
                return;
            }
            Medicine::upsert($chunk, ['generic_name'], ['dosage_form', 'is_available', 'updated_at']);
            $total += count($chunk);
            $chunk = [];
        };

        while (($row = fgetcsv($handle)) !== false) {
            $name = trim($row[0] ?? '');
            if ($name === '') {
                continue;
            }
            $chunk[] = [
                'generic_name' => $name,
                'dosage_form'  => ($row[1] ?? '') !== '' ? $row[1] : null,
                'is_available' => (int) ($row[2] ?? 1) === 1,
                'created_at'   => $now,
                'updated_at'   => $now,
            ];
            if (count($chunk) >= 500) {
                $flush();
            }
        }
        $flush();
        fclose($handle);

        $this->command?->info("MedicineSeeder: seeded {$total} DEAMHI generics.");
    }
}
