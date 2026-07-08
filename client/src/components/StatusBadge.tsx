import { STATUS_STYLES } from '../lib/theme';
import { useT } from '../lib/i18n';

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const cls = STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground border border-border';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {t(`status.${status}`)}
    </span>
  );
}
