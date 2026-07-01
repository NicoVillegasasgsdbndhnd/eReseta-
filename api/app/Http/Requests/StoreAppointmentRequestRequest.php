<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequestRequest extends FormRequest
{
    /** Public guest booking — anyone may submit a request. */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name'      => ['required', 'string', 'max:255'],
            // dob + sex are required (clinic safety / specialization eligibility) but still
            // lightweight — a guest knows both off the top of their head.
            'dob'            => ['required', 'date', 'before:today'],
            'sex'            => ['required', 'in:male,female,other'],
            'mobile'         => ['required', 'string', 'max:30'],
            'email'          => ['required', 'email', 'max:255'],
            'doctor_id'      => ['required', 'integer', 'exists:doctors,id'],
            'preferred_date' => ['required', 'date', 'after:now'],
            'reason'         => ['nullable', 'string', 'max:1000'],
        ];
    }
}
