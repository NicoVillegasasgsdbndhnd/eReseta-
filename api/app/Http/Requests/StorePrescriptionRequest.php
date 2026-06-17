<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('doctor');
    }

    public function rules(): array
    {
        return [
            'patient_record_id'          => ['required', 'exists:patient_records,id'],
            'items'                      => ['required', 'array', 'min:1'],
            'items.*.drug_name'          => ['required', 'string', 'max:255'],
            'items.*.dosage'             => ['required', 'string', 'max:100'],
            'items.*.quantity'           => ['required', 'integer', 'min:1'],
            'items.*.quantity_unit'      => ['nullable', 'string', 'max:20'],
            'items.*.frequency'          => ['required', 'string', 'max:100'],
            'items.*.duration'           => ['required', 'string', 'max:100'],
            'items.*.instructions'       => ['nullable', 'string'],
        ];
    }
}
