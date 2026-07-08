import type { ReactNode } from 'react';
import { Card, CardContent } from '@databricks/appkit-ui/react';

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
}

const toneRing: Record<string, string> = {
  default: 'text-primary',
  success: 'text-[color:var(--success)]',
  warning: 'text-[color:var(--warning)]',
  destructive: 'text-destructive',
};

export function KpiCard({ label, value, sub, icon, tone = 'default' }: KpiCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground truncate">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {icon && <div className={`shrink-0 ${toneRing[tone]}`}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
