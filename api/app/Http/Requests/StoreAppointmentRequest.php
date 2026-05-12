<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole(['patient', 'admin']);
    }

    public function rules(): array
    {
        return [
            'doctor_id'    => ['required', 'exists:doctors,id'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'type'         => ['required', 'in:consultation,follow_up,emergency'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ];
    }
}
