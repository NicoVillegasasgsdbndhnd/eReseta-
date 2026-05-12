<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'prescription_id'  => $this->prescription_id,
            'event_type'       => $this->event_type,
            'actor_id'         => $this->actor_id,
            'actor'            => new UserResource($this->whenLoaded('actor')),
            'occurred_at'      => $this->occurred_at,
            'blockchain_tx_id' => $this->blockchain_tx_id,
        ];
    }
}
