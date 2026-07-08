import { useT } from '../lib/i18n';

// Heineken red star mark (inline SVG so the app stays fully self-contained).
export function HeinekenStar({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#e4001b"
        d="M12 2l2.9 6.26L21.8 9l-5 4.9 1.3 6.9L12 17.5 5.9 20.8l1.3-6.9-5-4.9 6.9-.74z"
      />
    </svg>
  );
}

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const t = useT();

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div className="flex items-center justify-center rounded-md bg-primary p-1.5" title="Heineken · Genie Control Center">
          <HeinekenStar className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <div className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1">
        <HeinekenStar className="h-4 w-4" />
        <span className="text-sm font-extrabold tracking-tight text-primary-foreground">HEINEKEN</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-sidebar-foreground">Genie Control Center</p>
        <p className="text-[11px] text-sidebar-foreground/60">{t('brand.subtitle')}</p>
      </div>
    </div>
  );
}
