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
        $year   = now()->year;
        $prefix = sprintf('RX-%d-', $year);

        // Derive the next number from the highest existing reference, NOT a row count —
        // a count-based sequence hands out a number that's already taken when there are
        // gaps (deleted rows, seeded/imported data), causing a unique-constraint violation.
        $last = static::where('reference_no', 'like', $prefix . '%')
            ->orderByDesc('reference_no')
            ->value('reference_no');

        $next = $last === null ? 1 : ((int) substr($last, strlen($prefix))) + 1;

        return sprintf('%s%04d', $prefix, $next);
    }
}
