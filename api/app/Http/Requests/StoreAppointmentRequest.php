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


            'type'         => ['nullable', 'in:consultation,follow_up'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {


        if (! $this->filled('type') || $this->user()->hasRole('patient')) {
            $this->merge(['type' => 'consultation']);
        }
    }
}
