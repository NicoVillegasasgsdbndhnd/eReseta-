<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePatientRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('doctor');
    }

    public function rules(): array
    {
        return [
            'chief_complaint' => ['sometimes', 'string', 'max:255'],
            'diagnosis'       => ['sometimes', 'string', 'max:255'],
            'notes'           => ['nullable', 'string'],

            'vital_signs'            => ['nullable', 'array'],
            'vital_signs.*'          => ['nullable', 'string', 'max:30'],
            'physical_exam'          => ['nullable', 'array'],
            'physical_exam.*.status' => ['nullable', 'string', 'max:20'],
            'physical_exam.*.notes'  => ['nullable', 'string', 'max:255'],
        ];
    }
}
