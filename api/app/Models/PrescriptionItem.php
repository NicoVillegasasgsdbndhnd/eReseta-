<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionItem extends Model
{
    protected $fillable = [
        'prescription_id', 'drug_name', 'medicine_id', 'dosage',
        'quantity', 'quantity_unit', 'dispensed_quantity',
        'dispensed_brand_id', 'dispensed_brand_name',
        'frequency', 'duration', 'instructions',
    ];

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    /** The generic this item was prescribed from (strict generics-only catalog). */
    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }

    /** The actual brand the pharmacist dispensed. */
    public function dispensedBrand(): BelongsTo
    {
        return $this->belongsTo(MedicineBrand::class, 'dispensed_brand_id');
    }
}
