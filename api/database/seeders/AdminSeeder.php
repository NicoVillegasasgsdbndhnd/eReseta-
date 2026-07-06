<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{









    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@deamhi.ph');
        $name  = env('ADMIN_NAME', 'Administrator');

        $configured = env('ADMIN_PASSWORD');
        $password   = $configured ?: Str::password(16);

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name'                 => $name,
                'password'             => $password, // hashed via the model's 'hashed' cast
                'status'               => 'active',
                'must_change_password' => true,
            ]
        );

        $user->syncRoles(['admin']);

        $this->command?->newLine();
        $this->command?->info('  DEAMHI super-admin provisioned');
        $this->command?->info('  Email: '.$email);
        if ($configured) {
            $this->command?->info('  Password: taken from ADMIN_PASSWORD');
        } else {
            $this->command?->warn('  Temporary password (shown once — store it securely): '.$password);
        }
        $this->command?->info('  This account must change its password on first login.');
        $this->command?->newLine();
    }
}
