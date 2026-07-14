<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Notifications\AppointmentBooked;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\DB;
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

    /**
     * Production had appointments predating the reference column. Numbering must continue
     * past whatever the backfill issued instead of colliding with it.
     */
    public function test_new_appointments_continue_after_backfilled_references(): void
    {
        ['doctor' => $doctor]   = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $year = now()->year;

        // Two rows as the backfill would have left them, plus one it could not reach.
        foreach (["APT-{$year}-0001", "APT-{$year}-0002", null] as $ref) {
            DB::table('appointments')->insert([
                'reference_no' => $ref,
                'patient_id'   => $patient->id,
                'doctor_id'    => $doctor->id,
                'scheduled_at' => now()->addDay(),
                'status'       => 'scheduled',
                'type'         => 'consultation',
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }

        // A count-based sequence would return 0003 here and then collide on the next one.
        $next = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDays(3),
            'status'       => 'scheduled',
            'type'         => 'consultation',
        ]);

        $this->assertSame("APT-{$year}-0003", $next->reference_no);

        $refs = Appointment::whereNotNull('reference_no')->pluck('reference_no');
        $this->assertCount($refs->unique()->count(), $refs, 'reference numbers must be unique');
    }
}
