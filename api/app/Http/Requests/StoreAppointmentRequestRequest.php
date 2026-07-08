<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequestRequest extends FormRequest
{

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name'      => ['required', 'string', 'max:100', 'regex:/^[\p{L}\s.\'-]+$/u'],


            'dob'            => ['required', 'date', 'before:today'],
            'sex'            => ['required', 'in:male,female,other'],
            'mobile'         => ['required', 'string', 'max:30'],
            'email'          => ['required', 'email', 'max:255'],
            'otp'            => ['required', 'string', 'size:6'],
            'doctor_id'      => ['required', 'integer', 'exists:doctors,id'],
            'preferred_date' => ['required', 'date', 'after:now'],
            'reason'         => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.regex' => 'Name may only contain letters, spaces, hyphens, apostrophes, and periods.',
        ];
    }
}
