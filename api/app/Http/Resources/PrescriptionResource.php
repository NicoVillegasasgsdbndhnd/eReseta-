<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'reference_no'      => $this->reference_no,
            'patient_record_id' => $this->patient_record_id,
            'doctor_id'         => $this->doctor_id,
            'patient_record'    => new PatientRecordResource($this->whenLoaded('patientRecord')),
            'doctor'            => new DoctorResource($this->whenLoaded('doctor')),
            'items'             => PrescriptionItemResource::collection($this->whenLoaded('items')),
            'events'            => PrescriptionEventResource::collection($this->whenLoaded('events')),
            'issued_at'         => $this->issued_at,
            'status'            => $this->status?->value,
            'blockchain_tx_id'  => $this->blockchain_tx_id,
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
        ];
    }
}
