<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Hash;

/**
 * Reject a password that any other user already uses.
 *
 * Enforced at panel request (Sir Jondel). This is deliberately AGAINST the usual
 * recommendation: salted bcrypt makes identical passwords hash differently, so the
 * only way to detect a duplicate is to check the new password against every stored
 * hash. To keep the harm minimal we (a) store NO extra password fingerprint — the
 * bcrypt hashes stay as-is — and (b) return a GENERIC message so we never reveal
 * that a specific password already belongs to some account.
 */
class UniquePasswordAcrossUsers implements ValidationRule
{
    public function __construct(private readonly ?int $exceptUserId = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || $value === '') {
            return;
        }

        $query = User::query()->select('id', 'password')->whereNotNull('password');
        if ($this->exceptUserId !== null) {
            $query->where('id', '!=', $this->exceptUserId);
        }

        foreach ($query->cursor() as $user) {
            if (Hash::check($value, $user->password)) {
                $fail('Please choose a different password.');

                return;
            }
        }
    }
}
