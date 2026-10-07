<?php

namespace Tests;

use Illuminate\Support\Facades\Hash;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Client;
use MongoDB\Database;

/**
 * Base class for tests that hit MongoDB. Uses MONGO_DB from phpunit.xml
 * (MEDIBuddy_test), seeds what it needs in setUp and drops the whole database
 * again in tearDown.
 */
abstract class MongoTestCase extends TestCase
{
    protected Database $db;

    protected function setUp(): void
    {
        parent::setUp();

        $name = (string) env('MONGO_DB');
        // Safety net: this class drops the database, so refuse anything that is not a test DB.
        $this->assertStringEndsWith('_test', $name, 'Refusing to run: MONGO_DB must end with _test');

        $this->db = (new Client(env('MONGO_DSN', 'mongodb://127.0.0.1:27017')))->selectDatabase($name);
        $this->db->drop();

        $this->db->selectCollection('utilisateur')->insertMany([
            ['nom' => 'Martin', 'prenom' => 'Sophie', 'email' => 'admin', 'password' => Hash::make('admin-pass'), 'role' => 'admin'],
            ['nom' => 'Durand', 'prenom' => 'Luc', 'email' => 'infi', 'password' => Hash::make('infi-pass'), 'role' => 'infirmier'],
            ['nom' => 'Legacy', 'prenom' => 'User', 'email' => 'legacy', 'password' => 'plain-text', 'role' => 'admin'],
        ]);
        $this->db->selectCollection('Patients')->insertOne([
            'nom' => 'Test', 'prenom' => 'Patient', 'identite' => 'T1',
        ]);
    }

    protected function tearDown(): void
    {
        $this->db->drop();
        parent::tearDown();
    }

    /** Logs in through the API and returns the plain bearer token. */
    protected function loginToken(string $login, string $password): string
    {
        $response = $this->postJson('/api/login', ['login' => $login, 'password' => $password]);
        $response->assertOk();

        return $response->json('token');
    }

    protected function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }

    /** Inserts a token document directly (e.g. already expired) and returns the plain value. */
    protected function insertToken(string $role, int $expiresAt): string
    {
        $plain = bin2hex(random_bytes(32));
        $this->db->selectCollection('tokens')->insertOne([
            'token_hash' => hash('sha256', $plain),
            'user_id' => (string) new ObjectId(),
            'role' => $role,
            'name' => 'Seeded User',
            'created_at' => new UTCDateTime((time() - 100) * 1000),
            'expires_at' => new UTCDateTime($expiresAt * 1000),
        ]);

        return $plain;
    }
}
