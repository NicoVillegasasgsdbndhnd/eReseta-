<?php

namespace App\Http\Controllers;

use App\Enums\BillingStatus;
use App\Models\BillingRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function paymongo(Request $request): Response
    {
        $secret = config('services.paymongo.webhook_secret');

        if ($secret) {
            $signature = $request->header('Paymongo-Signature');

            if (! $this->verifySignature($request->getContent(), $signature, $secret)) {
                Log::warning('PayMongo webhook signature mismatch');
                return response('Unauthorized', 401);
            }
        }

        $event = $request->input('data.attributes.type');
        $data  = $request->input('data.attributes.data');

        if ($event === 'payment.paid') {
            $paymongoId = $data['attributes']['billing']['billing_details']['metadata']['link_id']
                ?? $data['attributes']['payment_method_used']
                ?? null;

            // Match by stored paymongo_id (the link ID returned when creating the link)
            $linkId = $request->input('data.attributes.data.id');
            $billing = BillingRecord::where('paymongo_id', $linkId)->first();

            if ($billing && $billing->status !== BillingStatus::Paid) {
                $billing->update([
                    'status'  => BillingStatus::Paid,
                    'paid_at' => now(),
                ]);

                Log::info("Billing #{$billing->id} marked paid via PayMongo webhook.");
            }
        }

        return response('OK', 200);
    }

    private function verifySignature(string $payload, ?string $signature, string $secret): bool
    {
        if (! $signature) {
            return false;
        }

        // PayMongo signature format: t=<timestamp>,te=<test_hmac>,li=<live_hmac>
        $parts = [];
        foreach (explode(',', $signature) as $part) {
            [$key, $value] = explode('=', $part, 2);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? '';
        $hmacKey   = app()->environment('production') ? ($parts['li'] ?? '') : ($parts['te'] ?? '');

        $expected = hash_hmac('sha256', "{$timestamp}.{$payload}", $secret);

        return hash_equals($expected, $hmacKey);
    }
}
