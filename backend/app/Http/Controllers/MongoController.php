<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Services\MongoService;
use Illuminate\Http\Request;

/** Employees, consultations (`data`) and follow-ups (`suivi`). */
class MongoController extends Controller
{
    use RespondsWithJson;

    protected $mongoService;

    public function __construct(MongoService $mongoService)
    {
        $this->mongoService = $mongoService;
    }

    public function getAllPosts()
    {
        return $this->mongoService->all('Patients');
    }

    // ---- Employees -------------------------------------------------------

    /** Only these fields are stored; anything else in the body is ignored. */
    protected function employeeFields(Request $request): array
    {
        return [
            'nom' => $this->str($request->input('nom')),
            'specialite' => $this->str($request->input('specialite')),
            'telephone' => $this->str($request->input('telephone')),
            'email' => $this->str($request->input('email')),
            'disponible' => $request->boolean('disponible'),
        ];
    }

    protected function employeeRules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:120'],
            'specialite' => ['nullable', 'string', 'max:120'],
            'telephone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'string', 'max:160'],
        ];
    }

    public function Postmedecin(Request $request)
    {
        $validator = $this->check($request->all(), $this->employeeRules());
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        if (!$this->mongoService->insertMedecin('Employes', $this->employeeFields($request))) {
            return $this->conflict('Ce médecin existe déjà.');
        }

        return $this->ok('Médecin ajouté.');
    }

    public function getAllEmployee()
    {
        return $this->mongoService->all('Employes');
    }

    public function Delete($nom)
    {
        if (!$this->mongoService->deletemplo('Employes', $nom)) {
            return $this->notFound('Médecin introuvable.');
        }

        return $this->ok('Médecin supprimé.');
    }

    public function update(Request $request, $nom)
    {
        $validator = $this->check($request->all(), $this->employeeRules());
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        if (!$this->mongoService->updateemploi('Employes', $nom, $this->employeeFields($request))) {
            return $this->notFound('Médecin introuvable.');
        }

        return $this->ok('Mise à jour réussie.');
    }

    // ---- Consultations ---------------------------------------------------

    public function checkdta()
    {
        return $this->mongoService->patientchackdata('Patients');
    }

    /** PUT /add/{id}: adds a consultation to the patient with that _id. */
    public function adddata(Request $request, $id)
    {
        $validator = $this->check($request->all(), [
            'date' => ['required', 'string', 'max:20'],
            'antecedents' => ['nullable', 'string', 'max:5000'],
            'motif_consultation' => ['nullable', 'string', 'max:5000'],
            'examen_clinnique' => ['nullable', 'string', 'max:5000'],
            'examen_biologique' => ['nullable', 'string', 'max:5000'],
            'examen_radiologique' => ['nullable', 'string', 'max:5000'],
            'diagnostique' => ['nullable', 'string', 'max:5000'],
            'traitement' => ['nullable', 'string', 'max:5000'],
            'situation' => ['nullable', 'string', 'max:100'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $visit = [
            'date' => $this->str($request->input('date')),
            'antecedents' => $request->input('antecedents'),
            'motif_consultation' => $request->input('motif_consultation'),
            'examen_clinnique' => $request->input('examen_clinnique'),
            'examen_biologique' => $request->input('examen_biologique'),
            'examen_radiologique' => $request->input('examen_radiologique'),
            'diagnostique' => $request->input('diagnostique'),
            'traitement' => $request->input('traitement'),
            'situation' => $request->input('situation'),
        ];

        if (!$this->mongoService->insertepatient('Patients', $visit, $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Consultation ajoutée.');
    }

    /**
     * DELETE /deletevisit/{id}?visit_id=... (or ?date=d/m/yyyy for entries
     * saved before visit ids existed): removes one consultation.
     */
    public function deleteVisit(Request $request, $id)
    {
        $visitId = $request->query('visit_id');
        $date = $request->query('date');
        if (!is_string($visitId) && !is_string($date)) {
            return response()->json(['valeur' => 0, 'message' => 'visit_id ou date requis.'], 422);
        }
        if (is_string($visitId) && !preg_match('/^[a-f0-9]{24}$/', $visitId)) {
            return response()->json(['valeur' => 0, 'message' => 'visit_id invalide.'], 422);
        }

        if (!$this->mongoService->deletdatapatients('Patients', $id, is_string($visitId) ? $visitId : null, is_string($date) ? $date : null)) {
            return $this->notFound('Consultation introuvable.');
        }

        return $this->ok('Consultation supprimée.');
    }

    // ---- Follow-ups (suivi) ----------------------------------------------

    public function cheksuivi()
    {
        return $this->mongoService->patientchacksuivi('Patients');
    }

    /** PUT /insertsuivi/{identite}: appends a follow-up entry. */
    public function insertsuivii(Request $request, $id)
    {
        $validator = $this->check($request->all(), [
            'date' => ['required', 'string', 'max:20'],
            'examen_clinnique' => ['nullable', 'string', 'max:5000'],
            'examen_biologique' => ['nullable', 'string', 'max:5000'],
            'examen_radiologique' => ['nullable', 'string', 'max:5000'],
            'traitement' => ['nullable', 'string', 'max:5000'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $entry = [
            'date' => $this->str($request->input('date')),
            'examen_clinnique' => $request->input('examen_clinnique'),
            'examen_biologique' => $request->input('examen_biologique'),
            'examen_radiologique' => $request->input('examen_radiologique'),
            'traitement' => $request->input('traitement'),
        ];

        if (!$this->mongoService->insertsuivi('Patients', $entry, (string) $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Suivi ajouté.');
    }

    /** PUT /updatesuivie/{identite}: appends a follow-up status entry. */
    public function updatesuivie(Request $request, $id)
    {
        $validator = $this->check($request->all(), [
            'date' => ['required', 'string', 'max:20'],
            'situation' => ['required', 'string', 'max:100'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $entry = [
            'date' => $this->str($request->input('date')),
            'situation' => $this->str($request->input('situation')),
        ];

        if (!$this->mongoService->upsuivie('Patients', $entry, (string) $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Suivi mis à jour.');
    }

    /** PUT /deletesuivie/{id}: clears the patient's follow-up history. */
    public function deletesuivie($id)
    {
        if (!$this->mongoService->deleteS('Patients', $id)) {
            return $this->notFound('Patient introuvable.');
        }

        return $this->ok('Suivi supprimé.');
    }
}
