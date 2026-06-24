<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PatientDocumentTest extends TestCase
{
    public function test_staff_can_upload_and_list_a_patient_document(): void
    {
        Storage::fake('public');
        ['patient' => $patient] = $this->makePatient();
        $staff = $this->user('staff');

        $file = UploadedFile::fake()->create('hmo-card.pdf', 120, 'application/pdf');

        $this->actingAs($staff, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/documents", [
                'file'     => $file,
                'category' => 'insurance',
            ])
            ->assertStatus(201)
            ->assertJsonPath('category_label', 'Insurance / HMO Card');

        $this->assertDatabaseHas('patient_documents', [
            'patient_id'    => $patient->id,
            'category'      => 'insurance',
            'original_name' => 'hmo-card.pdf',
        ]);

        $this->actingAs($staff, 'sanctum')
            ->getJson("/api/patients/{$patient->id}/documents")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_patient_cannot_upload_documents(): void
    {
        Storage::fake('public');
        ['patient' => $patient, 'user' => $patientUser] = $this->makePatient();

        $this->actingAs($patientUser, 'sanctum')
            ->postJson("/api/patients/{$patient->id}/documents", [
                'file'     => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
                'category' => 'id',
            ])
            ->assertStatus(403);
    }

    public function test_upload_rejects_disallowed_file_type(): void
    {
        Storage::fake('public');
        ['patient' => $patient] = $this->makePatient();

        $this->actingAs($this->user('staff'), 'sanctum')
            ->postJson("/api/patients/{$patient->id}/documents", [
                'file'     => UploadedFile::fake()->create('malware.exe', 10, 'application/x-msdownload'),
                'category' => 'id',
            ])
            ->assertStatus(422);
    }
}
