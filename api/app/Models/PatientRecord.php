<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientRecord extends Model
{
    protected $fillable = [
        'patient_id', 'doctor_id', 'visit_date', 'chief_complaint', 'diagnosis', 'notes',
        'restriction_category', 'restricted_specialization',
    ];


    public const RESTRICTIONS = [
        'mental_health'     => 'Mental Health / Psychotherapy',
        'genetic'           => 'Genetic Testing',
        'substance_abuse'   => 'Substance Abuse Treatment',
        'vip'               => 'VIP / Break-Glass',
        'patient_requested' => 'Patient-Requested Restriction',
    ];


    public const RESTRICTION_SPECIALIZATIONS = [
        'mental_health'     => ['Psychiatry', 'Psychology'],
        'genetic'           => ['Genetics', 'Medical Genetics'],
        'substance_abuse'   => ['Addiction Medicine', 'Psychiatry'],
        'vip'               => [],
        'patient_requested' => [],
    ];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
        ];
    }


    public function restrictionLabel(): ?string
    {
        return $this->restriction_category
            ? (self::RESTRICTIONS[$this->restriction_category] ?? 'Restricted')
            : null;
    }






    public function viewableBy(?Doctor $doctor): bool
    {
        if (! $this->restriction_category) {
            return true;
        }
        if (! $doctor) {
            return false;
        }

        $allowed = $this->restricted_specialization
            ? [$this->restricted_specialization]
            : (self::RESTRICTION_SPECIALIZATIONS[$this->restriction_category] ?? []);

        return in_array($doctor->specialization, $allowed, true);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class);
    }
}
