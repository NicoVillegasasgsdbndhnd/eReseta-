<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;










class PatientRecordAccess
{





    public function decide(User $user, Patient $patient): array
    {
        if ($user->hasRole('doctor')) {
            $doctorId = $user->doctor?->id;

            if ($doctorId && $this->hasCareRelationship($doctorId, $patient)) {
                return $this->allow('treatment');
            }
            if ($this->hasActiveGrant($user, $patient)) {
                return $this->allow('break_glass');
            }
            return [
                'allowed' => false,
                'mode'    => 'denied',
                'code'    => 'needs_break_glass',
                'message' => 'You are not the attending doctor for this patient. Use emergency Break-Glass access if clinically required.',
            ];
        }


        if ($user->hasRole('staff') || $user->hasRole('admin')) {
            if ($patient->hasGivenConsent()) {
                return $this->allow('consent');
            }
            return [
                'allowed' => false,
                'mode'    => 'denied',
                'code'    => 'needs_consent',
                'message' => "DPA consent is required before viewing this patient's records.",
            ];
        }

        return [
            'allowed' => false,
            'mode'    => 'denied',
            'code'    => null,
            'message' => 'Unauthorized.',
        ];
    }


    public function enforce(User $user, Patient $patient): string
    {
        $decision = $this->decide($user, $patient);

        abort_if(! $decision['allowed'], response()->json([
            'message'     => $decision['message'],
            'reason_code' => $decision['code'],
        ], 403));

        return $decision['mode'];
    }





    public function hasCareRelationship(int $doctorId, Patient $patient): bool
    {
        $hasAppointment = Appointment::where('patient_id', $patient->id)
            ->where('doctor_id', $doctorId)
            ->where('status', '!=', 'cancelled')
            ->exists();

        return $hasAppointment || $patient->records()->where('doctor_id', $doctorId)->exists();
    }

    public function hasActiveGrant(User $user, Patient $patient): bool
    {
        return $patient->accessGrants()
            ->active()
            ->where('doctor_user_id', $user->id)
            ->exists();
    }

    private function allow(string $mode): array
    {
        return ['allowed' => true, 'mode' => $mode, 'code' => null, 'message' => null];
    }
}
