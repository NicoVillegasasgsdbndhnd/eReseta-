<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\User;
use App\Support\Terms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;





class ComplianceController extends Controller
{

    public function consentRegister(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $rows = Patient::with(['user:id,name', 'consents.recordedBy:id,name'])
            ->get()
            ->map(function (Patient $p) {
                $current = $p->consents->first(); // consents() is ordered latest-first
                return [
                    'patient_id'   => $p->id,
                    'patient_name' => $p->user?->name,
                    'status'       => $current?->status ?? 'none',
                    'recorded_at'  => $current?->recorded_at,
                    'recorded_by'  => $current?->recordedBy?->name,
                ];
            })
            ->sortBy('patient_name')
            ->values();

        return response()->json([
            'data'    => $rows,
            'summary' => [
                'given'     => $rows->where('status', 'given')->count(),
                'withdrawn' => $rows->where('status', 'withdrawn')->count(),
                'none'      => $rows->where('status', 'none')->count(),
            ],
        ]);
    }


    public function termsAcceptance(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $rows = User::with('roles:id,name')
            ->get()
            ->map(function (User $u) {
                return [
                    'id'               => $u->id,
                    'name'             => $u->name,
                    'role'             => $u->getRoleNames()->first(),
                    'accepted_version' => $u->terms_accepted_version,
                    'accepted_at'      => $u->terms_accepted_at,
                    'up_to_date'       => $u->terms_accepted_version === Terms::VERSION,
                ];
            })
            ->sortBy('name')
            ->values();

        return response()->json([
            'current_version' => Terms::VERSION,
            'data'            => $rows,
            'summary'         => [
                'up_to_date' => $rows->where('up_to_date', true)->count(),
                'pending'    => $rows->where('up_to_date', false)->count(),
            ],
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Only administrators can view compliance registers.');
    }
}
