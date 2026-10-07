<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Services\FactureService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use MongoDB\BSON\ObjectId;
use MongoDB\Client;

/** Invoices: list / create / show / payments (admin + nurse) and cancel (admin). */
class FactureController extends Controller
{
    use RespondsWithJson;

    public function __construct(protected FactureService $factures)
    {
    }

    /** GET /factures?statut=&patient=&from=&to= */
    public function index(Request $request)
    {
        $validator = $this->check($request->query(), [
            'statut' => ['nullable', Rule::in(['impayée', 'partielle', 'payée', 'annulée'])],
            'patient' => ['nullable', 'regex:/^[a-f0-9]{24}$/'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        return $this->factures->list($request->only(['statut', 'patient', 'from', 'to']));
    }

    public function show($id)
    {
        $facture = $this->factures->find($id);

        return $facture ?: $this->notFound('Facture introuvable.');
    }

    /** POST /factures: total is computed from the lines, never taken from the client. */
    public function store(Request $request)
    {
        $validator = $this->check($request->all(), [
            'patient_id' => ['required', 'regex:/^[a-f0-9]{24}$/'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'consultation_id' => ['nullable', 'regex:/^[a-f0-9]{24}$/'],
            'lignes' => ['required', 'array', 'min:1', 'max:30'],
            'lignes.*.service' => ['required', 'string', 'max:120'],
            'lignes.*.qty' => ['required', 'integer', 'min:1', 'max:1000'],
            'lignes.*.prix' => ['required', 'numeric', 'min:0', 'max:1000000'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $patient = (new Client(env('MONGO_DSN', 'mongodb://localhost:27017')))
            ->selectDatabase(env('MONGO_DB', 'MEDIBuddy'))
            ->selectCollection('Patients')
            ->findOne(['_id' => new ObjectId($request->input('patient_id'))], ['projection' => ['nom' => 1, 'prenom' => 1]]);
        if (!$patient) {
            return $this->notFound('Patient introuvable.');
        }

        $lignes = array_map(fn ($l) => ['service' => trim($l['service']), 'qty' => $l['qty'], 'prix' => $l['prix']], $request->input('lignes'));
        $total = array_sum(array_map(fn ($l) => $l['qty'] * $l['prix'], $lignes));
        if ($total <= 0) {
            return response()->json(['valeur' => 0, 'message' => 'Le total de la facture doit être supérieur à 0.'], 422);
        }

        $facture = $this->factures->create([
            'patient_id' => $request->input('patient_id'),
            'patient_nom' => trim(($patient['prenom'] ?? '') . ' ' . ($patient['nom'] ?? '')),
            'date' => $request->input('date') ?: date('Y-m-d'),
            'lignes' => $lignes,
            'consultation_id' => $request->input('consultation_id'),
        ]);

        return response()->json($facture, 201);
    }

    /** POST /factures/{id}/paiements */
    public function pay(Request $request, $id)
    {
        $validator = $this->check($request->all(), [
            'montant' => ['required', 'numeric', 'gt:0', 'max:10000000'],
            'mode' => ['required', Rule::in(FactureService::MODES)],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        [$status, $facture] = $this->factures->addPayment($id, (float) $request->input('montant'), $request->input('mode'), $request->input('date') ?: date('Y-m-d'));

        return match ($status) {
            'notfound' => $this->notFound('Facture introuvable.'),
            'cancelled' => $this->conflict('Cette facture est annulée.'),
            'overpay' => response()->json(['valeur' => 0, 'message' => 'Le montant dépasse le reste à payer (' . number_format($facture['reste'], 2, ',', ' ') . ' DH).'], 422),
            'conflict' => $this->conflict('La facture vient d\'être modifiée, réessayez.'),
            default => response()->json($facture, 201),
        };
    }

    /** POST /factures/{id}/annuler (admin): soft cancel with a reason; the invoice is kept. */
    public function cancel(Request $request, $id)
    {
        $validator = $this->check($request->all(), ['motif' => ['required', 'string', 'min:3', 'max:255']]);
        if ($validator->fails()) {
            return $this->invalid($validator);
        }

        $user = $request->attributes->get('auth_user');
        [$status, $facture] = $this->factures->cancel($id, trim($request->input('motif')), $user['name'] ?? '');

        return match ($status) {
            'notfound' => $this->notFound('Facture introuvable.'),
            'already' => $this->conflict('Cette facture est déjà annulée.'),
            default => response()->json($facture),
        };
    }
}
