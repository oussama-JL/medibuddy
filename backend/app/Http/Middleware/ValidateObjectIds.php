<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** `object.id:id,identite`: the named route parameters must be 24-char hex ObjectIds. */
class ValidateObjectIds
{
    public function handle(Request $request, Closure $next, string ...$params): Response
    {
        foreach ($params as $name) {
            $value = $request->route($name);
            if (!is_string($value) || !preg_match('/^[a-f0-9]{24}$/', $value)) {
                return response()->json(['message' => "Invalid {$name}."], 422);
            }
        }

        return $next($request);
    }
}
