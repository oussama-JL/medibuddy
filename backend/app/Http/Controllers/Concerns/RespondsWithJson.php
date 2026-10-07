<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

/**
 * Consistent JSON answers. `valeur` is 1 on success and 0 on failure, which
 * is what the React pages already check.
 */
trait RespondsWithJson
{
    protected function ok(string $message = 'OK', array $extra = []): JsonResponse
    {
        return response()->json(['valeur' => 1, 'message' => $message] + $extra, 200);
    }

    protected function notFound(string $message = 'Introuvable.'): JsonResponse
    {
        return response()->json(['valeur' => 0, 'message' => $message], 404);
    }

    protected function conflict(string $message): JsonResponse
    {
        return response()->json(['valeur' => 0, 'message' => $message], 409);
    }

    protected function invalid(ValidatorContract $validator): JsonResponse
    {
        return response()->json(['valeur' => 0, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
    }

    /** Runs the rules; returns the validator so callers can check ->fails(). */
    protected function check(array $input, array $rules): ValidatorContract
    {
        // JSON numbers (age, gsm...) are accepted where text is expected.
        $input = array_map(fn ($v) => is_int($v) || is_float($v) ? (string) $v : $v, $input);

        return Validator::make($input, $rules);
    }

    /** Trimmed string, or '' for missing/null. */
    protected function str($value): string
    {
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return is_string($value) ? trim($value) : '';
    }
}
