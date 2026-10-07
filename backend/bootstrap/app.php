<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Behind a reverse proxy (Render, Railway...) the client IP, which the login throttle
        // relies on, is only right when the proxy is trusted: set TRUSTED_PROXIES=* there.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES') ?: null);

        $middleware->alias([
            'auth.token' => \App\Http\Middleware\AuthenticateToken::class,
            'role' => \App\Http\Middleware\RequireRole::class,
            'object.id' => \App\Http\Middleware\ValidateObjectIds::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

// Containers with a read-only image filesystem (e.g. Vercel) keep writable storage in /tmp.
// getenv() is used because Apache's mod_php does not always expose the variable in $_ENV.
if ($storage = getenv('LARAVEL_STORAGE_PATH')) {
    $app->useStoragePath($storage);
}

return $app;
