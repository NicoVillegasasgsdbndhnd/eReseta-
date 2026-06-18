<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiagnosticOrder extends Model
{
    protected $fillable = [
        'reference_no', 'patient_record_id', 'doctor_id', 'ordered_at', 'status', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'datetime',
        ];
    }

    public function patientRecord(): BelongsTo
    {
        return $this->belongsTo(PatientRecord::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DiagnosticOrderItem::class);
    }

    public static function generateReferenceNo(): string
    {
        $year  = now()->year;
        $count = static::whereYear('created_at', $year)->count() + 1;

        return sprintf('DX-%d-%04d', $year, $count);
    }
}
