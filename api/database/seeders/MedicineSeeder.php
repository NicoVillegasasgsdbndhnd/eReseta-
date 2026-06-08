<?php

namespace Database\Seeders;

use App\Models\Medicine;
use Illuminate\Database\Seeder;

class MedicineSeeder extends Seeder
{
    /**
     * Seeds the generic medicines catalog from the PNF EML CSV
     * (database/seeders/data/medicines.csv, produced by extract_medicines.py).
     *
     * Idempotent: upserts on generic_name and only refreshes the descriptive columns, so a re-seed
     * never clobbers pharmacist-set `is_available` flags.
     */
    public function run(): void
    {
        $csv = database_path('seeders/data/medicines.csv');

        if (! is_file($csv)) {
            $this->command?->warn("MedicineSeeder: {$csv} not found — skipping.");
            return;
        }

        $handle = fopen($csv, 'r');
        fgetcsv($handle); // skip header row

        $now = now();
        $chunk = [];
        $total = 0;

        $flush = function () use (&$chunk, &$total) {
            if ($chunk === []) {
                return;
            }
            Medicine::upsert($chunk, ['generic_name'], ['dosage_form', 'strength', 'route', 'updated_at']);
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
                'strength'     => ($row[2] ?? '') !== '' ? $row[2] : null,
                'route'        => ($row[3] ?? '') !== '' ? $row[3] : null,
                'created_at'   => $now,
                'updated_at'   => $now,
            ];
            if (count($chunk) >= 200) {
                $flush();
            }
        }
        $flush();
        fclose($handle);

        $this->command?->info("MedicineSeeder: upserted {$total} medicines.");
    }
}
