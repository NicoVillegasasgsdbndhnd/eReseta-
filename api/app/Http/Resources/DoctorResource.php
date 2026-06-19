<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DoctorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'user_id'        => $this->user_id,
            'user'           => new UserResource($this->whenLoaded('user')),
            'license_no'     => $this->license_no,
            'ptr_no'         => $this->ptr_no,
            's2_license'     => $this->s2_license,
            'signature'      => $this->signature,
            'specialization' => $this->specialization,
            'prc_expiry'     => $this->prc_expiry?->toDateString(),
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
