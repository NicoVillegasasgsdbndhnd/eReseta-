<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MedicineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'generic_name' => $this->generic_name,
            'dosage_form'  => $this->dosage_form,
            'is_available' => $this->is_available,

            'strengths'    => $this->whenLoaded('brands', fn () =>
                $this->brands->pluck('strength')->filter()->unique()->values()
            ),
            'brand_count'  => $this->whenLoaded('brands', fn () => $this->brands->count()),
            'brands'       => MedicineBrandResource::collection($this->whenLoaded('brands')),
        ];
    }
}
