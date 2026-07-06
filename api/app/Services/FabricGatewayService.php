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
