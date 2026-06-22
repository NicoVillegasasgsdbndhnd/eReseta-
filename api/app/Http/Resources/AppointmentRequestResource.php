<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'reference_no'   => $this->reference_no,
            'full_name'      => $this->full_name,
            'dob'            => $this->dob?->toDateString(),
            'sex'            => $this->sex,
            'mobile'         => $this->mobile,
            'email'          => $this->email,
            'doctor_id'      => $this->doctor_id,
            'doctor'         => new DoctorResource($this->whenLoaded('doctor')),
            // Wall-clock (clinic-local), no timezone designator — matches AppointmentResource.
            'preferred_date' => $this->preferred_date?->format('Y-m-d\TH:i:s'),
            'reason'         => $this->reason,
            'status'         => $this->status,
            'appointment_id' => $this->appointment_id,
            'decline_reason' => $this->decline_reason,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
        ];
    }
}
