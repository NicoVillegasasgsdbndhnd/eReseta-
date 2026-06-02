<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces every API request to be treated as JSON.
 *
 * Without this, an unauthenticated request that omits `Accept: application/json` makes Laravel fall
 * back to web behaviour — it tries to redirect to the `login` route (undefined on an API-only app),
 * yielding a 500 + HTML stack trace (information disclosure). Setting the header up front makes
 * `expectsJson()` true so auth/validation/not-found errors all render as JSON (401/422/404).
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
