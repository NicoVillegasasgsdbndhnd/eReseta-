<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DoctorResource extends JsonResource
{
    /**
     * When true, the printed prescriber credentials (PRC/PTR/S2/PAN + signature) are included
     * regardless of the viewer's role — set via asPrescriber() when this doctor is the prescriber
     * on a prescription the viewer is entitled to (e.g. a patient viewing their own Rx, which by
     * law must show the prescriber's license numbers and signature). HR/personal data stays gated.
     */
    protected bool $asPrescriber = false;

    public function asPrescriber(): static
    {
        $this->asPrescriber = true;

        return $this;
    }

    /**
     * Access-permissions matrix (mentor revision). Fields are exposed by the *viewer's* role:
     *  - PATIENT (and any authenticated viewer): public-facing profile — name, specialty,
     *    affiliations, HMO partners, clinic room/email/secretary, available days, base fees.
     *  - STAFF / DOCTOR / PHARMACIST (clinical): + government credentials (PRC/PAN/S2), HR
     *    identity, department/consultant type, and all fees (inpatient / ER referral).
     *  - ADMIN only: + TIN (tax / payroll).
     */
    public function toArray(Request $request): array
    {
        $user       = $request->user();
        $isAdmin    = (bool) $user?->hasRole('admin');
        $isClinical = $user && ($isAdmin
            || $user->hasRole('staff')
            || $user->hasRole('doctor')
            || $user->hasRole('pharmacist'));

        // ── Tier 1 — visible to everyone (incl. patients) ──
        $data = [
            'id'                           => $this->id,
            'user_id'                      => $this->user_id,
            'user'                         => new UserResource($this->whenLoaded('user')),
            'specialization'               => $this->specialization,
            'bio'                          => $this->bio,
            'suffix'                       => $this->suffix,
            'profile_photo'                => $this->profile_photo,
            'medical_society_affiliations' => $this->medical_society_affiliations ?? [],
            'hmo_partners'                 => $this->hmo_partners ?? [],
            'clinic_room_no'               => $this->clinic_room_no,
            'clinic_email'                 => $this->clinic_email,
            'secretary_phone'              => $this->secretary_phone,
            'clinic_available_days'        => $this->clinic_available_days ?? [],
            'consultation_fee'             => $this->consultation_fee,
            'followup_fee'                 => $this->followup_fee,
            'created_at'                   => $this->created_at,
            'updated_at'                   => $this->updated_at,
        ];

        // ── Tier 2a — printed prescriber credentials (PRC/PTR/S2/PAN + signature) ──
        // Clinical viewers always; otherwise only when this doctor is the prescriber on a
        // prescription the viewer owns (asPrescriber) — they appear on the legal Rx document.
        if ($isClinical || $this->asPrescriber) {
            $data += [
                'license_no'               => $this->license_no,        // PRC
                'prc_expiry'               => $this->prc_expiry?->toDateString(),
                'ptr_no'                   => $this->ptr_no,
                's2_license'               => $this->s2_license,        // PDEA S2
                'philhealth_accreditation' => $this->philhealth_accreditation, // PAN
                'signature'                => $this->signature,
                'signature_image'          => $this->signature_image
                    ? Storage::disk('public')->url($this->signature_image)
                    : null,
            ];
        }

        // ── Tier 2b — HR identity + extended fees (clinical staff only, never patients) ──
        if ($isClinical) {
            $data += [
                'gender'                   => $this->gender,
                'date_of_birth'            => $this->date_of_birth?->toDateString(),
                'corporate_email'          => $this->corporate_email,
                'secure_phone'             => $this->secure_phone,
                'trunkline_ext'            => $this->trunkline_ext,
                'hospital_department'      => $this->hospital_department,
                'consultant_type'          => $this->consultant_type,
                'inpatient_fee'            => $this->inpatient_fee,
                'er_referral_fee'          => $this->er_referral_fee,
            ];
        }

        // ── Tier 3 — admin only (tax / payroll) ──
        if ($isAdmin) {
            $data['tin'] = $this->tin;
        }

        return $data;
    }
}
