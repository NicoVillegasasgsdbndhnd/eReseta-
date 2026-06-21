<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticOrderResource;
use App\Http\Resources\PatientRecordResource;
use App\Http\Resources\PrescriptionResource;
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

        // Active medications = full prescriptions (still in effect), rendered as Hospital Rx cards.
        $activePrescriptions = $patient->prescriptions()
            ->where('status', '!=', 'expired')
            ->with(['items', 'doctor.user', 'patientRecord.patient.user'])
            ->latest('issued_at')
            ->get();

        $encounters = $patient->records()
            ->with('doctor.user', 'prescriptions.items', 'diagnosticOrders')
            ->latest('visit_date')
            ->get();

        $labImaging = $patient->diagnosticOrders()
            ->with('doctor.user', 'items')
            ->latest('ordered_at')
            ->get();

        return response()->json([
            'patient' => [
                'id'            => $patient->id,
                'name'          => $patient->user?->name,
                'patient_code'  => sprintf('DEAMHI-%s-%05d', $patient->created_at?->year ?? now()->year, $patient->id),
                'sex'           => $patient->sex,
                'dob'           => $patient->dob?->format('Y-m-d'),
                'age'           => $patient->dob?->age,
                'email'         => $patient->user?->email,
                'contact'       => $patient->contact,
                'address'       => $patient->address,
                'philhealth_no' => $patient->philhealth_no,
                'preferred_language'         => $patient->preferred_language,
                'known_allergies'            => $patient->known_allergies,
                'gov_id_type'                => $patient->gov_id_type,
                'gov_id_no'                  => $patient->gov_id_no,
                'hmo_provider'               => $patient->hmo_provider,
                'hmo_policy_no'              => $patient->hmo_policy_no,
                'hmo_group_no'               => $patient->hmo_group_no,
                'copay'                      => $patient->copay,
                'emergency_contact_name'     => $patient->emergency_contact_name,
                'emergency_contact_phone'    => $patient->emergency_contact_phone,
                'emergency_contact_relation' => $patient->emergency_contact_relation,
                'registered_at' => $patient->created_at?->format('Y-m-d'),
                'visits_count'  => $patient->records()->count(),
                'rx_count'      => $patient->prescriptions()->count(),
            ],
            'active_prescriptions' => PrescriptionResource::collection($activePrescriptions),
            'encounters'           => PatientRecordResource::collection($encounters),
            'lab_imaging'          => DiagnosticOrderResource::collection($labImaging),
            // Phase 2: 'restricted_files' — filtered by the viewer's specialization match.
        ]);
    }
}
