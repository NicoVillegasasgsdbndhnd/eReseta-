<?php

namespace App\Http\Requests;

use App\Models\PatientRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('doctor');
    }

    public function rules(): array
    {
        return [
            'patient_id'      => ['required', 'exists:patients,id'],
            'visit_date'      => ['required', 'date'],
            'chief_complaint' => ['required', 'string', 'max:255'],
            'diagnosis'       => ['required', 'string', 'max:255'],
            'notes'           => ['nullable', 'string'],

            // Structured vitals + physical exam (DEAMHI Out-Patient form). Both optional/JSON.
            'vital_signs'          => ['nullable', 'array'],
            'vital_signs.*'        => ['nullable', 'string', 'max:30'],
            'physical_exam'        => ['nullable', 'array'],
            'physical_exam.*.status' => ['nullable', 'string', 'max:20'],
            'physical_exam.*.notes'  => ['nullable', 'string', 'max:255'],

            'restriction_category'      => ['nullable', Rule::in(array_keys(PatientRecord::RESTRICTIONS))],
            'restricted_specialization' => ['nullable', 'string', 'max:100'],


            'follow_up_at'     => ['nullable', 'date', 'after:now'],
            'follow_up_reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
