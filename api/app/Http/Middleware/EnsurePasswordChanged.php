<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side enforcement of the first-login password change. A user flagged with
 * must_change_password may only reach the password-change endpoint (PUT /api/profile)
 * plus the (un-grouped) /api/auth/me and /api/auth/logout. Every other authenticated
 * API call is blocked with 403 until a permanent password is set. This complements
 * the client-side redirect so the rule can't be bypassed with a crafted request.
 */
class EnsurePasswordChanged
{
    /** Paths a locked-down user may still reach. */
    private const ALLOWED = [
        'api/profile',      // PUT — set the new password
        'api/auth/me',
        'api/auth/logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password && ! $request->is(...self::ALLOWED)) {
            abort(403, 'You must change your temporary password before continuing.');
        }

        return $next($request);
    }
}
