<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Patient extends Model
{
    protected $fillable = [
        'user_id', 'dob', 'sex', 'address', 'philhealth_no', 'contact',
        'preferred_language', 'known_allergies',
        'gov_id_type', 'gov_id_no', 'hmo_provider', 'hmo_policy_no', 'hmo_group_no', 'copay',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
    ];

    protected function casts(): array
    {
        return [
            'dob'             => 'date',
            'address'         => 'encrypted',
            'contact'         => 'encrypted',
            'philhealth_no'   => 'encrypted',

            'gov_id_no'       => 'encrypted',
            'known_allergies' => 'encrypted',
        ];
    }

    protected static function booted(): void
    {



        static::saving(function (Patient $patient): void {
            $patient->philhealth_no_hash = static::hashPhilhealth($patient->philhealth_no);
        });
    }

    public static function hashPhilhealth(?string $value): ?string
    {
        return $value === null || $value === ''
            ? null
            : hash_hmac('sha256', $value, config('app.key'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function records(): HasMany
    {
        return $this->hasMany(PatientRecord::class);
    }

    public function prescriptions(): HasManyThrough
    {
        return $this->hasManyThrough(Prescription::class, PatientRecord::class);
    }

    public function diagnosticOrders(): HasManyThrough
    {
        return $this->hasManyThrough(DiagnosticOrder::class, PatientRecord::class);
    }

    public function billingRecords(): HasMany
    {
        return $this->hasMany(BillingRecord::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PatientDocument::class);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(PatientConsent::class)->latest('recorded_at');
    }

    public function accessGrants(): HasMany
    {
        return $this->hasMany(RecordAccessGrant::class);
    }


    public function currentConsent(): ?PatientConsent
    {
        return $this->consents()->first();
    }


    public function hasGivenConsent(): bool
    {
        return $this->currentConsent()?->status === 'given';
    }
}
