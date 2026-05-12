<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
        ];
    }
}
