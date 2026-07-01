<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\PatientConsent;
use Tests\TestCase;

/**
 * RA 10173 records-access gate (PatientChartController): doctors need a care relationship (or
 * break-glass); staff/admin need DPA consent. Hard-gated.
 */
class RecordAccessTest extends TestCase
{
    private function appointmentBetween(int $doctorId, int $patientId, string $status = 'confirmed'): Appointment
    {
        return Appointment::create([
            'patient_id'   => $patientId,
            'doctor_id'    => $doctorId,
            'scheduled_at' => now(),
            'status'       => $status,
            'type'         => 'consultation',
        ]);
    }

    // ── Doctor (treatment basis) ─────────────────────────────────────────────
    public function test_doctor_with_appointment_can_view_chart(): void
    {
        ['user' => $docUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->appointmentBetween($doctor->id, $patient->id);

        $this->actingAs($docUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200);
    }

    public function test_doctor_without_appointment_is_blocked_with_break_glass_code(): void
    {
        ['user' => $docUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($docUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403)
            ->assertJsonPath('reason_code', 'needs_break_glass');
    }

    public function test_cancelled_appointment_does_not_grant_doctor_access(): void
    {
        ['user' => $docUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->appointmentBetween($doctor->id, $patient->id, 'cancelled');

        $this->actingAs($docUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403)
            ->assertJsonPath('reason_code', 'needs_break_glass');
    }

    // ── Break-glass ──────────────────────────────────────────────────────────
    public function test_doctor_can_break_glass_then_view_chart(): void
    {
        ['user' => $docUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        // Blocked first
        $this->actingAs($docUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403);

        // Break the glass with a justification
        $this->actingAs($docUser, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'ER unconscious patient; urgent allergy history required.'])
            ->assertStatus(201);

        // Now access is granted, and the override is logged as an un-deletable alert
        $this->actingAs($docUser, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $docUser->id, 'action' => 'BREAK_GLASS', 'target_id' => $patient->id,
        ]);
        $this->assertDatabaseHas('record_access_grants', [
            'patient_id' => $patient->id, 'doctor_user_id' => $docUser->id,
        ]);
    }

    public function test_break_glass_requires_a_reason(): void
    {
        ['user' => $docUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($docUser, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_non_doctor_cannot_break_glass(): void
    {
        $staff = $this->user('staff');
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'trying to bypass consent'])
            ->assertStatus(403);
    }

    // ── Non-doctor (consent basis) ───────────────────────────────────────────
    public function test_staff_without_consent_is_blocked(): void
    {
        $staff = $this->user('staff');
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403)
            ->assertJsonPath('reason_code', 'needs_consent');
    }

    public function test_staff_with_given_consent_can_view(): void
    {
        $staff = $this->user('staff');
        ['patient' => $patient] = $this->makePatient();
        $patient->consents()->create(['status' => 'given', 'recorded_by' => $staff->id, 'recorded_at' => now()]);

        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(200);
    }

    public function test_withdrawn_consent_blocks_again(): void
    {
        $staff = $this->user('staff');
        ['patient' => $patient] = $this->makePatient();
        $patient->consents()->create(['status' => 'given', 'recorded_by' => $staff->id, 'recorded_at' => now()->subDay()]);
        $patient->consents()->create(['status' => 'withdrawn', 'recorded_by' => $staff->id, 'recorded_at' => now()]);

        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403)
            ->assertJsonPath('reason_code', 'needs_consent');
    }

    // ── Recording consent ────────────────────────────────────────────────────
    public function test_staff_can_record_consent(): void
    {
        $staff = $this->user('staff');
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/consent", ['status' => 'given', 'notes' => 'Patient present, verbal consent.'])
            ->assertStatus(201)
            ->assertJsonPath('status', 'given');

        $this->assertDatabaseHas('patient_consents', [
            'patient_id' => $patient->id, 'status' => 'given', 'recorded_by' => $staff->id,
        ]);
        // The capture itself is audited (not just the reads it enables).
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $staff->id, 'action' => 'CONSENT_GIVEN', 'target_id' => $patient->id,
        ]);
    }

    public function test_patient_cannot_record_consent(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/consent", ['status' => 'given'])
            ->assertStatus(403);
    }

    // ── Admin alerts ─────────────────────────────────────────────────────────
    public function test_admin_can_review_break_glass_alerts_but_staff_cannot(): void
    {
        ['user' => $docUser] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->actingAs($docUser, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/break-glass", ['reason' => 'Emergency access for ER allergy check.'])
            ->assertStatus(201);

        $this->actingAs($this->user('admin'), 'sanctum')
            ->getJson('/api/break-glass-alerts')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->actingAs($this->user('staff'), 'sanctum')
            ->getJson('/api/break-glass-alerts')
            ->assertStatus(403);
    }

    // ── Patient privacy portal ───────────────────────────────────────────────
    public function test_patient_can_view_and_withdraw_own_consent_reblocking_staff(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff');
        $patient->consents()->create(['status' => 'given', 'recorded_by' => $staff->id, 'recorded_at' => now()]);

        // With consent given, staff can view.
        $this->actingAs($staff, 'sanctum')->getJson("/api/patients/{$patient->id}/chart")->assertStatus(200);

        // Patient sees their consent…
        $this->actingAs($patientUser, 'sanctum')->getJson('/api/me/consent')
            ->assertStatus(200)->assertJsonPath('current.status', 'given');

        // …and withdraws it themselves.
        $this->actingAs($patientUser, 'sanctum')->postJson('/api/me/consent/withdraw')
            ->assertStatus(201)->assertJsonPath('status', 'withdrawn');

        // Staff is now re-blocked.
        $this->actingAs($staff, 'sanctum')->getJson("/api/patients/{$patient->id}/chart")
            ->assertStatus(403)->assertJsonPath('reason_code', 'needs_consent');
    }

    public function test_privacy_log_lists_accesses_to_own_record(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff');
        $patient->consents()->create(['status' => 'given', 'recorded_by' => $staff->id, 'recorded_at' => now()]);
        $this->actingAs($staff, 'sanctum')->getJson("/api/patients/{$patient->id}/chart")->assertStatus(200);

        $this->actingAs($patientUser, 'sanctum')->getJson('/api/me/privacy-log')
            ->assertStatus(200)
            ->assertJsonFragment(['action' => 'READ']); // the staff read shows in the patient's log
    }

    public function test_non_patient_cannot_use_privacy_portal(): void
    {
        $this->actingAs($this->user('staff'), 'sanctum')->getJson('/api/me/consent')->assertStatus(403);
    }
}
