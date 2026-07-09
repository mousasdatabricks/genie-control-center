import { useAnalyticsQuery, LineChart, BarChart, DonutChart } from '@databricks/appkit-ui/react';
import { Link } from 'react-router';
import {
  Activity,
  Users,
  MessageSquare,
  ThumbsUp,
  DollarSign,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtUsd, fmtPct, fmtDec } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { PageHeader, ChartCard } from '../components/ui-bits';

export function Overview() {
  const params = useFilterParams();
  const t = useT();
  const { data: kpiData } = useAnalyticsQuery('overview_kpis', params);
  const { data: spaces } = useAnalyticsQuery('spaces_inventory', params);

  const k = firstRow(kpiData);
  const questions = toNum(k.questions);
  const pos = toNum(k.pos);
  const neg = toNum(k.neg);
  const successRate = pos + neg > 0 ? (100 * pos) / (pos + neg) : 0;
  const costPerQ = questions > 0 ? toNum(k.total_cost) / questions : 0;

  const rows = asRows(spaces);
  const attention = rows.filter((r) => r.status === 'Órfão' || r.status === 'Dormente');

  return (
    <div className="space-y-6">
      <PageHeader title={t('ov.title')} description={t('ov.desc')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t('ov.activeSpaces')} value={fmtInt(k.active_spaces)} icon={<Activity className="h-5 w-5" />} />
        <KpiCard label={t('ov.activeUsers')} value={fmtInt(k.active_users)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label={t('ov.questions')} value={fmtInt(questions)} icon={<MessageSquare className="h-5 w-5" />} />
        <KpiCard
          label={t('ov.successRate')}
          value={fmtPct(successRate)}
          sub={`${fmtInt(pos)} 👍 / ${fmtInt(neg)} 👎`}
          tone={successRate >= 75 ? 'success' : 'warning'}
          icon={<ThumbsUp className="h-5 w-5" />}
        />
        <KpiCard label={t('ov.totalCost')} value={fmtUsd(k.total_cost)} tone="warning" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard label={t('ov.costPerQ')} value={fmtUsd(costPerQ)} icon={<Coins className="h-5 w-5" />} />
      </div>

      {attention.length > 0 && (
        <div className="rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[color:var(--warning)]" />
            <span className="text-sm font-semibold text-foreground">
              {t('ov.attention', { n: attention.length })}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {attention.slice(0, 8).map((r) => (
              <Link
                key={String(r.space_id)}
                to={`/spaces/${String(r.space_id)}`}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent/50"
              >
                <span className="font-medium">{String(r.space_name)}</span>
                <StatusBadge status={String(r.status)} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t('ov.tsTitle')} description={t('ov.tsDesc')} className="lg:col-span-2">
          <LineChart
            queryKey="overview_timeseries"
            parameters={params}
            xKey="usage_date"
            yKey={['questions', 'active_users']}
            colors={CHART_COLORS}
            height={300}
            smooth
            showLegend
          />
        </ChartCard>
        <ChartCard title={t('ov.costByArea')} description={t('ov.costByAreaDesc')}>
          <DonutChart queryKey="cost_by_area" parameters={params} xKey="area" yKey="custo" colors={CHART_COLORS} height={300} />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('ov.adoptionByArea')} description={t('ov.adoptionByAreaDesc')}>
          <BarChart queryKey="adoption_by_area" parameters={params} xKey="area" yKey="usuarios" colors={CHART_COLORS} height={300} />
        </ChartCard>
        <ChartCard title={t('ov.questionsBySpace')} description={t('ov.questionsBySpaceDesc')}>
          <BarChart queryKey="usage_by_space" parameters={params} xKey="space_name" yKey="perguntas" colors={CHART_COLORS} height={300} />
        </ChartCard>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('ov.avgCostLatency', { c: fmtUsd(costPerQ), l: fmtDec(k.avg_latency) })}
      </p>
    </div>
  );
}
