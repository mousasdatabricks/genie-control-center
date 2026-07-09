import { CLIENT_BRAND } from './brand-config';

/** Chart palette — customize colors in brand-config.ts */
export const CHART_COLORS = [
  CLIENT_BRAND.primary,
  '#4C8BF5',
  CLIENT_BRAND.accent,
  CLIENT_BRAND.gold,
  '#1B3A6B',
  '#6BA3F7',
  '#0A3D91',
  '#9AA0A6',
];

export const BRAND = {
  name: CLIENT_BRAND.orgName,
  product: CLIENT_BRAND.productName,
  primary: CLIENT_BRAND.primary,
  accent: CLIENT_BRAND.accent,
  gold: CLIENT_BRAND.gold,
};

export const STATUS_STYLES: Record<string, string> = {
  Ativo: 'bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30',
  Dormente: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/40',
  'Órfão': 'bg-destructive/10 text-destructive border border-destructive/30',
};
