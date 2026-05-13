<?php

namespace App\Http\Controllers;

use App\Enums\BillingStatus;
use App\Http\Resources\BillingRecordResource;
use App\Models\BillingRecord;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BillingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $records = BillingRecord::with('patient.user', 'appointment')
            ->when($user->hasRole('patient'), fn ($q) =>
                $q->whereHas('patient', fn ($p) => $p->where('user_id', $user->id))
            )
            ->when($request->patient_id, fn ($q, $id) => $q->where('patient_id', $id))
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(20);

        return BillingRecordResource::collection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'patient_id'     => ['required', 'exists:patients,id'],
            'appointment_id' => ['required', 'exists:appointments,id'],
            'amount'         => ['required', 'numeric', 'min:0'],
        ]);

        $record = BillingRecord::create($request->only('patient_id', 'appointment_id', 'amount'));

        return response()->json(
            new BillingRecordResource($record->load('patient.user', 'appointment')),
            201
        );
    }

    public function paymentLink(BillingRecord $billingRecord): JsonResponse
    {
        if ($billingRecord->status === BillingStatus::Paid) {
            return response()->json(['message' => 'Billing record is already paid.'], 422);
        }

        $secretKey = config('services.paymongo.secret_key');

        if (! $secretKey) {
            return response()->json(['message' => 'PayMongo is not configured.'], 503);
        }

        $amountInCentavos = (int) round((float) $billingRecord->amount * 100);

        $response = Http::withBasicAuth($secretKey, '')
            ->post('https://api.paymongo.com/v1/links', [
                'data' => [
                    'attributes' => [
                        'amount'      => $amountInCentavos,
                        'description' => "DEAMHI Billing #{$billingRecord->id}",
                        'currency'    => 'PHP',
                    ],
                ],
            ]);

        if (! $response->successful()) {
            Log::error('PayMongo link creation failed', ['response' => $response->json()]);
            return response()->json(['message' => 'Failed to create payment link.'], 502);
        }

        $data = $response->json('data');
        $billingRecord->update(['paymongo_id' => $data['id']]);

        return response()->json([
            'checkout_url' => $data['attributes']['checkout_url'],
            'paymongo_id'  => $data['id'],
        ]);
    }

    public function markPaid(BillingRecord $billingRecord): BillingRecordResource
    {
        $billingRecord->update([
            'status'  => BillingStatus::Paid,
            'paid_at' => now(),
        ]);

        return new BillingRecordResource($billingRecord->fresh('patient.user', 'appointment'));
    }

    public function summary(Patient $patient): JsonResponse
    {
        $records = $patient->billingRecords()->get();

        return response()->json([
            'total'   => $records->sum('amount'),
            'paid'    => $records->where('status', 'paid')->sum('amount'),
            'pending' => $records->where('status', 'pending')->sum('amount'),
            'waived'  => $records->where('status', 'waived')->sum('amount'),
            'count'   => $records->count(),
        ]);
    }
}
