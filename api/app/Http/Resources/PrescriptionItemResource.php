<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrescriptionItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'prescription_id' => $this->prescription_id,
            'drug_name'       => $this->drug_name,
            'dosage'          => $this->dosage,
            'quantity'           => $this->quantity,
            'quantity_unit'      => $this->quantity_unit,
            'dispensed_quantity' => $this->dispensed_quantity,
            'frequency'       => $this->frequency,
            'duration'        => $this->duration,
            'instructions'    => $this->instructions,
        ];
    }
}
