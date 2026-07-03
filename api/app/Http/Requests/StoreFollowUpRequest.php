<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Staff/admin creating a follow-up appointment for a patient (the fallback path when the doctor
 * didn't schedule it during the consultation). Staff book only for their assigned doctor.
 */
class StoreFollowUpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['staff', 'admin']);
    }

    protected function prepareForValidation(): void
    {
        // Staff manage exactly one doctor's calendar — force the booking onto that doctor
        // regardless of any doctor_id sent by the client. Admins may target any doctor.
        if ($this->user()->hasRole('staff') && ! $this->user()->hasRole('admin')) {
            $this->merge(['doctor_id' => $this->user()->assigned_doctor_id]);
        }
    }

    public function rules(): array
    {
        return [
            'patient_id'       => ['required', 'exists:patients,id'],
            'doctor_id'        => ['required', 'exists:doctors,id'],
            'scheduled_at'     => ['required', 'date', 'after:now'],
            'reason'           => ['nullable', 'string', 'max:500'],
            'source_record_id' => ['nullable', 'exists:patient_records,id'],
        ];
    }
}
