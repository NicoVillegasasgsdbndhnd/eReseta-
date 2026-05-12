<?php

namespace App\Models;

use App\Enums\PrescriptionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prescription extends Model
{
    protected $fillable = [
        'reference_no', 'patient_record_id', 'doctor_id',
        'issued_at', 'status', 'blockchain_tx_id',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'status'    => PrescriptionStatus::class,
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
        return $this->hasMany(PrescriptionItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PrescriptionEvent::class)->orderBy('occurred_at');
    }

    public static function generateReferenceNo(): string
    {
        $year  = now()->year;
        $count = static::whereYear('created_at', $year)->count() + 1;

        return sprintf('RX-%d-%04d', $year, $count);
    }
}
