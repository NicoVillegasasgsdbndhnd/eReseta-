<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'patient_id'   => $this->patient_id,
            'doctor_id'    => $this->doctor_id,
            'patient'      => new PatientResource($this->whenLoaded('patient')),
            'doctor'       => new DoctorResource($this->whenLoaded('doctor')),
            'scheduled_at' => $this->scheduled_at,
            'status'       => $this->status?->value,
            'type'         => $this->type,
            'notes'        => $this->notes,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }
}
