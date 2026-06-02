<?php

namespace App\Http\Requests;

use App\Models\Patient;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'doctor']);
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
