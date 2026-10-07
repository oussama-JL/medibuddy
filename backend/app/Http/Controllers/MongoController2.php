<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Services\MongoService2;
use Illuminate\Http\Request;

/** Patients, waiting room, appointments and billing. */
class MongoController2 extends Controller
{
    use RespondsWithJson;

    protected $mongoService;

    public function __construct(MongoService2 $mongoService)
    {
        $this->mongoService = $mongoService;
    }

    /** Patient fields the app knows about; nothing else is stored from a request. */
    protected const PATIENT_FIELDS = ['nom', 'prenom', 'sexe', 'age', 'gsm', 'adresse', 'assurance', 'identite', 'situation'];

    /** Extra fields the admin edit form can change on an existing patient. */
    protected const PATIENT_EDIT_FIELDS = ['email', 'dateNaissance', 'groupeSanguin', 'status'];

    /** Numeric patient fields with their allowed range: height in cm, weight in kg. */
    protected const PATIENT_MEASURES = ['taille' => [50, 250], 'poids' => [2, 400]];

    protected function patientRules(bool $creating): array
    {
        $rules = [];
        foreach (self::PATIENT_MEASURES as $field => [$min, $max]) {
            $rules[$field] = ['nullable', 'numeric', "between:{$min},{$max}"];
        }
        foreach (array_merge(self::PATIENT_FIELDS, self::PATIENT_EDIT_FIELDS) as $field) {
            $rules[$field] = ['nullable', 'string', 'max:200'];
        }
        if ($creating) {
            $rules['nom'] = ['required', 'string', 'max:120'];
            $rules['prenom'] = ['required', 'string', 'max:120'];
        }

        return $rules;
    }

    public function getAllPosts()
    {
        return $this->mongoService->all('Patients');
    }

    /** GET /patients/{id}: one patient record. */
    public function showPatient($id)
    {
        $patient = $this->mongoService->patientById('Patients', $id);
        if (!$patient) {
            return $this->notFound('Patient introuvable.');
        }

        return $patient;
    }

    /** POST /Posts: creates a patient (409 when it already exists). */
    public function createPost(Request $request)
    {
        $validator = $this->check($request->all(), $this->patientRules(true));
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $patient = [];
        foreach (self::PATIENT_FIELDS as $field) {
            $patient[$field] = $this->str($request->input($field));
        }
        foreach (array_keys(self::PATIENT_MEASURES) as $field) {
            if ($this->str($request->input($field)) !== '') {
                $patient[$field] = $request->input($field) + 0;
            }
        }
        // registration date (dd/mm/yyyy), used by the dashboard's "new patients"
        $patient['inscription'] = date('d/m/Y');

        if (!$this->mongoService->insertDocument('Patients', $patient)) {
            $message = $patient['identite'] !== ''
                ? 'Un patient avec cette identité (CIN) existe déjà.'
                : 'Un patient avec ce nom, prénom et téléphone existe déjà.';

            return $this->conflict($message);
        }

        return response()->json(['valeur' => 1, 'message' => 'Patient ajouté.'], 201);
    }

    /** PUT /salle/{id}: puts the patient at the end of the waiting room. */
    public function salle(Request $request, $id)
    {
        if (!$this->mongoService->salle_attend('Patients', $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Patient ajouté à la salle d\'attente.');
    }

    public function getSalle()
    {
        return $this->mongoService->all('Salle_Attente');
    }

    /** PUT /deleteSalle/{id}: removes the patient from the waiting room. */
    public function deleteSalle($id)
    {
        if (!$this->mongoService->DeletedSalle('Patients', $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Patient retiré de la salle d\'attente.');
    }

    /** PUT /modifierPatient/{id}: updates the fields that were sent (non-empty ones). */
    public function modifierPatient(Request $request, $id)
    {
        $validator = $this->check($request->all(), $this->patientRules(false));
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $fields = [];
        foreach (array_merge(self::PATIENT_FIELDS, self::PATIENT_EDIT_FIELDS) as $field) {
            $value = $this->str($request->input($field));
            if ($value !== '') {
                $fields[$field] = $value;
            }
        }

        foreach (array_keys(self::PATIENT_MEASURES) as $field) {
            if ($this->str($request->input($field)) !== '') {
                $fields[$field] = $request->input($field) + 0;
            }
        }

        if (!$this->mongoService->ModifyPatient('Patients', $id, $fields)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Patient mis à jour.');
    }

    /** DELETE /deletePatient/{id}: admin and nurse; the UI always asks for confirmation first. */
    public function deletePatient($id)
    {
        if (!$this->mongoService->DeletedPatient('Patients', $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Patient supprimé.');
    }

    /** PUT /RendezVous/{id}: books an appointment (history is kept; 409 when the slot is taken). */
    public function RendezVous(Request $request, $id)
    {
        $validator = $this->check($request->all(), [
            'month' => ['required', 'string', 'max:20'],
            'time' => ['required', 'string', 'max:10'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $rdv = ['month' => $this->str($request->input('month')), 'time' => $this->str($request->input('time'))];
        $status = $this->mongoService->InsertDate('Patients', $id, $rdv);
        if ($status === 'notfound') {
            return $this->notFound('Patient introuvable.');
        }
        if ($status === 'conflict') {
            return $this->conflict('Ce créneau est déjà réservé.');
        }

        return $this->ok('Rendez-vous enregistré.');
    }

    public function getAllRdv()
    {
        return $this->mongoService->rdvPatient('Patients');
    }
}
