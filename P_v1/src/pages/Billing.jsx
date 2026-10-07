import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRole } from '../lib/auth';
import { fetchFactures, STATUTS } from '../lib/factures';
import { formatMoney } from '../lib/money';
import { patientId, usePatients } from '../lib/usePatients';
import { InvoiceDetailModal, InvoiceFormModal, PaymentModal, StatusChip } from '../components/InvoiceModals';

const INPUT = 'rounded-lg border border-gray-300 px-3 py-2 text-sm';
const fr = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

function Summary({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function Billing() {
  const role = useRole();
  const { patients } = usePatients();

  const [factures, setFactures] = useState(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ statut: '', patient: '', from: '', to: '' });
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      setFactures(await fetchFactures(filters));
      setError(false);
    } catch (err) {
      console.error('Factures :', err);
      setError(true);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch) => setFilters({ ...filters, ...patch });

  // totals ignore cancelled invoices
  const totals = useMemo(() => {
    const live = (factures || []).filter((f) => !f.annulee);
    return {
      facture: live.reduce((s, f) => s + f.total, 0),
      encaisse: live.reduce((s, f) => s + f.paye, 0),
      reste: live.reduce((s, f) => s + f.reste, 0),
    };
  }, [factures]);

  const opened = openId && factures ? factures.find((f) => f.id === openId) : null;

  const refreshed = async (updated) => {
    setPaying(null);
    setCreating(false);
    if (updated && updated.id && !openId) setOpenId(null);
    await load();
  };

  const actions = (f) => (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={() => setOpenId(f.id)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50">Voir</button>
      {!f.annulee && f.reste > 0 ? (
        <button type="button" onClick={() => setPaying(f)} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">Encaisser</button>
      ) : null}
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:flex-1">
          <Summary label="Facturé" value={formatMoney(totals.facture)} tone="text-gray-800" />
          <Summary label="Encaissé" value={formatMoney(totals.encaisse)} tone="text-emerald-600" />
          <Summary label="Reste à encaisser" value={formatMoney(totals.reste)} tone="text-red-600" />
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 sm:ml-4">+ Nouvelle facture</button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          <button type="button" onClick={() => set({ statut: '' })} aria-pressed={filters.statut === ''} className={`rounded-full px-3 py-1 text-xs font-medium ${filters.statut === '' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>Toutes</button>
          {STATUTS.map((s) => (
            <button key={s} type="button" onClick={() => set({ statut: s })} aria-pressed={filters.statut === s} className={`rounded-full px-3 py-1 text-xs font-medium ${filters.statut === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>{s}</button>
          ))}
        </div>
        <select aria-label="Patient" value={filters.patient} onChange={(event) => set({ patient: event.target.value })} className={INPUT}>
          <option value="">Tous les patients</option>
          {(patients || []).map((p) => <option key={patientId(p)} value={patientId(p)}>{p.nom} {p.prenom}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">Du <input type="date" aria-label="Du" value={filters.from} onChange={(event) => set({ from: event.target.value })} className={INPUT} /></label>
        <label className="flex items-center gap-2 text-sm text-gray-600">Au <input type="date" aria-label="Au" value={filters.to} onChange={(event) => set({ to: event.target.value })} className={INPUT} /></label>
        {filters.statut || filters.patient || filters.from || filters.to ? (
          <button type="button" onClick={() => setFilters({ statut: '', patient: '', from: '', to: '' })} className="text-sm text-indigo-600 hover:text-indigo-800">Réinitialiser</button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">Impossible de charger les factures.</p> : null}
      {!factures && !error ? <p className="text-sm text-gray-500">Chargement…</p> : null}

      {factures ? (
        <>
          <p className="mb-3 text-sm text-gray-500">{factures.length} facture{factures.length > 1 ? 's' : ''}</p>

          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Payé</th>
                  <th className="px-4 py-3 text-right">Reste</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {factures.map((f) => (
                  <tr key={f.id} className={`hover:bg-gray-50 ${f.annulee ? 'text-gray-400' : ''}`}>
                    <td className="px-4 py-3 font-medium">{f.numero}</td>
                    <td className="px-4 py-3">{fr(f.date)}</td>
                    <td className="px-4 py-3">{f.patient_nom}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(f.total)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(f.paye)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(f.reste)}</td>
                    <td className="px-4 py-3"><StatusChip statut={f.statut} /></td>
                    <td className="px-4 py-3">{actions(f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {factures.map((f) => (
              <li key={f.id} className="rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800">{f.numero}</p>
                    <p className="truncate text-sm text-gray-600">{f.patient_nom}</p>
                    <p className="text-xs text-gray-400">{fr(f.date)}</p>
                  </div>
                  <StatusChip statut={f.statut} />
                </div>
                <p className="mt-2 text-sm text-gray-600">Total {formatMoney(f.total)} · Payé {formatMoney(f.paye)} · Reste <strong>{formatMoney(f.reste)}</strong></p>
                <div className="mt-3">{actions(f)}</div>
              </li>
            ))}
          </ul>

          {factures.length === 0 ? <p className="py-8 text-center text-gray-500">Aucune facture ne correspond à ces filtres.</p> : null}
        </>
      ) : null}

      {creating ? <InvoiceFormModal patients={patients || []} onClose={() => setCreating(false)} onSaved={refreshed} /> : null}
      {paying ? <PaymentModal facture={paying} onClose={() => setPaying(null)} onSaved={refreshed} /> : null}
      {opened ? (
        <InvoiceDetailModal
          facture={opened}
          role={role}
          onClose={() => setOpenId(null)}
          onPay={(f) => { setOpenId(null); setPaying(f); }}
          onChanged={() => { setOpenId(null); load(); }}
        />
      ) : null}
    </div>
  );
}
