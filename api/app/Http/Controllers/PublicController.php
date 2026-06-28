<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequestRequest;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

/**
 * Unauthenticated, public-facing endpoints for the landing site: browse doctors,
 * check a doctor's open slots, and submit a guest appointment request. Deliberately
 * exposes NO patient PII (availability returns only booked time strings).
 */
class PublicController extends Controller
{
    public function __construct(private readonly AppointmentService $appointments) {}

    /** Public doctor directory — name, specialization, bio only (no license/PRC). */
    public function doctors(): JsonResponse
    {
        $doctors = Doctor::with('user:id,name')->orderBy('id')->get()
            ->map(fn (Doctor $d): array => [
                'id'             => $d->id,
                'name'           => $d->user?->name,
                'specialization' => $d->specialization,
                'bio'            => $d->bio,
            ]);

        return response()->json(['data' => $doctors]);
    }

    /**
     * A doctor's occupied slots for a date + their upcoming leave dates, so the public
     * booking calendar can grey out taken times and blocked days. No patient PII.
     */
    public function doctorAvailability(Request $request, Doctor $doctor): JsonResponse
    {
        $request->validate(['date' => ['required', 'date']]);

        $booked = $doctor->appointments()
            ->whereDate('scheduled_at', $request->date)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($a): ?string => $a->scheduled_at?->format('H:i'))
            ->filter()
            ->values();

        $leaves = DoctorLeave::where('doctor_id', $doctor->id)
            ->whereDate('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->get()
            ->map(fn (DoctorLeave $l): string => $l->date instanceof \DateTimeInterface
                ? $l->date->format('Y-m-d')
                : (string) $l->date)
            ->values();

        return response()->json([
            'date'   => $request->date,
            'booked' => $booked,
            'leaves' => $leaves,
        ]);
    }

    /** Guest submits an appointment request (no account). Throttled at the route. */
    public function storeAppointmentRequest(StoreAppointmentRequestRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Reject taken slots / leave days up-front (same guards the authed booking uses).
        $this->appointments->assertDoctorNotOnLeave($data['doctor_id'], $data['preferred_date']);
        $this->appointments->assertSlotAvailable($data['doctor_id'], $data['preferred_date']);

        $appointmentRequest = AppointmentRequest::create([
            ...$data,
            'reference_no' => AppointmentRequest::generateReferenceNo(),
            'status'       => 'pending',
        ]);

        $appointmentRequest->load('doctor.user');

        // No email on submission — the guest sees the full confirmation on-screen.
        // An email is only sent once STAFF approve the request (AppointmentRequestApproved).
        return response()->json([
            'reference_no'       => $appointmentRequest->reference_no,
            'full_name'          => $appointmentRequest->full_name,
            'doctor'             => $appointmentRequest->doctor?->user?->name ?? 'your preferred doctor',
            'preferred_schedule' => $appointmentRequest->preferred_date?->format('l, F j, Y \a\t g:i A'),
            'message'            => 'Your appointment request has been received.',
        ], 201);
    }
}
