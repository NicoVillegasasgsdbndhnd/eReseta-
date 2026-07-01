<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Support\Terms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * First-login Terms & Privacy acceptance (RA 10173). Returns the role-based agreement for the
 * authenticated user and records their acceptance (evidence → audit log).
 */
class TermsController extends Controller
{
    /** Public (unauthenticated) view of the patient agreement — for the guest footer /terms page. */
    public function publicTerms(): JsonResponse
    {
        return response()->json(Terms::for('patient'));
    }

    /**
     * Robust role → variant. A clinical/staff role always yields the Employee agreement (even if the
     * account also holds admin); only a pure admin gets the Administrator agreement. This avoids a
     * dual-role account being mis-served the admin terms.
     */
    private function variantFor($user): string
    {
        if ($user->hasRole('patient')) {
            return 'patient';
        }
        if ($user->hasAnyRole(['doctor', 'staff', 'pharmacist'])) {
            return 'employee';
        }
        return $user->hasRole('admin') ? 'admin' : 'employee';
    }

    /** The current agreement for this user's role + whether they've accepted the current version. */
    public function me(Request $request): JsonResponse
    {
        $user    = $request->user();
        $variant = $this->variantFor($user);

        return response()->json([
            ...Terms::for($variant),
            'accepted'    => $user->terms_accepted_version === Terms::VERSION,
            'accepted_at' => $user->terms_accepted_at,
        ]);
    }

    /** Record acceptance of the current terms version (append-only evidence in the audit log). */
    public function accept(Request $request): JsonResponse
    {
        $user    = $request->user();
        $variant = $this->variantFor($user);

        $user->forceFill([
            'terms_accepted_version' => Terms::VERSION,
            'terms_accepted_at'      => now(),
        ])->save();

        AuditLog::create([
            'user_id'     => $user->id,
            'action'      => 'TERMS_ACCEPTED',
            'target_type' => 'User',
            'target_id'   => $user->id,
            'ip_address'  => $request->ip(),
            'context'     => "Accepted {$variant} terms " . Terms::VERSION,
        ]);

        return response()->json(['accepted' => true, 'version' => Terms::VERSION]);
    }
}
