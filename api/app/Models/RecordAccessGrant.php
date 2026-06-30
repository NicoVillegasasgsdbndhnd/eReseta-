<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecordAccessGrant extends Model
{
    protected $fillable = [
        'patient_id', 'doctor_user_id', 'reason', 'granted_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'granted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** Grants that have not yet expired. */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('expires_at', '>', now());
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }
}
