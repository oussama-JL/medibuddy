import { useEffect, useMemo, useState } from 'react';
import { CheckCircleIcon, ClockIcon, PlusIcon, UserCircleIcon } from '@heroicons/react/outline';
import { api } from '../lib/api';
import { useRole } from '../lib/auth';
import { can } from '../lib/permissions';
import { patientId, usePatients } from '../lib/usePatients';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';

const fullName = (p) => `${p.nom || ''} ${p.prenom || ''}`.trim();

export default function WaitingRoom() {
  const role = useRole();
  const canManage = can(role, 'waiting.manage');
  const confirm = useConfirm();
  const toast = useToast();
  const { patients, error, refresh } = usePatients();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);

  // the queue changes while the clinic works: refresh it every 30 seconds
  useEffect(() => {
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const queue = useMemo(
    () => (patients || []).filter((p) => p.salle_d_attend > 0).sort((a, b) => a.salle_d_attend - b.salle_d_attend),
    [patients]
  );
  const outside = useMemo(() => (patients || []).filter((p) => !(p.salle_d_attend > 0)), [patients]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? queue.filter((p) => fullName(p).toLowerCase().includes(q)) : queue;
  }, [queue, search]);

  const call = async (method, path, success, failure) => {
    setBusy(true);
    try {
      const response = await api(path, { method });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      toast.success(success);
      await refresh();
    } catch {
      toast.error(failure);
    } finally {
      setBusy(false);
    }
  };

  const add = async (event) => {
    event.preventDefault();
    if (!selected) return;
    await call('PUT', `/salle/${selected}`, "Patient ajouté à la salle d'attente.", "Impossible d'ajouter le patient.");
    setSelected('');
  };

  const takeCharge = async (patient) => {
    const ok = await confirm({
      title: 'Prise en charge',
      message: `Confirmer que ${fullName(patient)} est pris en charge ?`,
      confirmLabel: 'Confirmer',
    });
    if (ok) await call('PUT', `/deleteSalle/${patientId(patient)}`, `${fullName(patient)} est pris en charge.`, 'Impossible de mettre à jour la salle d\'attente.');
  };

  if (error) return <p className="text-sm text-red-600">Impossible de charger la salle d'attente.</p>;
  if (!patients) return <p className="text-sm text-gray-500">Chargement…</p>;

  const next = queue[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserCircleIcon className="h-12 w-12 text-indigo-400" aria-hidden="true" />
          <div>
            <p className="text-sm text-indigo-700">{queue.length > 0 ? `${queue.length} patient(s) en attente` : 'Aucun patient en attente'}</p>
            <p className="text-lg font-semibold text-gray-800">{next ? `Suivant : ${fullName(next)}` : 'La salle est vide'}</p>
          </div>
        </div>
        {next && canManage ? (
          <button type="button" disabled={busy} onClick={() => takeCharge(next)} className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-60">
            <CheckCircleIcon className="h-5 w-5" />
            Prendre en charge
          </button>
        ) : null}
      </div>

      {canManage ? (
        <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="wr-patient" className="mb-1 block text-sm font-medium text-gray-700">Ajouter un patient à la salle d'attente</label>
            <select id="wr-patient" value={selected} onChange={(event) => setSelected(event.target.value)} className="w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-indigo-400 focus:outline-none">
              <option value="">Sélectionner un patient</option>
              {outside.map((p) => (
                <option key={patientId(p)} value={patientId(p)}>{fullName(p)}{p.identite ? ` (${p.identite})` : ''}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!selected || busy} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-50">
            <PlusIcon className="h-5 w-5" />
            Ajouter
          </button>
        </form>
      ) : null}

      <div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher dans la salle d'attente"
          aria-label="Rechercher dans la salle d'attente"
          className="mb-4 w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-indigo-400 focus:outline-none sm:max-w-md"
        />

        <div className="hidden overflow-x-auto rounded-lg shadow md:block">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3">Ordre</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Âge</th>
                <th className="px-6 py-3">GSM</th>
                {canManage ? <th className="px-6 py-3 text-right">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {shown.map((p) => (
                <tr key={patientId(p)} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{p.salle_d_attend}</span></td>
                  <td className="px-6 py-4 font-medium text-gray-800">{fullName(p)}</td>
                  <td className="px-6 py-4 text-gray-600">{p.age ? `${p.age} ans` : '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{p.gsm || '—'}</td>
                  {canManage ? (
                    <td className="px-6 py-4 text-right">
                      <button type="button" disabled={busy} onClick={() => takeCharge(p)} className="rounded-lg border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60">Prendre en charge</button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {shown.length === 0 ? (
                <tr><td colSpan={canManage ? 5 : 4} className="px-6 py-6 text-center text-sm text-gray-500">Aucun patient en attente</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <ul className="space-y-3 md:hidden">
          {shown.map((p) => (
            <li key={patientId(p)} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{p.salle_d_attend}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-800">{fullName(p)}</p>
                  <p className="flex items-center gap-1 text-xs text-gray-500"><ClockIcon className="h-3 w-3" />{p.age ? `${p.age} ans` : '—'} · {p.gsm || '—'}</p>
                </div>
              </div>
              {canManage ? (
                <button type="button" disabled={busy} onClick={() => takeCharge(p)} className="shrink-0 rounded-lg border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50 disabled:opacity-60">Prendre en charge</button>
              ) : null}
            </li>
          ))}
          {shown.length === 0 ? <li className="py-6 text-center text-sm text-gray-500">Aucun patient en attente</li> : null}
        </ul>
      </div>
    </div>
  );
}
