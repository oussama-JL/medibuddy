import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRole } from '../lib/auth';
import { computeClinicStats } from '../lib/clinicStats';
import { formatMoney } from '../lib/money';
import { can } from '../lib/permissions';
import { fetchFactures } from '../lib/factures';
import { usePatients } from '../lib/usePatients';

// "vs même période du mois précédent" badge: neutral when there is no previous month to compare to.
function Evolution({ value }) {
  if (value === null) {
    return (
      <div className="flex items-center mt-4">
        <span className="text-xs text-gray-500">Rien à comparer le mois précédent</span>
      </div>
    );
  }
  const up = value >= 0;
  return (
    <div className="flex items-center mt-4">
      <div className={`flex items-center px-2 py-1 rounded-full ${up ? 'bg-green-100' : 'bg-red-100'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${up ? 'text-green-600' : 'text-red-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={up ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} />
        </svg>
        <span className={`text-xs font-medium ml-1 ${up ? 'text-green-600' : 'text-red-600'}`}>{`${up ? '+' : ''}${value}%`}</span>
      </div>
      <span className="text-xs text-gray-500 ml-2">vs même période du mois précédent</span>
    </div>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor, evolution, footer }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{value}</h2>
        </div>
        <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
      {evolution !== undefined ? <Evolution value={evolution} /> : null}
      <div className="mt-4">
        <p className="text-sm text-gray-500">{footer}</p>
      </div>
    </div>
  );
}

const ICON_PATIENTS = 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z';
const ICON_CALENDAR = 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
const ICON_MONEY = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const ICON_CLOCK = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';

export default function Dashboard() {
  const role = useRole();
  const showRevenue = can(role, 'stats.revenue');
  const { patients, error } = usePatients();

  // invoices are only requested for the role that sees revenue
  const [invoices, setInvoices] = useState(null);
  useEffect(() => {
    if (!showRevenue) return;
    fetchFactures().then(setInvoices).catch(() => setInvoices([]));
  }, [showRevenue]);

  // The nurse never gets revenue figures computed or rendered.
  const stats = useMemo(
    () => (patients && (!showRevenue || invoices) ? computeClinicStats(patients, new Date(), { revenue: showRevenue, invoices: invoices || [] }) : null),
    [patients, invoices, showRevenue]
  );

  if (error) {
    return <div className="dashboard p-6 bg-gray-50 text-sm text-red-600">Impossible de charger les données du tableau de bord.</div>;
  }
  if (!stats) {
    return <div className="dashboard p-6 bg-gray-50 text-sm text-gray-500">Chargement des données…</div>;
  }

  return (
    <div className="dashboard p-6 bg-gray-50">
      <div className={`mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 ${showRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <StatCard
          label="Patients"
          value={stats.patients.total}
          icon={ICON_PATIENTS}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          evolution={stats.patients.evolution}
          footer={<>Nouveaux patients ce mois : <span className="font-semibold text-gray-700">{stats.patients.thisMonth}</span></>}
        />
        <StatCard
          label="Consultations"
          value={stats.consultations.total}
          icon={ICON_CALENDAR}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          evolution={stats.consultations.evolution}
          footer={<>Rendez-vous à venir : <span className="font-semibold text-gray-700">{stats.consultations.upcoming}</span></>}
        />
        {showRevenue ? (
        <StatCard
          label="Revenus encaissés"
          value={formatMoney(stats.revenue.total)}
          icon={ICON_MONEY}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          evolution={stats.revenue.evolution}
          footer={<>Ce mois : <span className="font-semibold text-gray-700">{formatMoney(stats.revenue.thisMonth)}</span> · Reste à payer : <span className="font-semibold text-gray-700">{formatMoney(stats.revenue.unpaid)}</span></>}
        />
        ) : null}
        <StatCard
          label="Salle d'attente"
          value={stats.waiting}
          icon={ICON_CLOCK}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          footer="Patients actuellement en attente"
        />
      </div>

      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="font-semibold text-gray-800 mb-4">Activité des 6 derniers mois</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.monthly}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="consultations" fill="#3b82f6" name="Consultations" />
            <Bar dataKey="nouveaux" fill="#10b981" name="Nouveaux patients" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-md overflow-hidden mt-6">
        <h3 className="font-semibold text-gray-800 mb-4">Rendez-vous du jour</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {stats.todayAppointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center p-2 rounded-lg hover:bg-gray-50">
              <div className="w-12 text-center">
                <span className="block text-sm font-medium">{appointment.time || 'N/A'}</span>
              </div>
              <div className="ml-4 flex-grow">
                <p className="text-sm font-medium text-gray-800">{`${appointment.nom || ''} ${appointment.prenom || ''}`}</p>
              </div>
            </div>
          ))}

          {stats.todayAppointments.length === 0 && (
            <div className="text-center py-4 text-gray-500">Aucun rendez-vous pour aujourd'hui</div>
          )}
        </div>
      </div>
    </div>
  );
}
