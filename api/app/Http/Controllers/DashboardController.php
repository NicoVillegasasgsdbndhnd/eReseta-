<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = match (true) {
            $user->hasRole('admin')      => $this->adminSummary(),
            $user->hasRole('doctor')     => $this->doctorSummary($user),
            $user->hasRole('pharmacist') => $this->pharmacistSummary(),
            $user->hasRole('patient')    => $this->patientSummary($user),
            default                      => [],
        };

        return response()->json($data);
    }

    public function appointmentStats(): JsonResponse
    {
        $stats = Appointment::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $byDoctor = Appointment::with('doctor.user')
            ->selectRaw('doctor_id, count(*) as count')
            ->groupBy('doctor_id')
            ->get()
            ->map(fn ($a) => [
                'doctor' => $a->doctor?->user?->name,
                'count'  => $a->count,
            ]);

        return response()->json([
            'by_status' => $stats,
            'by_doctor' => $byDoctor,
        ]);
    }

    public function prescriptionActivity(): JsonResponse
    {
        $stats = Prescription::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $recent = Prescription::with('doctor.user', 'patientRecord.patient.user')
            ->latest('issued_at')
            ->limit(10)
            ->get();

        return response()->json([
            'by_status' => $stats,
            'recent'    => $recent->map(fn ($rx) => [
                'reference_no' => $rx->reference_no,
                'patient'      => $rx->patientRecord?->patient?->user?->name,
                'doctor'       => $rx->doctor?->user?->name,
                'status'       => $rx->status,
                'issued_at'    => $rx->issued_at,
            ]),
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can view audit logs.');

        $logs = AuditLog::with('user.roles')
            ->when($request->action, fn ($q, $a) => $q->where('action', $a))
            ->latest()
            ->paginate(50);




        $logs->getCollection()->transform(function (AuditLog $log) {
            if ($log->user) {
                $log->user->setAttribute('role', $log->user->getRoleNames()->first());
                $log->user->unsetRelation('roles');
            }

            return $log;
        });

        return response()->json($logs);
    }



    private function adminSummary(): array
    {
        return [
            'total_appointments_today'  => Appointment::whereDate('scheduled_at', today())->count(),
            'pending_verifications'      => Prescription::where('status', 'issued')->count(),
            'new_patients_this_week'     => Patient::where('created_at', '>=', now()->startOfWeek())->count(),
            'total_patients'             => Patient::count(),
            'appointment_status_breakdown' => Appointment::selectRaw('status, count(*) as count')
                ->groupBy('status')->pluck('count', 'status'),
        ];
    }

    private function doctorSummary(mixed $user): array
    {
        $doctorId = $user->doctor?->id;

        return [
            'todays_appointments'  => Appointment::where('doctor_id', $doctorId)
                ->whereDate('scheduled_at', today())->count(),
            'pending_appointments' => Appointment::where('doctor_id', $doctorId)
                ->whereIn('status', ['scheduled', 'confirmed'])->count(),
            'prescriptions_issued' => Prescription::where('doctor_id', $doctorId)->count(),
        ];
    }

    private function pharmacistSummary(): array
    {
        return [
            'awaiting_verification' => Prescription::where('status', 'issued')->count(),
            'ready_to_dispense'     => Prescription::where('status', 'verified')->count(),
            'dispensed_today'       => Prescription::where('status', 'dispensed')
                ->whereDate('updated_at', today())->count(),
        ];
    }

    private function patientSummary(mixed $user): array
    {
        $patientId = $user->patient?->id;

        return [
            'upcoming_appointments' => Appointment::where('patient_id', $patientId)
                ->whereIn('status', ['scheduled', 'confirmed'])
                ->where('scheduled_at', '>=', now())->count(),
            'total_prescriptions'   => Prescription::whereHas('patientRecord',
                fn ($q) => $q->where('patient_id', $patientId))->count(),
            'pending_bills'         => \App\Models\BillingRecord::where('patient_id', $patientId)
                ->where('status', 'pending')->count(),
        ];
    }
}
