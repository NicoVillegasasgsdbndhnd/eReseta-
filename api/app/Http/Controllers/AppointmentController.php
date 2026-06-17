<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentStatusRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AppointmentController extends Controller
{
    public function __construct(private readonly AppointmentService $appointmentService) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $appointments = Appointment::with('patient.user', 'doctor.user')
            ->when($user->hasRole('patient'), fn ($q) =>
                $q->whereHas('patient', fn ($p) => $p->where('user_id', $user->id))
            )
            ->when($user->hasRole('doctor'), fn ($q) =>
                $q->whereHas('doctor', fn ($d) => $d->where('user_id', $user->id))
            )
            ->when($user->hasRole('staff'), fn ($q) =>
                $q->where('doctor_id', $user->assigned_doctor_id)
            )
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->date, fn ($q, $date) => $q->whereDate('scheduled_at', $date))
            ->latest('scheduled_at')
            ->paginate(20);

        return AppointmentResource::collection($appointments);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        // Doctors and pharmacists do not book appointments
        abort_if(
            $request->user()->hasRole('doctor') || $request->user()->hasRole('pharmacist'),
            403,
            'Unauthorized.'
        );

        $appointment = $this->appointmentService->create(
            $request->validated(),
            $request->user()
        );

        return response()->json(new AppointmentResource($appointment), 201);
    }

    public function show(Request $request, Appointment $appointment): AppointmentResource
    {
        $user = $request->user();

        if ($user->hasRole('patient')) {
            abort_if($appointment->patient?->user_id !== $user->id, 403, 'Unauthorized.');
        } elseif ($user->hasRole('doctor')) {
            abort_if($appointment->doctor?->user_id !== $user->id, 403, 'Unauthorized.');
        } elseif ($user->hasRole('staff')) {
            abort_if($appointment->doctor_id !== $user->assigned_doctor_id, 403, 'Unauthorized.');
        } elseif ($user->hasRole('pharmacist')) {
            abort(403, 'Unauthorized.');
        }

        return new AppointmentResource(
            $appointment->load('patient.user', 'doctor.user', 'statusHistories.changedByUser')
        );
    }

    public function updateStatus(UpdateAppointmentStatusRequest $request, Appointment $appointment): AppointmentResource
    {
        $user = $request->user();
        abort_if(
            $user->hasRole('patient') || $user->hasRole('pharmacist'),
            403,
            'Unauthorized.'
        );

        // Staff may only manage appointments for the doctor they're assigned to (mirrors show/index).
        abort_if(
            $user->hasRole('staff') && $appointment->doctor_id !== $user->assigned_doctor_id,
            403,
            'Unauthorized.'
        );

        $appointment = $this->appointmentService->updateStatus(
            $appointment,
            $request->validated(),
            $request->user()
        );

        return new AppointmentResource($appointment);
    }
}
