import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CgProfile } from 'react-icons/cg';
import { IoMdArrowBack } from 'react-icons/io';
import { FaIdCard, FaMapMarkerAlt } from 'react-icons/fa';
import { BsGenderMale, BsGenderFemale } from 'react-icons/bs';
import { MdOutlineHistoryEdu } from 'react-icons/md';
import { api } from '../lib/api';
import { computeBmi } from '../lib/bmi';
import { fetchFactures } from '../lib/factures';
import { formatMoney } from '../lib/money';
import { StatusChip } from '../components/InvoiceModals';

const TABS = [
  { id: 'antecedents', label: 'Les antécédents', icon: '📋', title: 'Antécédents médicaux', field: 'antecedents', empty: 'Aucun antécédent médical enregistré' },
  { id: 'motifs', label: 'Motifs de consultation', icon: '🔍', title: 'Motifs de consultation', field: 'motif_consultation', empty: 'Aucune information disponible' },
  { id: 'examens', label: 'Examens cliniques', icon: '🩺', title: 'Examens cliniques', field: 'examen_clinnique', empty: 'Aucun examen clinique disponible' },
  { id: 'biologiques', label: 'Examens Biologiques', icon: '🧪', title: 'Examens Biologiques', field: 'examen_biologique', empty: 'Aucun examen biologique disponible' },
  { id: 'radiologiques', label: 'Examens Radiologiques', icon: '📊', title: 'Examens Radiologiques', field: 'examen_radiologique', empty: 'Aucun examen radiologique disponible' },
  { id: 'diagnostic', label: 'Diagnostic', icon: '📝', title: 'Diagnostic', field: 'diagnostique', empty: 'Aucun diagnostic disponible' },
  { id: 'traitements', label: 'Les traitements', icon: '💊', title: 'Traitements', field: 'traitement', empty: 'Aucun traitement disponible' },
];

const CARD = 'overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg';
const CARD_HEAD = 'bg-gradient-to-r from-indigo-600 to-blue-700 p-4 text-white';

function Row({ label, children }) {
  return (
    <div className="flex p-4 transition-colors hover:bg-gray-50">
      <div className="flex-1 font-medium text-gray-600">{label}</div>
      <div className="flex-1 text-right text-gray-800">{children}</div>
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [activeTab, setActiveTab] = useState('motifs');
  const [factures, setFactures] = useState(null);

  useEffect(() => {
    fetchFactures({ patient: id }).then(setFactures).catch(() => setFactures([]));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api(`/patients/${id}`)
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404 || response.status === 422) return setStatus('notfound');
        if (!response.ok) return setStatus('error');
        setPatient(await response.json());
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = (
    <Link to="/app/patients" className="flex items-center font-medium text-indigo-700 transition-colors hover:text-indigo-900" aria-label="Retour à la liste des patients">
      <IoMdArrowBack className="mr-2 text-xl" />
      <span>Retour à la liste</span>
    </Link>
  );

  if (status !== 'ready') {
    const message = { loading: 'Chargement…', notfound: 'Patient introuvable.', error: 'Impossible de charger le dossier.' }[status];
    return (
      <div>
        <div className="mb-6">{back}</div>
        <p className="text-gray-500">{message}</p>
      </div>
    );
  }

  const visits = Array.isArray(patient.data) ? patient.data : [];
  const bmi = computeBmi(patient.taille, patient.poids);
  const tab = TABS.find((t) => t.id === activeTab);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        {back}
        <h1 className="hidden text-2xl font-bold text-gray-800 sm:block">Dossier Patient</h1>
        <div className="w-24"></div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className="flex items-center text-xl font-semibold"><CgProfile className="mr-2" /> Profil du Patient</h2>
          </div>
          <div className="p-6 text-center">
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 shadow-lg">
              <CgProfile size={80} color="white" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800">{patient.nom} {patient.prenom}</h2>
            <div className="mb-3 inline-block whitespace-nowrap rounded-full border border-gray-200 px-3 py-1 text-sm font-medium">
              <FaIdCard className="mr-2 inline-block text-indigo-600" />{patient.identite || '—'}
            </div>
            <p className="flex items-center justify-center text-gray-600">
              <FaMapMarkerAlt className="mr-2 text-indigo-600" />{patient.adresse || '—'}
            </p>
            <div className="mt-4 flex justify-center">
              {bmi ? (
                <div className={`flex items-center rounded-lg px-4 py-2 text-sm font-bold ${bmi.color}`}>IMC : {bmi.value.toFixed(1)} · {bmi.label}</div>
              ) : (
                <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">IMC : —</div>
              )}
            </div>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className="text-xl font-semibold">Informations Personnelles</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <Row label="Sexe">
              {patient.sexe === 'Homme' ? (
                <span className="flex items-center justify-end text-blue-600"><BsGenderMale className="mr-2" /> Masculin</span>
              ) : patient.sexe === 'Femme' ? (
                <span className="flex items-center justify-end text-pink-600"><BsGenderFemale className="mr-2" /> Féminin</span>
              ) : '—'}
            </Row>
            <Row label="Âge">{patient.age ? `${patient.age} ans` : '—'}</Row>
            <Row label="Assurance">{patient.assurance || '—'}</Row>
            <Row label="GSM">{patient.gsm || '—'}</Row>
            <Row label="Taille">{patient.taille ? `${patient.taille} cm` : '—'}</Row>
            <Row label="Poids">{patient.poids ? `${patient.poids} kg` : '—'}</Row>
          </div>
        </div>

        <div className={CARD}>
          <div className={CARD_HEAD}>
            <h2 className="flex items-center text-xl font-semibold"><MdOutlineHistoryEdu className="mr-2" /> Historique des Consultations</h2>
          </div>
          <div className="p-4">
            {visits.length > 0 ? (
              <div className="space-y-3">
                {visits.map((v, index) => (
                  <div key={v.visit_id || index} className="rounded-r-lg border-l-4 border-blue-500 bg-blue-50 p-3 transition-colors hover:bg-blue-100">
                    <div className="text-sm font-medium text-blue-800">{v.date || 'Date non spécifiée'}</div>
                    <div className="mt-1 text-sm text-gray-700">{v.diagnostique || v.motif_consultation || 'Consultation'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-gray-500">
                <MdOutlineHistoryEdu size={40} className="mb-2 text-gray-400" />
                <p>Aucune consultation enregistrée</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-6 ${CARD}`}>
        <div className={CARD_HEAD}>
          <h2 className="text-xl font-semibold">Factures</h2>
        </div>
        <div className="p-4">
          {factures === null ? <p className="text-sm text-gray-500">Chargement…</p> : factures.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune facture pour ce patient.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {factures.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-medium text-gray-800">{f.numero}</span>
                  <span className="text-gray-500">{f.date.split('-').reverse().join('/')}</span>
                  <span>{formatMoney(f.total)}</span>
                  <span className="text-gray-500">reste {formatMoney(f.reste)}</span>
                  <StatusChip statut={f.statut} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md">
        <div className="flex overflow-x-auto bg-gray-50" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center whitespace-nowrap px-6 py-4 font-medium transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-indigo-50'}`}
            >
              <span className="mr-2">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="p-6" role="tabpanel">
          {visits.length > 0 ? (
            <>
              <h3 className="mb-3 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-800">{tab.title}</h3>
              <div className="space-y-4">
                {visits.map((v, index) => (
                  <div key={v.visit_id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-2 text-sm font-medium text-blue-800">{v.date || 'Date non spécifiée'}</div>
                    <p className="text-gray-700">{v[tab.field] || tab.empty}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-gray-500">Aucune information disponible</div>
          )}
        </div>
      </div>
    </div>
  );
}
