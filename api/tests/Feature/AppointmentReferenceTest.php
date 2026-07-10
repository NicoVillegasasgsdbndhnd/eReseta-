<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Notifications\AppointmentBooked;
use Illuminate\Notifications\AnonymousNotifiable;
use Tests\TestCase;

class AppointmentReferenceTest extends TestCase
{
    public function test_appointment_gets_reference_no_and_email_includes_it(): void
    {
        ['doctor' => $doctor]   = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $appt = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->assertNotNull($appt->reference_no);
        $this->assertStringStartsWith('APT-', $appt->reference_no);

        $appt2 = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDays(2),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);
        $this->assertNotSame($appt->reference_no, $appt2->reference_no);

        $appt->load('doctor.user');
        $mail = (new AppointmentBooked($appt))->toMail(new AnonymousNotifiable());
        $this->assertStringContainsString($appt->reference_no, implode(' ', $mail->introLines));
    }
}
