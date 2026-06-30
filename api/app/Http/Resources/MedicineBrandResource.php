<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineBrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'medicine_id'   => $this->medicine_id,
            'brand_name'    => $this->brand_name,
            'hospital_code' => $this->hospital_code,
            'strength'      => $this->strength,
            'dosage_form'   => $this->dosage_form,
            'packaging'     => $this->packaging,
            'is_available'  => $this->is_available,
        ];
    }
}
