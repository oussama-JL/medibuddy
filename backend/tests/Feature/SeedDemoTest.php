<?php

namespace Tests\Feature;

use Tests\MongoTestCase;

class SeedDemoTest extends MongoTestCase
{
    private function snapshot(): array
    {
        return $this->db->selectCollection('Patients')->find([], ['sort' => ['identite' => 1], 'projection' => ['nom' => 1, 'prenom' => 1, 'identite' => 1, 'gsm' => 1, 'age' => 1]])->toArray();
    }

    public function test_seed_demo_creates_the_demo_data_and_logins(): void
    {
        $this->artisan('medibuddy:seed-demo')->assertSuccessful();

        $patients = $this->db->selectCollection('Patients');
        $this->assertSame(25, $patients->countDocuments());
        $this->assertSame(3, $this->db->selectCollection('Employes')->countDocuments());
        $this->assertSame(2, $this->db->selectCollection('utilisateur')->countDocuments());
        $this->assertSame(0, $this->db->selectCollection('Salle_Attente')->countDocuments());
        $this->assertSame(4, $patients->countDocuments(['salle_d_attend' => ['$gt' => 0]]));
        $this->assertGreaterThan(10, $patients->countDocuments(['data' => ['$exists' => true]]));
        $this->assertGreaterThan(0, $patients->countDocuments(['suivi' => ['$exists' => true]]));
        $factures = $this->db->selectCollection('Factures');
        $this->assertGreaterThan(20, $factures->countDocuments());
        $this->assertSame(0, $patients->countDocuments(['facturation' => ['$exists' => true]]));
        $statuses = array_count_values(array_column(app(\App\Services\FactureService::class)->list(), 'statut'));
        $this->assertGreaterThan(0, $statuses['payée'] ?? 0);
        $this->assertGreaterThan(0, $statuses['partielle'] ?? 0);
        $this->assertGreaterThan(0, $statuses['impayée'] ?? 0);
        $modes = array_unique(array_column(array_merge(...array_column(app(\App\Services\FactureService::class)->list(), 'paiements')), 'mode'));
        $this->assertGreaterThanOrEqual(3, count($modes));
        $this->assertSame(4, $patients->countDocuments(['rendezVous.month' => date('d/m/Y')]));

        // height / weight for most patients, none for a few (empty state), all inside the allowed range
        $this->assertGreaterThan(15, $patients->countDocuments(['taille' => ['$exists' => true], 'poids' => ['$exists' => true]]));
        $this->assertGreaterThan(0, $patients->countDocuments(['taille' => ['$exists' => false]]));
        $this->assertSame(0, $patients->countDocuments(['$or' => [['taille' => ['$lt' => 50]], ['taille' => ['$gt' => 250]], ['poids' => ['$lt' => 2]], ['poids' => ['$gt' => 400]]]]));

        // everything is visibly fake
        foreach ($this->snapshot() as $p) {
            $this->assertMatchesRegularExpression('/^DEMO\d{4}$/', $p['identite']);
            $this->assertMatchesRegularExpression('/^06000000\d{2}$/', $p['gsm']);
        }

        // the wiped test users are gone and the demo users log in (passwords are bcrypt hashes)
        $this->postJson('/api/login', ['login' => 'admin', 'password' => 'admin-pass'])->assertStatus(401);
        $stored = $this->db->selectCollection('utilisateur')->findOne(['email' => 'admin@medibuddy.demo']);
        $this->assertStringStartsWith('$2y$', $stored['password']);
        $this->postJson('/api/login', ['login' => 'admin@medibuddy.demo', 'password' => 'Demo1234!'])->assertOk()->assertJsonPath('valeur', 1);
        $this->postJson('/api/login', ['login' => 'infirmier@medibuddy.demo', 'password' => 'Demo1234!'])->assertOk()->assertJsonPath('valeur', 2);
    }

    public function test_seed_demo_is_deterministic(): void
    {
        $this->artisan('medibuddy:seed-demo')->assertSuccessful();
        $first = json_encode($this->snapshot());

        $this->artisan('medibuddy:seed-demo')->assertSuccessful();

        $this->assertSame($first, json_encode($this->snapshot()));
        $this->assertSame(25, $this->db->selectCollection('Patients')->countDocuments());
    }

    public function test_seed_demo_refuses_to_run_in_production_without_force(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('medibuddy:seed-demo')->assertFailed();
        $this->assertSame(1, $this->db->selectCollection('Patients')->countDocuments());

        $this->artisan('medibuddy:seed-demo --force')->assertSuccessful();
        $this->assertSame(25, $this->db->selectCollection('Patients')->countDocuments());
    }
}
