<?php

namespace App\Http\Middleware;

use App\Repositories\Contracts\TokenRepository;
use Closure;
use Illuminate\Http\Request;

class TokenAuth
{
    public function __construct(private TokenRepository $tokens) {}

    public function handle(Request $request, Closure $next)
    {
        $token = '';
        $auth = $request->header('Authorization', '');
        if (str_starts_with($auth, 'Bearer ')) {
            $token = mb_substr($auth, 7, 128);
        }
        if ($token === '') {
            $token = mb_substr($request->cookie('bm_token', ''), 0, 128);
        }
        $user = $this->tokens->findValid($token);
        if (! $user) {
            return response()->json(['error' => 'Login dulu.'], 401);
        }
        $request->attributes->set('member', $user);

        return $next($request);
    }
}
