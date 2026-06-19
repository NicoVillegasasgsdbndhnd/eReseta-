<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DiagnosticOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'reference_no'      => $this->reference_no,
            'patient_record_id' => $this->patient_record_id,
            'doctor_id'         => $this->doctor_id,
            'doctor'            => new DoctorResource($this->whenLoaded('doctor')),
            'ordered_at'        => $this->ordered_at,
            'status'            => $this->status,
            'notes'             => $this->notes,
            'items'             => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id'              => $item->id,
                'test_name'       => $item->test_name,
                'clinical_reason' => $item->clinical_reason,
            ])),
            'created_at'        => $this->created_at,
        ];
    }
}
