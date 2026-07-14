<?php

namespace App\Services;

use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;










class FabricGatewayService
{

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


    public function verify(Prescription $rx, User $pharmacist): string
    {
        return $this->send('put', "/prescription/{$rx->reference_no}/verify", [
            'pharmacistId' => (string) $pharmacist->id,
            'verifiedAt'   => now()->toIso8601String(),
        ]);
    }


    public function dispense(Prescription $rx, User $pharmacist): string
    {
        return $this->send('put', "/prescription/{$rx->reference_no}/dispense", [
            'pharmacistId' => (string) $pharmacist->id,
            'dispensedAt'  => now()->toIso8601String(),
        ]);
    }

    /**
     * Is this prescription already recorded on the ledger?
     *
     * Used to make ledger writes idempotent: if an issue fails with a generic endorsement
     * error, we check here whether the prescription is genuinely already on-chain (a duplicate)
     * versus a real transient failure.
     */
    public function exists(string $referenceNo): bool
    {
        $response = $this->client()->get("/prescription/{$referenceNo}");

        if ($response->successful()) {
            return true;
        }

        // The gateway wraps a chaincode "not found" as an HTTP 500 with the message in the body.
        if (str_contains((string) $response->body(), 'not found')) {
            return false;
        }

        // Any other non-2xx is a real error (gateway/peer down, etc.) — surface it.
        $response->throw();

        return false;
    }

    private function send(string $method, string $path, array $payload): string
    {
        $response = $this->client()->{$method}($path, $payload)->throw();

        return (string) $response->json('txId');
    }

    private function client(): PendingRequest
    {
        $request = Http::baseUrl(config('services.fabric.gateway_url'))
            ->timeout((int) config('services.fabric.timeout'))
            ->acceptJson();

        $token = config('services.fabric.token');
        if (is_string($token) && $token !== '') {
            return $request->withHeader('X-Fabric-Gateway-Token', $token);
        }

        return $request;
    }
}
