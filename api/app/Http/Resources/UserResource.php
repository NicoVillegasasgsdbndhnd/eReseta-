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
            'must_change_password' => (bool) $this->must_change_password,
            'profile_photo_url' => $this->profile_photo_path
                ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->profile_photo_path)
                : null,
            'doctor'            => $this->when(
                $this->relationLoaded('doctor') && $this->doctor,
                fn () => [
                    'id'             => $this->doctor->id,
                    'specialization' => $this->doctor->specialization,
                    'license_no'     => $this->doctor->license_no,
                    'prc_expiry'     => $this->doctor->prc_expiry?->toDateString(),
                ]
            ),
            // Staff: which doctor they're assigned to
            'assigned_doctor'   => $this->when(
                $this->relationLoaded('assignedDoctor') && $this->assignedDoctor,
                fn () => [
                    'id'             => $this->assignedDoctor->id,
                    'specialization' => $this->assignedDoctor->specialization,
                    'user'           => $this->when(
                        $this->assignedDoctor->relationLoaded('user') && $this->assignedDoctor->user,
                        fn () => [
                            'id'   => $this->assignedDoctor->user->id,
                            'name' => $this->assignedDoctor->user->name,
                        ]
                    ),
                ]
            ),
            // Staff request status
            'staff_request'     => $this->when(
                $this->relationLoaded('staffRequest') && $this->staffRequest,
                fn () => [
                    'id'     => $this->staffRequest->id,
                    'status' => $this->staffRequest->status,
                ]
            ),
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
