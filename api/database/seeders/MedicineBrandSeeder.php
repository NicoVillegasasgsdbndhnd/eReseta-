<?php

namespace Database\Seeders;

use App\Models\Medicine;
use App\Models\MedicineBrand;
use Illuminate\Database\Seeder;






class MedicineBrandSeeder extends Seeder
{
    public function run(): void
    {
        $csv = database_path('seeders/data/deamhi_medicine_brands.csv');

        if (! is_file($csv)) {
            $this->command?->warn("MedicineBrandSeeder: {$csv} not found — skipping.");
            return;
        }

        MedicineBrand::query()->delete();


        $byGeneric = Medicine::pluck('id', 'generic_name');

        $handle = fopen($csv, 'r');
        fgetcsv($handle); // header: generic_name,brand_name,hospital_code,strength,dosage_form,packaging,is_available

        $now = now();
        $chunk = [];
        $total = 0;
        $orphans = 0;

        $flush = function () use (&$chunk, &$total) {
            if ($chunk === []) {
                return;
            }
            MedicineBrand::insert($chunk);
            $total += count($chunk);
            $chunk = [];
        };

        while (($row = fgetcsv($handle)) !== false) {
            $generic = trim($row[0] ?? '');
            $brand   = trim($row[1] ?? '');
            if ($generic === '' || $brand === '') {
                continue;
            }
            $medicineId = $byGeneric[$generic] ?? null;
            if ($medicineId === null) {
                $orphans++;
                continue; // generic was excluded — skip the brand too
            }
            $chunk[] = [
                'medicine_id'   => $medicineId,
                'brand_name'    => $brand,
                'hospital_code' => ($row[2] ?? '') !== '' ? $row[2] : null,
                'strength'      => ($row[3] ?? '') !== '' ? $row[3] : null,
                'dosage_form'   => ($row[4] ?? '') !== '' ? $row[4] : null,
                'packaging'     => ($row[5] ?? '') !== '' ? $row[5] : null,
                'is_available'  => (int) ($row[6] ?? 1) === 1,
                'created_at'    => $now,
                'updated_at'    => $now,
            ];
            if (count($chunk) >= 500) {
                $flush();
            }
        }
        $flush();
        fclose($handle);

        $this->command?->info("MedicineBrandSeeder: seeded {$total} brands" . ($orphans ? " ({$orphans} orphaned skipped)." : '.'));
    }
}
