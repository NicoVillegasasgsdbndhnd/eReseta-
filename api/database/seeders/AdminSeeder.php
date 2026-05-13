<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin@deamhi.ph'],
            [
                'name'     => 'Administrator',
                'password' => Hash::make('Admin@2026!'),
                'status'   => 'active',
            ]
        );

        $user->syncRoles(['admin']);
    }
}
