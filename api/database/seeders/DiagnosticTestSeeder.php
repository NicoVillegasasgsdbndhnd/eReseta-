<?php

namespace Database\Seeders;

use App\Models\DiagnosticTest;
use Illuminate\Database\Seeder;

/**
 * Seeds the diagnostic test catalog from DEAMHI's real HIS examinations + imaging menu
 * (database/seeders/data/deamhi_diagnostic_tests.csv). Imaging rows carry a modality + body_region
 * for the doctor's cascade picker; laboratory rows leave those null.
 *
 * REPLACE semantics: wipes the old placeholder tests first. diagnostic_order_items.diagnostic_test_id
 * is nullOnDelete, so any historical orders keep their free-text test_name.
 */
class DiagnosticTestSeeder extends Seeder
{
    public function run(): void
    {
        $csv = database_path('seeders/data/deamhi_diagnostic_tests.csv');

        if (! is_file($csv)) {
            $this->command?->warn("DiagnosticTestSeeder: {$csv} not found — skipping.");
            return;
        }

        DiagnosticTest::query()->delete();

        $handle = fopen($csv, 'r');
        fgetcsv($handle); // header: name,category,modality,body_region

        $now = now();
        $chunk = [];
        $total = 0;

        $flush = function () use (&$chunk, &$total) {
            if ($chunk === []) {
                return;
            }
            DiagnosticTest::upsert($chunk, ['name'], ['category', 'modality', 'body_region', 'is_available', 'updated_at']);
            $total += count($chunk);
            $chunk = [];
        };

        while (($row = fgetcsv($handle)) !== false) {
            $name = trim($row[0] ?? '');
            if ($name === '') {
                continue;
            }
            $chunk[] = [
                'name'         => $name,
                'category'     => ($row[1] ?? '') !== '' ? $row[1] : null,
                'modality'     => ($row[2] ?? '') !== '' ? $row[2] : null,
                'body_region'  => ($row[3] ?? '') !== '' ? $row[3] : null,
                'is_available' => true,
                'created_at'   => $now,
                'updated_at'   => $now,
            ];
            if (count($chunk) >= 500) {
                $flush();
            }
        }
        $flush();
        fclose($handle);

        $this->command?->info("DiagnosticTestSeeder: seeded {$total} DEAMHI tests.");
    }
}
