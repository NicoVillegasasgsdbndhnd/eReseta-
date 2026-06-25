<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PrescriptionBlockchainTest extends TestCase
{
    /** @return array{drug_name:string,dosage:string,quantity:int,frequency:string,duration:string,instructions:string} */
    private function item(): array
    {
        return [
            'drug_name'    => 'Amoxicillin',
            'dosage'       => '500mg',
            'quantity'     => 21,
            'frequency'    => 'Three times daily',
            'duration'     => '7 days',
            'instructions' => 'Complete the full course.',
        ];
    }

    public function test_lifecycle_records_tx_ids_when_blockchain_enabled(): void
    {
        config([
            'services.fabric.enabled'     => true,
            'services.fabric.gateway_url' => 'http://gateway.test',
            'services.fabric.token'       => 'test-fabric-token',
        ]);

        Http::fake([
            'gateway.test/*' => Http::sequence()
                ->push(['txId' => 'tx_issued'])
                ->push(['txId' => 'tx_verified'])
                ->push(['txId' => 'tx_dispensed']),
        ]);

        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record     = $this->makePatientRecord($patient->id, $doctor->id);
        $pharmacist = $this->user('pharmacist');

        $rxId = $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/prescriptions', [
                'patient_record_id' => $record->id,
                'items'             => [$this->item()],
            ])
            ->assertStatus(201)
            ->json('id');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/verify")
            ->assertStatus(200);

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/dispense")
            ->assertStatus(200);

        // The ISSUED tx anchors the prescription (the field the UI panel keys on).
        $this->assertDatabaseHas('prescriptions', [
            'id'               => $rxId,
            'blockchain_tx_id' => 'tx_issued',
        ]);

        foreach (['ISSUED' => 'tx_issued', 'VERIFIED' => 'tx_verified', 'DISPENSED' => 'tx_dispensed'] as $type => $tx) {
            $this->assertDatabaseHas('prescription_events', [
                'prescription_id'  => $rxId,
                'event_type'       => $type,
                'blockchain_tx_id' => $tx,
            ]);
        }

        Http::assertSentCount(3);
        Http::assertSent(fn ($request) => $request->hasHeader('X-Fabric-Gateway-Token', 'test-fabric-token'));
    }

    public function test_no_ledger_calls_when_blockchain_disabled(): void
    {
        // BLOCKCHAIN_ENABLED is false in phpunit.xml.
        Http::fake();

        ['user' => $doctorUser, 'doctor' => $doctor] = $this->makeDoctor();
        ['patient' => $patient] = $this->makePatient();
        $record = $this->makePatientRecord($patient->id, $doctor->id);

        $rxId = $this->actingAs($doctorUser, 'sanctum')
            ->postJson('/api/prescriptions', [
                'patient_record_id' => $record->id,
                'items'             => [$this->item()],
            ])
            ->assertStatus(201)
            ->json('id');

        Http::assertNothingSent();

        $this->assertDatabaseHas('prescriptions', [
            'id'               => $rxId,
            'blockchain_tx_id' => null,
        ]);
    }
}
