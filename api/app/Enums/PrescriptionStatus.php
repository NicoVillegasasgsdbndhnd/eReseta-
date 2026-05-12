<?php

namespace App\Enums;

enum PrescriptionStatus: string
{
    case Issued    = 'issued';
    case Verified  = 'verified';
    case Dispensed = 'dispensed';
    case Expired   = 'expired';
}
