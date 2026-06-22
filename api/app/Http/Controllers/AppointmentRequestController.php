<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Enums\AppointmentType;
use App\Http\Resources\AppointmentRequestResource;
use App\Models\Appointment;
use App\Models\AppointmentRequest;
use App\Models\AppointmentStatusHistory;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AppointmentRequestController extends Controller
{
    public function __construct(private readonly AppointmentService $appointments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorizeStaff($request);

        $requests = AppointmentRequest::with('doctor.user')
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate(30);

        return AppointmentRequestResource::collection($requests);
    }

    /** Approve a pending request → create a real (guest) appointment that occupies the slot. */
    public function approve(Request $request, AppointmentRequest $appointmentRequest): JsonResponse
    {
        $this->authorizeStaff($request);
        abort_if($appointmentRequest->status !== 'pending', 422, 'Only a pending request can be approved.');

        $preferred = $appointmentRequest->preferred_date->format('Y-m-d H:i:s');
        $this->appointments->assertDoctorNotOnLeave($appointmentRequest->doctor_id, $preferred);
        $this->appointments->assertSlotAvailable($appointmentRequest->doctor_id, $preferred);

        DB::transaction(function () use ($appointmentRequest, $preferred, $request): void {
            $appointment = Appointment::create([
                'patient_id'             => null,
                'appointment_request_id' => $appointmentRequest->id,
                'guest_name'             => $appointmentRequest->full_name,
                'guest_contact'          => $appointmentRequest->mobile,
                'doctor_id'              => $appointmentRequest->doctor_id,
                'scheduled_at'           => $preferred,
                'type'                   => AppointmentType::Consultation,
                'status'                 => AppointmentStatus::Scheduled,
            ]);

            AppointmentStatusHistory::create([
                'appointment_id' => $appointment->id,
                'from_status'    => null,
                'to_status'      => AppointmentStatus::Scheduled,
                'changed_by'     => $request->user()->id,
            ]);

            $appointmentRequest->update([
                'status'         => 'approved',
                'appointment_id' => $appointment->id,
            ]);
        });

        return response()->json(
            new AppointmentRequestResource($appointmentRequest->fresh('doctor.user')),
            200
        );
    }

    public function decline(Request $request, AppointmentRequest $appointmentRequest): JsonResponse
    {
        $this->authorizeStaff($request);
        abort_if($appointmentRequest->status !== 'pending', 422, 'Only a pending request can be declined.');

        $validated = $request->validate(['decline_reason' => ['nullable', 'string', 'max:500']]);

        $appointmentRequest->update([
            'status'         => 'declined',
            'decline_reason' => $validated['decline_reason'] ?? null,
        ]);

        return response()->json(
            new AppointmentRequestResource($appointmentRequest->fresh('doctor.user')),
            200
        );
    }

    private function authorizeStaff(Request $request): void
    {
        abort_if(
            ! $request->user()->hasRole('admin') && ! $request->user()->hasRole('staff'),
            403,
            'Only staff or administrators can manage appointment requests.'
        );
    }
}
