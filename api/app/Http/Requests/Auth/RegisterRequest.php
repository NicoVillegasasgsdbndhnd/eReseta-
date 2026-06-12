<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            'phone'    => ['nullable', 'string', 'max:20'],
            'address'  => ['nullable', 'string'],
            // SECURITY: public self-registration is patient-only. Privileged roles
            // (doctor/pharmacist/admin/staff) are created exclusively by an admin via
            // POST /users. Any other value is rejected; the role is also forced
            // server-side in AuthService::register, so this is defence in depth.
            'role'     => ['nullable', 'in:patient'],
        ];
    }
}
