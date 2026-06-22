<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends Model
{
    protected $fillable = [
        'user_id', 'license_no', 'specialization', 'prc_expiry',
        'ptr_no', 's2_license', 'signature', 'signature_image',
        // Identity & contact
        'suffix', 'gender', 'date_of_birth', 'corporate_email', 'secure_phone',
        'secretary_phone', 'clinic_email', 'trunkline_ext', 'profile_photo',
        // Government credentials
        'philhealth_accreditation', 'tin',
        // Specialization & affiliations
        'hospital_department', 'consultant_type', 'clinic_room_no',
        'medical_society_affiliations', 'hmo_partners', 'clinic_available_days',
        // Fees
        'consultation_fee', 'followup_fee', 'inpatient_fee', 'er_referral_fee',
    ];

    protected function casts(): array
    {
        return [
            'prc_expiry'                   => 'date',
            'date_of_birth'                => 'date',
            'medical_society_affiliations' => 'array',
            'hmo_partners'                 => 'array',
            'clinic_available_days'        => 'array',
            'consultation_fee'             => 'decimal:2',
            'followup_fee'                 => 'decimal:2',
            'inpatient_fee'                => 'decimal:2',
            'er_referral_fee'              => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function leaves(): HasMany
    {
        return $this->hasMany(DoctorLeave::class);
    }

    public function patientRecords(): HasMany
    {
        return $this->hasMany(PatientRecord::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }
}
