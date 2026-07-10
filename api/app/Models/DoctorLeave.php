<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorLeave extends Model
{
    protected $fillable = ['doctor_id', 'date', 'start_time', 'end_time', 'reason'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    /** A leave with no start_time blocks the whole day; otherwise only [start_time, end_time). */
    public function isWholeDay(): bool
    {
        return $this->start_time === null;
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }
}
