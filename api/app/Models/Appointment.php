<?php

namespace App\Models;

use App\Enums\AppointmentStatus;
use App\Enums\AppointmentType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    protected $fillable = [
        'patient_id', 'appointment_request_id', 'guest_name', 'guest_contact',
        'doctor_id', 'scheduled_at', 'status', 'type', 'notes', 'source_record_id',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'status'       => AppointmentStatus::class,
            'type'         => AppointmentType::class,
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    /** The consultation (patient record) this follow-up was created from, if any. */
    public function sourceRecord(): BelongsTo
    {
        return $this->belongsTo(PatientRecord::class, 'source_record_id');
    }

    public function appointmentRequest(): BelongsTo
    {
        return $this->belongsTo(AppointmentRequest::class);
    }

    /** Patient name when registered, else the guest snapshot taken at approval. */
    public function displayName(): ?string
    {
        return $this->patient?->user?->name ?? $this->guest_name;
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(AppointmentStatusHistory::class);
    }

    public function billingRecord(): HasOne
    {
        return $this->hasOne(BillingRecord::class);
    }
}
