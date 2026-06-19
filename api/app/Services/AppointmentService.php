<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\AppointmentStatusHistory;
use App\Models\DoctorLeave;
use App\Models\User;
use App\Notifications\AppointmentBooked;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AppointmentService
{
    public function create(array $data, User $patient): Appointment
    {
        $this->assertDoctorNotOnLeave($data['doctor_id'], $data['scheduled_at']);
        $this->assertSlotAvailable($data['doctor_id'], $data['scheduled_at']);
        $this->assertPatientFree($patient->patient->id, $data['scheduled_at']);

        $appointment = DB::transaction(function () use ($data, $patient): Appointment {
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

        // Booking confirmation email (best-effort — never block a booking on mail failure).
        try {
            $appointment->patient?->user?->notify(new AppointmentBooked($appointment));
        } catch (\Throwable $e) {
            Log::warning('Appointment booking email failed', ['appointment' => $appointment->id, 'error' => $e->getMessage()]);
        }

        return $appointment;
    }

    /**
     * A doctor's time slot reserves automatically: reject a second active booking for the
     * same doctor at the same datetime (mentor review — "booking should auto-reserve").
     */
    private function assertSlotAvailable(int|string $doctorId, string $scheduledAt, ?int $ignoreId = null): void
    {
        $taken = Appointment::where('doctor_id', $doctorId)
            ->where('scheduled_at', Carbon::parse($scheduledAt))
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Served])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages([
                'scheduled_at' => ['That time slot is already reserved with this doctor. Please pick another.'],
            ]);
        }
    }

    /**
     * A patient can't be in two places at once: reject a second active booking for the same
     * patient at the same datetime, even with a different doctor.
     */
    private function assertPatientFree(int|string $patientId, string $scheduledAt, ?int $ignoreId = null): void
    {
        $busy = Appointment::where('patient_id', $patientId)
            ->where('scheduled_at', Carbon::parse($scheduledAt))
            ->whereNotIn('status', [AppointmentStatus::Cancelled, AppointmentStatus::Served])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($busy) {
            throw ValidationException::withMessages([
                'scheduled_at' => ['You already have an appointment at this date and time.'],
            ]);
        }
    }

    /**
     * Reject a booking on a day the doctor has blocked out as leave (mentor review —
     * "doctor/secretary can X out a date when the doctor is on leave").
     */
    private function assertDoctorNotOnLeave(int|string $doctorId, string $scheduledAt): void
    {
        $onLeave = DoctorLeave::where('doctor_id', $doctorId)
            ->whereDate('date', Carbon::parse($scheduledAt)->toDateString())
            ->exists();

        if ($onLeave) {
            throw ValidationException::withMessages([
                'scheduled_at' => ['The doctor is on leave that day. Please choose another date.'],
            ]);
        }
    }

    public function updateStatus(Appointment $appointment, array $data, User $actor): Appointment
    {
        return DB::transaction(function () use ($appointment, $data, $actor): Appointment {
            $previousStatus = $appointment->status;
            $newStatus      = AppointmentStatus::from($data['status']);

            $updates = ['status' => $newStatus];
            if ($newStatus === AppointmentStatus::Rescheduled && isset($data['scheduled_at'])) {
                $this->assertDoctorNotOnLeave($appointment->doctor_id, $data['scheduled_at']);
                $this->assertSlotAvailable($appointment->doctor_id, $data['scheduled_at'], $appointment->id);
                $this->assertPatientFree($appointment->patient_id, $data['scheduled_at'], $appointment->id);
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
