<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;








class EnsurePasswordChanged
{

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
