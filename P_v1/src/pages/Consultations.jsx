import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useRole } from '../lib/auth';
import { parseDate, formatDateShort } from '../lib/dates';
import { can } from '../lib/permissions';
import { patientId, usePatients } from '../lib/usePatients';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const SITUATIONS = [
  { value: 'normal', label: 'NORMAL', badge: 'bg-green-500' },
  { value: 'URGENT', label: 'URGENT', badge: 'bg-red-500' },
  { value: 'EN ATTEND', label: 'EN ATTENTE', badge: 'bg-yellow-500' },
];

function StatusBadge({ status }) {
  const known = SITUATIONS.find((s) => s.value === status);
  return <span className={`rounded-full px-3 py-1 text-xs font-medium text-white ${known ? known.badge : 'bg-gray-500'}`}>{known ? known.label : status || '—'}</span>;
}

const latest = (patient) => patient.data[patient.data.length - 1];
const INPUT = 'w-full rounded-md border border-gray-300 p-2 text-sm';

const EMPTY_FORM = { id: '', antecedents: '', motif_consultation: '', examen_clinnique: '', examen_biologique: '', examen_radiologique: '', diagnostique: '', traitement: '', situation: 'normal' };

function ConsultationForm({ patients, onSaved, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM, date: formatDateShort() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const waiting = patients.filter((p) => p.salle_d_attend > 0).sort((a, b) => a.salle_d_attend - b.salle_d_attend);
  const others = patients.filter((p) => !(p.salle_d_attend > 0));
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (!form.id) {
      setError('Sélectionnez un patient.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { id, ...body } = form;
      const response = await api(`/add/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Impossible d'enregistrer la consultation.");
        return;
      }
      toast.success('Consultation ajoutée.');
      onSaved();
    } catch {
      setError("Erreur réseau : la consultation n'a pas été enregistrée.");
    } finally {
      setBusy(false);
    }
  };

  const area = (name, label) => (
    <div>
      <label htmlFor={`cf-${name}`} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <textarea id={`cf-${name}`} name={name} rows={2} value={form[name]} onChange={change} className={INPUT} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      <div>
        <label htmlFor="cf-id" className="mb-1 block text-sm font-medium text-gray-700">Nom et prénom</label>
        <select id="cf-id" name="id" value={form.id} onChange={change} className={INPUT} required>
          <option value="">Sélectionner un patient</option>
          {waiting.length ? (
            <optgroup label="En salle d'attente">
              {waiting.map((p) => <option key={patientId(p)} value={patientId(p)}>{p.nom} {p.prenom}</option>)}
            </optgroup>
          ) : null}
          <optgroup label="Autres patients">
            {others.map((p) => <option key={patientId(p)} value={patientId(p)}>{p.nom} {p.prenom}</option>)}
          </optgroup>
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input id="cf-date" name="date" value={form.date} onChange={change} className={INPUT} required />
        </div>
        <div>
          <label htmlFor="cf-situation" className="mb-1 block text-sm font-medium text-gray-700">Situation</label>
          <select id="cf-situation" name="situation" value={form.situation} onChange={change} className={INPUT}>
            {SITUATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>
      {area('antecedents', 'Antécédents')}
      {area('motif_consultation', 'Motif de consultation')}
      {area('examen_clinnique', 'Examen clinique')}
      {area('examen_biologique', 'Examen biologique')}
      {area('examen_radiologique', 'Examen radiologique')}
      {area('diagnostique', 'Diagnostic')}
      {area('traitement', 'Traitement')}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Annuler</button>
        <button type="submit" disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">Ajouter</button>
      </div>
    </form>
  );
}

function Detail({ patient, onClose }) {
  const toast = useToast();
  const last = latest(patient);

  const exportPdf = async (name) => {
    try {
      const pdf = await import('../lib/pdf');
      await pdf[name](patient);
    } catch (error) {
      console.error('PDF :', error);
      toast.error('Impossible de générer le PDF.');
    }
  };

  const info = (label, value) => (
    <div>
      <h4 className="text-xs font-medium uppercase text-gray-500">{label}</h4>
      <p className="mt-1 whitespace-pre-line text-gray-800">{value || '—'}</p>
    </div>
  );

  return (
    <Modal title={`${patient.nom || ''} ${patient.prenom || ''}`.trim()} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={last.situation} />
          <span className="text-sm text-gray-500">Dernière consultation : {last.date || '—'}</span>
        </div>
        {info('Motif de consultation', last.motif_consultation)}
        {info('Antécédents', last.antecedents)}
        {info('Examen clinique', last.examen_clinnique)}
        {info('Examen biologique', last.examen_biologique)}
        {info('Examen radiologique', last.examen_radiologique)}
        {info('Diagnostic', last.diagnostique)}
        {info('Traitement', last.traitement)}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row">
          <button type="button" onClick={() => exportPdf('pdfRadiologie')} className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">PDF résultats radiologiques</button>
          <button type="button" onClick={() => exportPdf('pdfTraitement')} className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">PDF plan de traitement</button>
          <Link to={`/app/patients/${patientId(patient)}`} className="rounded-md border border-indigo-300 px-4 py-2 text-center text-indigo-700 hover:bg-indigo-50">Voir le dossier</Link>
        </div>
      </div>
    </Modal>
  );
}

export default function Consultations() {
  const role = useRole();
  const { patients, error, refresh } = usePatients();

  const [name, setName] = useState('');
  const [situation, setSituation] = useState('');
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  const withVisits = useMemo(
    () =>
      (patients || [])
        .filter((p) => Array.isArray(p.data) && p.data.length > 0)
        .sort((a, b) => (parseDate(latest(b).date) || 0) - (parseDate(latest(a).date) || 0)),
    [patients]
  );
  const totalVisits = useMemo(() => withVisits.reduce((sum, p) => sum + p.data.length, 0), [withVisits]);

  const rows = useMemo(() => {
    const q = name.trim().toLowerCase();
    return withVisits.filter((p) => {
      const matchesName = !q || `${p.nom || ''} ${p.prenom || ''}`.toLowerCase().includes(q);
      return matchesName && (!situation || latest(p).situation === situation);
    });
  }, [withVisits, name, situation]);

  const opened = openId ? withVisits.find((p) => patientId(p) === openId) : null;

  if (error) return <p className="text-sm text-red-600">Impossible de charger les consultations.</p>;
  if (!patients) return <p className="text-sm text-gray-500">Chargement…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-gray-800">
          {withVisits.length} patient{withVisits.length > 1 ? 's' : ''} · {totalVisits} consultation{totalVisits > 1 ? 's' : ''}
        </h2>
        {can(role, 'consultations.add') ? (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-indigo-700">
            <span className="mr-2 text-lg">+</span>
            Nouvelle Consultation
          </button>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="cs-name" className="mb-1 block text-sm font-medium text-gray-700">Nom et prénom</label>
          <input id="cs-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Rechercher par nom…" className={INPUT} />
        </div>
        <div>
          <label htmlFor="cs-situation" className="mb-1 block text-sm font-medium text-gray-700">Situation</label>
          <select id="cs-situation" value={situation} onChange={(event) => setSituation(event.target.value)} className={INPUT}>
            <option value="">Tous</option>
            {SITUATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="button" onClick={() => { setName(''); setSituation(''); }} className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 shadow-sm hover:bg-gray-50">Réinitialiser</button>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Nom et prénom</th>
              <th className="px-4 py-3">Dernier diagnostic</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Consultations</th>
              <th className="px-4 py-3">Situation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((p) => (
              <tr key={patientId(p)} className="cursor-pointer transition-colors hover:bg-gray-50" onClick={() => setOpenId(patientId(p))}>
                <td className="px-4 py-3 font-medium text-gray-900">{p.nom} {p.prenom}</td>
                <td className="px-4 py-3">{latest(p).diagnostique || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{latest(p).date || '—'}</td>
                <td className="px-4 py-3">{p.data.length}</td>
                <td className="px-4 py-3"><StatusBadge status={latest(p).situation} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((p) => (
          <li key={patientId(p)}>
            <button type="button" onClick={() => setOpenId(patientId(p))} className="w-full rounded-xl border border-gray-200 p-4 text-left shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-semibold text-gray-800">{p.nom} {p.prenom}</p>
                <StatusBadge status={latest(p).situation} />
              </div>
              <p className="mt-1 text-sm text-gray-600">{latest(p).diagnostique || '—'}</p>
              <p className="mt-1 text-xs text-gray-400">{latest(p).date || '—'} · {p.data.length} consultation{p.data.length > 1 ? 's' : ''}</p>
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="py-8 text-center text-gray-500">Aucune consultation trouvée.</p> : null}

      {adding ? (
        <Modal title="Nouvelle consultation" onClose={() => setAdding(false)}>
          <ConsultationForm patients={patients} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />
        </Modal>
      ) : null}
      {opened ? <Detail patient={opened} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
