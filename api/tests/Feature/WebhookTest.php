<?php

namespace Tests\Feature;

use App\Enums\BillingStatus;
use App\Models\Appointment;
use App\Models\BillingRecord;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class WebhookTest extends TestCase
{
    private const SECRET = 'whsec_test_secret';

    public function test_valid_signature_marks_billing_paid(): void
    {
        config(['services.paymongo.webhook_secret' => self::SECRET]);
        $billing = $this->billing('link_paid_1');

        $response = $this->sendWebhook($this->paidPayload('link_paid_1'));

        $response->assertStatus(200);
        $billing->refresh();
        $this->assertSame(BillingStatus::Paid, $billing->status);
        $this->assertNotNull($billing->paid_at);
    }

    public function test_invalid_signature_is_rejected_and_billing_untouched(): void
    {
        config(['services.paymongo.webhook_secret' => self::SECRET]);
        $billing = $this->billing('link_bad_1');

        $ts        = (string) time();
        $badHeader = "t={$ts},te=deadbeef,li=deadbeef";
        $response  = $this->sendWebhook($this->paidPayload('link_bad_1'), $badHeader);

        $response->assertStatus(401);
        $this->assertSame(BillingStatus::Pending, $billing->refresh()->status);
    }

    public function test_unknown_link_id_is_acknowledged_without_changes(): void
    {
        config(['services.paymongo.webhook_secret' => self::SECRET]);
        $billing = $this->billing('link_known');

        $response = $this->sendWebhook($this->paidPayload('link_does_not_exist'));

        $response->assertStatus(200);
        $this->assertSame(BillingStatus::Pending, $billing->refresh()->status);
    }

    public function test_already_paid_record_is_not_reprocessed(): void
    {
        config(['services.paymongo.webhook_secret' => self::SECRET]);
        $paidAt  = now()->subDay();
        $billing = $this->billing('link_paid_already', BillingStatus::Paid, $paidAt);

        $response = $this->sendWebhook($this->paidPayload('link_paid_already'));

        $response->assertStatus(200);
        $billing->refresh();
        $this->assertSame(BillingStatus::Paid, $billing->status);
        $this->assertSame($paidAt->toDateTimeString(), $billing->paid_at->toDateTimeString());
    }

    private function billing(string $paymongoId, BillingStatus $status = BillingStatus::Pending, $paidAt = null): BillingRecord
    {
        ['patient' => $patient] = $this->makePatient();
        ['doctor' => $doctor]   = $this->makeDoctor();

        $appointment = Appointment::create([
            'patient_id'   => $patient->id,
            'doctor_id'    => $doctor->id,
            'scheduled_at' => now()->addDay(),
        ]);

        return BillingRecord::create([
            'patient_id'     => $patient->id,
            'appointment_id' => $appointment->id,
            'amount'         => 500.00,
            'status'         => $status,
            'paymongo_id'    => $paymongoId,
            'paid_at'        => $paidAt,
        ]);
    }

    private function paidPayload(string $linkId): array
    {
        return [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id'         => $linkId,
                        'attributes' => [],
                    ],
                ],
            ],
        ];
    }

    private function sendWebhook(array $payload, ?string $overrideSignature = null): TestResponse
    {
        $json = json_encode($payload);
        $ts   = (string) time();
        $hmac = hash_hmac('sha256', "{$ts}.{$json}", self::SECRET);

        $signature = $overrideSignature ?? "t={$ts},te={$hmac},li={$hmac}";

        return $this->call(
            'POST',
            '/api/webhooks/paymongo',
            [],
            [],
            [],
            ['HTTP_PAYMONGO_SIGNATURE' => $signature, 'CONTENT_TYPE' => 'application/json'],
            $json,
        );
    }
}
