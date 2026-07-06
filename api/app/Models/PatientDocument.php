<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class PatientDocument extends Model
{
    protected $fillable = [
        'patient_id', 'category', 'original_name', 'path', 'mime', 'size', 'uploaded_by',
    ];

    public const CATEGORIES = [
        'id'        => 'Government ID',
        'insurance' => 'Insurance / HMO Card',
        'intake'    => 'Intake Form',
        'hipaa'     => 'HIPAA / Privacy Consent',
        'other'     => 'Other Document',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }


    public function url(): string
    {
        return Storage::disk('public')->url($this->path);
    }
}
