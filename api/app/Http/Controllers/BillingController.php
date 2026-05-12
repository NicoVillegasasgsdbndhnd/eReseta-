<?php

namespace App\Http\Controllers;

use App\Http\Resources\BillingRecordResource;
use App\Models\BillingRecord;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BillingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $records = BillingRecord::with('patient.user', 'appointment')
            ->when($user->hasRole('patient'), fn ($q) =>
                $q->whereHas('patient', fn ($p) => $p->where('user_id', $user->id))
            )
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
