<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Sets the documented turnover credential for each DEAMHI account.
 *
 * Every account gets its OWN password (previously they were shared per role), which
 * matches the system's no-duplicate-password rule. Only updates accounts that already
 * exist — it never creates one — so a typo can't silently add an unauthorised user.
 */
class SetAccountPasswords extends Command
{
    protected $signature = 'accounts:set-passwords {--force : Skip the confirmation prompt}';

    protected $description = 'Set the documented unique password for each DEAMHI account (turnover credentials).';

    /** email => password. Each must be unique and meet the policy: 8+, mixed case, number, symbol. */
    private const ACCOUNTS = [
        // Administrators
        'admin@deamhi.ph'          => 'Admin@8801',
        'lady@deamhi.ph'           => 'Balingit@8802',
        'joshua@deamhi.ph'         => 'Gania@8803',

        // Doctors  (three Atanacios — first names keep these distinct)
        'danilo@deamhi.ph'         => 'Danilo@8811',
        'joseph@deamhi.ph'         => 'Joseph@8812',
        'catherine@deamhi.ph'      => 'Turla@8813',
        'oliver@deamhi.ph'         => 'Oliver@8814',

        // Secretaries / staff
        'jemellee@deamhi.ph'       => 'Jemellee@8821',
        'leonora@deamhi.ph'        => 'Mansibang@8822',
        'loribeth@deamhi.ph'       => 'Aquas@8823',
        'john@deamhi.ph'           => 'Gomez@8824',

        // Pharmacists
        'gavino@deamhi.ph'         => 'Gavino@8831',
        'yabut@deamhi.ph'          => 'Yabut@8832',
        'angeline@deamhi.ph'       => 'Lacson@8833',
        'rowen@deamhi.ph'          => 'Cubilla@8834',
        'gina@deamhi.ph'           => 'Manguerra@8835',

        // Patients
        'markyyyylicmoan@gmail.com' => 'Licmoan@8841',
        'testpatient@deamhi.ph'     => 'Testpatient@8842',
        'testpatient2@deamhi.ph'    => 'Testpatient@8843',
        'pashente@deamhi.ph'        => 'Pashente@8844',
        'testpatient5@deamhi.ph'    => 'Testpatient@8845',
    ];

    public function handle(): int
    {
        $count = count(self::ACCOUNTS);

        if (count(array_unique(self::ACCOUNTS)) !== $count) {
            $this->error('Duplicate passwords in the list — aborting.');

            return self::FAILURE;
        }

        if (! $this->option('force')
            && ! $this->confirm("This resets the password for {$count} existing accounts. Continue?")) {
            $this->warn('Aborted — nothing changed.');

            return self::FAILURE;
        }

        $updated = 0;
        $missing = [];

        foreach (self::ACCOUNTS as $email => $password) {
            $user = User::where('email', $email)->first();

            if ($user === null) {
                $missing[] = $email;
                continue;
            }

            // 'password' is hashed by the model cast. Clear the force-change flag so the
            // documented credential works on first login.
            $user->forceFill([
                'password'             => $password,
                'must_change_password' => false,
            ])->save();

            $this->line("  <info>✓</info> {$email}  →  {$password}");
            $updated++;
        }

        $this->newLine();
        $this->info("Updated {$updated} of {$count} accounts.");

        if ($missing !== []) {
            $this->warn('Not found (unchanged): ' . implode(', ', $missing));
        }

        return self::SUCCESS;
    }
}
