<?php

namespace Tests\Feature;

use App\Models\Patient;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PatientEncryptionTest extends TestCase
{
    public function test_patient_pii_is_encrypted_at_rest(): void
    {
        ['patient' => $patient] = $this->makePatient();
        $patient->update([
            'address'       => '123 Rizal St, Antipolo City',
            'contact'       => '09171234567',
            'philhealth_no' => '12-345678901-2',
        ]);

        $raw = DB::table('patients')->where('id', $patient->id)->first();

        // Stored ciphertext must not equal the plaintext.
        $this->assertNotSame('123 Rizal St, Antipolo City', $raw->address);
        $this->assertNotSame('09171234567', $raw->contact);
        $this->assertNotSame('12-345678901-2', $raw->philhealth_no);
        // Laravel encrypted payloads are base64 JSON envelopes.
        $this->assertStringContainsString('"iv"', base64_decode($raw->address));
    }

    public function test_model_decrypts_pii_transparently(): void
    {
        ['patient' => $patient] = $this->makePatient();
        $patient->update(['philhealth_no' => '99-999999999-9']);

        $fresh = Patient::find($patient->id);

        $this->assertSame('99-999999999-9', $fresh->philhealth_no);
        $this->assertSame(
            hash_hmac('sha256', '99-999999999-9', config('app.key')),
            DB::table('patients')->where('id', $patient->id)->value('philhealth_no_hash'),
        );
    }

    public function test_duplicate_philhealth_no_is_rejected_via_blind_index(): void
    {
        $admin = $this->user('admin');

        ['patient' => $existing] = $this->makePatient();
        $existing->update(['philhealth_no' => '11-111111111-1']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/patients', [
            'name'          => 'Juan Dela Cruz',
            'email'         => 'juan.new@example.com',
            'password'      => 'Str0ng#Pass1',
            'dob'           => '1995-05-05',
            'sex'           => 'male',
            'address'       => 'Somewhere',
            'contact'       => '09170000000',
            'philhealth_no' => '11-111111111-1',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('philhealth_no');
    }
}
