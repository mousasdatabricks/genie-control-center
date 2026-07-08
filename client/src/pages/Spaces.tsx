import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAnalyticsQuery, Input, Button } from '@databricks/appkit-ui/react';
import { Search } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows } from '../lib/rows';
import { toNum, fmtInt, fmtUsd, fmtDate } from '../lib/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

const STATUSES = ['Todos', 'Ativo', 'Dormente', 'Órfão'];

export function Spaces() {
  const params = useFilterParams();
  const t = useT();
  const navigate = useNavigate();
  const { data, loading } = useAnalyticsQuery('spaces_inventory', params);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('Todos');

  const all = asRows(data);
  const rows = useMemo(
    () =>
      all.filter((r) => {
        const matchStatus = status === 'Todos' || r.status === status;
        const matchText = !q || String(r.space_name).toLowerCase().includes(q.toLowerCase());
        return matchStatus && matchText;
      }),
    [all, q, status],
  );

  const totalCost = all.reduce((a, r) => a + toNum(r.cost_30d), 0);

  const cols: Column[] = [
    { key: 'space_name', header: t('col.space'), render: (r) => <span className="font-medium text-foreground">{String(r.space_name)}</span> },
    { key: 'status', header: t('col.status'), render: (r) => <StatusBadge status={String(r.status)} /> },
    { key: 'area', header: t('col.area') },
    { key: 'workspace_name', header: t('col.workspace') },
    { key: 'owner_email', header: t('col.owner') },
    { key: 'num_tables', header: t('col.tables'), align: 'right', render: (r) => fmtInt(r.num_tables) },
    { key: 'last_activity', header: t('col.lastActivity'), render: (r) => fmtDate(r.last_activity) },
    { key: 'users_30d', header: t('col.users30d'), align: 'right', render: (r) => fmtInt(r.users_30d) },
    { key: 'questions_30d', header: t('col.questions30d'), align: 'right', render: (r) => fmtInt(r.questions_30d) },
    { key: 'cost_30d', header: t('col.cost30d'), align: 'right', render: (r) => fmtUsd(r.cost_30d) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('sp.title')} description={t('sp.desc')} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>
              {t(`status.${s}`)}
            </Button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('sp.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('sp.count', { n: fmtInt(rows.length), total: fmtInt(all.length), cost: fmtUsd(totalCost) })}
      </p>

      <ChartCard title={t('sp.inventory')}>
        <DataGrid columns={cols} rows={rows} loading={loading} onRowClick={(r) => navigate(`/spaces/${String(r.space_id)}`)} maxHeight="560px" />
      </ChartCard>
    </div>
  );
}
