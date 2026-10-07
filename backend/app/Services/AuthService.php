<?php

namespace App\Services;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Client;

/**
 * Minimal token auth on top of the raw MongoDB driver.
 *
 * The plain token is only ever handed to the client; Mongo stores its sha256.
 * `tokens` documents: token_hash, user_id, role, name, created_at, expires_at
 * (a TTL index on expires_at removes expired rows; verify() also checks it).
 */
class AuthService
{
    public const TOKEN_TTL_SECONDS = 8 * 3600;

    protected $database;

    public function __construct()
    {
        $client = new Client(env('MONGO_DSN', 'mongodb://localhost:27017'));
        $this->database = $client->selectDatabase(env('MONGO_DB', 'MEDIBuddy'));
    }

    public function findUserByLogin(string $login): ?array
    {
        // $login is a plain string here (validated + cast by the caller), so it
        // cannot smuggle Mongo operators into the filter.
        $user = $this->database->selectCollection('utilisateur')->findOne(['email' => $login]);

        return $user ? $this->toArray($user) : null;
    }

    public function findUserById(string $id): ?array
    {
        if (!preg_match('/^[a-f0-9]{24}$/', $id)) {
            return null;
        }
        $user = $this->database->selectCollection('utilisateur')->findOne(['_id' => new ObjectId($id)]);

        return $user ? $this->toArray($user) : null;
    }

    /** Public user fields only: never the password or hash. */
    public function publicUser(array $user): array
    {
        return [
            'id' => (string) $user['_id'],
            'nom' => $user['nom'] ?? '',
            'prenom' => $user['prenom'] ?? '',
            'email' => $user['email'] ?? '',
            'role' => $user['role'] ?? '',
        ];
    }

    /** Creates a token for the user and returns the plain value (shown once). */
    public function issueToken(array $user): string
    {
        $this->ensureIndexes();

        $plain = bin2hex(random_bytes(32));
        $now = time();
        $this->tokens()->insertOne([
            'token_hash' => hash('sha256', $plain),
            'user_id' => (string) $user['_id'],
            'role' => $user['role'] ?? '',
            'name' => trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? '')),
            'created_at' => new UTCDateTime($now * 1000),
            'expires_at' => new UTCDateTime(($now + self::TOKEN_TTL_SECONDS) * 1000),
        ]);

        return $plain;
    }

    /** @return array{id:string,role:string,name:string}|null */
    public function resolveToken(string $plain): ?array
    {
        if ($plain === '') {
            return null;
        }
        $doc = $this->tokens()->findOne(['token_hash' => hash('sha256', $plain)]);
        if (!$doc) {
            return null;
        }
        $expiresMs = (int) (string) $doc['expires_at'];
        if ($expiresMs <= time() * 1000) {
            $this->tokens()->deleteOne(['_id' => $doc['_id']]);

            return null;
        }

        return ['id' => $doc['user_id'], 'role' => $doc['role'], 'name' => $doc['name']];
    }

    public function revokeToken(string $plain): void
    {
        $this->tokens()->deleteOne(['token_hash' => hash('sha256', $plain)]);
    }

    protected function ensureIndexes(): void
    {
        $this->tokens()->createIndex(['expires_at' => 1], ['expireAfterSeconds' => 0]);
        $this->tokens()->createIndex(['token_hash' => 1], ['unique' => true]);
    }

    protected function tokens()
    {
        return $this->database->selectCollection('tokens');
    }

    protected function toArray($doc): array
    {
        return $doc->getArrayCopy();
    }
}
