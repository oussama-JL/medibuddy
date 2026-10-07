<?php

namespace Tests\Feature;

use Tests\MongoTestCase;

class AuthTest extends MongoTestCase
{
    public function test_admin_can_log_in(): void
    {
        $response = $this->postJson('/api/login', ['login' => 'admin', 'password' => 'admin-pass']);

        $response->assertOk()
            ->assertJsonPath('valeur', 1)
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonPath('user.nom', 'Martin');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $response->json('token'));
    }

    public function test_nurse_can_log_in(): void
    {
        $this->postJson('/api/login', ['login' => 'infi', 'password' => 'infi-pass'])
            ->assertOk()
            ->assertJsonPath('valeur', 2)
            ->assertJsonPath('user.role', 'infirmier');
    }

    public function test_wrong_password_is_rejected_with_valeur_3(): void
    {
        $this->postJson('/api/login', ['login' => 'admin', 'password' => 'wrong'])
            ->assertStatus(401)
            ->assertJsonPath('valeur', 3)
            ->assertJsonMissingPath('token');
    }

    public function test_unknown_user_is_rejected_the_same_way(): void
    {
        $this->postJson('/api/login', ['login' => 'nobody', 'password' => 'x'])
            ->assertStatus(401)
            ->assertJsonPath('valeur', 3);
    }

    public function test_nosql_injection_payload_is_rejected(): void
    {
        $this->postJson('/api/login', ['login' => ['$ne' => ''], 'password' => ['$ne' => '']])
            ->assertStatus(422)
            ->assertJsonPath('valeur', 3)
            ->assertJsonMissingPath('token');

        // also as one operator inside an otherwise valid-looking body
        $this->postJson('/api/login', ['login' => 'admin', 'password' => ['$gt' => '']])
            ->assertStatus(422);
    }

    public function test_plaintext_passwords_in_the_database_never_log_in(): void
    {
        $this->postJson('/api/login', ['login' => 'legacy', 'password' => 'plain-text'])
            ->assertStatus(401)
            ->assertJsonPath('valeur', 3);
    }

    public function test_login_response_contains_no_password_or_hash(): void
    {
        $body = $this->postJson('/api/login', ['login' => 'admin', 'password' => 'admin-pass'])->getContent();

        $this->assertStringNotContainsString('password', $body);
        $this->assertStringNotContainsString('$2y$', $body);
        $this->assertStringNotContainsString('admin-pass', $body);

        $token = json_decode($body, true)['token'];
        $me = $this->getJson('/api/me', $this->bearer($token))->getContent();
        $this->assertStringNotContainsString('password', $me);
        $this->assertStringNotContainsString('$2y$', $me);
    }

    public function test_only_the_token_hash_is_stored(): void
    {
        $token = $this->loginToken('admin', 'admin-pass');

        $stored = $this->db->selectCollection('tokens')->findOne(['token_hash' => hash('sha256', $token)]);
        $this->assertNotNull($stored);
        $this->assertNull($this->db->selectCollection('tokens')->findOne(['token_hash' => $token]));
        $this->assertGreaterThan(time() * 1000, (int) (string) $stored['expires_at']);
    }

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['login' => 'admin', 'password' => 'wrong'])->assertStatus(401);
        }

        // even the right password is refused while throttled
        $this->postJson('/api/login', ['login' => 'admin', 'password' => 'admin-pass'])->assertStatus(429);
    }

    public function test_unauthenticated_request_gets_401(): void
    {
        $this->getJson('/api/all')->assertStatus(401);
        $this->getJson('/api/me')->assertStatus(401);
        $this->getJson('/api/all', ['Authorization' => 'Bearer not-a-real-token'])->assertStatus(401);
    }

    public function test_authenticated_request_gets_200(): void
    {
        $token = $this->loginToken('infi', 'infi-pass');

        $this->getJson('/api/all', $this->bearer($token))->assertOk();
        $this->getJson('/api/me', $this->bearer($token))->assertOk()->assertJsonPath('user.role', 'infirmier');
    }

    public function test_nurse_gets_403_on_admin_only_routes(): void
    {
        $nurse = $this->loginToken('infi', 'infi-pass');
        $admin = $this->loginToken('admin', 'admin-pass');

        $this->getJson('/api/allemplo', $this->bearer($nurse))->assertStatus(403);
        $this->putJson('/api/deletesuivie/' . str_repeat('a', 24), [], $this->bearer($nurse))->assertStatus(403);
        $this->getJson('/api/allemplo', $this->bearer($admin))->assertOk();
    }

    public function test_logout_invalidates_the_token(): void
    {
        $token = $this->loginToken('admin', 'admin-pass');
        $this->getJson('/api/all', $this->bearer($token))->assertOk();

        $this->postJson('/api/logout', [], $this->bearer($token))->assertOk();

        $this->getJson('/api/all', $this->bearer($token))->assertStatus(401);
        $this->assertNull($this->db->selectCollection('tokens')->findOne(['token_hash' => hash('sha256', $token)]));
    }

    public function test_expired_token_gets_401(): void
    {
        $expired = $this->insertToken('admin', time() - 60);
        $valid = $this->insertToken('admin', time() + 3600);

        $this->getJson('/api/all', $this->bearer($expired))->assertStatus(401);
        $this->getJson('/api/all', $this->bearer($valid))->assertOk();
    }

    public function test_bad_object_id_gets_422(): void
    {
        $token = $this->loginToken('admin', 'admin-pass');

        $this->putJson('/api/salle/not-an-id', [], $this->bearer($token))->assertStatus(422);
        $this->deleteJson('/api/deletePatient/xyz', [], $this->bearer($token))->assertStatus(422);
        $this->putJson('/api/modifierPatient/' . str_repeat('g', 24), [], $this->bearer($token))->assertStatus(422);
    }

    public function test_hash_passwords_command_is_idempotent(): void
    {
        $this->artisan('medibuddy:hash-passwords')->assertSuccessful();
        $legacy = $this->db->selectCollection('utilisateur')->findOne(['email' => 'legacy']);
        $this->assertStringStartsWith('$2y$', $legacy['password']);
        $first = $legacy['password'];

        $this->artisan('medibuddy:hash-passwords')->assertSuccessful();
        $again = $this->db->selectCollection('utilisateur')->findOne(['email' => 'legacy']);
        $this->assertSame($first, $again['password']);

        $this->postJson('/api/login', ['login' => 'legacy', 'password' => 'plain-text'])->assertOk();
    }
}
