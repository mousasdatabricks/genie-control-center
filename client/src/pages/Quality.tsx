import { useAnalyticsQuery, LineChart } from '@databricks/appkit-ui/react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtPct } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

function SuccessCell({ v }: { v: unknown }) {
  const n = toNum(v);
  const tone = n >= 85 ? 'var(--success)' : n >= 70 ? 'var(--warning)' : 'var(--destructive)';
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-16 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, n)}%`, backgroundColor: tone }} />
      </span>
      <span className="font-medium" style={{ color: tone }}>{fmtPct(n)}</span>
    </span>
  );
}

export function Quality() {
  const params = useFilterParams();
  const t = useT();
  const { data: kpi } = useAnalyticsQuery('overview_kpis', params);
  const { data: bySpace, loading } = useAnalyticsQuery('quality_by_space', params);

  const k = firstRow(kpi);
  const pos = toNum(k.pos);
  const neg = toNum(k.neg);
  const rate = pos + neg > 0 ? (100 * pos) / (pos + neg) : 0;

  const rows = asRows(bySpace);
  const worst = rows.filter((r) => toNum(r.taxa_sucesso) < 75);

  const cols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'positivos', header: '👍', align: 'right', render: (r) => fmtInt(r.positivos) },
    { key: 'negativos', header: '👎', align: 'right', render: (r) => fmtInt(r.negativos) },
    { key: 'feedback_total', header: t('col.feedbackTotal'), align: 'right', render: (r) => fmtInt(r.feedback_total) },
    { key: 'taxa_sucesso', header: t('col.success'), align: 'right', render: (r) => <SuccessCell v={r.taxa_sucesso} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('ql.title')} description={t('ql.desc')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('ql.successRate')} value={fmtPct(rate)} tone={rate >= 75 ? 'success' : 'warning'} icon={<Star className="h-5 w-5" />} />
        <KpiCard label={t('ql.posFeedback')} value={fmtInt(pos)} tone="success" icon={<ThumbsUp className="h-5 w-5" />} />
        <KpiCard label={t('ql.negFeedback')} value={fmtInt(neg)} tone="destructive" icon={<ThumbsDown className="h-5 w-5" />} />
        <KpiCard label={t('ql.totalFeedback')} value={fmtInt(pos + neg)} icon={<MessageSquare className="h-5 w-5" />} />
      </div>

      <ChartCard title={t('ql.evolution')} description={t('ql.evolutionDesc')}>
        <LineChart queryKey="quality_timeseries" parameters={params} xKey="usage_date" yKey="taxa_sucesso" colors={[CHART_COLORS[0]]} height={300} smooth />
      </ChartCard>

      {worst.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-foreground">{t('ql.worst', { n: worst.length })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {worst.map((r) => (
              <span key={String(r.space_name)} className="rounded-md border border-border bg-card px-2.5 py-1 text-xs">
                {String(r.space_name)} · <span className="font-medium text-destructive">{fmtPct(r.taxa_sucesso)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <ChartCard title={t('ql.bySpace')} description={t('ql.bySpaceDesc')}>
        <DataGrid columns={cols} rows={rows} loading={loading} maxHeight="500px" />
      </ChartCard>
    </div>
  );
}
