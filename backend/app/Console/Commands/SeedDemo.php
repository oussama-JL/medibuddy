<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FactureService;
use Illuminate\Support\Facades\Hash;
use MongoDB\BSON\ObjectId;
use MongoDB\Client;

/**
 * Wipes the app collections and fills them with clearly FAKE demo data
 * (names, CIN "DEMOxxxx", phones 06000000xx). Deterministic: the same call
 * always produces the same people and records; only the dates move with "today".
 */
class SeedDemo extends Command
{
    protected $signature = 'medibuddy:seed-demo {--force : run even when APP_ENV=production}';

    protected $description = 'Wipe and reseed the MEDIBuddy database with fake demo data (admin + nurse demo logins)';

    private const SEED = 20260101;
    private const PATIENT_COUNT = 25;

    private const COLLECTIONS = ['Patients', 'Employes', 'utilisateur', 'Salle_Attente', 'tokens', 'Factures', 'counters'];

    private const LAST_NAMES = ['Alaoui', 'Benali', 'Idrissi', 'Tazi', 'Fassi', 'El Amrani', 'Bennani', 'Chraibi', 'Lahlou', 'Berrada', 'Skalli', 'Ouazzani', 'Sebti', 'Mansouri', 'Zniber', 'Cherkaoui', 'Haddad', 'Bouzid', 'Naciri', 'Kabbaj', 'Squalli', 'Filali', 'Guessous', 'Lamrani', 'Tahiri'];
    private const MEN = ['Youssef', 'Mohamed', 'Hamza', 'Amine', 'Karim', 'Omar', 'Anas', 'Mehdi', 'Rachid', 'Said', 'Ayoub', 'Khalid', 'Tarik'];
    private const WOMEN = ['Fatima', 'Khadija', 'Salma', 'Imane', 'Sara', 'Aya', 'Zineb', 'Hajar', 'Nadia', 'Meryem', 'Houda', 'Latifa'];
    private const INSURANCE = ['CNSS', 'CNOPS', 'AXA', 'Wafa Assurance', 'Saham', 'RMA', 'Aucune'];
    private const HISTORY = [
        'Aucun antécédent notable',
        'Hypertension artérielle traitée',
        'Diabète de type 2 sous metformine',
        "Asthme allergique depuis l'enfance",
        'Appendicectomie en 2015',
        'Allergie à la pénicilline',
        'Tabagisme actif, 10 paquets-années',
        'Migraines récurrentes',
    ];

    /** motif, examen clinique, biologie, imagerie, diagnostic, traitement */
    private const CASES = [
        ['Toux persistante depuis 5 jours', 'Auscultation pulmonaire : quelques sibilants diffus', 'NFS : hyperleucocytose à 12 000/mm³', 'Radiographie thoracique : sans anomalie', 'Bronchite aiguë', 'Amoxicilline 1 g, 2 fois par jour pendant 7 jours'],
        ['Douleurs abdominales épigastriques', 'Abdomen souple, sensibilité épigastrique', 'Aucun examen demandé', 'Échographie abdominale : sans particularité', 'Gastrite', 'Oméprazole 20 mg le matin pendant 4 semaines'],
        ['Céphalées avec fièvre à 38,5 °C', 'T° 38,4 °C, gorge érythémateuse', 'CRP : 24 mg/L', 'Aucun examen demandé', 'Angine virale', 'Paracétamol 1 g, 3 fois par jour pendant 5 jours'],
        ['Contrôle de la tension artérielle', 'TA 150/90 mmHg, FC 78/min', 'Bilan lipidique normal', 'Aucun examen demandé', 'Hypertension artérielle déséquilibrée', 'Amlodipine 5 mg, 1 comprimé par jour'],
        ['Douleur lombaire après effort', 'Rachis lombaire douloureux à la mobilisation', 'Aucun examen demandé', 'Radiographie du rachis lombaire : discopathie L4-L5', 'Lombalgie commune', 'Ibuprofène 400 mg si douleur, repos 5 jours'],
        ['Fatigue et vertiges', 'Pâleur conjonctivale modérée', 'NFS : hémoglobine à 9,8 g/dL', 'Aucun examen demandé', 'Anémie ferriprive', 'Fer 80 mg par jour pendant 3 mois'],
        ['Éruption cutanée prurigineuse', 'Lésions érythémateuses des avant-bras', 'Aucun examen demandé', 'Aucun examen demandé', 'Dermatite allergique', 'Cétirizine 10 mg le soir'],
        ['Rhinite et éternuements', 'Muqueuse nasale pâle et œdématiée', 'Aucun examen demandé', 'Aucun examen demandé', 'Rhinite allergique', 'Sérum physiologique, cétirizine 10 mg le soir'],
        ['Fièvre et courbatures depuis 2 jours', 'T° 38,9 °C, pharynx rouge', 'CRP : 18 mg/L', 'Aucun examen demandé', 'Syndrome grippal', 'Paracétamol 1 g, repos et hydratation'],
    ];

    public function handle(): int
    {
        if (app()->environment('production') && !$this->option('force')) {
            $this->error('APP_ENV=production: refusing to wipe the database. Re-run with --force if you really mean it.');

            return self::FAILURE;
        }

        mt_srand(self::SEED);

        $db = (new Client(env('MONGO_DSN', 'mongodb://localhost:27017')))->selectDatabase(env('MONGO_DB', 'MEDIBuddy'));
        foreach (self::COLLECTIONS as $name) {
            $db->selectCollection($name)->drop();
        }

        $db->selectCollection('utilisateur')->insertMany($this->users());
        $db->selectCollection('Employes')->insertMany($this->employees());
        $db->createCollection('Salle_Attente');
        $patients = $this->patients();
        $db->selectCollection('Patients')->insertMany($patients);
        $invoiceCount = $this->invoices($patients);
        $this->callSilently('medibuddy:migrate-factures');

        $this->info('Demo data created in database "' . env('MONGO_DB', 'MEDIBuddy') . '":');
        $this->line('  patients: ' . count($patients) . ', employees: 3, users: 2, invoices: ' . $invoiceCount);
        $this->line('  admin:     admin@medibuddy.demo / Demo1234!');
        $this->line('  infirmier: infirmier@medibuddy.demo / Demo1234!');

        return self::SUCCESS;
    }

    /**
     * One invoice per consultation, numbered chronologically, with a mix of
     * statuses (paid / partly paid / unpaid) and payment methods.
     */
    private function invoices(array $patients): int
    {
        $service = app(FactureService::class);
        $visits = [];
        foreach ($patients as $patient) {
            foreach ($patient['data'] ?? [] as $visit) {
                $day = \DateTimeImmutable::createFromFormat('j/n/Y', $visit['date']);
                if ($day) {
                    $visits[] = [$day->setTime(0, 0), $patient, $visit];
                }
            }
        }
        usort($visits, fn ($a, $b) => $a[0] <=> $b[0] ?: strcmp((string) $a[1]['identite'], (string) $b[1]['identite']));

        $modes = ['espèces', 'espèces', 'espèces', 'espèces', 'carte', 'carte', 'carte', 'chèque', 'chèque', 'virement'];
        $today = new \DateTimeImmutable('today');
        $count = 0;

        foreach ($visits as $n => [$day, $patient, $visit]) {
            $lignes = [['service' => 'Consultation', 'qty' => 1, 'prix' => 200 + 50 * mt_rand(0, 4)]];
            if (mt_rand(1, 100) <= 35) {
                $lignes[] = ['service' => 'Analyses biologiques', 'qty' => 1, 'prix' => 150 + 50 * mt_rand(0, 5)];
            }
            if (mt_rand(1, 100) <= 20) {
                $lignes[] = ['service' => 'Radiographie', 'qty' => 1, 'prix' => 200 + 50 * mt_rand(0, 3)];
            }

            $facture = $service->create([
                'patient_id' => (string) $patient['_id'],
                'patient_nom' => trim($patient['prenom'] . ' ' . $patient['nom']),
                'date' => $day->format('Y-m-d'),
                'lignes' => $lignes,
                'consultation_id' => $visit['visit_id'],
            ]);

            $roll = mt_rand(1, 100);
            $recent = $day >= $today->modify('-4 days');
            if ($roll <= ($recent ? 45 : 72)) {
                $amount = $facture['total'];            // paid in full
            } elseif ($roll <= ($recent ? 75 : 88)) {
                $amount = round($facture['total'] * mt_rand(40, 70) / 100 / 10) * 10; // deposit
            } else {
                $amount = 0;                             // not paid yet
            }
            if ($amount > 0) {
                $payDay = min($day->modify('+' . mt_rand(0, 3) . ' days'), $today);
                $service->addPayment($facture['id'], (float) $amount, $modes[mt_rand(0, count($modes) - 1)], $payDay->format('Y-m-d'));
            }
            $count++;
        }

        return $count;
    }

    private function users(): array
    {
        return [
            ['nom' => 'Démo', 'prenom' => 'Admin', 'email' => 'admin@medibuddy.demo', 'password' => Hash::make('Demo1234!'), 'role' => 'admin'],
            ['nom' => 'Démo', 'prenom' => 'Infirmier', 'email' => 'infirmier@medibuddy.demo', 'password' => Hash::make('Demo1234!'), 'role' => 'infirmier'],
        ];
    }

    private function employees(): array
    {
        return [
            ['nom' => 'Dr Amine Benkirane', 'specialite' => 'Médecine générale', 'telephone' => '0600000091', 'email' => 'a.benkirane@medibuddy.demo', 'disponible' => true],
            ['nom' => 'Dr Salma Ouazzani', 'specialite' => 'Pédiatrie', 'telephone' => '0600000092', 'email' => 's.ouazzani@medibuddy.demo', 'disponible' => true],
            ['nom' => 'Dr Karim Lahlou', 'specialite' => 'Cardiologie', 'telephone' => '0600000093', 'email' => 'k.lahlou@medibuddy.demo', 'disponible' => false],
        ];
    }

    private function pick(array $list)
    {
        return $list[mt_rand(0, count($list) - 1)];
    }

    private function daysAgo(int $days): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('today'))->modify("-{$days} days");
    }

    private function patients(): array
    {
        $patients = [];
        $waiting = 0;
        $times = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '16:00'];

        for ($i = 1; $i <= self::PATIENT_COUNT; $i++) {
            $woman = $i % 3 === 0;
            // registrations are spread evenly over ~4 months (about one every 5 days), so any
            // stretch of the current month looks like the same stretch of earlier months
            $registered = max(0, (int) round(($i - 1) * 4.8) + mt_rand(-1, 1));
            $first = $woman ? self::WOMEN[($i * 5) % count(self::WOMEN)] : self::MEN[($i * 7) % count(self::MEN)];
            $number = sprintf('%02d', $i);

            $patient = [
                '_id' => new ObjectId(substr(md5("demo-patient-$i"), 0, 24)),
                'nom' => self::LAST_NAMES[($i - 1) % count(self::LAST_NAMES)],
                'prenom' => $first,
                'sexe' => $woman ? 'Femme' : 'Homme',
                'age' => (string) mt_rand(18, 79),
                'gsm' => '06000000' . $number,
                'adresse' => mt_rand(1, 120) . ' Rue Exemple, Casablanca (démo)',
                'assurance' => $this->pick(self::INSURANCE),
                'identite' => 'DEMO' . (1000 + $i * 37),
                'inscription' => $this->daysAgo($registered)->format('d/m/Y'),
                'salle_d_attend' => 0,
            ];

            // height (cm) and weight (kg) for most patients; a few are left without to show the empty state
            if ($i % 6 !== 0) {
                $tall = $woman ? mt_rand(152, 178) : mt_rand(164, 193);
                $patient['taille'] = $tall;
                $patient['poids'] = mt_rand((int) (($tall - 105) * 0.9), (int) (($tall - 100) * 1.35));
            }

            // consultations: a first visit right after registration, then a follow-up every
            // 12-25 days up to today, so activity is steady over time (including this month so far)
            if ($i % 8 !== 0) {
                $offsets = [];
                $o = max(0, $registered - mt_rand(0, 2));
                while ($o >= 0) {
                    $day = $this->daysAgo($o);
                    if ($day->format('N') === '7') {          // no consultations on Sundays
                        $o = $o > 0 ? $o - 1 : $o + 1;
                    }
                    $offsets[] = $o;
                    $o -= mt_rand(12, 25);
                }
                $visits = [];
                foreach ($offsets as $v => $offset) {
                    $case = self::CASES[($i + $v * 2) % count(self::CASES)];
                    $day = $this->daysAgo($offset);
                    $visits[] = [
                        'date' => $day->format('j/n/Y'),
                        'antecedents' => self::HISTORY[($i + $v) % count(self::HISTORY)],
                        'motif_consultation' => $case[0],
                        'examen_clinnique' => $case[1],
                        'examen_biologique' => $case[2],
                        'examen_radiologique' => $case[3],
                        'diagnostique' => $case[4],
                        'traitement' => $case[5],
                        'situation' => $i % 11 === 0 ? 'URGENT' : 'normal',
                        'visit_id' => substr(md5("demo-visit-$i-$v"), 0, 24),
                    ];
                }
                $patient['data'] = $visits;
            }

            // long-term follow-up for a few patients who have consultations
            if (isset($patient['data']) && $i % 3 === 1) {
                $patient['suivi'] = [
                    [
                        'date' => $this->daysAgo(mt_rand(20, 60))->format('Y-m-d'),
                        'examen_clinnique' => 'Évolution favorable, tension mieux contrôlée',
                        'examen_biologique' => 'Glycémie à jeun : 1,10 g/L',
                        'examen_radiologique' => 'Aucun examen demandé',
                        'traitement' => 'Poursuite du traitement en cours',
                        'suivi_id' => substr(md5("demo-suivi-$i-0"), 0, 24),
                    ],
                    [
                        'date' => $this->daysAgo(mt_rand(1, 19))->format('Y-m-d'),
                        'examen_clinnique' => 'Bon état général',
                        'examen_biologique' => 'Bilan de contrôle normal',
                        'examen_radiologique' => 'Aucun examen demandé',
                        'traitement' => 'Contrôle dans 3 mois',
                        'suivi_id' => substr(md5("demo-suivi-$i-1"), 0, 24),
                    ],
                ];
            }

            // appointments: some today, some this week, some earlier / later; a few patients also have a past one
            $rdv = fn (\DateTimeImmutable $day, string $time, int $n) => [
                'month' => $day->format('d/m/Y'),
                'time' => $time,
                'rdv_id' => substr(md5("demo-rdv-$i-$n"), 0, 24),
            ];
            $today = new \DateTimeImmutable('today');
            if ($i <= 4) {
                $patient['rendezVous'] = [$rdv($today, $times[$i * 2 % count($times)], 0)];
            } elseif ($i <= 12) {
                $patient['rendezVous'] = [$rdv($today->modify('+' . (($i - 4) % 6 + 1) . ' days'), $times[$i % count($times)], 0)];
            } elseif ($i <= 16) {
                $patient['rendezVous'] = [$rdv($this->daysAgo(mt_rand(2, 25)), $times[$i % count($times)], 0)];
            }
            if ($i % 2 === 0 && $i <= 12) {
                // earlier visit before the upcoming one: appointment history
                array_unshift($patient['rendezVous'], $rdv($this->daysAgo(mt_rand(10, 40)), $times[($i + 3) % count($times)], 1));
            }

            // a few people in the waiting room right now
            if ($i >= 21 && $i <= 24) {
                $patient['salle_d_attend'] = ++$waiting;
            }

            $patients[] = $patient;
        }

        return $patients;
    }
}
