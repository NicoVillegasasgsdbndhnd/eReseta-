<?php

namespace App\Http\Middleware;

use App\Support\Terms;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side enforcement of first-login (and post-version-bump) Terms & Privacy acceptance. A user
 * who hasn't accepted the current TERMS_VERSION may only reach the terms/accept endpoints, the
 * password-change endpoint, and /auth/me + /auth/logout. Everything else is blocked with 403.
 * Runs AFTER EnsurePasswordChanged so the order is: change password → accept terms → use the app.
 */
class EnsureTermsAccepted
{
    /** Paths a not-yet-accepted user may still reach. */
    private const ALLOWED = [
        'api/me/terms',
        'api/me/terms/accept',
        'api/profile',      // still allow the password-change step
        'api/auth/me',
        'api/auth/logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->terms_accepted_version !== Terms::VERSION && ! $request->is(...self::ALLOWED)) {
            abort(403, 'You must accept the Terms & Privacy agreement before continuing.');
        }

        return $next($request);
    }
}
