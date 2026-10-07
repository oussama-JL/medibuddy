import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useRole } from '../lib/auth';
import { formatDateFr, formatDateIso, parseDate } from '../lib/dates';
import { can } from '../lib/permissions';
import { patientId, usePatients } from '../lib/usePatients';
import { useToast } from '../components/Toast';

const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '15:00', '16:00', '17:00', '18:00'];
const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
const fullName = (p) => `${p.nom || ''} ${p.prenom || ''}`.trim();

// "08/05/2030" -> comparable timestamp (0 when unreadable)
const stamp = (rdv) => {
  const d = parseDate(rdv.month);
  return d ? d.getTime() : 0;
};

function AppointmentList({ title, items, empty }) {
  return (
    <section>
      <h3 className="mb-3 text-lg font-semibold text-gray-800">{title}</h3>
      {items.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">{empty}</p> : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
          {items.map((item) => (
            <li key={`${patientId(item.patient)}-${item.rdv.month}-${item.rdv.time}`} className="flex items-center justify-between gap-3 bg-white p-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{fullName(item.patient)}</p>
                <p className="text-xs text-gray-500">{item.patient.gsm || item.patient.identite || ''}</p>
              </div>
              <p className="shrink-0 text-right text-gray-700">
                <span className="font-medium">{item.rdv.month}</span>
                <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">{item.rdv.time}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Appointments() {
  const role = useRole();
  const toast = useToast();
  const { patients, error, refresh } = usePatients();

  const [patient, setPatient] = useState('');
  const [date, setDate] = useState(formatDateIso());
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);

  const all = useMemo(
    () =>
      (patients || []).flatMap((p) =>
        (Array.isArray(p.rendezVous) ? p.rendezVous : []).map((rdv) => ({ patient: p, rdv }))
      ),
    [patients]
  );

  const todayStamp = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  }, []);

  const sortAsc = (a, b) => stamp(a.rdv) - stamp(b.rdv) || String(a.rdv.time).localeCompare(String(b.rdv.time));

  const upcoming = useMemo(() => all.filter((x) => stamp(x.rdv) >= todayStamp).sort(sortAsc), [all, todayStamp]);

  // for each patient, the most recent appointment that is already behind us
  const lastPast = useMemo(() => {
    const byPatient = new Map();
    all.filter((x) => stamp(x.rdv) < todayStamp && stamp(x.rdv) > 0).forEach((x) => {
      const key = patientId(x.patient);
      const best = byPatient.get(key);
      if (!best || stamp(x.rdv) > stamp(best.rdv)) byPatient.set(key, x);
    });
    return [...byPatient.values()].sort((a, b) => sortAsc(b, a)).slice(0, 8);
  }, [all, todayStamp]);

  // dd/mm/yyyy of the date being booked, and which of its slots are already taken
  const month = date ? formatDateFr(new Date(`${date}T00:00:00`)) : '';
  const taken = useMemo(() => new Set(all.filter((x) => x.rdv.month === month && patientId(x.patient) !== patient).map((x) => x.rdv.time)), [all, month, patient]);
  const freeSlots = TIME_SLOTS.filter((slot) => !taken.has(slot));

  const book = async (event) => {
    event.preventDefault();
    if (!patient || !date || !time) {
      toast.error('Choisissez un patient, une date et une heure.');
      return;
    }
    setBusy(true);
    try {
      const response = await api(`/RendezVous/${patient}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ month, time }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.message || "Impossible d'enregistrer le rendez-vous.");
        if (response.status === 409) refresh();
        return;
      }
      toast.success('Rendez-vous enregistré.');
      setTime('');
      await refresh();
    } catch {
      toast.error('Erreur réseau : le rendez-vous n\'a pas été enregistré.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">Impossible de charger les rendez-vous.</p>;
  if (!patients) return <p className="text-sm text-gray-500">Chargement…</p>;

  const todayCount = upcoming.filter((x) => stamp(x.rdv) === todayStamp).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      {can(role, 'appointments.manage') ? (
        <form onSubmit={book} className="h-fit space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-lg font-semibold text-gray-800">Nouveau rendez-vous</h3>
          <div>
            <label htmlFor="ap-patient" className="mb-1 block text-sm font-medium text-gray-700">Patient</label>
            <select id="ap-patient" value={patient} onChange={(event) => setPatient(event.target.value)} className={INPUT} required>
              <option value="">Sélectionner un patient</option>
              {patients.map((p) => <option key={patientId(p)} value={patientId(p)}>{fullName(p)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ap-date" className="mb-1 block text-sm font-medium text-gray-700">Date</label>
            <input id="ap-date" type="date" value={date} min={formatDateIso()} onChange={(event) => { setDate(event.target.value); setTime(''); }} className={INPUT} required />
          </div>
          <div>
            <label htmlFor="ap-time" className="mb-1 block text-sm font-medium text-gray-700">Heure</label>
            <select id="ap-time" value={time} onChange={(event) => setTime(event.target.value)} className={INPUT} required disabled={freeSlots.length === 0}>
              <option value="">{freeSlots.length === 0 ? 'Journée complète' : 'Sélectionner une heure'}</option>
              {freeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-500">{freeSlots.length} créneau(x) libre(s) le {month}</p>
          </div>
          <button type="submit" disabled={busy || freeSlots.length === 0} className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            Réserver
          </button>
        </form>
      ) : null}

      <div className="space-y-8">
        <p className="text-sm text-gray-500">{todayCount} rendez-vous aujourd'hui · {upcoming.length} à venir</p>
        <AppointmentList title="Rendez-vous à venir" items={upcoming} empty="Aucun rendez-vous à venir." />
        <AppointmentList title="Dernier rendez-vous passé (par patient)" items={lastPast} empty="Aucun rendez-vous passé." />
      </div>
    </div>
  );
}
