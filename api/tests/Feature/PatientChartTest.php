<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\PatientRecord;
use Tests\TestCase;

class PatientChartTest extends TestCase
{
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
