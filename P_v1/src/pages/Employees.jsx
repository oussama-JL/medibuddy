import { useCallback, useEffect, useMemo, useState } from 'react';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/outline';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const INPUT = 'w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-indigo-400 focus:outline-none';
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };
const EMPTY = { nom: '', specialite: '', telephone: '', email: '', disponible: true };

function Availability({ yes }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${yes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{yes ? 'Oui' : 'Non'}</span>;
}

function DoctorForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setValues({ ...values, [name]: type === 'checkbox' ? checked : value });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const problem = await onSubmit(values);
    setBusy(false);
    if (problem) setError(problem);
  };

  const field = (name, label, props = {}) => (
    <div className="space-y-1">
      <label htmlFor={`doc-${name}`} className="text-sm font-medium text-gray-700">{label}</label>
      <input id={`doc-${name}`} name={name} value={values[name]} onChange={change} className={INPUT} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit}>
      {error ? <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {field('nom', 'Nom', { required: true })}
        {field('specialite', 'Spécialité', { required: true })}
        {field('telephone', 'Téléphone', { required: true })}
        {field('email', 'Email', { type: 'email' })}
        <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
          <input type="checkbox" name="disponible" checked={values.disponible} onChange={change} className="h-4 w-4" />
          Disponible
        </label>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-500 px-6 py-2 text-white hover:bg-gray-600">Annuler</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600 disabled:opacity-60">{submitLabel}</button>
      </div>
    </form>
  );
}

export default function Employees() {
  const confirm = useConfirm();
  const toast = useToast();

  const [doctors, setDoctors] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState({ search: '', specialite: '', disponibilite: 'tous' });
  const [sortAsc, setSortAsc] = useState(true);
  const [form, setForm] = useState(null); // null | { doctor } (doctor null = new)
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api('/allemplo');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setDoctors(await response.json());
      setLoadError('');
      setLastUpdate(new Date());
    } catch (err) {
      setLoadError(`Impossible de charger les médecins : ${err.message}`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const specialities = useMemo(() => [...new Set((doctors || []).map((d) => d.specialite).filter(Boolean))].sort(), [doctors]);

  const rows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (doctors || [])
      .filter((d) => !q || [d.nom, d.specialite, d.telephone, d.email].some((v) => String(v || '').toLowerCase().includes(q)))
      .filter((d) => !filters.specialite || d.specialite === filters.specialite)
      .filter((d) => filters.disponibilite === 'tous' || (filters.disponibilite === 'disponible') === Boolean(d.disponible))
      .sort((a, b) => String(a.nom).localeCompare(String(b.nom)) * (sortAsc ? 1 : -1));
  }, [doctors, filters, sortAsc]);

  const save = async (values) => {
    const editing = form.doctor;
    try {
      const response = await api(editing ? `/update/${encodeURIComponent(editing.nom)}` : '/Postmedcin', {
        method: editing ? 'PUT' : 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(values),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return data.message || "Impossible d'enregistrer le médecin.";
      toast.success(editing ? 'Médecin mis à jour avec succès.' : 'Médecin ajouté avec succès.');
      setForm(null);
      load();
      return undefined;
    } catch (err) {
      return `Une erreur est survenue : ${err.message}`;
    }
  };

  const remove = async (doctor) => {
    const ok = await confirm({
      title: 'Supprimer le médecin',
      message: `Supprimer ${doctor.nom} de la liste ?`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      const response = await api(`/delete/${encodeURIComponent(doctor.nom)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success('Médecin supprimé.');
      load();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const actions = (doctor) => (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={() => setForm({ doctor })} className="rounded-full p-1 text-amber-500 hover:bg-amber-100 hover:text-amber-700" aria-label={`Modifier ${doctor.nom}`} title="Modifier"><PencilIcon className="h-5 w-5" /></button>
      <button type="button" onClick={() => remove(doctor)} className="rounded-full p-1 text-red-500 hover:bg-red-100 hover:text-red-700" aria-label={`Supprimer ${doctor.nom}`} title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
    </div>
  );

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!doctors) return <p className="text-sm text-gray-500">Chargement…</p>;

  const available = doctors.filter((d) => d.disponible).length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-gray-800">Gestion des Médecins</h2>
        <button type="button" onClick={() => setForm({ doctor: null })} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600">
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter un médecin</span>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
        <input type="search" aria-label="Rechercher un médecin" placeholder="Rechercher…" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className={INPUT} />
        <select aria-label="Spécialité" value={filters.specialite} onChange={(event) => setFilters({ ...filters, specialite: event.target.value })} className={INPUT}>
          <option value="">Toutes les spécialités</option>
          {specialities.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Disponibilité" value={filters.disponibilite} onChange={(event) => setFilters({ ...filters, disponibilite: event.target.value })} className={INPUT}>
          <option value="tous">Tous les médecins</option>
          <option value="disponible">Disponibles</option>
          <option value="non-disponible">Non disponibles</option>
        </select>
      </div>

      <p className="mb-3 text-sm text-gray-500">{rows.length === doctors.length ? `${doctors.length} médecins au total` : `${rows.length} médecin(s) sur ${doctors.length}`}</p>

      <div className="hidden overflow-x-auto rounded-lg shadow md:block">
        <table className="w-full border-collapse">
          <thead className="bg-indigo-500 text-white">
            <tr>
              <th className="p-4 text-left text-sm font-semibold uppercase tracking-wider">
                <button type="button" onClick={() => setSortAsc(!sortAsc)} className="uppercase" aria-label="Trier par nom">Nom {sortAsc ? '▲' : '▼'}</button>
              </th>
              {['Spécialité', 'Téléphone', 'Email', 'Disponible'].map((h) => <th key={h} className="p-4 text-left text-sm font-semibold uppercase tracking-wider">{h}</th>)}
              <th className="p-4 text-right text-sm font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, index) => (
              <tr key={d.nom} className={`border-b border-gray-200 transition-colors hover:bg-indigo-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="p-4 font-medium">{d.nom}</td>
                <td className="p-4">{d.specialite || '—'}</td>
                <td className="p-4">{d.telephone || '—'}</td>
                <td className="p-4">{d.email || '—'}</td>
                <td className="p-4"><Availability yes={d.disponible} /></td>
                <td className="p-4">{actions(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((d) => (
          <li key={d.nom} className="rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800">{d.nom}</p>
                <p className="text-sm text-gray-500">{d.specialite || '—'}</p>
              </div>
              <Availability yes={d.disponible} />
            </div>
            <p className="mt-2 text-sm text-gray-600">{d.telephone || '—'}{d.email ? ` · ${d.email}` : ''}</p>
            <div className="mt-2">{actions(d)}</div>
          </li>
        ))}
      </ul>

      {rows.length === 0 ? <p className="py-8 text-center text-gray-500">Aucun médecin ne correspond à ces filtres.</p> : null}

      <div className="mt-6 flex flex-col gap-1 border-t border-gray-200 pt-4 text-sm text-gray-500 sm:flex-row sm:justify-between">
        <span>{lastUpdate ? `Dernière mise à jour : ${lastUpdate.toLocaleString('fr-FR')}` : ''}</span>
        <span>{available} médecin(s) disponible(s) sur {doctors.length} au total</span>
      </div>

      {form ? (
        <Modal title={form.doctor ? 'Modifier un médecin' : 'Ajouter un médecin'} onClose={() => setForm(null)}>
          <DoctorForm
            initial={form.doctor ? { nom: form.doctor.nom, specialite: form.doctor.specialite || '', telephone: form.doctor.telephone || '', email: form.doctor.email || '', disponible: Boolean(form.doctor.disponible) } : undefined}
            submitLabel={form.doctor ? 'Enregistrer' : 'Ajouter'}
            onSubmit={save}
            onCancel={() => setForm(null)}
          />
        </Modal>
      ) : null}
    </div>
  );
}
