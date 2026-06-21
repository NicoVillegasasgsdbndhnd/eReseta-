<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticOrderResource;
use App\Http\Resources\PatientRecordResource;
use App\Http\Resources\ProcedureResource;
use App\Models\AuditLog;
use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only consolidated patient chart for the Patient Records tab.
 * Every access is audited (healthcare "auditing on read" requirement).
 */
class PatientChartController extends Controller
{
    public function show(Request $request, Patient $patient): JsonResponse
    {
        $user = $request->user();
        abort_if($user->hasRole('patient') || $user->hasRole('pharmacist'), 403, 'Unauthorized.');

        // ── Auditing on READ ── log every chart access (not just writes).
        AuditLog::create([
            'user_id'     => $user->id,
            'action'      => 'READ',
            'target_type' => 'PatientChart',
            'target_id'   => $patient->id,
            'ip_address'  => $request->ip(),
        ]);

        $patient->load('user');

        // Active Medication List — items from prescriptions that are still in effect.
        $activeMedications = $patient->prescriptions()
            ->where('status', '!=', 'expired')
            ->with('items')
            ->latest('issued_at')
            ->get()
            ->flatMap(fn ($rx) => $rx->items->map(fn ($it) => [
                'id'            => $it->id,
                'drug_name'     => $it->drug_name,
                'dosage'        => $it->dosage,
                'quantity'      => $it->quantity,
                'quantity_unit' => $it->quantity_unit,
                'frequency'     => $it->frequency,
                'duration'      => $it->duration,
                'status'        => $rx->status->value ?? $rx->status,
                'reference_no'  => $rx->reference_no,
                'issued_at'     => $rx->issued_at?->format('Y-m-d'),
            ]))
            ->values();

        $encounters = $patient->records()
            ->with('doctor.user', 'prescriptions.items', 'diagnosticOrders')
            ->latest('visit_date')
            ->get();

        $procedures = $patient->procedures()->with('doctor.user')->latest('performed_at')->get();

        $labImaging = $patient->diagnosticOrders()
            ->with('doctor.user', 'items')
            ->latest('ordered_at')
            ->get();

        return response()->json([
            'patient' => [
                'id'      => $patient->id,
                'name'    => $patient->user?->name,
                'sex'     => $patient->sex,
                'dob'     => $patient->dob?->format('Y-m-d'),
            ],
            'active_medications' => $activeMedications,
            'encounters'         => PatientRecordResource::collection($encounters),
            'procedures'         => ProcedureResource::collection($procedures),
            'lab_imaging'        => DiagnosticOrderResource::collection($labImaging),
            // Phase 2: 'restricted_files' — filtered by the viewer's specialization match.
        ]);
    }
}
