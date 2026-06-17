<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Staff manage appointments for their assigned doctor (scope enforced in the controller).
        return $this->user()->hasRole(['doctor', 'admin', 'staff']);
    }

    public function rules(): array
    {
        return [
            'status'       => ['required', 'in:confirmed,served,rescheduled,cancelled'],
            'scheduled_at' => ['required_if:status,rescheduled', 'nullable', 'date', 'after:now'],
            'notes'        => ['nullable', 'string', 'max:500'],
        ];
    }
}
