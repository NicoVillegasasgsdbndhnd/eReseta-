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
            // Emergency removed (mentor review). Patients only ever book consultations;
            // follow_up stays valid for doctor/staff/admin-created follow-ups.
            'type'         => ['nullable', 'in:consultation,follow_up'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        // Patients always book a consultation; default the type so the patient UI
        // doesn't need to send it. Doctor/staff/admin may still specify follow_up.
        if (! $this->filled('type') || $this->user()->hasRole('patient')) {
            $this->merge(['type' => 'consultation']);
        }
    }
}
