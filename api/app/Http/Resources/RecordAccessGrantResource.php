<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecordAccessGrantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'patient_id'   => $this->patient_id,
            'patient_name' => $this->whenLoaded('patient', fn () => $this->patient?->user?->name),
            'doctor_name'  => $this->whenLoaded('doctorUser', fn () => $this->doctorUser?->name),
            'reason'       => $this->reason,
            'granted_at'   => $this->granted_at,
            'expires_at'   => $this->expires_at,
            'active'       => $this->expires_at?->isFuture() ?? false,
        ];
    }
}
