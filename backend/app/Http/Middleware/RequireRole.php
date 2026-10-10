<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->attributes->get('member');
        if (! $user || ! in_array($user['peran'], $roles, true)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }

        return $next($request);
    }
}
