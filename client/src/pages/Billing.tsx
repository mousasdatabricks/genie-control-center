import { useEffect, useMemo, useState } from 'react';
import { useAnalyticsQuery, BarChart, Input, Button } from '@databricks/appkit-ui/react';
import { Users, Cpu, Gift, DollarSign, TrendingUp, Save, RotateCcw, Info } from 'lucide-react';
import { useFilterParams } from '../lib/filters';
import { useT } from '../lib/i18n';
import { asRows, firstRow } from '../lib/rows';
import { CHART_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtUsd, fmtDec } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { PageHeader, ChartCard } from '../components/ui-bits';

interface Threshold { key: string; value: number; label: string }
interface Budget { user_email: string; monthly_usd: number }

export function Billing() {
  const params = useFilterParams();
  const t = useT();
  const { data: summary } = useAnalyticsQuery('paygo_summary', params);
  const { data: userCosts, loading } = useAnalyticsQuery('paygo_user_costs', params);

  const [defaultBudget, setDefaultBudget] = useState(20);
  const [defaultDraft, setDefaultDraft] = useState('20');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});

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

  const s = firstRow(summary);
  const rows = useMemo(() => asRows(userCosts), [userCosts]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('pg.title')} description={t('pg.desc')} />

      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-foreground">{t('pg.model')}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={t('pg.payingUsers')}
          value={`${fmtInt(s.paying_users)} / ${fmtInt(s.total_users)}`}
          sub={`${fmtDec(toNum(s.total_users) > 0 ? (100 * toNum(s.paying_users)) / toNum(s.total_users) : 0)}%`}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard label={t('pg.totalDbus')} value={fmtInt(s.total_dbus)} icon={<Cpu className="h-5 w-5" />} />
        <KpiCard label={t('pg.freeDbus')} value={fmtInt(s.free_dbus)} tone="success" icon={<Gift className="h-5 w-5" />} />
        <KpiCard label={t('pg.paidDbus')} value={fmtInt(s.paid_dbus)} tone="warning" icon={<Cpu className="h-5 w-5" />} />
        <KpiCard label={t('pg.paidCost')} value={fmtUsd(s.paid_list)} icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard label={t('pg.projMonth')} value={fmtUsd(s.paid_promo)} tone="destructive" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <ChartCard title={t('pg.distribution')} description={t('pg.distributionDesc')}>
        <BarChart
          queryKey="paygo_distribution"
          parameters={params}
          xKey="faixa"
          yKey="usuarios"
          colors={CHART_COLORS}
          height={280}
        />
      </ChartCard>

      <ChartCard title={t('pg.userTable')} description={t('pg.userTableDesc')}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('pg.defaultBudget')}:</span>
          <span className="text-sm">US$</span>
          <Input
            type="number"
            value={defaultDraft}
            onChange={(e) => setDefaultDraft(e.target.value)}
            className="w-24"
          />
          <Button size="sm" variant="outline" onClick={saveDefault}>
            <Save className="mr-1 h-3.5 w-3.5" /> {t('common.save')}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : (
          <div className="overflow-auto rounded-md border" style={{ maxHeight: '560px' }}>
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('col.user')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('col.area')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('pg.colDbus')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pg.colFreePct')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('pg.colPaidDbus')}</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">{t('pg.colPaidCost')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pg.colBudget')}</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">{t('pg.colVsBudget')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const email = String(r.user_email);
                  const paid = toNum(r.custo_promo);
                  const hasOverride = email in overrides;
                  const budget = hasOverride ? overrides[email] : defaultBudget;
                  const ratio = budget > 0 ? paid / budget : 0;
                  const pctFree = toNum(r.pct_free);
                  const status =
                    paid > budget ? t('pg.statusOver') : ratio >= 0.8 ? t('pg.statusAlert') : t('pg.statusOk');
                  const statusColor =
                    paid > budget ? 'var(--destructive)' : ratio >= 0.8 ? 'var(--warning)' : 'var(--success)';
                  const inputVal = draft[email] ?? (hasOverride ? String(budget) : '');
                  return (
                    <tr key={`${email}-${i}`} className="border-t border-border/60 hover:bg-muted/40">
                      <td className="px-3 py-2 text-foreground">{email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{String(r.area)}</td>
                      <td className="px-3 py-2 text-right">{fmtDec(r.dbus)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${Math.min(100, pctFree)}%`, backgroundColor: pctFree >= 100 ? 'var(--warning)' : CHART_COLORS[0] }}
                            />
                          </span>
                          <span className="text-xs text-muted-foreground">{fmtInt(pctFree)}%</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{fmtDec(r.dbus_pagos)}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmtUsd(paid)}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={inputVal}
                            placeholder={String(defaultBudget)}
                            onChange={(e) => setDraft((prev) => ({ ...prev, [email]: e.target.value }))}
                            className="h-7 w-20"
                          />
                          <button
                            type="button"
                            onClick={() => saveOverride(email)}
                            title={t('common.save')}
                            className="rounded p-1 text-muted-foreground hover:text-primary"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => clearOverride(email)}
                              title={t('pg.defaultBudget')}
                              className="rounded p-1 text-muted-foreground hover:text-destructive"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${Math.min(100, ratio * 100)}%`, backgroundColor: statusColor }}
                            />
                          </span>
                          <span className="text-xs font-medium" style={{ color: statusColor }}>
                            {status}
                          </span>
                        </span>
                      </td>
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
    </div>
  );
}
