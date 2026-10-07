<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** `auth.token`: requires a valid, unexpired Bearer token. */
class AuthenticateToken
{
    public function __construct(protected AuthService $auth)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $plain = (string) $request->bearerToken();
        $user = $this->auth->resolveToken($plain);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $request->attributes->set('auth_user', $user);
        $request->attributes->set('auth_token', $plain);

        return $next($request);
    }
}
