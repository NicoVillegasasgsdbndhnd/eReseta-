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
        ];
    }
}
