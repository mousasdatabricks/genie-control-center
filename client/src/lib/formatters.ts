// Numeric values from Databricks SQL may arrive as strings — always coerce.
export const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export const fmtInt = (v: unknown): string => intFmt.format(toNum(v));
export const fmtDec = (v: unknown): string => decFmt.format(toNum(v));

export const fmtUsd = (v: unknown): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(toNum(v));

export const fmtPct = (v: unknown): string => `${decFmt.format(toNum(v))}%`;

// Renders a YYYY-MM-DD (or ISO) date as dd/mm/aaaa without timezone drift.
export const fmtDate = (v: unknown): string => {
  if (!v) return '—';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
};

export const daysAgoStr = (n: number): string => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().split('T')[0];
};

// Whole days between an ISO date string and today.
export const daysSince = (v: unknown): number | null => {
  if (!v) return null;
  const then = new Date(String(v).slice(0, 10)).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86400000);
};
