<?php

namespace App\Http\Requests;

use App\Models\Patient;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Staff (secretary) register/intake new patients; admin/doctor too.
        return $this->user()->hasRole(['admin', 'doctor', 'staff']);
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', Password::min(8)->mixedCase()->numbers()->symbols()],
            'phone'         => ['nullable', 'string', 'max:20'],
            'dob'           => ['required', 'date', 'before:today'],
            'sex'           => ['required', 'in:male,female'],
            'address'       => ['required', 'string'],
            // philhealth_no is encrypted at rest; uniqueness is checked against the blind index.
            'philhealth_no' => ['nullable', 'string', 'max:30', $this->uniquePhilhealthRule()],
            'contact'       => ['required', 'string', 'max:20'],
            // Expanded intake profile — all optional.
            'preferred_language'         => ['nullable', 'string', 'max:60'],
            'known_allergies'            => ['nullable', 'string', 'max:255'],
            'gov_id_type'                => ['nullable', 'string', 'max:80'],
            'gov_id_no'                  => ['nullable', 'string', 'max:80'],
            'hmo_provider'               => ['nullable', 'string', 'max:120'],
            'hmo_policy_no'              => ['nullable', 'string', 'max:80'],
            'hmo_group_no'               => ['nullable', 'string', 'max:80'],
            'copay'                      => ['nullable', 'string', 'max:255'],
            'emergency_contact_name'     => ['nullable', 'string', 'max:120'],
            'emergency_contact_phone'    => ['nullable', 'string', 'max:30'],
            'emergency_contact_relation' => ['nullable', 'string', 'max:60'],
        ];
    }

    private function uniquePhilhealthRule(): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value && Patient::where('philhealth_no_hash', Patient::hashPhilhealth($value))->exists()) {
                $fail('The PhilHealth number has already been taken.');
            }
        };
    }
}
