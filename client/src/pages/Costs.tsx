import { useAnalyticsQuery, AreaChart, DonutChart, BarChart } from '@databricks/appkit-ui/react';
import { DollarSign, Coins, UserCog, TrendingUp } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtUsd } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

export function Costs() {
  const params = useFilterParams();
  const t = useT();
  const { data: kpi } = useAnalyticsQuery('overview_kpis', params);
  const { data: bySpace, loading: loadingSpace } = useAnalyticsQuery('cost_by_space', params);
  const { data: efficiency, loading: loadingEff } = useAnalyticsQuery('cost_efficiency', params);
  const { data: series } = useAnalyticsQuery('cost_timeseries', params);

  const k = firstRow(kpi);
  const totalCost = toNum(k.total_cost);
  const questions = toNum(k.questions);
  const activeUsers = toNum(k.active_users);
  const costPerQ = questions > 0 ? totalCost / questions : 0;
  const costPerUser = activeUsers > 0 ? totalCost / activeUsers : 0;

  const days = asRows(series).length || 1;
  const runRate = (totalCost / days) * 30;

  const spaceCols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'workspace_name', header: t('col.workspace') },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
    { key: 'usuarios', header: t('col.users'), align: 'right', render: (r) => fmtInt(r.usuarios) },
    { key: 'custo', header: t('col.cost'), align: 'right', render: (r) => fmtUsd(r.custo) },
    { key: 'custo_por_pergunta', header: t('col.costPerQ'), align: 'right', render: (r) => fmtUsd(r.custo_por_pergunta) },
  ];

  const effCols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'status', header: t('col.status'), render: (r) => <StatusBadge status={String(r.status)} /> },
    { key: 'usuarios', header: t('col.users'), align: 'right', render: (r) => fmtInt(r.usuarios) },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
    { key: 'custo', header: t('col.cost'), align: 'right', render: (r) => fmtUsd(r.custo) },
    { key: 'custo_por_usuario', header: t('col.costPerUser'), align: 'right', render: (r) => fmtUsd(r.custo_por_usuario) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('co.title')} description={t('co.desc')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('co.totalPeriod')} value={fmtUsd(totalCost)} tone="warning" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard label={t('ov.costPerQ')} value={fmtUsd(costPerQ)} icon={<Coins className="h-5 w-5" />} />
        <KpiCard label={t('co.costPerUser')} value={fmtUsd(costPerUser)} icon={<UserCog className="h-5 w-5" />} />
        <KpiCard label={t('co.runRate')} value={fmtUsd(runRate)} tone="destructive" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <ChartCard title={t('co.daily')} description={t('co.dailyDesc')}>
        <AreaChart queryKey="cost_timeseries" parameters={params} xKey="usage_date" yKey="custo" colors={[CHART_COLORS[3]]} height={300} smooth />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('co.bySku')} description={t('co.bySkuDesc')}>
          <DonutChart queryKey="cost_by_sku" parameters={params} xKey="sku" yKey="custo" colors={CHART_COLORS} height={300} />
        </ChartCard>
        <ChartCard title={t('co.byArea')}>
          <BarChart queryKey="cost_by_area" parameters={params} xKey="area" yKey="custo" colors={CHART_COLORS} height={300} />
        </ChartCard>
      </div>

      <ChartCard title={t('co.bySpace')}>
        <DataGrid columns={spaceCols} rows={asRows(bySpace)} loading={loadingSpace} maxHeight="440px" />
      </ChartCard>

      <ChartCard title={t('co.efficiency')} description={t('co.efficiencyDesc')}>
        <DataGrid columns={effCols} rows={asRows(efficiency)} loading={loadingEff} maxHeight="440px" />
      </ChartCard>
    </div>
  );
}
