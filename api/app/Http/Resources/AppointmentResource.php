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
            'patient_id'   => $this->patient_id,
            'doctor_id'    => $this->doctor_id,
            // A guest appointment (approved request, not yet registered) has no patient row —
            // fall back to the snapshot captured at approval.
            'patient'      => $this->patient_id ? new PatientResource($this->whenLoaded('patient')) : null,
            'guest_name'   => $this->guest_name,
            'guest_contact' => $this->guest_contact,
            'display_name' => $this->displayName(),
            'is_guest'     => $this->patient_id === null,
            'doctor'       => new DoctorResource($this->whenLoaded('doctor')),
            // Wall-clock, no timezone designator: the appointment time is a clinic-local value, not a
            // UTC instant. Emitting "Y-m-dTH:i:s" (no "Z") makes the browser parse it as local time so
            // the displayed time matches what was booked instead of shifting by the UTC offset.
            'scheduled_at' => $this->scheduled_at?->format('Y-m-d\TH:i:s'),
            'status'       => $this->status?->value,
            // 'patient' | 'clinic' | null — drives the "Cancelled by patient/clinic" badge.
            'cancelled_by' => $this->cancellerType(),
            'type'         => $this->type,
            'notes'        => $this->notes,
            'created_at'   => $this->created_at,
            'updated_at'   => $this->updated_at,
        ];
    }

    /**
     * Who cancelled the appointment: a patient cancelling their own → 'patient'; a
     * doctor/staff/admin → 'clinic'. Null unless cancelled and the history is loaded.
     */
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
