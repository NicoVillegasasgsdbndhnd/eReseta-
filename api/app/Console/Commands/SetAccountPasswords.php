<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * Applies the turnover credentials to existing accounts.
 *
 * Credentials are NOT stored in this file — the repository is public. They are read from a
 * local, git-ignored JSON file (default: storage/app/account-credentials.json) shaped as:
 *
 *   { "user@example.com": "TheirPassword@1234", ... }
 *
 * Only updates accounts that already exist — it never creates one.
 */
class SetAccountPasswords extends Command
{
    protected $signature = 'accounts:set-passwords
                            {--file= : Path to the credentials JSON (default: storage/app/account-credentials.json)}
                            {--force : Skip the confirmation prompt}';

    protected $description = 'Apply the turnover credentials from a local (git-ignored) JSON file.';

    public function handle(): int
    {
        $path = $this->option('file') ?: storage_path('app/account-credentials.json');

        if (! is_file($path)) {
            $this->error("Credentials file not found: {$path}");
            $this->line('Create it as {"email": "password", ...} — and keep it out of git.');

            return self::FAILURE;
        }

        $accounts = json_decode((string) file_get_contents($path), true);

        if (! is_array($accounts) || $accounts === []) {
            $this->error('Credentials file is empty or not valid JSON.');

            return self::FAILURE;
        }

        // Guard the two rules we promise: unique, and strong enough for the app's own policy.
        if (count(array_unique($accounts)) !== count($accounts)) {
            $this->error('Duplicate passwords in the file — aborting.');

            return self::FAILURE;
        }

        foreach ($accounts as $email => $password) {
            if (! is_string($password) || ! preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/', $password)) {
                $this->error("Password for {$email} does not meet the policy (8+, mixed case, number, symbol).");

                return self::FAILURE;
            }
        }

        $count = count($accounts);

        if (! $this->option('force')
            && ! $this->confirm("This resets the password for {$count} existing accounts. Continue?")) {
            $this->warn('Aborted — nothing changed.');

            return self::FAILURE;
        }

        $updated = 0;
        $missing = [];

        foreach ($accounts as $email => $password) {
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

            $this->line("  <info>✓</info> {$email}");
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
