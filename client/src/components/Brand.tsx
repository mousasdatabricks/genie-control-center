import { useT } from '../lib/i18n';
import { CLIENT_BRAND } from '../lib/brand-config';

function BrandIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a1 1 0 0 1 .9.55l1.6 3.24 3.58.52a1 1 0 0 1 .55 1.7l-2.59 2.53.61 3.56a1 1 0 0 1-1.45 1.05L12 13.77l-3.2 1.68a1 1 0 0 1-1.45-1.05l.61-3.56L5.37 7.01a1 1 0 0 1 .55-1.7l3.58-.52L11.1 2.55A1 1 0 0 1 12 2z"
      />
    </svg>
  );
}

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  const t = useT();
  const title = `${CLIENT_BRAND.orgName} · ${CLIENT_BRAND.productName}`;

  if (collapsed) {
    return (
      <div className="flex justify-center">
        <div
          className="flex items-center justify-center rounded-md bg-primary p-1.5 text-primary-foreground"
          title={title}
        >
          <BrandIcon className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <div className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-primary-foreground">
        <BrandIcon className="h-4 w-4" />
        <span className="text-sm font-extrabold tracking-tight uppercase">{CLIENT_BRAND.orgName}</span>
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-sidebar-foreground">{CLIENT_BRAND.productName}</p>
        <p className="text-[11px] text-sidebar-foreground/60">{t('brand.subtitle')}</p>
      </div>
    </div>
  );
}
