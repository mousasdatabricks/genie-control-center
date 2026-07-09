import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsQuery, BarChart, LineChart } from '@databricks/appkit-ui/react';
import { Users, UserPlus, Layers, Gauge } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useI18n, DOW_LABELS } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { PageHeader, ChartCard } from '../components/ui-bits';

interface Goal {
  area: string;
  mau_goal: number;
}

export function Adoption() {
  const params = useFilterParams();
  const { t, lang } = useI18n();
  const dow = DOW_LABELS[lang];
  const { data: byArea } = useAnalyticsQuery('adoption_by_area', params);
  const { data: heatRows } = useAnalyticsQuery('adoption_heatmap', params);
  const { data: kpi } = useAnalyticsQuery('overview_kpis', params);
  const { data: newUsers } = useAnalyticsQuery('adoption_new_users', params);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch('/api/admin/goals')
      .then((r) => (r.ok ? r.json() : []))
      .then((g: Goal[]) => setGoals(Array.isArray(g) ? g : []))
      .catch(() => setGoals([]));
  }, []);

  const areaRows = asRows(byArea);
  const k = firstRow(kpi);
  const totalNew = asRows(newUsers).reduce((acc, r) => acc + toNum(r.novos_usuarios), 0);
  const qPerUser = toNum(k.active_users) > 0 ? toNum(k.questions) / toNum(k.active_users) : 0;

  const heat = useMemo(() => {
    const map = new Map<string, number[]>();
    let max = 1;
    for (const r of asRows(heatRows)) {
      const area = String(r.area);
      const d = toNum(r.dow) - 1;
      const val = toNum(r.perguntas);
      if (!map.has(area)) map.set(area, [0, 0, 0, 0, 0, 0, 0]);
      const arr = map.get(area)!;
      if (d >= 0 && d < 7) arr[d] = val;
      if (val > max) max = val;
    }
    return { entries: Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])), max };
  }, [heatRows]);

  const goalByArea = new Map(goals.map((g) => [g.area, g.mau_goal]));

  return (
    <div className="space-y-6">
      <PageHeader title={t('ad.title')} description={t('ad.desc')} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('ad.activeUsers')} value={fmtInt(k.active_users)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label={t('ad.newUsers')} value={fmtInt(totalNew)} tone="success" icon={<UserPlus className="h-5 w-5" />} />
        <KpiCard label={t('ad.activeAreas')} value={fmtInt(areaRows.length)} icon={<Layers className="h-5 w-5" />} />
        <KpiCard label={t('ad.qPerUser')} value={qPerUser.toFixed(1)} icon={<Gauge className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('ad.usersQuestionsByArea')}>
          <BarChart
            queryKey="adoption_by_area"
            parameters={params}
            xKey="area"
            yKey={['usuarios', 'perguntas']}
            colors={CHART_COLORS}
            height={300}
            showLegend
          />
        </ChartCard>
        <ChartCard title={t('ad.newUsersWeek')} description={t('ad.newUsersWeekDesc')}>
          <LineChart
            queryKey="adoption_new_users"
            parameters={params}
            xKey="semana"
            yKey="novos_usuarios"
            colors={[CHART_COLORS[0]]}
            height={300}
            smooth
          />
        </ChartCard>
      </div>

      <ChartCard title={t('ad.heatmap')} description={t('ad.heatmapDesc')}>
        {heat.entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('common.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-separate" style={{ borderSpacing: '4px' }}>
              <thead>
                <tr>
                  <th className="w-40" />
                  {dow.map((d) => (
                    <th key={d} className="px-2 text-xs font-medium text-muted-foreground">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heat.entries.map(([area, vals]) => (
                  <tr key={area}>
                    <td className="pr-2 text-right text-xs font-medium text-foreground">{area}</td>
                    {vals.map((v, i) => {
                      const intensity = v / heat.max;
                      return (
                        <td key={i}>
                          <div
                            className="flex h-9 w-12 items-center justify-center rounded text-[11px] font-medium"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${CHART_COLORS[0]} ${Math.round(
                                intensity * 100,
                              )}%, transparent)`,
                              color: intensity > 0.5 ? 'white' : 'var(--muted-foreground)',
                            }}
                            title={`${area} · ${dow[i]}: ${fmtInt(v)}`}
                          >
                            {v > 0 ? fmtInt(v) : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>

      <ChartCard title={t('ad.goals')} description={t('ad.goalsDesc')}>
        <div className="space-y-3">
          {areaRows.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t('common.noData')}</p>}
          {areaRows.map((r) => {
            const area = String(r.area);
            const users = toNum(r.usuarios);
            const goal = goalByArea.get(area) ?? 0;
            const pct = goal > 0 ? Math.min(100, (100 * users) / goal) : 0;
            return (
              <div key={area}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{area}</span>
                  <span className="text-muted-foreground">
                    {fmtInt(users)}
                    {goal > 0 && <span> / {t('ad.goal')} {fmtInt(goal)}</span>}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${goal > 0 ? pct : 100}%`,
                      backgroundColor: pct >= 100 ? CHART_COLORS[0] : CHART_COLORS[1],
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>
    </div>
  );
}
