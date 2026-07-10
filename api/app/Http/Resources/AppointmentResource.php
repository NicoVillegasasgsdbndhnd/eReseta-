<?php

namespace App\Http\Resources;

use App\Enums\AppointmentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'reference_no' => $this->reference_no,
            'patient_id'   => $this->patient_id,
            'doctor_id'    => $this->doctor_id,


            'patient'      => $this->patient_id ? new PatientResource($this->whenLoaded('patient')) : null,
            'guest_name'   => $this->guest_name,
            'guest_contact' => $this->guest_contact,
            'display_name' => $this->displayName(),
            'is_guest'     => $this->patient_id === null,
            'doctor'       => new DoctorResource($this->whenLoaded('doctor')),



            'scheduled_at' => $this->scheduled_at?->format('Y-m-d\TH:i:s'),
            'status'       => $this->status?->value,

            'cancelled_by' => $this->cancellerType(),
            'type'         => $this->type,
            'source_record_id' => $this->source_record_id,
            'notes'        => $this->notes,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }





    private function cancellerType(): ?string
    {
        if ($this->status !== AppointmentStatus::Cancelled || ! $this->relationLoaded('statusHistories')) {
            return null;
        }

        $user = $this->statusHistories
            ->where('to_status', AppointmentStatus::Cancelled)
            ->sortByDesc('created_at')
            ->first()?->changedByUser;

        return $user ? ($user->hasRole('patient') ? 'patient' : 'clinic') : null;
    }
}
