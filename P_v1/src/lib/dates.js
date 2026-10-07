// Date helpers. The data mixes "dd/mm/yyyy", "d/m/yyyy" (not zero padded) and "yyyy-mm-dd".

// Accepts "dd/mm/yyyy", "d/m/yyyy" (not zero padded) and "yyyy-mm-dd".
export function parseDate(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  let day;
  let month;
  let year;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    [, day, month, year] = m;
  } else {
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return null;
    [, year, month, day] = m;
  }
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

const pad = (n) => String(n).padStart(2, '0');

// "dd/mm/yyyy" (the format appointments and registrations use)
export const formatDateFr = (date = new Date()) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

// "yyyy-mm-dd" (the format bills and follow-ups use)
export const formatDateIso = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "d/m/yyyy" (not zero padded): the format consultations are saved with
export const formatDateShort = (date = new Date()) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
