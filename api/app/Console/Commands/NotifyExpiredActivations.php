<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Notifications\PatientActivationExpired;
use Illuminate\Console\Command;

class NotifyExpiredActivations extends Command
{
    protected $signature = 'activation:notify-expired';

    protected $description = 'Email patients whose activation link expired unused, inviting them to request a new one.';

    public function handle(): int
    {
        $cutoff = now()->subMinutes((int) config('auth.passwords.activations.expire', 2880));

        $users = User::query()
            ->whereNull('activated_at')
            ->whereNotNull('activation_sent_at')
            ->whereNull('activation_expired_notified_at')
            ->where('activation_sent_at', '<', $cutoff)
            ->get();

        foreach ($users as $user) {
            $user->notify(new PatientActivationExpired());
            $user->forceFill(['activation_expired_notified_at' => now()])->save();
        }

        $this->info("Notified {$users->count()} patient(s) of an expired activation link.");

        return self::SUCCESS;
    }
}
