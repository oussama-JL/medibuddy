<?php

namespace App\Console\Commands;

use App\Services\FactureService;
use Illuminate\Console\Command;
use MongoDB\Client;

/**
 * Turns the old one-bill-per-patient `facturation` field into one invoice each.
 * Idempotent: a patient is only converted once (the field is removed afterwards,
 * and invoices remember the patient they came from).
 */
class MigrateFactures extends Command
{
    protected $signature = 'medibuddy:migrate-factures';

    protected $description = 'Convert the legacy Patients.facturation field into invoices in the Factures collection';

    public function handle(FactureService $factures): int
    {
        $patients = (new Client(env('MONGO_DSN', 'mongodb://localhost:27017')))
            ->selectDatabase(env('MONGO_DB', 'MEDIBuddy'))
            ->selectCollection('Patients');

        $created = 0;
        $skipped = 0;

        foreach ($patients->find(['facturation' => ['$exists' => true]]) as $patient) {
            $legacy = $patient['facturation'];
            $id = (string) $patient['_id'];

            $total = FactureService::money($legacy['total'] ?? 0);
            $paid = FactureService::money($legacy['paye'] ?? 0);
            if (!$legacy instanceof \ArrayAccess || $total <= 0) {
                $skipped++;
                $patients->updateOne(['_id' => $patient['_id']], ['$unset' => ['facturation' => '']]);
                continue;
            }

            if (!$factures->legacyExists($id)) {
                $date = preg_match('/^\d{4}-\d{2}-\d{2}/', (string) ($legacy['date'] ?? '')) ? substr($legacy['date'], 0, 10) : date('Y-m-d');
                $facture = $factures->create([
                    'patient_id' => $id,
                    'patient_nom' => trim(($patient['prenom'] ?? '') . ' ' . ($patient['nom'] ?? '')),
                    'date' => $date,
                    'lignes' => [['service' => 'Consultation', 'qty' => 1, 'prix' => $total]],
                    'legacy_patient_id' => $id,
                ]);
                if ($paid > 0) {
                    $factures->addPayment($facture['id'], min($paid, $total), 'espèces', $date);
                }
                $created++;
            } else {
                $skipped++;
            }

            $patients->updateOne(['_id' => $patient['_id']], ['$unset' => ['facturation' => '']]);
        }

        $this->info("Created {$created} invoice(s); {$skipped} bill(s) skipped.");

        return self::SUCCESS;
    }
}
