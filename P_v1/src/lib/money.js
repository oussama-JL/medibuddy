// The one place amounts are formatted: "1 250 DH".
export function formatMoney(value) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} DH`;
}
