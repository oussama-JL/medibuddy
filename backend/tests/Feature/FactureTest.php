<?php

namespace Tests\Feature;

use Tests\MongoTestCase;

class FactureTest extends MongoTestCase
{
    protected string $admin;
    protected string $nurse;
    protected string $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->loginToken('admin', 'admin-pass');
        $this->nurse = $this->loginToken('infi', 'infi-pass');
        $this->patient = (string) $this->db->selectCollection('Patients')->findOne(['identite' => 'T1'])['_id'];
    }

    protected function body(array $extra = []): array
    {
        return $extra + [
            'patient_id' => $this->patient,
            'date' => '2026-03-10',
            'lignes' => [
                ['service' => 'Consultation', 'qty' => 1, 'prix' => 300],
                ['service' => 'Analyses', 'qty' => 2, 'prix' => 125.5],
            ],
        ];
    }

    protected function create(array $extra = [], ?string $token = null)
    {
        return $this->postJson('/api/factures', $this->body($extra), $this->bearer($token ?? $this->nurse));
    }

    protected function pay(string $id, array $data, ?string $token = null)
    {
        return $this->postJson("/api/factures/$id/paiements", $data, $this->bearer($token ?? $this->nurse));
    }

    // ---- create ---------------------------------------------------------------

    public function test_create_invoice_computes_total_number_and_status(): void
    {
        $response = $this->create(['total' => 1, 'paye' => 999, 'statut' => 'payée']);

        $response->assertStatus(201)
            ->assertJsonPath('numero', 'F-2026-0001')
            ->assertJsonPath('total', 551)           // 300 + 2 x 125.5, never the client's value
            ->assertJsonPath('paye', 0)
            ->assertJsonPath('reste', 551)
            ->assertJsonPath('statut', 'impayée')
            ->assertJsonPath('patient_nom', 'Patient Test')
            ->assertJsonPath('annulee', false);
        $this->assertCount(2, $response->json('lignes'));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{24}$/', $response->json('id'));
    }

    public function test_numbers_are_sequential_per_year(): void
    {
        $first = $this->create()->json('numero');
        $second = $this->create()->json('numero');
        $otherYear = $this->create(['date' => '2025-12-31'])->json('numero');
        $nextYear = $this->create(['date' => '2026-04-01'])->json('numero');

        $this->assertSame(['F-2026-0001', 'F-2026-0002', 'F-2025-0001', 'F-2026-0003'], [$first, $second, $otherYear, $nextYear]);
    }

    public function test_create_links_a_consultation_and_defaults_the_date(): void
    {
        $visit = str_repeat('a', 24);
        $response = $this->postJson('/api/factures', ['patient_id' => $this->patient, 'consultation_id' => $visit, 'lignes' => [['service' => 'Consultation', 'qty' => 1, 'prix' => 200]]], $this->bearer($this->admin));

        $response->assertStatus(201)->assertJsonPath('consultation_id', $visit)->assertJsonPath('date', date('Y-m-d'));
    }

    public function test_create_validation(): void
    {
        $bad = [
            ['lignes' => []],
            ['lignes' => [['service' => '', 'qty' => 1, 'prix' => 10]]],
            ['lignes' => [['service' => 'X', 'qty' => 0, 'prix' => 10]]],
            ['lignes' => [['service' => 'X', 'qty' => 1.5, 'prix' => 10]]],
            ['lignes' => [['service' => 'X', 'qty' => 1, 'prix' => -5]]],
            ['lignes' => [['service' => 'X', 'qty' => 1, 'prix' => 'cher']]],
            ['lignes' => [['service' => ['$ne' => ''], 'qty' => 1, 'prix' => 10]]],
            ['lignes' => [['service' => 'Gratuit', 'qty' => 1, 'prix' => 0]]],   // total must be > 0
            ['date' => '10/03/2026'],
            ['consultation_id' => 'nope'],
            ['patient_id' => 'nope'],
            ['patient_id' => ['$ne' => '']],
        ];
        foreach ($bad as $i => $override) {
            $this->create($override)->assertStatus(422, "case $i");
        }
        $this->postJson('/api/factures', ['lignes' => $this->body()['lignes']], $this->bearer($this->nurse))->assertStatus(422);

        $this->create(['patient_id' => str_repeat('b', 24)])->assertStatus(404);
        $this->assertSame(0, $this->db->selectCollection('Factures')->countDocuments());
    }

    public function test_billing_requires_a_login(): void
    {
        $this->getJson('/api/factures')->assertStatus(401);
        $this->postJson('/api/factures', $this->body())->assertStatus(401);
        $this->postJson('/api/factures/' . str_repeat('a', 24) . '/paiements', [])->assertStatus(401);
    }

    // ---- show / list ------------------------------------------------------------

    public function test_show_and_list_with_filters(): void
    {
        $this->db->selectCollection('Patients')->insertOne(['nom' => 'Autre', 'prenom' => 'Pat', 'identite' => 'O1']);
        $other = (string) $this->db->selectCollection('Patients')->findOne(['identite' => 'O1'])['_id'];

        $a = $this->create(['date' => '2026-01-10'])->json();                       // unpaid
        $b = $this->create(['date' => '2026-02-10'])->json();                       // partial
        $c = $this->create(['date' => '2026-03-10', 'patient_id' => $other])->json(); // paid
        $this->pay($b['id'], ['montant' => 100, 'mode' => 'carte']);
        $this->pay($c['id'], ['montant' => 551, 'mode' => 'espèces']);

        $this->getJson("/api/factures/{$a['id']}", $this->bearer($this->nurse))->assertOk()->assertJsonPath('numero', $a['numero']);
        $this->getJson('/api/factures/' . str_repeat('a', 24), $this->bearer($this->nurse))->assertStatus(404);
        $this->getJson('/api/factures/nope', $this->bearer($this->nurse))->assertStatus(422);

        $all = $this->getJson('/api/factures', $this->bearer($this->nurse))->assertOk()->json();
        $this->assertSame([$c['id'], $b['id'], $a['id']], array_column($all, 'id'));   // newest first

        $ids = fn (string $qs) => array_column($this->getJson("/api/factures?$qs", $this->bearer($this->admin))->assertOk()->json(), 'id');
        $this->assertSame([$a['id']], $ids('statut=' . urlencode('impayée')));
        $this->assertSame([$b['id']], $ids('statut=partielle'));
        $this->assertSame([$c['id']], $ids('statut=' . urlencode('payée')));
        $this->assertSame([$c['id']], $ids("patient=$other"));
        $this->assertSame([$b['id'], $a['id']], $ids("patient={$this->patient}"));
        $this->assertSame([$c['id'], $b['id']], $ids('from=2026-02-01'));
        $this->assertSame([$b['id']], $ids('from=2026-02-01&to=2026-02-28'));

        $this->getJson('/api/factures?statut=nimporte', $this->bearer($this->admin))->assertStatus(422);
        $this->getJson('/api/factures?from=hier', $this->bearer($this->admin))->assertStatus(422);
    }

    // ---- payments ------------------------------------------------------------------

    public function test_partial_then_full_payment_updates_status_and_balance(): void
    {
        $id = $this->create()->json('id');

        $part = $this->pay($id, ['montant' => 200, 'mode' => 'espèces', 'date' => '2026-03-11']);
        $part->assertStatus(201)->assertJsonPath('statut', 'partielle')->assertJsonPath('paye', 200)->assertJsonPath('reste', 351);
        $this->assertSame('espèces', $part->json('paiements.0.mode'));
        $this->assertSame('2026-03-11', $part->json('paiements.0.date'));

        $full = $this->pay($id, ['montant' => 351, 'mode' => 'virement']);
        $full->assertStatus(201)->assertJsonPath('statut', 'payée')->assertJsonPath('paye', 551)->assertJsonPath('reste', 0);
        $this->assertCount(2, $full->json('paiements'));
        $this->assertSame(date('Y-m-d'), $full->json('paiements.1.date'));
    }

    public function test_overpayment_is_refused(): void
    {
        $id = $this->create()->json('id');
        $this->pay($id, ['montant' => 500, 'mode' => 'carte'])->assertStatus(201);

        $this->pay($id, ['montant' => 51.01, 'mode' => 'carte'])
            ->assertStatus(422)->assertJsonPath('valeur', 0);
        $this->assertStringContainsString('dépasse le reste', $this->pay($id, ['montant' => 60, 'mode' => 'carte'])->json('message'));

        // nothing was recorded
        $this->assertSame(500, $this->getJson("/api/factures/$id", $this->bearer($this->nurse))->json('paye'));
        // exactly the balance is fine
        $this->pay($id, ['montant' => 51, 'mode' => 'chèque'])->assertStatus(201)->assertJsonPath('statut', 'payée');
        // and a paid invoice takes no more money
        $this->pay($id, ['montant' => 1, 'mode' => 'espèces'])->assertStatus(422);
    }

    public function test_payment_validation(): void
    {
        $id = $this->create()->json('id');

        foreach ([
            [], ['montant' => 10], ['mode' => 'carte'],
            ['montant' => 0, 'mode' => 'carte'], ['montant' => -5, 'mode' => 'carte'], ['montant' => 'beaucoup', 'mode' => 'carte'],
            ['montant' => 10, 'mode' => 'bitcoin'], ['montant' => 10, 'mode' => 'carte', 'date' => '12/03/2026'],
            ['montant' => ['$gt' => 0], 'mode' => 'carte'],
        ] as $i => $data) {
            $this->pay($id, $data)->assertStatus(422, "case $i");
        }
        $this->pay(str_repeat('c', 24), ['montant' => 10, 'mode' => 'carte'])->assertStatus(404);
        $this->postJson('/api/factures/nope/paiements', ['montant' => 10, 'mode' => 'carte'], $this->bearer($this->nurse))->assertStatus(422);
        $this->assertSame(0, $this->getJson("/api/factures/$id", $this->bearer($this->nurse))->json('paye'));
    }

    // ---- cancel ----------------------------------------------------------------------

    public function test_only_admin_can_cancel_and_the_invoice_is_kept(): void
    {
        $id = $this->create()->json('id');

        $this->postJson("/api/factures/$id/annuler", ['motif' => 'Erreur de saisie'], $this->bearer($this->nurse))->assertStatus(403);
        $this->assertFalse($this->getJson("/api/factures/$id", $this->bearer($this->nurse))->json('annulee'));

        $this->postJson("/api/factures/$id/annuler", [], $this->bearer($this->admin))->assertStatus(422);
        $this->postJson("/api/factures/$id/annuler", ['motif' => 'x'], $this->bearer($this->admin))->assertStatus(422);

        $this->postJson("/api/factures/$id/annuler", ['motif' => 'Erreur de saisie'], $this->bearer($this->admin))
            ->assertOk()->assertJsonPath('statut', 'annulée')->assertJsonPath('annulee', true)
            ->assertJsonPath('annulation.motif', 'Erreur de saisie')->assertJsonPath('annulation.par', 'Sophie Martin');

        // soft cancel: still readable, still listed, but takes no payment and cannot be cancelled twice
        $this->getJson("/api/factures/$id", $this->bearer($this->nurse))->assertOk()->assertJsonPath('statut', 'annulée');
        $this->assertContains($id, array_column($this->getJson('/api/factures?statut=' . urlencode('annulée'), $this->bearer($this->nurse))->json(), 'id'));
        $this->pay($id, ['montant' => 10, 'mode' => 'carte'])->assertStatus(409);
        $this->postJson("/api/factures/$id/annuler", ['motif' => 'encore'], $this->bearer($this->admin))->assertStatus(409);
        $this->postJson('/api/factures/' . str_repeat('d', 24) . '/annuler', ['motif' => 'abc'], $this->bearer($this->admin))->assertStatus(404);
    }

    // ---- legacy migration ----------------------------------------------------------------

    public function test_migrate_factures_converts_legacy_bills_once(): void
    {
        $patients = $this->db->selectCollection('Patients');
        $patients->insertMany([
            ['nom' => 'Paid', 'prenom' => 'A', 'identite' => 'L1', 'facturation' => ['date' => '2025-04-15', 'total' => 1000, 'paye' => 1000, 'reste' => 0]],
            ['nom' => 'Part', 'prenom' => 'B', 'identite' => 'L2', 'facturation' => ['date' => '2025-05-02', 'total' => 800, 'paye' => 300, 'reste' => 500]],
            ['nom' => 'Open', 'prenom' => 'C', 'identite' => 'L3', 'facturation' => ['date' => '2026-01-05', 'total' => 400, 'paye' => 0, 'reste' => 400]],
            ['nom' => 'Zero', 'prenom' => 'D', 'identite' => 'L4', 'facturation' => ['date' => '2026-01-06', 'total' => 0, 'paye' => 0, 'reste' => 0]],
        ]);

        $this->artisan('medibuddy:migrate-factures')->assertSuccessful();

        $factures = app(\App\Services\FactureService::class)->list();
        $this->assertCount(3, $factures);                       // the empty bill is dropped
        $by = array_column($factures, null, 'patient_nom');
        $this->assertSame('payée', $by['A Paid']['statut']);
        $this->assertSame('partielle', $by['B Part']['statut']);
        $this->assertEquals(300, $by['B Part']['paye']);
        $this->assertSame('impayée', $by['C Open']['statut']);
        $this->assertSame('espèces', $by['A Paid']['paiements'][0]['mode']);
        $this->assertSame('Consultation', $by['A Paid']['lignes'][0]['service']);
        $this->assertEqualsCanonicalizing(['F-2025-0001', 'F-2025-0002', 'F-2026-0001'], array_column($factures, 'numero'));
        $this->assertSame(0, $patients->countDocuments(['facturation' => ['$exists' => true]]));

        // running it again changes nothing
        $this->artisan('medibuddy:migrate-factures')->assertSuccessful();
        $this->assertCount(3, app(\App\Services\FactureService::class)->list());
    }

    public function test_old_billing_routes_are_gone(): void
    {
        $id = str_repeat('a', 24);
        $this->putJson("/api/facturation/$id", [], $this->bearer($this->admin))->assertStatus(404);
        $this->putJson("/api/paiement/$id", [], $this->bearer($this->admin))->assertStatus(404);
        $this->putJson("/api/modifierfacturation/$id", [], $this->bearer($this->admin))->assertStatus(404);
        $this->getJson('/api/getfacturation1', $this->bearer($this->admin))->assertStatus(404);
    }
}
