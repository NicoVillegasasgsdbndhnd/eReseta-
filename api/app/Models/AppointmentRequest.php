<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentRequest extends Model
{
    protected $fillable = [
        'reference_no', 'full_name', 'dob', 'sex', 'mobile', 'email',
        'doctor_id', 'preferred_date', 'reason', 'status', 'appointment_id', 'decline_reason',
    ];

    protected function casts(): array
    {
        return [
            'dob'            => 'date',
            'preferred_date' => 'datetime',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public static function generateReferenceNo(): string
    {
        $year  = now()->year;
        $count = static::whereYear('created_at', $year)->count() + 1;

        return sprintf('REQ-%d-%04d', $year, $count);
    }
}
