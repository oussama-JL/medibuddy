import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useRole } from '../lib/auth';
import { parseDate, formatDateIso } from '../lib/dates';
import { can } from '../lib/permissions';
import { patientId, usePatients } from '../lib/usePatients';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

const byDateDesc = (a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0);

function FollowUpForm({ patients, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ identite: '', date: formatDateIso(), examen_clinnique: '', examen_biologique: '', examen_radiologique: '', traitement: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.identite) {
      setError('Sélectionnez un patient.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { identite, ...body } = form;
      const response = await api(`/insertsuivi/${encodeURIComponent(identite)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Impossible d'enregistrer le suivi.");
        return;
      }
      toast.success('Suivi ajouté.');
      onSaved();
    } catch {
      setError("Erreur réseau : le suivi n'a pas été enregistré.");
    } finally {
      setBusy(false);
    }
  };

  const area = (name, label) => (
    <div>
      <label htmlFor={`fu-${name}`} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <textarea id={`fu-${name}`} name={name} rows={2} value={form[name]} onChange={change} className={INPUT} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label htmlFor="fu-identite" className="mb-1 block text-sm font-medium text-gray-700">Patient</label>
        <select id="fu-identite" name="identite" value={form.identite} onChange={change} className={INPUT} required>
          <option value="">Sélectionner un patient</option>
          {patients.map((p) => <option key={patientId(p)} value={p.identite}>{p.nom} {p.prenom} ({p.identite})</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="fu-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
        <input id="fu-date" type="date" name="date" value={form.date} onChange={change} className={INPUT} required />
      </div>
      {area('examen_clinnique', 'Évolution clinique')}
      {area('examen_biologique', 'Examens biologiques')}
      {area('examen_radiologique', 'Examens radiologiques')}
      {area('traitement', 'Traitement')}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">Ajouter</button>
      </div>
    </form>
  );
}

export default function FollowUp() {
  const role = useRole();
  const confirm = useConfirm();
  const toast = useToast();
  const { patients, error, refresh } = usePatients();

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  const followed = useMemo(
    () => (patients || []).filter((p) => Array.isArray(p.suivi) && p.suivi.length > 0),
    [patients]
  );
  const rows = useMemo(() => {
    const q = name.trim().toLowerCase();
    return q ? followed.filter((p) => `${p.nom || ''} ${p.prenom || ''}`.toLowerCase().includes(q)) : followed;
  }, [followed, name]);
  const canAdd = can(role, 'followup.add');
  // a follow-up is attached to a patient by CIN, so only patients that have one can be added
  const candidates = useMemo(() => (patients || []).filter((p) => p.identite), [patients]);

  const clear = async (patient) => {
    const ok = await confirm({
      title: "Supprimer l'historique de suivi",
      message: `Supprimer tout l'historique de suivi de ${patient.prenom || ''} ${patient.nom || ''} ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await api(`/deletesuivie/${patientId(patient)}`, { method: 'PUT' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success('Historique de suivi supprimé.');
      setOpenId(null);
      refresh();
    } catch {
      toast.error("Erreur lors de la suppression du suivi.");
    }
  };

  if (error) return <p className="text-sm text-red-600">Impossible de charger le suivi.</p>;
  if (!patients) return <p className="text-sm text-gray-500">Chargement…</p>;

  const opened = openId ? followed.find((p) => patientId(p) === openId) : null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Rechercher par nom ou prénom"
          aria-label="Rechercher un patient suivi"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 sm:max-w-md"
        />
        {canAdd ? (
          <button type="button" onClick={() => setAdding(true)} className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">Ajouter un suivi</button>
        ) : null}
      </div>

      <p className="mb-3 text-sm text-gray-500">{followed.length} patient{followed.length > 1 ? 's' : ''} en suivi</p>

      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
            <tr>
              <th className="px-4 py-3">N° identité</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Prénom</th>
              <th className="px-4 py-3">Dernier suivi</th>
              <th className="px-4 py-3">Suivis</th>
              <th className="px-4 py-3">Dernier traitement</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p) => {
              const last = [...p.suivi].sort(byDateDesc)[0];
              return (
                <tr key={patientId(p)} className="hover:bg-blue-50/40">
                  <td className="px-4 py-3">{p.identite || '—'}</td>
                  <td className="px-4 py-3 font-medium">{p.nom}</td>
                  <td className="px-4 py-3">{p.prenom}</td>
                  <td className="px-4 py-3">{last.date || '—'}</td>
                  <td className="px-4 py-3">{p.suivi.length}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600">{last.traitement || last.situation || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setOpenId(patientId(p))} className="rounded-lg bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100">Historique</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((p) => {
          const last = [...p.suivi].sort(byDateDesc)[0];
          return (
            <li key={patientId(p)}>
              <button type="button" onClick={() => setOpenId(patientId(p))} className="w-full rounded-xl border border-gray-200 p-4 text-left shadow-sm">
                <p className="font-semibold text-gray-800">{p.nom} {p.prenom}</p>
                <p className="text-xs text-gray-500">{p.identite || 'Sans CIN'} · {p.suivi.length} suivi{p.suivi.length > 1 ? 's' : ''}</p>
                <p className="mt-1 text-sm text-gray-600">Dernier : {last.date || '—'} {last.traitement ? `· ${last.traitement}` : ''}</p>
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="py-8 text-center text-gray-500">Aucun patient en suivi.</p> : null}

      {adding ? (
        <Modal title="Ajouter un suivi" onClose={() => setAdding(false)}>
          <FollowUpForm patients={candidates} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />
        </Modal>
      ) : null}

      {opened ? (
        <Modal title={`Suivi de ${opened.prenom || ''} ${opened.nom || ''}`.trim()} onClose={() => setOpenId(null)} wide>
          <ol className="space-y-3">
            {[...opened.suivi].sort(byDateDesc).map((entry, index) => (
              <li key={entry.suivi_id || index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-blue-800">{entry.date || 'Date non spécifiée'}{entry.situation ? ` · ${entry.situation}` : ''}</p>
                {[['Évolution clinique', entry.examen_clinnique], ['Examens biologiques', entry.examen_biologique], ['Examens radiologiques', entry.examen_radiologique], ['Traitement', entry.traitement]].map(([label, value]) =>
                  value ? <p key={label} className="mt-1 text-sm text-gray-700"><span className="text-gray-500">{label} : </span>{value}</p> : null
                )}
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-between">
            <Link to={`/app/patients/${patientId(opened)}`} className="rounded-lg border border-indigo-300 px-4 py-2 text-center text-indigo-700 hover:bg-indigo-50">Voir le dossier</Link>
            {can(role, 'followup.clear') ? (
              <button type="button" onClick={() => clear(opened)} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">Supprimer l'historique</button>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
