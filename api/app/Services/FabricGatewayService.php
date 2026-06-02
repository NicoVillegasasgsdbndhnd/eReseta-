<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Thin HTTP client for the Node.js Fabric gateway (blockchain/gateway).
 *
 * The gateway proxies to the Hyperledger Fabric chaincode and returns a
 * { txId } for each lifecycle transaction. Only opaque internal IDs and the
 * drug list travel to the (private) ledger — no patient PII.
 *
 * Each method throws on a non-2xx response so the calling queued job can retry.
 */
class FabricGatewayService
{
    /** POST /prescription — records the ISSUED event, returns the anchor tx id. */
    public function issue(Prescription $rx): string
    {
        $drugList = $rx->items
            ->map(fn ($item) => [
                'drug'   => $item->drug_name,
                'dosage' => $item->dosage,
                'qty'    => $item->quantity,
            ])
            ->values()
            ->toJson();

        return $this->send('post', '/prescription', [
            'prescriptionId' => $rx->reference_no,
            'patientId'      => (string) $rx->patient_record_id,
            'doctorId'       => (string) $rx->doctor_id,
            'issuedAt'       => $rx->issued_at->toIso8601String(),
            'drugList'       => $drugList,
        ]);
    }

    /** PUT /prescription/{ref}/verify — appends the VERIFIED event. */
    public function verify(Prescription $rx, User $pharmacist): string
    {
        return $this->send('put', "/prescription/{$rx->reference_no}/verify", [
            'pharmacistId' => (string) $pharmacist->id,
            'verifiedAt'   => now()->toIso8601String(),
        ]);
    }

    /** PUT /prescription/{ref}/dispense — appends the DISPENSED event. */
    public function dispense(Prescription $rx, User $pharmacist): string
    {
        return $this->send('put', "/prescription/{$rx->reference_no}/dispense", [
            'pharmacistId' => (string) $pharmacist->id,
            'dispensedAt'  => now()->toIso8601String(),
        ]);
    }

    private function send(string $method, string $path, array $payload): string
    {
        $response = $this->client()->{$method}($path, $payload)->throw();

        return (string) $response->json('txId');
    }

    private function client(): PendingRequest
    {
        return Http::baseUrl(config('services.fabric.gateway_url'))
            ->timeout((int) config('services.fabric.timeout'))
            ->acceptJson();
    }
}
