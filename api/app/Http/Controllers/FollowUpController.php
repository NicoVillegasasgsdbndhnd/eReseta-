<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFollowUpRequest;
use App\Http\Resources\AppointmentResource;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;

/**
 * Staff/admin path for booking a follow-up appointment (the doctor's own path lives in
 * PatientRecordController::store). Reuses the appointment slot/leave/patient conflict checks.
 */
class FollowUpController extends Controller
{
    public function __construct(private readonly AppointmentService $appointments) {}

    public function store(StoreFollowUpRequest $request): JsonResponse
    {
        $appointment = $this->appointments->createFollowUp($request->validated(), $request->user());

        return response()->json(new AppointmentResource($appointment), 201);
    }
}
