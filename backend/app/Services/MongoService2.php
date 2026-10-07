<?php

namespace App\Services;

use MongoDB\BSON\ObjectId;
use MongoDB\Client;
use MongoDB\Collection;

/**
 * Patients (create / edit), waiting room, appointments and billing.
 * Methods return plain PHP values (bool / array / string status); the
 * controllers turn them into JSON responses.
 */
class MongoService2
{
    protected $client;
    protected $database;

    public function __construct()
    {
        $this->client = new Client(env('MONGO_DSN', 'mongodb://localhost:27017'));
        $this->database = $this->client->selectDatabase(env('MONGO_DB', 'MEDIBuddy'));
    }

    protected function col(string $name): Collection
    {
        return $this->database->selectCollection($name);
    }

    // Méthode pour récupérer toutes les données d'une collection
    public function all($collectionName)
    {
        return $this->col($collectionName)->find()->toArray();
    }

    /**
     * Creates a patient. Duplicates are detected by identite (CIN) when one is
     * given, otherwise by nom + prenom + gsm.
     *
     * @return bool false when the patient already exists
     */
    public function insertDocument(string $collectionName, array $patient): bool
    {
        if (($patient['identite'] ?? '') !== '') {
            $filter = ['identite' => $patient['identite']];
        } else {
            $filter = [
                'nom' => $patient['nom'],
                'prenom' => $patient['prenom'] ?? '',
                'gsm' => $patient['gsm'] ?? '',
            ];
        }

        if ($this->col($collectionName)->findOne($filter)) {
            return false;
        }

        $this->col($collectionName)->insertOne($patient);

        return true;
    }

    /**
     * Takes a patient out of the waiting room and shifts the ones behind.
     *
     * @return bool false when the patient does not exist
     */
    public function DeletedSalle(string $collection, string $id): bool
    {
        $collect = $this->col($collection);
        $document = $collect->findOne(['_id' => new ObjectId($id)]);
        if (!$document) {
            return false;
        }

        if (isset($document['salle_d_attend']) && $document['salle_d_attend'] > 0) {
            $position = $document['salle_d_attend'];

            // 0 = no longer in the waiting room
            $collect->updateOne(['_id' => new ObjectId($id)], ['$set' => ['salle_d_attend' => 0]]);

            // everyone behind moves up one place
            $collect->updateMany(
                ['salle_d_attend' => ['$gt' => $position]],
                ['$inc' => ['salle_d_attend' => -1]]
            );
        }

        return true;
    }

    /** @return bool false when the patient does not exist */
    public function ModifyPatient(string $collection, string $id, array $fields): bool
    {
        $collection = $this->col($collection);

        if ($fields) {
            return $collection->updateOne(['_id' => new ObjectId($id)], ['$set' => $fields])->getMatchedCount() > 0;
        }

        return (bool) $collection->findOne(['_id' => new ObjectId($id)], ['projection' => ['_id' => 1]]);
    }

    public function DeletedPatient(string $collection, string $id): bool
    {
        return $this->col($collection)->deleteOne(['_id' => new ObjectId($id)])->getDeletedCount() > 0;
    }

    /**
     * Books an appointment for the patient (month = dd/mm/yyyy, time = HH:MM).
     * Earlier appointments are kept (each gets an rdv_id); booking again for a
     * date the patient already has replaces that day's appointment.
     *
     * @return string 'ok' | 'notfound' | 'conflict' (slot already taken by someone else)
     */
    public function InsertDate(string $collectionName, string $id, array $rdv): string
    {
        $collection = $this->col($collectionName);
        $filter = ['_id' => new ObjectId($id)];

        $patient = $collection->findOne($filter, ['projection' => ['rendezVous' => 1]]);
        if (!$patient) {
            return 'notfound';
        }

        $taken = $collection->countDocuments([
            '_id' => ['$ne' => new ObjectId($id)],
            'rendezVous' => ['$elemMatch' => ['month' => $rdv['month'], 'time' => $rdv['time']]],
        ]);
        if ($taken > 0) {
            return 'conflict';
        }

        $entry = ['month' => $rdv['month'], 'time' => $rdv['time'], 'rdv_id' => (string) new ObjectId()];

        if (($patient['rendezVous'] ?? null) instanceof \MongoDB\Model\BSONArray) {
            $collection->updateOne($filter, ['$pull' => ['rendezVous' => ['month' => $rdv['month']]]]);
            $collection->updateOne($filter, ['$push' => ['rendezVous' => $entry]]);
        } else {
            $collection->updateOne($filter, ['$set' => ['rendezVous' => [$entry]]]);
        }

        return 'ok';
    }

    public function rdvPatient($collectionName)
    {
        return $this->col($collectionName)->find(['rendezVous' => ['$exists' => true]])->toArray();
    }

    /** One patient by _id, or null. */
    public function patientById(string $collectionName, string $id)
    {
        return $this->col($collectionName)->findOne(['_id' => new ObjectId($id)]);
    }

    /** Puts the patient at the end of the waiting room. @return bool false when not found */
    public function salle_attend(string $collectionName, string $id): bool
    {
        $collection = $this->col($collectionName);

        $count = $collection->countDocuments(['salle_d_attend' => ['$gt' => 0]]);

        $result = $collection->updateOne(
            ['_id' => new ObjectId($id)],
            ['$set' => ['salle_d_attend' => $count + 1]]
        );

        return $result->getMatchedCount() > 0;
    }
}
