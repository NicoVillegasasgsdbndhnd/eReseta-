<?php

namespace Database\Seeders;

use App\Models\Medicine;
use Illuminate\Database\Seeder;

/**
 * Sample brand names for common generics (Epic O demo). The catalog stays generic-first;
 * brands are a convenience. Matches the first medicine row for each generic.
 */
class MedicineBrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            'Paracetamol'   => 'Biogesic',
            'Amoxicillin'   => 'Amoxil',
            'Mefenamic Acid'=> 'Ponstan',
            'Cetirizine'    => 'Virlix',
            'Metformin'     => 'Glucophage',
            'Amlodipine'    => 'Norvasc',
            'Losartan'      => 'Cozaar',
            'Omeprazole'    => 'Losec',
            'Ascorbic Acid' => 'Cecon',
            'Salbutamol'    => 'Ventolin',
        ];

        foreach ($brands as $generic => $brand) {
            Medicine::where('generic_name', 'like', $generic . '%')
                ->whereNull('brand_name')
                ->limit(1)
                ->update(['brand_name' => $brand]);
        }

        $this->command?->info('MedicineBrandSeeder: set ' . count($brands) . ' sample brands.');
    }
}
