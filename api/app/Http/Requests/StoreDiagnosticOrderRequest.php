<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDiagnosticOrderRequest extends FormRequest
{
    public function authorize(): bool
    {

        return $this->user()->hasRole(['doctor', 'admin']);
    }

    public function rules(): array
    {
        return [
            'patient_record_id'         => ['required', 'exists:patient_records,id'],
            'notes'                     => ['nullable', 'string', 'max:1000'],
            'items'                     => ['required', 'array', 'min:1'],
            'items.*.test_name'         => ['required', 'string', 'max:255'],
            'items.*.diagnostic_test_id'=> ['nullable', 'exists:diagnostic_tests,id'],
            'items.*.clinical_reason'   => ['nullable', 'string', 'max:255'],
        ];
    }
}
