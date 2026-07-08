import { useAnalyticsQuery, BarChart } from '@databricks/appkit-ui/react';
import { MessageSquare, AlertCircle, Percent, Timer } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { HEINEKEN_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtDec, fmtPct } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

export function Usage() {
  const params = useFilterParams();
  const t = useT();
  const { data: kpi } = useAnalyticsQuery('overview_kpis', params);
  const { data: bySpace, loading: loadingSpace } = useAnalyticsQuery('usage_by_space', params);
  const { data: byUser, loading: loadingUser } = useAnalyticsQuery('usage_by_user', params);

  const k = firstRow(kpi);
  const questions = toNum(k.questions);
  const errors = toNum(k.errors);
  const errorRate = questions > 0 ? (100 * errors) / questions : 0;

  const spaceCols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'workspace_name', header: t('col.workspace') },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
    { key: 'usuarios', header: t('col.users'), align: 'right', render: (r) => fmtInt(r.usuarios) },
    { key: 'erros', header: t('col.errors'), align: 'right', render: (r) => fmtInt(r.erros) },
    { key: 'latencia_ms', header: t('col.latency'), align: 'right', render: (r) => fmtDec(r.latencia_ms) },
  ];

  const userCols: Column[] = [
    { key: 'user_email', header: t('col.user') },
    { key: 'area', header: t('col.area') },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
    { key: 'espacos', header: t('col.spacesUsed'), align: 'right', render: (r) => fmtInt(r.espacos) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('us.title')} description={t('us.desc')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('ov.questions')} value={fmtInt(questions)} icon={<MessageSquare className="h-5 w-5" />} />
        <KpiCard label={t('col.errors')} value={fmtInt(errors)} tone="destructive" icon={<AlertCircle className="h-5 w-5" />} />
        <KpiCard label={t('us.errorRate')} value={fmtPct(errorRate)} tone={errorRate > 5 ? 'warning' : 'success'} icon={<Percent className="h-5 w-5" />} />
        <KpiCard label={t('us.avgLatency')} value={`${fmtDec(k.avg_latency)} ms`} icon={<Timer className="h-5 w-5" />} />
      </div>

      <ChartCard title={t('us.questionsBySpace')} description={t('us.questionsBySpaceDesc')}>
        <BarChart queryKey="usage_by_space" parameters={params} xKey="space_name" yKey="perguntas" colors={HEINEKEN_COLORS} height={320} />
      </ChartCard>

      <ChartCard title={t('us.detailBySpace')}>
        <DataGrid columns={spaceCols} rows={asRows(bySpace)} loading={loadingSpace} maxHeight="440px" />
      </ChartCard>

      <ChartCard title={t('us.topUsers')} description={t('us.topUsersDesc')}>
        <DataGrid columns={userCols} rows={asRows(byUser)} loading={loadingUser} maxHeight="440px" />
      </ChartCard>
    </div>
  );
}
