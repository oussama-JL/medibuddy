// Body-mass index from height (cm) and weight (kg). Returns null when either value is missing or unusable.
// Categories follow the standard WHO ranges.
export function computeBmi(tailleCm, poidsKg) {
  const height = Number(tailleCm) / 100;
  const weight = Number(poidsKg);
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height <= 0 || weight <= 0) return null;

  const value = weight / (height * height);
  let label;
  let color;
  if (value < 18.5) {
    label = 'Insuffisance pondérale';
    color = 'bg-blue-500 text-white';
  } else if (value < 25) {
    label = 'Corpulence normale';
    color = 'bg-emerald-500 text-white';
  } else if (value < 30) {
    label = 'Surpoids';
    color = 'bg-amber-500 text-white';
  } else if (value < 35) {
    label = 'Obésité modérée';
    color = 'bg-orange-500 text-white';
  } else if (value < 40) {
    label = 'Obésité sévère';
    color = 'bg-red-500 text-white';
  } else {
    label = 'Obésité morbide';
    color = 'bg-red-700 text-white';
  }
  return { value, label, color };
}
