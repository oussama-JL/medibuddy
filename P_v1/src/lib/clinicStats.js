// Pure helpers that turn the /all patient list into the dashboard numbers.
// Every figure shown on the dashboard comes from here: nothing is hard-coded.

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

import { parseDate } from './dates';

const monthKey = (date) => date.getFullYear() * 12 + date.getMonth();
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const asList = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Percent change vs the same period of the previous month, or null when there is nothing to compare to.
export function evolution(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function patientId(patient, index) {
  const id = patient && patient._id;
  return (id && (id.$oid || id)) || `p${index}`;
}

// `revenue: false` skips the billing figures entirely (the nurse dashboard has no revenue card).
// Revenue comes from invoices: collected = payments dated in the period, unpaid = open balances.
export function computeClinicStats(patients, now = new Date(), { revenue: withRevenue = true, invoices = [] } = {}) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = monthKey(today);
  const lastMonth = thisMonth - 1;
  // The month is still in progress, so it is compared with the same stretch
  // (day 1 to today's day) of the previous month, not with the whole month.
  const inLastMonthSoFar = (date) => monthKey(date) === lastMonth && date.getDate() <= today.getDate();

  const newPatients = { thisMonth: 0, lastMonth: 0 };
  const consultations = { total: 0, thisMonth: 0, lastMonth: 0, upcoming: 0 };
  const revenue = { total: 0, thisMonth: 0, lastMonth: 0, unpaid: 0 };
  const todayAppointments = [];
  let waiting = 0;

  const monthly = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthly.push({ key: monthKey(d), name: MONTHS_FR[d.getMonth()], consultations: 0, nouveaux: 0 });
  }
  const bucket = (date) => monthly.find((m) => m.key === monthKey(date));

  asList(patients).forEach((patient, index) => {
    const registered = parseDate(patient.inscription);
    if (registered) {
      const key = monthKey(registered);
      if (key === thisMonth) newPatients.thisMonth += 1;
      if (inLastMonthSoFar(registered)) newPatients.lastMonth += 1;
      const b = bucket(registered);
      if (b) b.nouveaux += 1;
    }

    asList(patient.data).forEach((visit) => {
      consultations.total += 1;
      const date = parseDate(visit && visit.date);
      if (!date) return;
      const key = monthKey(date);
      if (key === thisMonth) consultations.thisMonth += 1;
      if (inLastMonthSoFar(date)) consultations.lastMonth += 1;
      const b = bucket(date);
      if (b) b.consultations += 1;
    });

    asList(patient.rendezVous).forEach((rdv) => {
      const date = parseDate(rdv && rdv.month);
      if (!date) return;
      if (date >= today) consultations.upcoming += 1;
      if (sameDay(date, today)) {
        todayAppointments.push({ id: `${patientId(patient, index)}-${rdv.time || ''}`, nom: patient.nom, prenom: patient.prenom, time: rdv.time || '' });
      }
    });

    if (asNumber(patient.salle_d_attend) > 0) waiting += 1;
  });

  if (withRevenue) {
    asList(invoices).filter((f) => !f.annulee).forEach((facture) => {
      revenue.unpaid += asNumber(facture.reste);
      asList(facture.paiements).forEach((payment) => {
        const amount = asNumber(payment.montant);
        revenue.total += amount;
        const date = parseDate(payment.date);
        if (!date) return;
        if (monthKey(date) === thisMonth) revenue.thisMonth += amount;
        if (inLastMonthSoFar(date)) revenue.lastMonth += amount;
      });
    });
  }

  todayAppointments.sort((a, b) => String(a.time).localeCompare(String(b.time)));

  return {
    patients: {
      total: asList(patients).length,
      thisMonth: newPatients.thisMonth,
      evolution: evolution(newPatients.thisMonth, newPatients.lastMonth),
    },
    consultations: { ...consultations, evolution: evolution(consultations.thisMonth, consultations.lastMonth) },
    revenue: withRevenue ? { ...revenue, evolution: evolution(revenue.thisMonth, revenue.lastMonth) } : null,
    waiting,
    todayAppointments,
    monthly,
  };
}
