<?php

namespace App\Services;

use App\Enums\UserStatus;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return ['user' => $user->load('patient', 'doctor'), 'token' => $token];
    }

    public function register(array $data): array
    {
        // SECURITY: self-registration always creates a PATIENT — never a privileged
        // role. Any client-supplied `role` is ignored here (and rejected by
        // RegisterRequest). Privileged accounts are created only via POST /users (admin).
        return DB::transaction(function () use ($data): array {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => $data['password'],
                'phone'    => $data['phone'] ?? null,
                'address'  => $data['address'] ?? null,
                'status'   => UserStatus::Active,
            ]);

            $user->assignRole('patient');
            Patient::create(['user_id' => $user->id]);

            $token = $user->createToken('api')->plainTextToken;

            return ['user' => $user, 'token' => $token];
        });
    }
}
