<?php

namespace App\Services;

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\Operation\FindOneAndUpdate;

/**
 * Invoices live in their own `Factures` collection (one document per invoice,
 * pointing at the patient). They are queried across patients (lists, filters,
 * revenue) and keep growing, so embedding them in Patients would bloat every
 * `/all` answer; a separate collection also makes the yearly counter and the
 * date / status filters straightforward.
 *
 * Status (impayée / partielle / payée / annulée) is never stored: it is
 * computed from total, payments and the cancelled flag every time.
 */
class FactureService
{
    public const MODES = ['espèces', 'carte', 'chèque', 'virement'];

    protected $database;

    public function __construct()
    {
        $client = new Client(env('MONGO_DSN', 'mongodb://localhost:27017'));
        $this->database = $client->selectDatabase(env('MONGO_DB', 'MEDIBuddy'));
    }

    protected function factures(): Collection
    {
        return $this->database->selectCollection('Factures');
    }

    public static function money($value): float
    {
        return round((float) $value, 2);
    }

    /** "F-2026-0001": sequential per year; the counter is incremented atomically. */
    public function nextNumber(int $year): string
    {
        $counter = $this->database->selectCollection('counters')->findOneAndUpdate(
            ['_id' => "facture-$year"],
            ['$inc' => ['seq' => 1]],
            ['upsert' => true, 'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER]
        );

        return sprintf('F-%d-%04d', $year, $counter['seq']);
    }

    /**
     * @param array{patient_id:string,patient_nom:string,date:string,lignes:array,consultation_id?:?string,legacy_patient_id?:?string} $data
     */
    public function create(array $data): array
    {
        $lignes = array_map(fn ($l) => [
            'service' => $l['service'],
            'qty' => (int) $l['qty'],
            'prix' => self::money($l['prix']),
        ], $data['lignes']);
        $total = self::money(array_sum(array_map(fn ($l) => $l['qty'] * $l['prix'], $lignes)));

        $doc = [
            'numero' => $this->nextNumber((int) substr($data['date'], 0, 4)),
            'patient_id' => $data['patient_id'],
            'patient_nom' => $data['patient_nom'],
            'date' => $data['date'],
            'lignes' => $lignes,
            'total' => $total,
            'paye' => 0.0,
            'paiements' => [],
            'consultation_id' => $data['consultation_id'] ?? null,
            'annulee' => false,
            'created_at' => new UTCDateTime(),
        ];
        if (!empty($data['legacy_patient_id'])) {
            $doc['legacy_patient_id'] = $data['legacy_patient_id'];
        }

        $id = $this->factures()->insertOne($doc)->getInsertedId();

        return $this->present($this->factures()->findOne(['_id' => $id]));
    }

    /** Raw BSON document -> API array with the computed fields (paye, reste, statut). */
    public function present($doc): array
    {
        $d = json_decode(json_encode($doc), true);
        $paiements = array_map(fn ($p) => [
            'paiement_id' => $p['paiement_id'],
            'date' => $p['date'],
            'montant' => self::money($p['montant']),
            'mode' => $p['mode'],
        ], $d['paiements'] ?? []);
        $paye = self::money(array_sum(array_column($paiements, 'montant')));
        $total = self::money($d['total']);
        $reste = max(0.0, self::money($total - $paye));
        $annulee = (bool) ($d['annulee'] ?? false);

        if ($annulee) {
            $statut = 'annulée';
        } elseif ($reste <= 0.0) {
            $statut = 'payée';
        } elseif ($paye > 0) {
            $statut = 'partielle';
        } else {
            $statut = 'impayée';
        }

        return [
            'id' => $d['_id']['$oid'],
            'numero' => $d['numero'],
            'patient_id' => $d['patient_id'],
            'patient_nom' => $d['patient_nom'],
            'date' => $d['date'],
            'lignes' => $d['lignes'],
            'total' => $total,
            'paiements' => $paiements,
            'paye' => $paye,
            'reste' => $reste,
            'statut' => $statut,
            'consultation_id' => $d['consultation_id'] ?? null,
            'annulee' => $annulee,
            'annulation' => $annulee ? ($d['annulation'] ?? null) : null,
        ];
    }

    public function find(string $id): ?array
    {
        $doc = $this->factures()->findOne(['_id' => new ObjectId($id)]);

        return $doc ? $this->present($doc) : null;
    }

    /** @param array{statut?:?string,patient?:?string,from?:?string,to?:?string} $filters */
    public function list(array $filters = []): array
    {
        $query = [];
        if (!empty($filters['patient'])) {
            $query['patient_id'] = $filters['patient'];
        }
        $range = [];
        if (!empty($filters['from'])) {
            $range['$gte'] = $filters['from'];
        }
        if (!empty($filters['to'])) {
            $range['$lte'] = $filters['to'];
        }
        if ($range) {
            $query['date'] = $range;
        }

        $out = [];
        foreach ($this->factures()->find($query, ['sort' => ['date' => -1, 'numero' => -1]]) as $doc) {
            $facture = $this->present($doc);
            if (!empty($filters['statut']) && $facture['statut'] !== $filters['statut']) {
                continue;
            }
            $out[] = $facture;
        }

        return $out;
    }

    /**
     * Records a payment. Optimistic lock on the stored `paye` so two cashiers
     * cannot together overpay an invoice.
     *
     * @return array{0:string,1:?array} [status, invoice]: ok | notfound | cancelled | overpay | conflict
     */
    public function addPayment(string $id, float $montant, string $mode, string $date): array
    {
        $oid = new ObjectId($id);
        $doc = $this->factures()->findOne(['_id' => $oid]);
        if (!$doc) {
            return ['notfound', null];
        }
        $current = $this->present($doc);
        if ($current['annulee']) {
            return ['cancelled', $current];
        }
        $montant = self::money($montant);
        if ($montant > $current['reste'] + 0.001) {
            return ['overpay', $current];
        }

        $newPaye = self::money($current['paye'] + $montant);
        $result = $this->factures()->updateOne(
            ['_id' => $oid, 'annulee' => false, 'paye' => $doc['paye'] ?? 0.0],
            [
                '$push' => ['paiements' => ['paiement_id' => (string) new ObjectId(), 'date' => $date, 'montant' => $montant, 'mode' => $mode]],
                '$set' => ['paye' => $newPaye],
            ]
        );
        if ($result->getMatchedCount() === 0) {
            return ['conflict', $current];
        }

        return ['ok', $this->find($id)];
    }

    /** @return array{0:string,1:?array} ok | notfound | already */
    public function cancel(string $id, string $motif, string $par): array
    {
        $oid = new ObjectId($id);
        $result = $this->factures()->updateOne(
            ['_id' => $oid, 'annulee' => false],
            ['$set' => ['annulee' => true, 'annulation' => ['date' => date('Y-m-d'), 'motif' => $motif, 'par' => $par]]]
        );
        if ($result->getMatchedCount() === 0) {
            return [$this->factures()->findOne(['_id' => $oid]) ? 'already' : 'notfound', null];
        }

        return ['ok', $this->find($id)];
    }

    /** Whether an invoice for this legacy patient bill was already created. */
    public function legacyExists(string $patientId): bool
    {
        return (bool) $this->factures()->findOne(['legacy_patient_id' => $patientId], ['projection' => ['_id' => 1]]);
    }
}
