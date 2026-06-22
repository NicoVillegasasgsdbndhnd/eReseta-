<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\PatientRecord;
use Tests\TestCase;

class PatientChartTest extends TestCase
{
    public function test_doctor_cannot_view_their_own_medical_record(): void
    {
        // A clinician who is also a registered patient (same user account).
        ['user' => $doctorUser] = $this->makeDoctor();
        $ownPatient = Patient::create([
            'user_id' => $doctorUser->id, 'dob' => '1980-01-01', 'sex' => 'male',
            'address' => 'Manila', 'contact' => '09170000000',
        ]);

        // They cannot self-access their own chart…
        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$ownPatient->id}/chart")
            ->assertStatus(403);

        // …but a different physician can.
        ['user' => $otherDoctor] = $this->makeDoctor();
        $this->actingAs($otherDoctor, 'sanctum')
            ->getJson("/api/patients/{$ownPatient->id}/chart")
            ->assertStatus(200);
    }

    public function test_doctor_can_read_chart_and_the_read_is_audited(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->makePatientRecord($patient->id, $doctor->id);

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200)
            ->assertJsonStructure(['patient', 'active_prescriptions', 'encounters', 'lab_imaging']);

        // Auditing on READ — the chart access must be logged.
        $this->assertDatabaseHas('audit_logs', [
            'user_id'     => $doctorUser->id,
            'action'      => 'READ',
            'target_type' => 'PatientChart',
            'target_id'   => $patient->id,
        ]);
    }

    public function test_pharmacist_cannot_read_chart(): void
    {
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($this->user('pharmacist'), 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403);
    }

    public function test_restricted_record_is_filtered_from_timeline_and_locked(): void
    {
        // A General-Medicine doctor is NOT an authorized specialist for mental-health data.
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $restricted = PatientRecord::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(), 'chief_complaint' => 'Anxiety',
            'diagnosis' => 'GAD', 'restriction_category' => 'mental_health',
        ]);

        $res = $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200);

        // Excluded from the main timeline…
        $this->assertEmpty(collect($res['encounters'])->firstWhere('id', $restricted->id));
        // …and present in restricted_files, locked, with clinical content withheld.
        $file = collect($res['restricted_files'])->firstWhere('id', $restricted->id);
        $this->assertNotNull($file);
        $this->assertTrue($file['locked']);
        $this->assertNull($file['record']);
    }

    public function test_matching_specialist_sees_restricted_record_unlocked(): void
    {
        $psychUser = $this->user('doctor');
        $psych = Doctor::create([
            'user_id' => $psychUser->id, 'specialization' => 'Psychiatry',
            'license_no' => 'PRC-PSY-1', 'prc_expiry' => now()->addYear()->toDateString(),
        ]);
        ['patient' => $patient] = $this->makePatient();
        $restricted = PatientRecord::create([
            'patient_id' => $patient->id, 'doctor_id' => $psych->id,
            'visit_date' => now()->toDateString(), 'chief_complaint' => 'Anxiety',
            'diagnosis' => 'GAD', 'restriction_category' => 'mental_health',
        ]);

        $res = $this->actingAs($psychUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200);

        $file = collect($res['restricted_files'])->firstWhere('id', $restricted->id);
        $this->assertFalse($file['locked']);
        $this->assertNotNull($file['record']);
    }

    public function test_patient_can_view_own_chart_but_not_restricted_data(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        $this->makePatientRecord($patient->id, $doctor->id);
        $restricted = PatientRecord::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(), 'chief_complaint' => 'Anxiety',
            'diagnosis' => 'GAD', 'restriction_category' => 'mental_health',
        ]);

        $res = $this->actingAs($patientUser, 'sanctum')
            ->getJson('/api/me/chart')
            ->assertStatus(200)
            ->assertJsonPath('patient.id', $patient->id);

        // Own normal encounter is present; restricted record is neither in the timeline nor listed.
        $this->assertNull(collect($res['encounters'])->firstWhere('id', $restricted->id));
        $this->assertEmpty($res['restricted_files']);
    }

    public function test_doctor_cannot_use_patient_self_chart(): void
    {
        ['user' => $doctorUser] = $this->makeDoctor();

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/me/chart')
            ->assertStatus(403);
    }

    public function test_rx_safety_returns_allergies_and_blocks_pharmacist(): void
    {
        ['user' => $doctorUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $patient->update(['known_allergies' => 'Penicillin']);

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/rx-safety")
            ->assertStatus(200)
            ->assertJsonPath('known_allergies', 'Penicillin')
            ->assertJsonPath('active_medications', []);

        $this->actingAs($this->user('pharmacist'), 'sanctum')
            ->getJson("/api/patients/{$patient->id}/rx-safety")
            ->assertStatus(403);
    }

    public function test_break_glass_reveals_content_and_is_audited(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $restricted = PatientRecord::create([
            'patient_id' => $patient->id, 'doctor_id' => $doctor->id,
            'visit_date' => now()->toDateString(), 'chief_complaint' => 'Anxiety',
            'diagnosis' => 'GAD', 'restriction_category' => 'mental_health',
        ]);

        // Too-short justification is rejected.
        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/patient-records/{$restricted->id}/break-glass", ['reason' => 'x'])
            ->assertStatus(422);

        // Valid justification reveals the content…
        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/patient-records/{$restricted->id}/break-glass", ['reason' => 'Emergency admission'])
            ->assertStatus(200)
            ->assertJsonPath('diagnosis', 'GAD');

        // …and is recorded in the audit trail with the justification.
        $this->assertDatabaseHas('audit_logs', [
            'user_id'     => $doctorUser->id,
            'action'      => 'BREAK_GLASS',
            'target_type' => 'PatientRecord',
            'target_id'   => $restricted->id,
            'context'     => 'Emergency admission',
        ]);
    }
}
