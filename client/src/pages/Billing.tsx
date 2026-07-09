import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsQuery, AreaChart, BarChart, Input, Button } from '@databricks/appkit-ui/react';
import { Users, Cpu, Gift, DollarSign, TrendingUp, Save, RotateCcw, Info, Layers, Boxes } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtUsd, fmtDec } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

interface Threshold { key: string; value: number; label: string }
interface Budget { user_email: string; monthly_usd: number }

export function Billing() {
  const params = useFilterParams();
  const t = useT();

  const { data: overview } = useAnalyticsQuery('billing_overview', params);
  const { data: bySku, loading: loadingSku } = useAnalyticsQuery('billing_by_sku_detail', params);
  const { data: byProduct } = useAnalyticsQuery('billing_by_product', params);
  const { data: byUser, loading: loadingUser } = useAnalyticsQuery('billing_by_user_total', params);
  const { data: bySpace, loading: loadingSpace } = useAnalyticsQuery('billing_by_space_total', params);
  const { data: summary } = useAnalyticsQuery('paygo_summary', params);
  const { data: userCosts, loading: loadingPaygo } = useAnalyticsQuery('paygo_user_costs', params);

  const [defaultBudget, setDefaultBudget] = useState(20);
  const [defaultDraft, setDefaultDraft] = useState('20');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});

  const ov = firstRow(overview);

  const loadBudgets = () => {
    fetch('/api/admin/thresholds')
      .then((r) => (r.ok ? r.json() : []))
      .then((th: Threshold[]) => {
        const d = (th || []).find((x) => x.key === 'default_user_budget_usd');
        if (d) {
          setDefaultBudget(toNum(d.value));
          setDefaultDraft(String(toNum(d.value)));
        }
      })
      .catch(() => {});
    fetch('/api/admin/user-budgets')
      .then((r) => (r.ok ? r.json() : []))
      .then((b: Budget[]) => {
        const map: Record<string, number> = {};
        for (const x of b || []) map[x.user_email] = toNum(x.monthly_usd);
        setOverrides(map);
      })
      .catch(() => {});
  };

  useEffect(loadBudgets, []);

  const saveDefault = async () => {
    const value = toNum(defaultDraft);
    const res = await fetch('/api/admin/thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'default_user_budget_usd', value }),
    });
    if (res.ok) setDefaultBudget(value);
  };

  const saveOverride = async (email: string) => {
    const value = toNum(draft[email]);
    const res = await fetch('/api/admin/user-budgets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: email, monthly_usd: value }),
    });
    if (res.ok) setOverrides((prev) => ({ ...prev, [email]: value }));
  };

  const clearOverride = async (email: string) => {
    const res = await fetch(`/api/admin/user-budgets/${encodeURIComponent(email)}`, { method: 'DELETE' });
    if (res.ok) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[email];
        return next;
      });
    }
  };

  const skuCols: Column[] = [
    { key: 'sku_name', header: t('gb.colSku') },
    { key: 'cost_category', header: t('gb.colCategory') },
    { key: 'custo', header: t('col.cost'), align: 'right', render: (r) => fmtUsd(r.custo) },
    { key: 'dbus', header: t('gb.colDbus'), align: 'right', render: (r) => fmtDec(r.dbus) },
  ];

  const userCols: Column[] = [
    { key: 'user_email', header: t('col.user') },
    { key: 'area', header: t('col.area') },
    { key: 'custo_compute', header: t('gb.colCompute'), align: 'right', render: (r) => fmtUsd(r.custo_compute) },
    { key: 'custo_llm', header: t('gb.colLlm'), align: 'right', render: (r) => fmtUsd(r.custo_llm) },
    { key: 'custo_total', header: t('gb.colTotal'), align: 'right', render: (r) => fmtUsd(r.custo_total) },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
  ];

  const spaceCols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'custo_compute', header: t('gb.colCompute'), align: 'right', render: (r) => fmtUsd(r.custo_compute) },
    { key: 'custo_llm', header: t('gb.colLlm'), align: 'right', render: (r) => fmtUsd(r.custo_llm) },
    { key: 'custo_total', header: t('gb.colTotal'), align: 'right', render: (r) => fmtUsd(r.custo_total) },
    { key: 'usuarios', header: t('col.users'), align: 'right', render: (r) => fmtInt(r.usuarios) },
  ];

  const spaceCols: Column[] = [
    { key: 'space_name', header: t('col.space') },
    { key: 'area', header: t('col.area') },
    { key: 'custo_compute', header: t('gb.colCompute'), align: 'right', render: (r) => fmtUsd(r.custo_compute) },
    { key: 'custo_llm', header: t('gb.colLlm'), align: 'right', render: (r) => fmtUsd(r.custo_llm) },
    { key: 'custo_total', header: t('gb.colTotal'), align: 'right', render: (r) => fmtUsd(r.custo_total) },
    { key: 'usuarios', header: t('col.users'), align: 'right', render: (r) => fmtInt(r.usuarios) },
  ];

  const s = firstRow(summary);
  const paygoRows = useMemo(() => asRows(userCosts), [userCosts]);

  return (
    <div className="space-y-8">
      <PageHeader title={t('gb.title')} description={t('gb.desc')} />

      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-foreground">{t('gb.banner')}</span>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('gb.sectionOverview')}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={t('gb.totalGenie')} value={fmtUsd(ov.total_sku)} icon={<DollarSign className="h-5 w-5" />} />
          <KpiCard label={t('gb.llmCost')} value={fmtUsd(ov.llm_cost)} tone="warning" icon={<Cpu className="h-5 w-5" />} />
          <KpiCard label={t('gb.computeCost')} value={fmtUsd(ov.compute_cost)} icon={<Layers className="h-5 w-5" />} />
          <KpiCard label={t('gb.activeUsers')} value={fmtInt(ov.active_users)} icon={<Users className="h-5 w-5" />} />
          <KpiCard label={t('ov.questions')} value={fmtInt(ov.questions)} icon={<Boxes className="h-5 w-5" />} />
          <KpiCard label={t('ov.costPerQ')} value={fmtUsd(ov.cost_per_question)} icon={<TrendingUp className="h-5 w-5" />} />
        </div>
        <ChartCard title={t('gb.dailyTotal')} description={t('gb.dailyTotalDesc')}>
          <AreaChart queryKey="billing_daily_total" parameters={params} xKey="usage_date" yKey="custo" colors={[CHART_COLORS[0]]} height={280} smooth />
        </ChartCard>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('gb.sectionSku')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('gb.byProduct')} description={t('gb.byProductDesc')}>
            <BarChart
              queryKey="billing_by_product"
              parameters={params}
              xKey="product_surface"
              yKey="perguntas"
              colors={CHART_COLORS}
              height={280}
            />
          </ChartCard>
          <ChartCard title={t('gb.skuTable')} description={t('gb.skuTableDesc')}>
            <DataGrid columns={skuCols} rows={asRows(bySku)} loading={loadingSku} maxHeight="280px" />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('gb.sectionAllocation')}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title={t('gb.byUser')} description={t('gb.byUserDesc')}>
            <DataGrid columns={userCols} rows={asRows(byUser)} loading={loadingUser} maxHeight="400px" />
          </ChartCard>
          <ChartCard title={t('gb.bySpace')} description={t('gb.bySpaceDesc')}>
            <DataGrid columns={spaceCols} rows={asRows(bySpace)} loading={loadingSpace} maxHeight="400px" />
          </ChartCard>
        </div>
      </section>

      <section className="space-y-4 border-t pt-6">
        <h2 className="text-lg font-semibold text-foreground">{t('pg.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('pg.desc')}</p>
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('pg.model')}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label={t('pg.payingUsers')} value={`${fmtInt(s.paying_users)} / ${fmtInt(s.total_users)}`} icon={<Users className="h-5 w-5" />} />
          <KpiCard label={t('pg.totalDbus')} value={fmtInt(s.total_dbus)} icon={<Cpu className="h-5 w-5" />} />
          <KpiCard label={t('pg.freeDbus')} value={fmtInt(s.free_dbus)} tone="success" icon={<Gift className="h-5 w-5" />} />
          <KpiCard label={t('pg.paidDbus')} value={fmtInt(s.paid_dbus)} tone="warning" icon={<Cpu className="h-5 w-5" />} />
          <KpiCard label={t('pg.paidCost')} value={fmtUsd(s.paid_list)} icon={<DollarSign className="h-5 w-5" />} />
          <KpiCard label={t('pg.projMonth')} value={fmtUsd(s.paid_promo)} tone="destructive" icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        <ChartCard title={t('pg.distribution')} description={t('pg.distributionDesc')}>
          <BarChart queryKey="paygo_distribution" parameters={params} xKey="faixa" yKey="usuarios" colors={CHART_COLORS} height={240} />
        </ChartCard>

        <ChartCard title={t('pg.userTable')} description={t('pg.userTableDesc')}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('pg.defaultBudget')}:</span>
            <span className="text-sm">US$</span>
            <Input type="number" value={defaultDraft} onChange={(e) => setDefaultDraft(e.target.value)} className="w-24" />
            <Button size="sm" variant="outline" onClick={saveDefault}>
              <Save className="mr-1 h-3.5 w-3.5" /> {t('common.save')}
            </Button>
          </div>
          {loadingPaygo ? (
            <div className="h-40 animate-pulse rounded bg-muted" />
          ) : (
            <div className="overflow-auto rounded-md border" style={{ maxHeight: '480px' }}>
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('col.user')}</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('pg.colDbus')}</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('pg.colPaidCost')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pg.colBudget')}</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pg.colVsBudget')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paygoRows.map((r, i) => {
                    const email = String(r.user_email);
                    const paid = toNum(r.custo_promo);
                    const hasOverride = email in overrides;
                    const budget = hasOverride ? overrides[email] : defaultBudget;
                    const ratio = budget > 0 ? paid / budget : 0;
                    const status = paid > budget ? t('pg.statusOver') : ratio >= 0.8 ? t('pg.statusAlert') : t('pg.statusOk');
                    const statusColor = paid > budget ? 'var(--destructive)' : ratio >= 0.8 ? 'var(--warning)' : 'var(--success)';
                    const inputVal = draft[email] ?? (hasOverride ? String(budget) : '');
                    return (
                      <tr key={`${email}-${i}`} className="border-t border-border/60 hover:bg-muted/40">
                        <td className="px-3 py-2">{email}</td>
                        <td className="px-3 py-2 text-right">{fmtDec(r.dbus)}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmtUsd(paid)}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            <Input type="number" value={inputVal} placeholder={String(defaultBudget)} onChange={(e) => setDraft((p) => ({ ...p, [email]: e.target.value }))} className="h-7 w-20" />
                            <button type="button" onClick={() => saveOverride(email)} className="rounded p-1 text-muted-foreground hover:text-primary"><Save className="h-3.5 w-3.5" /></button>
                            {hasOverride && (
                              <button type="button" onClick={() => clearOverride(email)} className="rounded p-1 text-muted-foreground hover:text-destructive"><RotateCcw className="h-3.5 w-3.5" /></button>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs font-medium" style={{ color: statusColor }}>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {t('pg.note')}
        </p>
      </section>
    </div>
  );
}
