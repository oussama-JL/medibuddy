// One place that says who can do what. Pages ask `can(role, action)` instead of
// existing in an admin copy and a nurse copy. Keep this in step with the role
// middleware in backend/routes/api.php (the server is what actually enforces it).

const BOTH = ['admin', 'infirmier'];
const ADMIN = ['admin'];

const RULES = {
  'dashboard.view': BOTH,
  'stats.revenue': ADMIN,

  'patients.view': BOTH,
  'patients.create': BOTH,
  'patients.edit': BOTH,
  'patients.delete': BOTH,

  'waiting.manage': BOTH,
  'appointments.manage': BOTH,
  'billing.manage': BOTH,
  'billing.cancel': ADMIN,

  'consultations.view': BOTH,
  'consultations.add': ADMIN,

  'followup.view': BOTH,
  'followup.add': ADMIN,
  'followup.clear': ADMIN,

  'employees.manage': ADMIN,
};

export const can = (role, action) => (RULES[action] || []).includes(role);

export const ROLE_LABELS = { admin: 'Administrateur', infirmier: 'Infirmier(ère)' };
export const roleLabel = (role) => ROLE_LABELS[role] || '';

// "Prénom Nom"; only the administrator keeps the "Dr." prefix.
export const displayName = (user) => {
  if (!user) return '';
  const name = [user.prenom, user.nom].filter(Boolean).join(' ');
  return user.role === 'admin' ? `Dr. ${name}` : name;
};

// The sidebar, for every role: an item shows when the role passes its `perm`.
export const NAV = [
  { path: 'dashboard', label: 'Dashboard', icon: 'bx bxs-dashboard', perm: 'dashboard.view', title: 'Tableau de bord', subtitle: "Vue d'ensemble de l'activité" },
  { path: 'patients', label: 'Patients', icon: 'bx bx-user', perm: 'patients.view', title: 'Gestion des patients', subtitle: 'Gérez vos dossiers patients' },
  { path: 'waiting-room', label: "Salle d'attente", icon: 'bx bx-time-five', perm: 'waiting.manage', title: "Salle d'attente", subtitle: 'Gérez les patients en attente' },
  { path: 'appointments', label: 'Rendez-vous', icon: 'bx bx-calendar', perm: 'appointments.manage', title: 'Rendez-vous', subtitle: 'Planifiez et suivez les rendez-vous' },
  { path: 'consultations', label: 'Consultation', icon: 'bx bx-clipboard', perm: 'consultations.view', title: 'Consultations', subtitle: 'Historique des consultations' },
  { path: 'follow-up', label: 'Suivi (long cours)', icon: 'bx bx-line-chart', perm: 'followup.view', title: 'Suivi des patients', subtitle: 'Suivez vos patients sur le long terme' },
  { path: 'billing', label: 'Facturation', icon: 'bx bx-money', perm: 'billing.manage', title: 'Facturation', subtitle: 'Gérez vos factures et paiements' },
  { path: 'employees', label: 'Employés', icon: 'bx bx-group', perm: 'employees.manage', title: 'Gestion des employés', subtitle: 'Gérez votre équipe médicale' },
];

export const navFor = (role) => NAV.filter((item) => can(role, item.perm));
