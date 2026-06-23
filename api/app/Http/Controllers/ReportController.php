<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Prescription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function appointments(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can access reports.');

        $request->validate([
            'from' => ['nullable', 'date'],
            'to'   => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = Appointment::with('patient.user', 'doctor.user')
            ->when($request->from, fn ($q, $d) => $q->whereDate('scheduled_at', '>=', $d))
            ->when($request->to,   fn ($q, $d) => $q->whereDate('scheduled_at', '<=', $d))
            ->when($request->doctor_id, fn ($q, $id) => $q->where('doctor_id', $id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s));

        $appointments = $query->latest('scheduled_at')->get();

        $summary = [
            'total'       => $appointments->count(),
            'by_status'   => $appointments->groupBy(fn ($a) => $a->status->value)->map->count(),
            'by_type'     => $appointments->groupBy(fn ($a) => $a->type->value)->map->count(),
            'served_rate' => $appointments->count()
                ? round($appointments->filter(fn ($a) => $a->status->value === 'served')->count() / $appointments->count() * 100, 1)
                : 0,
        ];

        return response()->json([
            'summary'      => $summary,
            'appointments' => $appointments->map(fn ($a) => [
                'id'           => $a->id,
                'patient'      => $a->patient?->user?->name,
                'doctor'       => $a->doctor?->user?->name,
                'scheduled_at' => $a->scheduled_at?->format('Y-m-d\TH:i:s'), // wall-clock, no TZ (see AppointmentResource)
                'status'       => $a->status,
                'type'         => $a->type,
            ]),
        ]);
    }

    public function prescriptions(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can access reports.');

        $request->validate([
            'from' => ['nullable', 'date'],
            'to'   => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $prescriptions = Prescription::with('patientRecord.patient.user', 'doctor.user', 'items')
            ->when($request->from, fn ($q, $d) => $q->whereDate('issued_at', '>=', $d))
            ->when($request->to,   fn ($q, $d) => $q->whereDate('issued_at', '<=', $d))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest('issued_at')
            ->get();

        return response()->json([
            'summary' => [
                'total'     => $prescriptions->count(),
                'by_status' => $prescriptions->groupBy(fn ($rx) => $rx->status->value)->map->count(),
            ],
            'prescriptions' => $prescriptions->map(fn ($rx) => [
                'reference_no' => $rx->reference_no,
                'patient'      => $rx->patientRecord?->patient?->user?->name,
                'doctor'       => $rx->doctor?->user?->name,
                'items_count'  => $rx->items->count(),
                'status'       => $rx->status,
                'issued_at'    => $rx->issued_at,
            ]),
        ]);
    }
}
