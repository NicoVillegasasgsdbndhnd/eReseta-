<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PatientRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'patient_id'      => $this->patient_id,
            'doctor_id'       => $this->doctor_id,
            'patient'         => new PatientResource($this->whenLoaded('patient')),
            'doctor'          => new DoctorResource($this->whenLoaded('doctor')),
            'visit_date'      => $this->visit_date?->toDateString(),
            'chief_complaint' => $this->chief_complaint,
            'diagnosis'       => $this->diagnosis,
            'notes'           => $this->notes,
            'prescriptions'   => PrescriptionResource::collection($this->whenLoaded('prescriptions')),
            'diagnostic_orders' => DiagnosticOrderResource::collection($this->whenLoaded('diagnosticOrders')),
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
        ];
    }
}
