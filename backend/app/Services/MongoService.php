<?php

namespace App\Services;

use MongoDB\BSON\ObjectId;
use MongoDB\Client;
use MongoDB\Collection;

/**
 * Employees, consultations (`data`), follow-ups (`suivi`) and patient removal.
 * Methods return plain PHP values (bool / array); the controllers turn them
 * into JSON responses.
 */
class MongoService
{
    protected $client;
    protected $database;

    public function __construct()
    {
        // Connexion à MongoDB
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

    /** Inserts an employee; false when one with the same name (and phone, if given) exists. */
    public function insertMedecin(string $collectionName, array $data): bool
    {
        $filter = ['nom' => $data['nom']];
        if (($data['telephone'] ?? '') !== '') {
            $filter['telephone'] = $data['telephone'];
        }
        if ($this->col($collectionName)->findOne($filter)) {
            return false;
        }
        $this->col($collectionName)->insertOne($data);

        return true;
    }

    public function deletemplo(string $collectionName, string $nom): bool
    {
        return $this->col($collectionName)->deleteOne(['nom' => $nom])->getDeletedCount() > 0;
    }

    /** @return bool false when no employee has that name */
    public function updateemploi(string $collectionName, string $nom, array $data): bool
    {
        $result = $this->col($collectionName)->updateOne(['nom' => $nom], ['$set' => $data]);

        return $result->getMatchedCount() > 0;
    }

    /**
     * Adds one consultation to the patient identified by its _id.
     * Every new entry gets a visit_id so it can be deleted precisely later.
     *
     * @return bool false when the patient does not exist
     */
    public function insertepatient(string $collectionName, array $visit, string $id): bool
    {
        $collection = $this->col($collectionName);
        $filter = ['_id' => new ObjectId($id)];

        $patient = $collection->findOne($filter, ['projection' => ['data' => 1]]);
        if (!$patient) {
            return false;
        }

        $visit['visit_id'] = (string) new ObjectId();

        $existing = $patient['data'] ?? null;
        if ($existing instanceof \MongoDB\Model\BSONArray) {
            $collection->updateOne($filter, ['$push' => ['data' => $visit]]);
        } else {
            // no `data` yet (or a null left by older code): start the list
            $collection->updateOne($filter, ['$set' => ['data' => [$visit]]]);
        }

        return true;
    }

    /** Patients that have at least one consultation. */
    public function patientchackdata(string $collectionName): array
    {
        return $this->col($collectionName)->find(['data' => ['$exists' => true]])->toArray();
    }

    /**
     * Removes one consultation from a patient. `$visitId` targets entries
     * written with a visit_id; `$date` is the fallback for older entries that
     * have none (only entries without a visit_id are matched that way).
     *
     * @return bool true when an entry was removed
     */
    public function deletdatapatients(string $collectionName, string $id, ?string $visitId, ?string $date): bool
    {
        if ($visitId) {
            $pull = ['visit_id' => $visitId];
        } elseif ($date) {
            $pull = ['date' => $date, 'visit_id' => ['$exists' => false]];
        } else {
            return false;
        }

        $result = $this->col($collectionName)->updateOne(
            ['_id' => new ObjectId($id)],
            ['$pull' => ['data' => $pull]]
        );

        return $result->getModifiedCount() > 0;
    }

    /**
     * Appends a follow-up (suivi) entry; earlier entries are kept.
     *
     * @return bool false when no patient has that identite
     */
    public function insertsuivi(string $collectionName, array $entry, string $identite): bool
    {
        return $this->pushSuivi($collectionName, $identite, $entry);
    }

    /** Appends a follow-up status entry (date + situation); history is kept. */
    public function upsuivie(string $collectionName, array $entry, string $identite): bool
    {
        return $this->pushSuivi($collectionName, $identite, $entry);
    }

    protected function pushSuivi(string $collectionName, string $identite, array $entry): bool
    {
        $collection = $this->col($collectionName);
        $patient = $collection->findOne(['identite' => $identite], ['projection' => ['suivi' => 1]]);
        if (!$patient) {
            return false;
        }

        $entry['suivi_id'] = (string) new ObjectId();

        if (($patient['suivi'] ?? null) instanceof \MongoDB\Model\BSONArray) {
            $collection->updateOne(['_id' => $patient['_id']], ['$push' => ['suivi' => $entry]]);
        } else {
            $collection->updateOne(['_id' => $patient['_id']], ['$set' => ['suivi' => [$entry]]]);
        }

        return true;
    }

    /** Patients that have both consultations and follow-ups. */
    public function patientchacksuivi(string $collectionName): array
    {
        return $this->col($collectionName)
            ->find(['suivi' => ['$exists' => true], 'data' => ['$exists' => true]])
            ->toArray();
    }

    /** Clears the whole follow-up history of a patient. */
    public function deleteS(string $collectionName, string $id): bool
    {
        $result = $this->col($collectionName)->updateOne(['_id' => new ObjectId($id)], ['$unset' => ['suivi' => '']]);

        return $result->getMatchedCount() > 0;
    }
}
