import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatDateIso } from '../lib/dates';
import { MODES, STATUT_STYLES } from '../lib/factures';
import { formatMoney } from '../lib/money';
import { can } from '../lib/permissions';
import { patientId } from '../lib/usePatients';
import Modal from './Modal';
import { useToast } from './Toast';

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

export function StatusChip({ statut }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600'}`}>{statut}</span>;
}

const fr = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

// ---- New invoice -------------------------------------------------------------------

const emptyLine = () => ({ service: '', qty: 1, prix: '' });

export function InvoiceFormModal({ patients, onClose, onSaved }) {
  const toast = useToast();
  const [patient, setPatient] = useState('');
  const [date, setDate] = useState(formatDateIso());
  const [lignes, setLignes] = useState([{ service: 'Consultation', qty: 1, prix: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const total = useMemo(() => lignes.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.prix) || 0), 0), [lignes]);
  const setLine = (index, patch) => setLignes(lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const submit = async (event) => {
    event.preventDefault();
    if (!patient) return setError('Sélectionnez un patient.');
    if (lignes.some((l) => !l.service.trim() || !(Number(l.qty) >= 1) || l.prix === '' || Number(l.prix) < 0)) {
      return setError('Chaque ligne doit avoir un service, une quantité (1 minimum) et un prix.');
    }
    if (total <= 0) return setError('Le total doit être supérieur à 0.');

    setBusy(true);
    setError('');
    try {
      const response = await api('/factures', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ patient_id: patient, date, lignes: lignes.map((l) => ({ service: l.service.trim(), qty: Number(l.qty), prix: Number(l.prix) })) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Impossible d'enregistrer la facture.");
        return;
      }
      toast.success(`Facture ${data.numero} créée.`);
      onSaved(data);
    } catch {
      setError("Erreur réseau : la facture n'a pas été enregistrée.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Nouvelle facture" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nf-patient" className="mb-1 block text-sm font-medium text-gray-700">Patient</label>
            <select id="nf-patient" value={patient} onChange={(event) => setPatient(event.target.value)} className={INPUT} required>
              <option value="">Sélectionner un patient</option>
              {patients.map((p) => <option key={patientId(p)} value={patientId(p)}>{p.nom} {p.prenom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="nf-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input id="nf-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={INPUT} required />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Lignes de facture</legend>
          <div className="space-y-3">
            {lignes.map((l, index) => (
              <div key={index} className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-end gap-2">
                <div>
                  {index === 0 ? <label className="mb-1 block text-xs text-gray-500">Service</label> : null}
                  <input aria-label={`Service ${index + 1}`} value={l.service} onChange={(event) => setLine(index, { service: event.target.value })} placeholder="Service" className={INPUT} />
                </div>
                <div>
                  {index === 0 ? <label className="mb-1 block text-xs text-gray-500">Qté</label> : null}
                  <input aria-label={`Quantité ${index + 1}`} type="number" min="1" step="1" value={l.qty} onChange={(event) => setLine(index, { qty: event.target.value })} className={INPUT} />
                </div>
                <div>
                  {index === 0 ? <label className="mb-1 block text-xs text-gray-500">Prix (DH)</label> : null}
                  <input aria-label={`Prix ${index + 1}`} type="number" min="0" step="any" value={l.prix} onChange={(event) => setLine(index, { prix: event.target.value })} placeholder="0" className={INPUT} />
                </div>
                <button
                  type="button"
                  onClick={() => setLignes(lignes.filter((_, i) => i !== index))}
                  disabled={lignes.length === 1}
                  aria-label={`Supprimer la ligne ${index + 1}`}
                  className="rounded-lg px-2 py-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLignes([...lignes, emptyLine()])} className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Ajouter une ligne</button>
        </fieldset>

        <p className="text-right text-lg font-semibold text-gray-800">Total : {formatMoney(total)}</p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60">Créer la facture</button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Payment -----------------------------------------------------------------------------

export function PaymentModal({ facture, onClose, onSaved }) {
  const toast = useToast();
  const [montant, setMontant] = useState(String(facture.reste));
  const [mode, setMode] = useState(MODES[0]);
  const [date, setDate] = useState(formatDateIso());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = Number(montant);
    if (!(value > 0)) return setError('Saisissez un montant supérieur à 0.');
    if (value > facture.reste + 0.001) return setError(`Le montant dépasse le reste à payer (${formatMoney(facture.reste)}).`);

    setBusy(true);
    setError('');
    try {
      const response = await api(`/factures/${facture.id}/paiements`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ montant: value, mode, date }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Impossible d'enregistrer le paiement.");
        return;
      }
      toast.success('Paiement enregistré.');
      onSaved(data);
    } catch {
      setError("Erreur réseau : le paiement n'a pas été enregistré.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Encaisser · ${facture.numero}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center text-sm">
          <div><dt className="text-gray-500">Total</dt><dd className="font-semibold">{formatMoney(facture.total)}</dd></div>
          <div><dt className="text-gray-500">Payé</dt><dd className="font-semibold">{formatMoney(facture.paye)}</dd></div>
          <div><dt className="text-gray-500">Reste</dt><dd className="font-semibold text-red-600">{formatMoney(facture.reste)}</dd></div>
        </dl>
        <div>
          <label htmlFor="pm-montant" className="mb-1 block text-sm font-medium text-gray-700">Montant (DH)</label>
          <input id="pm-montant" type="number" min="0" step="any" value={montant} onChange={(event) => setMontant(event.target.value)} className={INPUT} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pm-mode" className="mb-1 block text-sm font-medium text-gray-700">Mode de paiement</label>
            <select id="pm-mode" value={mode} onChange={(event) => setMode(event.target.value)} className={INPUT}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pm-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input id="pm-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={INPUT} required />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">Annuler</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60">Encaisser</button>
        </div>
      </form>
    </Modal>
  );
}

// ---- Detail (with PDF and admin-only cancel) ------------------------------------------------

export function InvoiceDetailModal({ facture, role, onClose, onPay, onChanged }) {
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const exportPdf = async () => {
    try {
      const { pdfInvoice } = await import('../lib/pdfInvoice');
      await pdfInvoice(facture);
    } catch (err) {
      console.error('PDF :', err);
      toast.error('Impossible de générer le PDF.');
    }
  };

  const cancel = async (event) => {
    event.preventDefault();
    if (motif.trim().length < 3) return setError('Indiquez le motif de l\'annulation (3 caractères minimum).');
    setBusy(true);
    setError('');
    try {
      const response = await api(`/factures/${facture.id}/annuler`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ motif: motif.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Impossible d'annuler la facture.");
        return;
      }
      toast.success('Facture annulée.');
      onChanged(data);
    } catch {
      setError("Erreur réseau : la facture n'a pas été annulée.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Facture ${facture.numero}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-gray-800">{facture.patient_nom}</p>
            <p className="text-sm text-gray-500">Date : {fr(facture.date)}</p>
          </div>
          <StatusChip statut={facture.statut} />
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr><th className="px-3 py-2">Service</th><th className="px-3 py-2 text-right">Qté</th><th className="px-3 py-2 text-right">Prix</th><th className="px-3 py-2 text-right">Montant</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facture.lignes.map((l, i) => (
                <tr key={i}><td className="px-3 py-2">{l.service}</td><td className="px-3 py-2 text-right">{l.qty}</td><td className="px-3 py-2 text-right">{formatMoney(l.prix)}</td><td className="px-3 py-2 text-right">{formatMoney(l.qty * l.prix)}</td></tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr><td colSpan="3" className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right">{formatMoney(facture.total)}</td></tr>
            </tfoot>
          </table>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Paiements</h3>
          {facture.paiements.length === 0 ? <p className="text-sm text-gray-500">Aucun paiement enregistré.</p> : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              {facture.paiements.map((p) => (
                <li key={p.paiement_id} className="flex items-center justify-between px-3 py-2">
                  <span>{fr(p.date)} · {p.mode}</span>
                  <span className="font-medium">{formatMoney(p.montant)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-right text-sm text-gray-600">Payé : <strong>{formatMoney(facture.paye)}</strong> · Reste : <strong className={facture.reste > 0 ? 'text-red-600' : ''}>{formatMoney(facture.reste)}</strong></p>
        </div>

        {facture.annulee && facture.annulation ? (
          <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">Annulée le {fr(facture.annulation.date)} par {facture.annulation.par || '—'} : {facture.annulation.motif}</p>
        ) : null}

        {cancelling ? (
          <form onSubmit={cancel} className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            <label htmlFor="cancel-motif" className="block text-sm font-medium text-red-800">Motif de l'annulation</label>
            <input id="cancel-motif" value={motif} onChange={(event) => setMotif(event.target.value)} className={INPUT} autoFocus />
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60">Confirmer l'annulation</button>
              <button type="button" onClick={() => setCancelling(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700">Retour</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            {can(role, 'billing.cancel') && !facture.annulee ? (
              <button type="button" onClick={() => setCancelling(true)} className="rounded-lg border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 sm:mr-auto">Annuler la facture</button>
            ) : null}
            <button type="button" onClick={exportPdf} className="rounded-lg border border-indigo-300 px-4 py-2 text-indigo-700 hover:bg-indigo-50">Télécharger le PDF</button>
            {!facture.annulee && facture.reste > 0 ? (
              <button type="button" onClick={() => onPay(facture)} className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">Encaisser</button>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
