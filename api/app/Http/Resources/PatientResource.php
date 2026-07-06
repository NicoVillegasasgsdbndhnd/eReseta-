<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,

            'patient_code'  => sprintf('DEAMHI-%s-%05d', $this->created_at?->year ?? now()->year, $this->id),
            'user_id'       => $this->user_id,
            'user'          => new UserResource($this->whenLoaded('user')),
            'dob'           => $this->dob?->toDateString(),
            'sex'           => $this->sex,
            'address'       => $this->address,
            'philhealth_no' => $this->philhealth_no,
            'contact'       => $this->contact,

            'preferred_language'         => $this->preferred_language,
            'known_allergies'            => $this->known_allergies,
            'gov_id_type'                => $this->gov_id_type,
            'gov_id_no'                  => $this->gov_id_no,
            'hmo_provider'               => $this->hmo_provider,
            'hmo_policy_no'              => $this->hmo_policy_no,
            'hmo_group_no'               => $this->hmo_group_no,
            'copay'                      => $this->copay,
            'emergency_contact_name'     => $this->emergency_contact_name,
            'emergency_contact_phone'    => $this->emergency_contact_phone,
            'emergency_contact_relation' => $this->emergency_contact_relation,
            'created_at'    => $this->created_at,
            'updated_at'    => $this->updated_at,
        ];
    }
}
