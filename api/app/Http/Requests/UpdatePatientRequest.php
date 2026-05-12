<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['admin', 'doctor']);
    }

    public function rules(): array
    {
        $patientId = $this->route('patient');

        return [
            'name'          => ['sometimes', 'string', 'max:255'],
            'email'         => ['sometimes', 'email', "unique:users,email,{$this->route('patient')->user_id}"],
            'phone'         => ['nullable', 'string', 'max:20'],
            'dob'           => ['sometimes', 'date', 'before:today'],
            'sex'           => ['sometimes', 'in:male,female'],
            'address'       => ['sometimes', 'string'],
            'philhealth_no' => ['nullable', 'string', 'max:30', "unique:patients,philhealth_no,{$patientId}"],
            'contact'       => ['sometimes', 'string', 'max:20'],
        ];
    }
}
