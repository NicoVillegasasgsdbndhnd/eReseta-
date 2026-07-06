<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class DispensePrescriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('pharmacist');
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],


            'items'                      => ['sometimes', 'array'],
            'items.*.id'                 => ['required_with:items', 'integer'],
            'items.*.dispensed_quantity' => ['required_with:items', 'integer', 'min:0'],

            'items.*.dispensed_brand_id' => ['nullable', 'integer', 'exists:medicine_brands,id'],
        ];
    }





    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $items = $this->input('items');
            if (! is_array($items) || $items === []) {
                return;
            }

            $prescription = $this->route('prescription');
            if (! $prescription) {
                return;
            }

            $ordered = $prescription->items()->get()->keyBy('id');
            $brands = \App\Models\MedicineBrand::whereIn('id', collect($items)->pluck('dispensed_brand_id')->filter()->all())
                ->get()->keyBy('id');

            foreach ($items as $i => $row) {
                $item = isset($row['id']) ? $ordered->get($row['id']) : null;
                if (! $item) {
                    $validator->errors()->add("items.$i.id", 'This item does not belong to the prescription.');
                    continue;
                }
                $qty = $row['dispensed_quantity'] ?? null;

                $remaining = max(0, (int) $item->quantity - (int) ($item->dispensed_quantity ?? 0));
                if (is_numeric($qty) && $qty > $remaining) {
                    $validator->errors()->add(
                        "items.$i.dispensed_quantity",
                        "Cannot dispense more than the remaining quantity ({$remaining}).",
                    );
                }

                $brandId = $row['dispensed_brand_id'] ?? null;
                if ($brandId && $item->medicine_id) {
                    $brand = $brands->get($brandId);
                    if ($brand && (int) $brand->medicine_id !== (int) $item->medicine_id) {
                        $validator->errors()->add("items.$i.dispensed_brand_id", 'This brand does not match the prescribed generic.');
                    }
                }
            }
        });
    }
}
