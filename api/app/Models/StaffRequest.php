<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffRequest extends Model
{
    protected $fillable = ['staff_user_id', 'doctor_id', 'status'];

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'doctor_id');
    }
}
