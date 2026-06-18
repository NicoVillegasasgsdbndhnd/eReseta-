<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDiagnosticOrderRequest;
use App\Http\Resources\DiagnosticOrderResource;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiagnosticOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');

        $orders = DiagnosticOrder::with('doctor.user', 'items')
            ->when($user->hasRole('patient'), fn ($q) =>
                $q->whereHas('patientRecord.patient', fn ($p) => $p->where('user_id', $user->id))
            )
            ->when($request->patient_record_id, fn ($q, $id) =>
                $q->where('patient_record_id', $id)
            )
            ->latest('ordered_at')
            ->paginate(20);

        return DiagnosticOrderResource::collection($orders);
    }

    public function store(StoreDiagnosticOrderRequest $request): JsonResponse
    {
        $user = $request->user();
        $doctorId = $user->doctor?->id;
        abort_if(! $doctorId, 422, 'Only a doctor profile can order diagnostics.');

        $data = $request->validated();

        $order = DB::transaction(function () use ($data, $doctorId): DiagnosticOrder {
            $order = DiagnosticOrder::create([
                'reference_no'      => DiagnosticOrder::generateReferenceNo(),
                'patient_record_id' => $data['patient_record_id'],
                'doctor_id'         => $doctorId,
                'ordered_at'        => now(),
                'status'            => 'ordered',
                'notes'             => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                DiagnosticOrderItem::create([
                    'diagnostic_order_id' => $order->id,
                    'diagnostic_test_id'  => $item['diagnostic_test_id'] ?? null,
                    'test_name'           => $item['test_name'],
                    'clinical_reason'     => $item['clinical_reason'] ?? null,
                ]);
            }

            return $order;
        });

        return response()->json(
            new DiagnosticOrderResource($order->load('doctor.user', 'items')),
            201
        );
    }

    public function show(Request $request, DiagnosticOrder $diagnosticOrder): DiagnosticOrderResource
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if(
                $diagnosticOrder->patientRecord?->patient?->user_id !== $user->id,
                403,
                'Unauthorized.'
            );
        }

        return new DiagnosticOrderResource(
            $diagnosticOrder->load('doctor.user', 'items', 'patientRecord.patient.user')
        );
    }

    /** Mark an order completed/cancelled (doctor, staff, or admin). */
    public function updateStatus(Request $request, DiagnosticOrder $diagnosticOrder): DiagnosticOrderResource
    {
        $user = $request->user();
        abort_if($user->hasRole('patient') || $user->hasRole('pharmacist'), 403, 'Unauthorized.');

        $validated = $request->validate([
            'status' => ['required', 'in:ordered,completed,cancelled'],
        ]);

        if ($user->hasRole('staff')) {
            abort_if($diagnosticOrder->doctor_id !== $user->assigned_doctor_id, 403, 'Unauthorized.');
        }

        $diagnosticOrder->update(['status' => $validated['status']]);

        return new DiagnosticOrderResource($diagnosticOrder->load('doctor.user', 'items'));
    }
}
