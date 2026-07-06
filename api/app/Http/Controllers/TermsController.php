<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Support\Terms;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;





class TermsController extends Controller
{

    public function publicTerms(): JsonResponse
    {
        return response()->json(Terms::for('patient'));
    }






    private function variantFor($user): string
    {
        if ($user->hasRole('admin')) {
            return 'admin';
        }
        if ($user->hasRole('patient')) {
            return 'patient';
        }
        return 'employee';
    }


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
