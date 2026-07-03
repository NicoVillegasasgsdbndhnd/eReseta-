<?php

namespace Tests\Feature;

use Tests\TestCase;

class FollowUpTest extends TestCase
{
    public function test_doctor_schedules_follow_up_from_the_consultation_note(): void
    {
        ['user' => $docUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $at = now()->addWeeks(2)->setTime(10, 30)->format('Y-m-d H:i:s');

        $recordId = $this->actingAs($docUser, 'sanctum')
            ->postJson('/api/patient-records', [
                'patient_id'       => $patient->id,
                'visit_date'       => now()->toDateString(),
                'chief_complaint'  => 'BP check',
                'diagnosis'        => 'Hypertension',
                'follow_up_at'     => $at,
                'follow_up_reason' => 'Re-check BP',
            ])
            ->assertStatus(201)
            ->json('id');

        $this->assertDatabaseHas('appointments', [
            'patient_id'       => $patient->id,
            'doctor_id'        => $doctor->id,
            'type'             => 'follow_up',
            'source_record_id' => $recordId,
            'notes'            => 'Re-check BP',
        ]);
    }

    public function test_record_without_follow_up_creates_no_appointment(): void
    {
        ['user' => $docUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($docUser, 'sanctum')
            ->postJson('/api/patient-records', [
                'patient_id'      => $patient->id,
                'visit_date'      => now()->toDateString(),
                'chief_complaint' => 'Cough',
                'diagnosis'       => 'URTI',
            ])
            ->assertStatus(201);

        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_staff_creates_follow_up_for_their_assigned_doctor(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);
        $at = now()->addWeek()->setTime(9, 0)->format('Y-m-d H:i:s');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/follow-ups', [
                'patient_id'   => $patient->id,
                'scheduled_at' => $at,
                'reason'       => 'Wound check',
            ])
            ->assertStatus(201)
            ->assertJsonPath('type', 'follow_up')
            ->assertJsonPath('doctor_id', $doctor->id);

        $this->assertDatabaseHas('appointments', [
            'patient_id' => $patient->id,
            'doctor_id'  => $doctor->id,
            'type'       => 'follow_up',
            'notes'      => 'Wound check',
        ]);
    }

    public function test_double_booking_the_same_slot_is_rejected(): void
    {
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $a] = $this->makePatient();
        ['patient' => $b] = $this->makePatient();
        $staff = $this->user('staff', ['assigned_doctor_id' => $doctor->id]);
        $at = now()->addWeek()->setTime(9, 0)->format('Y-m-d H:i:s');

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/follow-ups', ['patient_id' => $a->id, 'scheduled_at' => $at])
            ->assertStatus(201);

        $this->actingAs($staff, 'sanctum')
            ->postJson('/api/follow-ups', ['patient_id' => $b->id, 'scheduled_at' => $at])
            ->assertStatus(422)
            ->assertJsonValidationErrors('scheduled_at');
    }

    public function test_patient_cannot_create_a_follow_up(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor] = $this->makeDoctor();

        $this->actingAs($patientUser, 'sanctum')
            ->postJson('/api/follow-ups', [
                'patient_id'   => $patient->id,
                'doctor_id'    => $doctor->id,
                'scheduled_at' => now()->addWeek()->setTime(9, 0)->format('Y-m-d H:i:s'),
            ])
            ->assertStatus(403);
    }
}
