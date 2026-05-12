<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'doctor']);
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', Password::min(8)],
            'phone'         => ['nullable', 'string', 'max:20'],
            'dob'           => ['required', 'date', 'before:today'],
            'sex'           => ['required', 'in:male,female'],
            'address'       => ['required', 'string'],
            'philhealth_no' => ['nullable', 'string', 'max:30', 'unique:patients,philhealth_no'],
            'contact'       => ['required', 'string', 'max:20'],
        ];
    }
}
