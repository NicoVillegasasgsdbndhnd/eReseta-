<?php

namespace App\Http\Controllers;

use App\Models\StaffRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffRequestController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;

        if (! $doctor) {
            return response()->json(['data' => []]);
        }

        $requests = StaffRequest::with('staffUser')
            ->where('doctor_id', $doctor->id)
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id'         => $r->id,
                'status'     => $r->status,
                'created_at' => $r->created_at,
                'staff_user' => [
                    'id'    => $r->staffUser->id,
                    'name'  => $r->staffUser->name,
                    'email' => $r->staffUser->email,
                ],
            ]);

        return response()->json(['data' => $requests]);
    }


    public function approve(Request $request, StaffRequest $staffRequest): JsonResponse
    {
        $this->authorizeDoctor($request, $staffRequest);

        $staffRequest->update(['status' => 'approved']);

        return response()->json(['message' => 'Staff request approved.']);
    }


    public function reject(Request $request, StaffRequest $staffRequest): JsonResponse
    {
        $this->authorizeDoctor($request, $staffRequest);

        $staffRequest->update(['status' => 'rejected']);



        $staffRequest->staffUser->tokens()->delete();

        return response()->json(['message' => 'Staff request rejected.']);
    }

    private function authorizeDoctor(Request $request, StaffRequest $staffRequest): void
    {
        $doctor = $request->user()->doctor;
        abort_if(! $doctor || $doctor->id !== $staffRequest->doctor_id, 403);
    }
}
