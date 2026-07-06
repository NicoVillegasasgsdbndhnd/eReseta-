<?php

namespace App\Http\Controllers;

use App\Enums\PrescriptionStatus;
use App\Http\Requests\DispensePrescriptionRequest;
use App\Http\Requests\StorePrescriptionRequest;
use App\Http\Resources\PrescriptionResource;
use App\Models\Prescription;
use App\Services\PrescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class PrescriptionController extends Controller
{
    public function __construct(private readonly PrescriptionService $prescriptionService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();



        abort_if($user->hasRole('staff'), 403, 'Unauthorized.');

        $prescriptions = Prescription::with('patientRecord.patient.user', 'doctor.user', 'items')
            ->when($user->hasRole('doctor'), fn ($q) =>
                $q->whereHas('doctor', fn ($d) => $d->where('user_id', $user->id))
            )
            ->when($user->hasRole('patient'), fn ($q) =>
                $q->whereHas('patientRecord.patient', fn ($p) => $p->where('user_id', $user->id))
            )
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->latest('issued_at')
            ->paginate(20);

        return PrescriptionResource::collection($prescriptions);
    }

    public function store(StorePrescriptionRequest $request): JsonResponse
    {
        abort_if(
            ! $request->user()->hasRole('doctor') && ! $request->user()->hasRole('admin'),
            403,
            'Only doctors can issue prescriptions.'
        );

        $rx = $this->prescriptionService->create($request->validated(), $request->user());

        return response()->json(new PrescriptionResource($rx), 201);
    }

    public function show(Request $request, Prescription $prescription): PrescriptionResource
    {
        $user = $request->user();
        abort_if($user->hasRole('staff'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if(
                $prescription->patientRecord?->patient?->user_id !== $user->id,
                403,
                'Unauthorized.'
            );
        }

        return new PrescriptionResource(
            $prescription->load('patientRecord.patient.user', 'doctor.user', 'items', 'events.actor')
        );
    }

    public function verify(DispensePrescriptionRequest $request, Prescription $prescription): PrescriptionResource
    {
        abort_if(! $request->user()->hasRole('pharmacist'), 403, 'Only pharmacists can verify prescriptions.');

        if ($prescription->status !== PrescriptionStatus::Issued) {
            throw ValidationException::withMessages([
                'status' => ['Prescription must be in issued status to verify.'],
            ]);
        }

        return new PrescriptionResource(
            $this->prescriptionService->verify($prescription, $request->user())
        );
    }

    public function dispense(DispensePrescriptionRequest $request, Prescription $prescription): PrescriptionResource
    {
        abort_if(! $request->user()->hasRole('pharmacist'), 403, 'Only pharmacists can dispense prescriptions.');

        if ($prescription->status !== PrescriptionStatus::Verified) {
            throw ValidationException::withMessages([
                'status' => ['Prescription must be verified before dispensing.'],
            ]);
        }

        return new PrescriptionResource(
            $this->prescriptionService->dispense($prescription, $request->user(), $request->input('items', []))
        );
    }
}
