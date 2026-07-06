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
            'first_name'        => $this->first_name,
            'middle_name'       => $this->middle_name,
            'last_name'         => $this->last_name,
            'gender'            => $this->gender,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'address'           => $this->address,
            'role'              => $this->getRoleNames()->first(),
            'status'            => $this->status,
            'must_change_password' => (bool) $this->must_change_password,
            'terms_accepted'       => $this->terms_accepted_version === \App\Support\Terms::VERSION,
            'profile_photo_url' => $this->profile_photo_path
                ? \Illuminate\Support\Facades\Storage::disk('public')->url($this->profile_photo_path)
                : null,
            'patient'           => $this->when(
                $this->relationLoaded('patient') && $this->patient,
                fn () => [
                    'id' => $this->patient->id,
                ]
            ),
            'doctor'            => $this->when(
                $this->relationLoaded('doctor') && $this->doctor,
                fn () => [
                    'id'             => $this->doctor->id,
                    'specialization' => $this->doctor->specialization,
                    'license_no'     => $this->doctor->license_no,
                    'prc_expiry'     => $this->doctor->prc_expiry?->toDateString(),
                ]
            ),

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
