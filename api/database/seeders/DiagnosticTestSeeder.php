<?php

namespace Database\Seeders;

use App\Models\DiagnosticTest;
use Illuminate\Database\Seeder;









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
