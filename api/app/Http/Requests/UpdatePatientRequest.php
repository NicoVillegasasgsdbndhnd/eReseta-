<?php

namespace App\Http\Requests;

use App\Models\Patient;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'doctor', 'staff']);
    }

    public function rules(): array
    {
        return [
            'name'          => ['sometimes', 'string', 'max:255'],
            'email'         => ['sometimes', 'email', "unique:users,email,{$this->route('patient')->user_id}"],
            'phone'         => ['nullable', 'string', 'max:20'],
            'dob'           => ['sometimes', 'date', 'before:today'],
            'sex'           => ['sometimes', 'in:male,female'],
            'address'       => ['sometimes', 'string'],
            // philhealth_no is encrypted at rest; uniqueness is checked against the blind index.
            'philhealth_no' => ['nullable', 'string', 'max:30', $this->uniquePhilhealthRule()],
            'contact'       => ['sometimes', 'string', 'max:20'],
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
        $currentId = $this->route('patient')->getKey();

        return function (string $attribute, mixed $value, \Closure $fail) use ($currentId): void {
            if ($value && Patient::where('philhealth_no_hash', Patient::hashPhilhealth($value))
                ->where('id', '!=', $currentId)
                ->exists()) {
                $fail('The PhilHealth number has already been taken.');
            }
        };
    }
}
