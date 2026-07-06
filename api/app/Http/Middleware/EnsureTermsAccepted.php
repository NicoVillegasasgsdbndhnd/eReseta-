<?php

namespace App\Http\Middleware;

use App\Support\Terms;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;







class EnsureTermsAccepted
{

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
