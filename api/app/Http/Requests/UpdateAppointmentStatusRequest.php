<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppointmentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Staff (secretary) manage their assigned doctor's bookings — confirm/reschedule/cancel.
        // Previously only doctor/admin were allowed, which 403'd staff confirmations (the
        // "confirming a pending booking doesn't work" bug from the mentor review).
        // Patients may cancel or rebook their own appointment (constrained in the controller).
        return $this->user()->hasRole(['doctor', 'admin', 'staff', 'patient']);
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
