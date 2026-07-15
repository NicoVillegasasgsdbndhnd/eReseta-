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
        $nameChars = 'regex:/^[\p{L}\s.\'-]+$/u';

        return [
            'first_name'     => ['required', 'string', 'max:50', $nameChars],
            'middle_initial' => ['nullable', 'string', 'max:20', $nameChars],
            'last_name'      => ['required', 'string', 'max:50', $nameChars],
            'suffix'         => ['nullable', 'string', 'max:10', 'regex:/^[\p{L}.]+$/u'],

            'dob'            => ['required', 'date', 'before:today'],
            'sex'            => ['required', 'in:male,female,other'],
            'mobile'         => ['required', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/'],
            'email'          => ['required', 'email', 'max:255'],
            'otp'            => ['required', 'string', 'size:6'],
            'doctor_id'      => ['required', 'integer', 'exists:doctors,id'],
            'preferred_date' => ['required', 'date', 'after:now'],
            'reason'         => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        $chars = ' may only contain letters, spaces, hyphens, apostrophes, and periods.';

        return [
            'first_name.regex'     => 'First name' . $chars,
            'middle_initial.regex' => 'Middle initial' . $chars,
            'last_name.regex'      => 'Last name' . $chars,
            'suffix.regex'         => 'Suffix may only contain letters and periods (e.g. Jr., III).',
            'mobile.regex'         => 'Enter a valid Philippine mobile number, e.g. 09171234567.',
        ];
    }
}
