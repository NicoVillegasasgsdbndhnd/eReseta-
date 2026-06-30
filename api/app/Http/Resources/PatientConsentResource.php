<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientConsentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'status'          => $this->status,
            'notes'           => $this->notes,
            'consent_version' => $this->consent_version,
            'recorded_at'     => $this->recorded_at,
            'recorded_by'     => $this->whenLoaded('recordedBy', fn () => $this->recordedBy?->name),
        ];
    }
}
