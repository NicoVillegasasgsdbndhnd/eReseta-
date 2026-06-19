<?php

namespace Database\Seeders;

use App\Models\DiagnosticTest;
use Illuminate\Database\Seeder;

class DiagnosticTestSeeder extends Seeder
{
    public function run(): void
    {
        $tests = [
            // Imaging
            ['name' => 'Chest X-ray (PA)',          'category' => 'imaging'],
            ['name' => 'X-ray — Extremity',         'category' => 'imaging'],
            ['name' => 'Ultrasound — Whole Abdomen','category' => 'imaging'],
            ['name' => 'Ultrasound — KUB',          'category' => 'imaging'],
            ['name' => 'CT Scan — Cranial',         'category' => 'imaging'],
            ['name' => '2D Echocardiography',       'category' => 'imaging'],
            ['name' => 'ECG (12-lead)',             'category' => 'imaging'],
            // Laboratory
            ['name' => 'Complete Blood Count (CBC)','category' => 'laboratory'],
            ['name' => 'Urinalysis',                'category' => 'laboratory'],
            ['name' => 'Fecalysis',                 'category' => 'laboratory'],
            ['name' => 'Fasting Blood Sugar (FBS)', 'category' => 'laboratory'],
            ['name' => 'Lipid Profile',             'category' => 'laboratory'],
            ['name' => 'Blood Urea Nitrogen (BUN)', 'category' => 'laboratory'],
            ['name' => 'Creatinine',                'category' => 'laboratory'],
            ['name' => 'SGPT / ALT',                'category' => 'laboratory'],
            ['name' => 'SGOT / AST',                'category' => 'laboratory'],
            ['name' => 'HbA1c',                     'category' => 'laboratory'],
            ['name' => 'Thyroid Panel (TSH, FT4)',  'category' => 'laboratory'],
            ['name' => 'CRP',                       'category' => 'laboratory'],
            ['name' => 'Dengue NS1 Antigen',        'category' => 'laboratory'],
        ];

        foreach ($tests as $t) {
            DiagnosticTest::updateOrCreate(['name' => $t['name']], ['category' => $t['category']]);
        }

        $this->command?->info('DiagnosticTestSeeder: upserted ' . count($tests) . ' tests.');
    }
}
