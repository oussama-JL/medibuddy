import { useState } from 'react';

const EMPTY = { nom: '', prenom: '', sexe: '', age: '', gsm: '', adresse: '', assurance: '', identite: '', taille: '', poids: '' };

const INPUT = 'w-full rounded-lg border-2 border-gray-200 px-4 py-2 focus:border-indigo-400 focus:outline-none';

// Height is entered in centimetres, weight in kilograms (same limits as the server).
const LIMITS = { taille: [50, 250, 'La taille doit être comprise entre 50 et 250 cm.'], poids: [2, 400, 'Le poids doit être compris entre 2 et 400 kg.'] };

function Field({ id, label, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

// Add / edit form for a patient. `onSubmit(values)` resolves to an error message (string) or nothing.
export default function PatientForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, (initial && initial[k]) ?? ''])));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    for (const [field, [min, max, message]] of Object.entries(LIMITS)) {
      const raw = String(values[field]).trim();
      if (raw !== '' && !(Number(raw) >= min && Number(raw) <= max)) {
        setError(message);
        return;
      }
    }
    setBusy(true);
    setError('');
    const problem = await onSubmit(values);
    setBusy(false);
    if (problem) setError(problem);
  };

  const input = (name, label, props = {}) => (
    <Field id={`pf-${name}`} label={label}>
      <input id={`pf-${name}`} name={name} value={values[name]} onChange={change} className={INPUT} {...props} />
    </Field>
  );

  return (
    <form onSubmit={submit}>
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {input('nom', 'Nom', { required: true, placeholder: 'Nom' })}
        {input('prenom', 'Prénom', { required: true, placeholder: 'Prénom' })}
        {input('identite', 'N° identité (CIN)', { placeholder: 'CIN' })}
        <Field id="pf-sexe" label="Sexe">
          <select id="pf-sexe" name="sexe" value={values.sexe} onChange={change} className={INPUT}>
            <option value="">Sélectionner</option>
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
          </select>
        </Field>
        {input('age', 'Âge', { type: 'number', min: 0, max: 120, placeholder: 'Âge' })}
        {input('gsm', 'GSM', { placeholder: 'GSM' })}
        {input('adresse', 'Adresse', { placeholder: 'Adresse' })}
        {input('assurance', 'Assurance', { placeholder: 'Assurance' })}
        {input('taille', 'Taille (cm)', { type: 'number', min: 50, max: 250, step: 'any', placeholder: 'ex. 172' })}
        {input('poids', 'Poids (kg)', { type: 'number', min: 2, max: 400, step: 'any', placeholder: 'ex. 68' })}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-500 px-6 py-2 text-white hover:bg-gray-600">
          Annuler
        </button>
        <button type="submit" disabled={busy} className="rounded-lg bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600 disabled:opacity-60">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
