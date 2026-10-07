import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/outline';
import { api } from '../lib/api';
import { useRole } from '../lib/auth';
import { can } from '../lib/permissions';
import { patientId, usePatients } from '../lib/usePatients';
import Modal from '../components/Modal';
import PatientForm from '../components/PatientForm';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

// Only send what the form holds; numbers stay strings, the server validates and converts them.
const toBody = (values) => Object.fromEntries(Object.entries(values).filter(([, v]) => String(v).trim() !== ''));

export default function Patients() {
  const role = useRole();
  const confirm = useConfirm();
  const toast = useToast();
  const { patients, error, refresh } = usePatients();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null | { patient } (patient null = new)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !patients) return patients;
    return patients.filter((p) => [p.nom, p.prenom, p.identite].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [patients, search]);

  const save = async (values) => {
    const editing = form.patient;
    try {
      const response = await api(editing ? `/modifierPatient/${patientId(editing)}` : '/Posts', {
        method: editing ? 'PUT' : 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(toBody(values)),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // e.g. 409 "already exists" or 422 validation: keep the form open and say why
        return data.message || "Impossible d'enregistrer le patient.";
      }
      toast.success(editing ? 'Patient mis à jour.' : 'Patient ajouté.');
      setForm(null);
      refresh();
      return undefined;
    } catch {
      return 'Erreur réseau : le patient n\'a pas été enregistré.';
    }
  };

  const remove = async (patient) => {
    const ok = await confirm({
      title: 'Supprimer le patient',
      message: `Supprimer définitivement ${patient.prenom || ''} ${patient.nom || ''} et tout son dossier ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await api(`/deletePatient/${patientId(patient)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success('Patient supprimé.');
      refresh();
    } catch {
      toast.error('Erreur lors de la suppression du patient.');
    }
  };

  const actions = (patient) => (
    <div className="flex justify-center space-x-1">
      {can(role, 'patients.view') ? (
        <Link to={`/app/patients/${patientId(patient)}`} className="rounded-full p-1 text-indigo-500 transition-colors hover:bg-indigo-100 hover:text-indigo-700" aria-label="Voir détails" title="Voir détails">
          <EyeIcon className="h-5 w-5" />
        </Link>
      ) : null}
      {can(role, 'patients.edit') ? (
        <button type="button" onClick={() => setForm({ patient })} className="rounded-full p-1 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700" aria-label="Modifier" title="Modifier">
          <PencilIcon className="h-5 w-5" />
        </button>
      ) : null}
      {can(role, 'patients.delete') ? (
        <button type="button" onClick={() => remove(patient)} className="rounded-full p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700" aria-label="Supprimer" title="Supprimer">
          <TrashIcon className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par nom, prénom ou CIN"
          aria-label="Rechercher un patient"
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-indigo-400 focus:outline-none sm:max-w-md"
        />
        {can(role, 'patients.create') ? (
          <button type="button" onClick={() => setForm({ patient: null })} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white transition-colors hover:bg-indigo-600">
            <PlusIcon className="h-5 w-5" />
            <span>Ajouter un patient</span>
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">Impossible de charger les patients.</p> : null}
      {!patients && !error ? <p className="text-sm text-gray-500">Chargement…</p> : null}

      {visible ? (
        <>
          <p className="mb-3 text-sm text-gray-500">{visible.length} patient{visible.length > 1 ? 's' : ''}</p>

          {/* table from tablet width up, cards on phones */}
          <div className="hidden overflow-x-auto rounded-lg shadow md:block">
            <table className="w-full border-collapse">
              <thead className="bg-indigo-500 text-white">
                <tr>
                  {['N° Identité', 'Nom et Prénom', 'Sexe', 'GSM', 'Âge', 'Assurance'].map((h) => (
                    <th key={h} className="p-4 text-left text-sm font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="p-4 text-center text-sm font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((patient, index) => (
                  <tr key={patientId(patient) || index} className={`border-b border-gray-200 transition-colors hover:bg-indigo-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-4">{patient.identite || '—'}</td>
                    <td className="p-4 font-medium">{patient.nom} {patient.prenom}</td>
                    <td className="p-4">{patient.sexe || '—'}</td>
                    <td className="p-4">{patient.gsm || 'Non renseigné'}</td>
                    <td className="p-4">{patient.age ? `${patient.age} ans` : '—'}</td>
                    <td className="p-4">{patient.assurance || '—'}</td>
                    <td className="p-4">{actions(patient)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {visible.map((patient, index) => (
              <li key={patientId(patient) || index} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{patient.nom} {patient.prenom}</p>
                    <p className="text-xs text-gray-500">{patient.identite || 'Sans CIN'}</p>
                  </div>
                  {actions(patient)}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                  <dt className="text-gray-400">Sexe</dt><dd>{patient.sexe || '—'}</dd>
                  <dt className="text-gray-400">Âge</dt><dd>{patient.age ? `${patient.age} ans` : '—'}</dd>
                  <dt className="text-gray-400">GSM</dt><dd>{patient.gsm || 'Non renseigné'}</dd>
                  <dt className="text-gray-400">Assurance</dt><dd>{patient.assurance || '—'}</dd>
                </dl>
              </li>
            ))}
          </ul>

          {visible.length === 0 ? <p className="py-8 text-center text-gray-500">Aucun patient trouvé.</p> : null}
        </>
      ) : null}

      {form ? (
        <Modal title={form.patient ? 'Modifier le patient' : 'Ajouter un patient'} onClose={() => setForm(null)}>
          <PatientForm
            initial={form.patient || undefined}
            submitLabel={form.patient ? 'Enregistrer' : 'Ajouter'}
            onSubmit={save}
            onCancel={() => setForm(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
