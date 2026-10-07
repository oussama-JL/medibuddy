<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function __construct(protected AuthService $auth)
    {
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:1024'],
        ]);
        if ($validator->fails()) {
            return response()->json(['valeur' => 3, 'message' => 'Invalid credentials.'], 422);
        }

        // Plain strings only: this is what stops {"$ne": ""} style payloads.
        $login = (string) $request->input('login');
        $password = (string) $request->input('password');

        $throttleKey = 'login|' . sha1($request->ip() . '|' . strtolower($login));
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            return response()->json(['valeur' => 3, 'message' => 'Too many attempts. Try again later.'], 429)
                ->header('Retry-After', RateLimiter::availableIn($throttleKey));
        }

        $user = $this->auth->findUserByLogin($login);
        $stored = is_array($user) ? ($user['password'] ?? '') : '';
        // Only bcrypt hashes are accepted; a plaintext value in the DB never matches.
        $hashed = is_string($stored) && str_starts_with($stored, '$2y$');
        // Always spend one bcrypt operation so unknown users cost the same as wrong passwords.
        if ($hashed) {
            $passwordOk = Hash::check($password, $stored);
        } else {
            Hash::make($password);
            $passwordOk = false;
        }
        $roleValue = $user['role'] ?? null;

        if (!$user || !$hashed || !$passwordOk || !in_array($roleValue, ['admin', 'infirmier'], true)) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json(['valeur' => 3, 'message' => 'Invalid credentials.'], 401);
        }

        RateLimiter::clear($throttleKey);
        $public = $this->auth->publicUser($user);

        return response()->json([
            'valeur' => $roleValue === 'admin' ? 1 : 2,
            'token' => $this->auth->issueToken($user),
            'user' => $public,
            // kept for the existing frontend, which reads `utili`
            'utili' => $public,
        ]);
    }

    public function logout(Request $request)
    {
        $this->auth->revokeToken((string) $request->attributes->get('auth_token'));

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $user = $this->auth->findUserById($authUser['id']);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $public = $this->auth->publicUser($user);

        return response()->json(['valeur' => $public['role'] === 'admin' ? 1 : 2, 'user' => $public, 'utili' => $public]);
    }
}
