// Heineken Brasil chart palette (green-forward, red star accent, gold highlight).
export const HEINEKEN_COLORS = [
  '#00841f', // Heineken green
  '#6bbf59', // light green
  '#e4001b', // red star
  '#f2a900', // gold
  '#0a5c2e', // dark green
  '#8cc63f', // lime
  '#00611c',
  '#9aa0a6', // silver
];

export const BRAND = {
  name: 'Heineken',
  product: 'Genie Control Center',
  green: '#00841f',
  darkGreen: '#0a5c2e',
  red: '#e4001b',
  gold: '#f2a900',
};

// Colors used to render the space status pills consistently across pages.
export const STATUS_STYLES: Record<string, string> = {
  Ativo: 'bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30',
  Dormente: 'bg-[color:var(--warning)]/15 text-[color:var(--warning)] border border-[color:var(--warning)]/40',
  'Órfão': 'bg-destructive/10 text-destructive border border-destructive/30',
};
