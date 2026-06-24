<?php

namespace Tests\Feature;

use Tests\TestCase;

class PatientRecordTest extends TestCase
{
    public function test_doctor_sees_all_patient_records_cross_view(): void
    {
        ['user' => $doctorUserA, 'doctor' => $doctorA] = $this->makeDoctor();
        ['doctor' => $doctorB] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();

        // A record authored by doctor B.
        $this->makePatientRecord($patient->id, $doctorB->id);

        // Doctor A can still see it in the shared records hub.
        $this->actingAs($doctorUserA, 'sanctum')
             ->getJson('/api/patient-records')
             ->assertStatus(200)
             ->assertJsonCount(1, 'data');
    }

    public function test_patient_cannot_access_records_hub(): void
    {
        ['user' => $patientUser] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
             ->getJson('/api/patient-records')
             ->assertStatus(403);
    }

    public function test_records_hub_hides_restricted_records_from_staff(): void
    {
        $staff = $this->user('staff');
        ['doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $this->makePatientRecord($patient->id, $doctor->id);
        $restricted = $this->makePatientRecord($patient->id, $doctor->id);
        $restricted->update([
            'diagnosis' => 'Restricted diagnosis',
            'restriction_category' => 'mental_health',
        ]);

        $this->actingAs($staff, 'sanctum')
             ->getJson('/api/patient-records')
             ->assertStatus(200)
             ->assertJsonCount(1, 'data')
             ->assertJsonMissing(['diagnosis' => 'Restricted diagnosis']);
    }

    public function test_records_hub_allows_matching_specialist_to_view_restricted_records(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        $doctor->update(['specialization' => 'Psychiatry']);
        ['patient' => $patient] = $this->makePatient();
        $restricted = $this->makePatientRecord($patient->id, $doctor->id);
        $restricted->update([
            'diagnosis' => 'Restricted diagnosis',
            'restriction_category' => 'mental_health',
        ]);

        $this->actingAs($doctorUser, 'sanctum')
             ->getJson('/api/patient-records')
             ->assertStatus(200)
             ->assertJsonPath('data.0.diagnosis', 'Restricted diagnosis');
    }

    public function test_patient_can_view_only_their_own_chart(): void
    {
        ['user' => $patientUser, 'patient' => $patient] = $this->makePatient();
        ['patient' => $otherPatient] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
             ->getJson('/api/me/chart')
             ->assertStatus(200)
             ->assertJsonPath('patient.id', $patient->id);

        $this->actingAs($patientUser, 'sanctum')
             ->getJson("/api/patients/{$otherPatient->id}/chart")
             ->assertStatus(403);
    }

    public function test_doctor_can_edit_a_served_record(): void
    {
        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $this->actingAs($doctorUser, 'sanctum')
             ->putJson("/api/patient-records/{$record->id}", [
                 'chief_complaint' => 'Updated complaint',
                 'diagnosis'       => 'Updated diagnosis',
                 'notes'           => 'Revised after review.',
             ])
             ->assertStatus(200)
             ->assertJsonPath('diagnosis', 'Updated diagnosis');
    }
}
