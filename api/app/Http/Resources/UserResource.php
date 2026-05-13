<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'name'              => $this->name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'address'           => $this->address,
            'role'              => $this->getRoleNames()->first(),
            'status'            => $this->status,
            'profile_photo_url' => $this->profile_photo_path
                ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->profile_photo_path)
                : null,
            'doctor'            => $this->when(
                $this->relationLoaded('doctor') && $this->doctor,
                fn () => [
                    'specialization' => $this->doctor->specialization,
                    'license_no'     => $this->doctor->license_no,
                    'prc_expiry'     => $this->doctor->prc_expiry?->toDateString(),
                ]
            ),
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
