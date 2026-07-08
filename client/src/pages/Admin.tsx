import { useEffect, useState } from 'react';
import { useAnalyticsQuery, Input, Button } from '@databricks/appkit-ui/react';
import { CheckCircle2, XCircle, Save } from 'lucide-react';
import { useT } from '../lib/i18n';
import { asRows } from '../lib/rows';
import { toNum, fmtInt } from '../lib/formatters';
import { PageHeader, ChartCard } from '../components/ui-bits';

interface Goal { area: string; mau_goal: number }
interface Threshold { key: string; value: number; label: string }

export function Admin() {
  const t = useT();
  const { data: wsRows } = useAnalyticsQuery('filters_workspaces', {});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [health, setHealth] = useState<'ok' | 'error' | 'loading'>('loading');
  const [saved, setSaved] = useState(false);

  const load = () => {
    fetch('/api/admin/goals').then((r) => (r.ok ? r.json() : [])).then((g) => setGoals(Array.isArray(g) ? g : [])).catch(() => {});
    fetch('/api/admin/thresholds').then((r) => (r.ok ? r.json() : [])).then((th) => setThresholds(Array.isArray(th) ? th : [])).catch(() => {});
    fetch('/api/admin/health')
      .then((r) => setHealth(r.ok ? 'ok' : 'error'))
      .catch(() => setHealth('error'));
  };

  useEffect(load, []);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveGoal = async (g: Goal) => {
    const res = await fetch('/api/admin/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: g.area, mau_goal: toNum(g.mau_goal) }),
    });
    if (res.ok) flash();
  };

  const saveThreshold = async (th: Threshold) => {
    const res = await fetch('/api/admin/thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: th.key, value: toNum(th.value) }),
    });
    if (res.ok) flash();
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('am.title')} description={t('am.desc')} />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          {health === 'ok' ? (
            <><CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" /> <span>{t('am.lakebaseOk')}</span></>
          ) : health === 'error' ? (
            <><XCircle className="h-4 w-4 text-destructive" /> <span>{t('am.lakebaseErr')}</span></>
          ) : (
            <span className="text-muted-foreground">{t('am.checking')}</span>
          )}
        </div>
        {saved && <span className="text-sm text-[color:var(--success)]">{t('am.saved')}</span>}
      </div>

      <ChartCard title={t('am.goals')} description={t('am.goalsDesc')}>
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={g.area} className="flex items-center gap-3">
              <span className="w-56 text-sm font-medium text-foreground">{g.area}</span>
              <Input
                type="number"
                value={String(g.mau_goal)}
                onChange={(e) => {
                  const v = toNum(e.target.value);
                  setGoals((prev) => prev.map((x, idx) => (idx === i ? { ...x, mau_goal: v } : x)));
                }}
                className="w-28"
              />
              <Button size="sm" variant="outline" onClick={() => saveGoal(g)}>
                <Save className="mr-1 h-3.5 w-3.5" /> {t('common.save')}
              </Button>
            </div>
          ))}
          {goals.length === 0 && <p className="text-sm text-muted-foreground">{t('am.loading')}</p>}
        </div>
      </ChartCard>

      <ChartCard title={t('am.thresholds')} description={t('am.thresholdsDesc')}>
        <div className="space-y-3">
          {thresholds.map((th, i) => (
            <div key={th.key} className="flex items-center gap-3">
              <div className="w-96">
                <p className="text-sm font-medium text-foreground">{th.key}</p>
                <p className="text-xs text-muted-foreground">{th.label}</p>
              </div>
              <Input
                type="number"
                value={String(th.value)}
                onChange={(e) => {
                  const v = toNum(e.target.value);
                  setThresholds((prev) => prev.map((x, idx) => (idx === i ? { ...x, value: v } : x)));
                }}
                className="w-28"
              />
              <Button size="sm" variant="outline" onClick={() => saveThreshold(th)}>
                <Save className="mr-1 h-3.5 w-3.5" /> {t('common.save')}
              </Button>
            </div>
          ))}
          {thresholds.length === 0 && <p className="text-sm text-muted-foreground">{t('am.loading')}</p>}
        </div>
      </ChartCard>

      <ChartCard title={t('am.workspaces')} description={t('am.workspacesDesc')}>
        <div className="flex flex-wrap gap-2">
          {asRows(wsRows).map((r) => (
            <span key={String(r.workspace_name)} className="rounded-md border border-border bg-card px-3 py-1.5 text-sm">
              {String(r.workspace_name)}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('am.workspacesTotal', { n: fmtInt(asRows(wsRows).length) })}</p>
      </ChartCard>
    </div>
  );
}
