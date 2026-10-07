<?php

namespace Tests\Feature;

use MongoDB\BSON\ObjectId;
use Tests\MongoTestCase;

class ClinicApiTest extends MongoTestCase
{
    protected string $admin;
    protected string $nurse;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->loginToken('admin', 'admin-pass');
        $this->nurse = $this->loginToken('infi', 'infi-pass');
    }

    protected function patientId(string $identite = 'T1'): string
    {
        return (string) $this->db->selectCollection('Patients')->findOne(['identite' => $identite])['_id'];
    }

    protected function patientDoc(string $identite = 'T1'): array
    {
        return $this->db->selectCollection('Patients')->findOne(['identite' => $identite])->getArrayCopy();
    }

    protected function visit(string $date = '15/4/2025'): array
    {
        return [
            'date' => $date, 'antecedents' => 'RAS', 'motif_consultation' => 'Toux',
            'examen_clinnique' => 'RAS', 'examen_biologique' => 'NFS', 'examen_radiologique' => '',
            'diagnostique' => 'Bronchite', 'traitement' => 'Repos', 'situation' => 'URGENT',
        ];
    }

    // ---- consultations: insertepatient / deletdatapatients -----------------

    public function test_add_consultation_appends_with_a_visit_id_and_keeps_history(): void
    {
        $id = $this->patientId();

        $this->putJson("/api/add/$id", $this->visit('1/3/2025'), $this->bearer($this->admin))
            ->assertOk()->assertJsonPath('valeur', 1);
        $this->putJson("/api/add/$id", $this->visit('2/3/2025'), $this->bearer($this->admin))
            ->assertOk();

        $data = json_decode(json_encode($this->patientDoc()['data']), true);
        $this->assertCount(2, $data);
        $this->assertSame('1/3/2025', $data[0]['date']);
        $this->assertSame('URGENT', $data[1]['situation']);
        $this->assertMatchesRegularExpression('/^[a-f0-9]{24}$/', $data[0]['visit_id']);
        $this->assertNotSame($data[0]['visit_id'], $data[1]['visit_id']);
    }

    public function test_add_consultation_on_unknown_patient_is_404_and_needs_a_date(): void
    {
        $this->putJson('/api/add/' . str_repeat('a', 24), $this->visit(), $this->bearer($this->admin))->assertStatus(404);
        $this->putJson('/api/add/' . $this->patientId(), ['motif_consultation' => 'x'], $this->bearer($this->admin))->assertStatus(422);
    }

    public function test_add_consultation_replaces_a_null_data_field(): void
    {
        $this->db->selectCollection('Patients')->updateOne(['identite' => 'T1'], ['$set' => ['data' => null]]);

        $this->putJson('/api/add/' . $this->patientId(), $this->visit(), $this->bearer($this->admin))->assertOk();

        $this->assertCount(1, $this->patientDoc()['data']);
    }

    public function test_delete_visit_by_visit_id_removes_only_that_entry(): void
    {
        $id = $this->patientId();
        $this->putJson("/api/add/$id", $this->visit('1/3/2025'), $this->bearer($this->admin));
        $this->putJson("/api/add/$id", $this->visit('2/3/2025'), $this->bearer($this->admin));
        $first = json_decode(json_encode($this->patientDoc()['data']), true)[0]['visit_id'];

        $this->deleteJson("/api/deletevisit/$id?visit_id=$first", [], $this->bearer($this->admin))
            ->assertOk()->assertJsonPath('valeur', 1);

        $left = json_decode(json_encode($this->patientDoc()['data']), true);
        $this->assertCount(1, $left);
        $this->assertSame('2/3/2025', $left[0]['date']);
    }

    public function test_delete_visit_falls_back_to_date_for_legacy_entries(): void
    {
        $id = $this->patientId();
        $this->db->selectCollection('Patients')->updateOne(['identite' => 'T1'], ['$set' => ['data' => [
            ['date' => '14/2/2025', 'traitement' => 'old'],
            ['date' => '15/2/2025', 'traitement' => 'older'],
        ]]]);

        $this->deleteJson("/api/deletevisit/$id?date=" . urlencode('14/2/2025'), [], $this->bearer($this->admin))->assertOk();

        $left = json_decode(json_encode($this->patientDoc()['data']), true);
        $this->assertCount(1, $left);
        $this->assertSame('15/2/2025', $left[0]['date']);
    }

    public function test_delete_visit_errors(): void
    {
        $id = $this->patientId();
        $this->deleteJson("/api/deletevisit/$id", [], $this->bearer($this->admin))->assertStatus(422);
        $this->deleteJson("/api/deletevisit/$id?visit_id=nope", [], $this->bearer($this->admin))->assertStatus(422);
        $this->deleteJson("/api/deletevisit/$id?visit_id=" . str_repeat('b', 24), [], $this->bearer($this->admin))->assertStatus(404);
        $this->deleteJson("/api/deletevisit/$id?visit_id=" . str_repeat('b', 24), [], $this->bearer($this->nurse))->assertStatus(403);
    }

    public function test_removed_and_misrouted_endpoints_are_gone(): void
    {
        $this->deleteJson('/api/deletedata', [], $this->bearer($this->admin))->assertStatus(404);
        $this->putJson('/api/updatepatient/T1', [], $this->bearer($this->admin))->assertStatus(404);
    }

    public function test_getdata_returns_a_list_even_when_nobody_has_consultations(): void
    {
        $this->getJson('/api/getdata', $this->bearer($this->admin))->assertOk()->assertExactJson([]);
        $this->getJson('/api/getsuivi', $this->bearer($this->admin))->assertOk()->assertExactJson([]);
    }

    // ---- suivi: insertsuivi / upsuivie --------------------------------------

    public function test_insertsuivi_pushes_and_keeps_history(): void
    {
        $entry = ['date' => '2025-04-18', 'examen_clinnique' => 'ok', 'examen_biologique' => '', 'examen_radiologique' => '', 'traitement' => 'doliprane'];

        $this->putJson('/api/insertsuivi/T1', $entry, $this->bearer($this->admin))->assertOk()->assertJsonPath('valeur', 1);
        $this->putJson('/api/insertsuivi/T1', ['date' => '2025-04-25'] + $entry, $this->bearer($this->admin))->assertOk();

        $suivi = json_decode(json_encode($this->patientDoc()['suivi']), true);
        $this->assertCount(2, $suivi);
        $this->assertSame('2025-04-18', $suivi[0]['date']);
        $this->assertSame('2025-04-25', $suivi[1]['date']);
    }

    public function test_updatesuivie_pushes_a_status_entry_and_answers_json(): void
    {
        $this->putJson('/api/insertsuivi/T1', ['date' => '2025-04-18', 'traitement' => 'x'], $this->bearer($this->admin))->assertOk();

        $this->putJson('/api/updatesuivie/T1', ['date' => '2025-05-02', 'situation' => 'STABLE'], $this->bearer($this->admin))
            ->assertOk()->assertJsonPath('valeur', 1);

        $suivi = json_decode(json_encode($this->patientDoc()['suivi']), true);
        $this->assertCount(2, $suivi);
        $this->assertSame('STABLE', $suivi[1]['situation']);
    }

    public function test_suivi_on_unknown_patient_is_404_and_validated(): void
    {
        $this->putJson('/api/insertsuivi/NOPE', ['date' => '2025-04-18'], $this->bearer($this->admin))->assertStatus(404);
        $this->putJson('/api/updatesuivie/NOPE', ['date' => '2025-04-18', 'situation' => 'x'], $this->bearer($this->admin))->assertStatus(404);
        $this->putJson('/api/updatesuivie/T1', ['date' => '2025-04-18'], $this->bearer($this->admin))->assertStatus(422);
    }

    public function test_deletesuivie_clears_history_and_answers_json(): void
    {
        $this->putJson('/api/insertsuivi/T1', ['date' => '2025-04-18'], $this->bearer($this->admin));

        $this->putJson('/api/deletesuivie/' . $this->patientId(), [], $this->bearer($this->admin))->assertOk()->assertJsonPath('valeur', 1);
        $this->assertArrayNotHasKey('suivi', $this->patientDoc());
        $this->putJson('/api/deletesuivie/' . str_repeat('c', 24), [], $this->bearer($this->admin))->assertStatus(404);
    }

    // ---- creating patients: dedupe + whitelist ------------------------------

    public function test_create_patient_stores_known_fields_and_the_registration_date(): void
    {
        $response = $this->postJson('/api/Posts', [
            'nom' => 'Alami', 'prenom' => 'Sara', 'identite' => 'AB123', 'gsm' => '0600000001',
            'age' => 31, 'role' => 'admin', 'salle_d_attend' => 99,
        ], $this->bearer($this->nurse));

        $response->assertStatus(201)->assertJsonPath('valeur', 1);
        $doc = $this->patientDoc('AB123');
        $this->assertSame('31', $doc['age']);
        $this->assertSame(date('d/m/Y'), $doc['inscription']);
        $this->assertArrayNotHasKey('role', $doc);
        $this->assertArrayNotHasKey('salle_d_attend', $doc);
    }

    public function test_duplicate_patient_by_identite_is_409_with_a_message(): void
    {
        $body = ['nom' => 'Alami', 'prenom' => 'Sara', 'identite' => 'AB123'];
        $this->postJson('/api/Posts', $body, $this->bearer($this->nurse))->assertStatus(201);

        // same CIN, even with a different name: still a duplicate
        $this->postJson('/api/Posts', ['nom' => 'Autre', 'prenom' => 'Nom', 'identite' => 'AB123'], $this->bearer($this->nurse))
            ->assertStatus(409)
            ->assertJsonPath('valeur', 0)
            ->assertJsonPath('message', 'Un patient avec cette identité (CIN) existe déjà.');
        $this->assertSame(1, $this->db->selectCollection('Patients')->countDocuments(['identite' => 'AB123']));
    }

    public function test_duplicate_patient_without_identite_uses_name_and_phone(): void
    {
        $body = ['nom' => 'Bennani', 'prenom' => 'Omar', 'gsm' => '0600000002'];
        $this->postJson('/api/Posts', $body, $this->bearer($this->nurse))->assertStatus(201);

        $this->postJson('/api/Posts', $body, $this->bearer($this->nurse))->assertStatus(409);
        // same name but another phone is a different person
        $this->postJson('/api/Posts', ['gsm' => '0600000003'] + $body, $this->bearer($this->nurse))->assertStatus(201);
    }

    public function test_create_patient_validation(): void
    {
        $this->postJson('/api/Posts', ['prenom' => 'Sans nom'], $this->bearer($this->nurse))->assertStatus(422);
        $this->postJson('/api/Posts', ['nom' => ['$ne' => ''], 'prenom' => 'x'], $this->bearer($this->nurse))->assertStatus(422);
    }

    public function test_duplicate_employee_is_409(): void
    {
        $body = ['nom' => 'Dr Idrissi', 'specialite' => 'Cardiologie', 'telephone' => '0600000010', 'email' => 'idrissi@example.test', 'disponible' => true];
        $this->postJson('/api/Postmedcin', $body, $this->bearer($this->admin))->assertOk()->assertJsonPath('valeur', 1);

        $this->postJson('/api/Postmedcin', $body, $this->bearer($this->admin))
            ->assertStatus(409)->assertJsonPath('message', 'Ce médecin existe déjà.');
    }

    public function test_update_and_delete_employee_answer_json(): void
    {
        $body = ['nom' => 'Dr Idrissi', 'specialite' => 'Cardiologie', 'disponible' => true];
        $this->postJson('/api/Postmedcin', $body, $this->bearer($this->admin))->assertOk();

        $this->putJson('/api/update/' . rawurlencode('Dr Idrissi'), ['specialite' => 'Pédiatrie'] + $body, $this->bearer($this->admin))
            ->assertOk()->assertJsonPath('valeur', 1);
        // saving the same values again is not an error
        $this->putJson('/api/update/' . rawurlencode('Dr Idrissi'), ['specialite' => 'Pédiatrie'] + $body, $this->bearer($this->admin))->assertOk();
        $this->putJson('/api/update/Inconnu', $body, $this->bearer($this->admin))->assertStatus(404);

        $this->deleteJson('/api/delete/' . rawurlencode('Dr Idrissi'), [], $this->bearer($this->admin))->assertOk();
        $this->deleteJson('/api/delete/' . rawurlencode('Dr Idrissi'), [], $this->bearer($this->admin))->assertStatus(404);
    }

    // ---- height / weight, single patient ------------------------------------

    public function test_patient_height_and_weight_are_validated_and_stored_as_numbers(): void
    {
        $ok = ['nom' => 'Mesures', 'prenom' => 'Test', 'identite' => 'M1', 'taille' => '172', 'poids' => 68.5];
        $this->postJson('/api/Posts', $ok, $this->bearer($this->nurse))->assertStatus(201);

        $doc = $this->patientDoc('M1');
        $this->assertSame(172, $doc['taille']);
        $this->assertSame(68.5, $doc['poids']);

        foreach ([['taille' => 20], ['taille' => 400], ['poids' => 1], ['poids' => 900], ['taille' => 'grand'], ['poids' => 'x']] as $bad) {
            $this->postJson('/api/Posts', ['nom' => 'Bad', 'prenom' => 'Test', 'identite' => 'B' . json_encode($bad)] + $bad, $this->bearer($this->nurse))
                ->assertStatus(422);
        }
        $this->assertSame(0, $this->db->selectCollection('Patients')->countDocuments(['nom' => 'Bad']));
    }

    public function test_modifier_patient_updates_height_and_weight_with_the_same_limits(): void
    {
        $id = $this->patientId();

        $this->putJson("/api/modifierPatient/$id", ['taille' => 180, 'poids' => 75], $this->bearer($this->admin))->assertOk();
        $doc = $this->patientDoc();
        $this->assertSame(180, $doc['taille']);
        $this->assertSame(75, $doc['poids']);

        $this->putJson("/api/modifierPatient/$id", ['taille' => 10], $this->bearer($this->admin))->assertStatus(422);
        $this->assertSame(180, $this->patientDoc()['taille']);
    }

    public function test_show_patient_returns_the_record_for_both_roles(): void
    {
        $id = $this->patientId();

        foreach ([$this->admin, $this->nurse] as $token) {
            $this->getJson("/api/patients/$id", $this->bearer($token))
                ->assertOk()->assertJsonPath('identite', 'T1')->assertJsonPath('nom', 'Test');
        }
        $this->getJson('/api/patients/' . str_repeat('a', 24), $this->bearer($this->admin))->assertStatus(404);
        $this->getJson('/api/patients/not-an-id', $this->bearer($this->admin))->assertStatus(422);
        $this->getJson("/api/patients/$id")->assertStatus(401);
    }

    // ---- editing / deleting patients, waiting room, appointments, billing ---

    public function test_modifier_patient_updates_given_fields_for_the_nurse_and_admin_edit_fields(): void
    {
        $id = $this->patientId();

        $this->putJson("/api/modifierPatient/$id", ['nom' => 'Renamed', 'email' => 'p@example.test', 'groupeSanguin' => 'O+', 'ignored' => 'x'], $this->bearer($this->nurse))
            ->assertOk()->assertJsonPath('valeur', 1);

        $doc = $this->patientDoc();
        $this->assertSame('Renamed', $doc['nom']);
        $this->assertSame('p@example.test', $doc['email']);
        $this->assertSame('O+', $doc['groupeSanguin']);
        $this->assertSame('Patient', $doc['prenom']);
        $this->assertArrayNotHasKey('ignored', $doc);

        $this->putJson('/api/modifierPatient/' . str_repeat('d', 24), ['nom' => 'x'], $this->bearer($this->nurse))->assertStatus(404);
    }

    public function test_delete_patient_answers_json(): void
    {
        $id = $this->patientId();
        $this->deleteJson("/api/deletePatient/$id", [], $this->bearer($this->nurse))->assertOk()->assertJsonPath('valeur', 1);
        $this->deleteJson("/api/deletePatient/$id", [], $this->bearer($this->nurse))->assertStatus(404);
        // admin can delete too, and the old admin-only duplicate route is gone
        $this->deleteJson('/api/deletePatient/' . str_repeat('e', 24), [], $this->bearer($this->admin))->assertStatus(404);
        $this->deleteJson('/api/deletePatients/' . str_repeat('e', 24), [], $this->bearer($this->admin))->assertStatus(404);
        $this->getJson('/api/consu', $this->bearer($this->admin))->assertStatus(404);
    }

    public function test_waiting_room_queue(): void
    {
        $patients = $this->db->selectCollection('Patients');
        $patients->insertMany([['nom' => 'A', 'identite' => 'A1'], ['nom' => 'B', 'identite' => 'B1'], ['nom' => 'C', 'identite' => 'C1']]);

        foreach (['A1', 'B1', 'C1'] as $identite) {
            $this->putJson('/api/salle/' . $this->patientId($identite), [], $this->bearer($this->nurse))->assertOk()->assertJsonPath('valeur', 1);
        }
        $this->assertSame([1, 2, 3], array_map(fn ($i) => $this->patientDoc($i)['salle_d_attend'], ['A1', 'B1', 'C1']));

        // removing B moves C up; removing someone who is not waiting changes nothing
        $this->putJson('/api/deleteSalle/' . $this->patientId('B1'), [], $this->bearer($this->nurse))->assertOk();
        $this->assertSame([1, 0, 2], array_map(fn ($i) => $this->patientDoc($i)['salle_d_attend'], ['A1', 'B1', 'C1']));
        $this->putJson('/api/deleteSalle/' . $this->patientId('B1'), [], $this->bearer($this->nurse))->assertOk();
        $this->assertSame([1, 0, 2], array_map(fn ($i) => $this->patientDoc($i)['salle_d_attend'], ['A1', 'B1', 'C1']));

        $this->putJson('/api/salle/' . str_repeat('f', 24), [], $this->bearer($this->nurse))->assertStatus(404);
    }

    public function test_appointment_endpoints_answer_json(): void
    {
        $id = $this->patientId();

        $this->putJson("/api/RendezVous/$id", ['month' => '24/04/2025', 'time' => '09:30'], $this->bearer($this->nurse))->assertOk()->assertJsonPath('valeur', 1);
        $this->putJson("/api/RendezVous/$id", ['time' => '09:30'], $this->bearer($this->nurse))->assertStatus(422);

    }

    public function test_appointments_keep_history_replace_the_same_day_and_refuse_taken_slots(): void
    {
        $id = $this->patientId();
        $this->db->selectCollection('Patients')->insertOne(['nom' => 'Autre', 'identite' => 'O1']);
        $other = $this->patientId('O1');
        $slot = fn (string $month, string $time) => ['month' => $month, 'time' => $time];

        $this->putJson("/api/RendezVous/$id", $slot('01/05/2030', '09:00'), $this->bearer($this->nurse))->assertOk()->assertJsonPath('valeur', 1);
        $this->putJson("/api/RendezVous/$id", $slot('08/05/2030', '10:00'), $this->bearer($this->nurse))->assertOk();

        $rdvs = json_decode(json_encode($this->patientDoc()['rendezVous']), true);
        $this->assertCount(2, $rdvs);
        $this->assertSame(['01/05/2030', '08/05/2030'], array_column($rdvs, 'month'));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{24}$/', $rdvs[0]['rdv_id']);
        $this->assertNotSame($rdvs[0]['rdv_id'], $rdvs[1]['rdv_id']);

        // same patient, same day: that day's appointment is replaced, the other one stays
        $this->putJson("/api/RendezVous/$id", $slot('08/05/2030', '11:00'), $this->bearer($this->nurse))->assertOk();
        $rdvs = json_decode(json_encode($this->patientDoc()['rendezVous']), true);
        $this->assertCount(2, $rdvs);
        $this->assertSame('11:00', $rdvs[1]['time']);

        // a slot someone else holds is refused with 409 and nothing changes
        $this->putJson("/api/RendezVous/$other", $slot('08/05/2030', '11:00'), $this->bearer($this->nurse))
            ->assertStatus(409)->assertJsonPath('message', 'Ce créneau est déjà réservé.');
        $this->assertArrayNotHasKey('rendezVous', $this->patientDoc('O1'));
        // the same time on another day is fine
        $this->putJson("/api/RendezVous/$other", $slot('09/05/2030', '11:00'), $this->bearer($this->nurse))->assertOk();

        $this->putJson('/api/RendezVous/' . str_repeat('a', 24), $slot('01/05/2030', '09:00'), $this->bearer($this->nurse))->assertStatus(404);
    }

    public function test_appointment_is_added_to_a_null_rendezvous_field(): void
    {
        $this->db->selectCollection('Patients')->updateOne(['identite' => 'T1'], ['$set' => ['rendezVous' => null]]);

        $this->putJson('/api/RendezVous/' . $this->patientId(), ['month' => '01/05/2030', 'time' => '09:00'], $this->bearer($this->nurse))->assertOk();

        $this->assertCount(1, $this->patientDoc()['rendezVous']);
    }
}
