<?php

namespace App\Enums;

enum AppointmentType: string
{
    case Consultation = 'consultation';
    case FollowUp     = 'follow_up';
    // Emergency removed (mentor review 2026-06-18). Patients book consultations only;
    // follow-ups are created for the patient by a doctor/staff during a consultation.
}
