<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Scheduled   = 'scheduled';
    case Confirmed   = 'confirmed';
    case Served      = 'served';
    case Rescheduled = 'rescheduled';
    case Cancelled   = 'cancelled';
}
