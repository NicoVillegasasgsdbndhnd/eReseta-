<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AppointmentService
{
    public function create(array $data, User $patient): Appointment
    {
        return DB::transaction(function () use ($data, $patient): Appointment {
            $appointment = Appointment::create([
                'patient_id'   => $patient->patient->id,
                'doctor_id'    => $data['doctor_id'],
                'scheduled_at' => $data['scheduled_at'],
                'type'         => $data['type'],
                'notes'        => $data['notes'] ?? null,
                'status'       => AppointmentStatus::Scheduled,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status'    => null,
                'to_status'      => AppointmentStatus::Scheduled,
                'changed_by'     => $patient->id,
            ]);

            return $appointment->load('patient.user', 'doctor.user');
        });
    }

    public function updateStatus(Appointment $appointment, array $data, User $actor): Appointment
    {
        return DB::transaction(function () use ($appointment, $data, $actor): Appointment {
            $previousStatus = $appointment->status;
            $newStatus      = AppointmentStatus::from($data['status']);

            $updates = ['status' => $newStatus];
            if ($newStatus === AppointmentStatus::Rescheduled && isset($data['scheduled_at'])) {
                $updates['scheduled_at'] = $data['scheduled_at'];
            }

            $appointment->update($updates);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status'    => $previousStatus,
                'to_status'      => $newStatus,
                'changed_by'     => $actor->id,
                'notes'          => $data['notes'] ?? null,
            ]);

            return $appointment->fresh('patient.user', 'doctor.user');
        });
    }
}
