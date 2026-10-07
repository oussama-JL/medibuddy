import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// Loads the patient list (`/all`) once and exposes refresh() for after a change.
// `patients` is null until the first answer arrives.
export function usePatients() {
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await api('/all');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const list = await response.json();
      setPatients(Array.isArray(list) ? list : []);
      setError(false);
    } catch (err) {
      console.error('Erreur chargement patients :', err);
      setError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { patients, error, refresh };
}

export const patientId = (patient) => (patient && patient._id && (patient._id.$oid || patient._id)) || '';
