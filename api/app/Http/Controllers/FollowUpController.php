<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFollowUpRequest;
use App\Http\Resources\AppointmentResource;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;





class FollowUpController extends Controller
{
    public function __construct(private readonly AppointmentService $appointments) {}

    public function store(StoreFollowUpRequest $request): JsonResponse
    {
        $appointment = $this->appointments->createFollowUp($request->validated(), $request->user());

        return response()->json(new AppointmentResource($appointment), 201);
    }
}
