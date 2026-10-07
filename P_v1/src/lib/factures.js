// Shared invoice helpers (status chips, payment methods, fetching).
import { api } from './api';

export const MODES = ['espèces', 'carte', 'chèque', 'virement'];

export const STATUTS = ['impayée', 'partielle', 'payée', 'annulée'];

export const STATUT_STYLES = {
  payée: 'bg-emerald-100 text-emerald-800',
  partielle: 'bg-amber-100 text-amber-800',
  impayée: 'bg-red-100 text-red-800',
  annulée: 'bg-gray-200 text-gray-600',
};

export async function fetchFactures(params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  const response = await api(`/factures${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
