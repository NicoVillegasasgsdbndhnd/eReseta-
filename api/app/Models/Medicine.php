<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Medicine extends Model
{
    protected $fillable = [
        'generic_name', 'brand_name', 'dosage_form', 'strength', 'route', 'is_available',
    ];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
        ];
    }


    public function brands(): HasMany
    {
        return $this->hasMany(MedicineBrand::class);
    }
}
