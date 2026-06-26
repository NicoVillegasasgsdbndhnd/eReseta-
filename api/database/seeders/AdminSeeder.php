<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    /**
     * Bootstraps the first ("super") admin on a fresh deployment.
     *
     * Production: set ADMIN_EMAIL / ADMIN_PASSWORD (and optionally ADMIN_NAME) in the
     * server .env before running `php artisan db:seed --class=AdminSeeder`. If
     * ADMIN_PASSWORD is omitted a strong random one is generated and printed once.
     * Either way the account is flagged must_change_password, so the IT manager must
     * set a private password on first login — no shipped/known default credential.
     */
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
