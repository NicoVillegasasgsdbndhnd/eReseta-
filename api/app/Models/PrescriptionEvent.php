<?php

namespace App\Models;

use App\Enums\PrescriptionEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionEvent extends Model
{
    protected $fillable = [
        'prescription_id', 'event_type', 'actor_id', 'occurred_at', 'blockchain_tx_id',
    ];

    protected function casts(): array
    {
        return [
            'event_type'  => PrescriptionEventType::class,
            'occurred_at' => 'datetime',
        ];
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
