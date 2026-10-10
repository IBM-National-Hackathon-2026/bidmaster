<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $res */
        $res = $next($request);
        $res->headers->set('Content-Security-Policy',
            "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
        $res->headers->set('X-Content-Type-Options', 'nosniff');
        $res->headers->set('X-Frame-Options', 'DENY');
        $res->headers->set('Referrer-Policy', 'no-referrer');
        $res->headers->set('Cache-Control', 'no-store');
        $res->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $res;
    }
}
