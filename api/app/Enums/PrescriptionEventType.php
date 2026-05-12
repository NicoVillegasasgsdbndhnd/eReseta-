<?php

namespace App\Enums;

enum PrescriptionEventType: string
{
    case Issued    = 'ISSUED';
    case Verified  = 'VERIFIED';
    case Dispensed = 'DISPENSED';
}
