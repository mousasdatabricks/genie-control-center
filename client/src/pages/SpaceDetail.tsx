import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { useAnalyticsQuery, LineChart, Input, Button } from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowLeft, Users, MessageSquare, DollarSign, Star, Trash2 } from 'lucide-react';
import { useFilters } from '../lib/filters';
import { useT } from '../lib/i18n';
import { firstRow, asRows } from '../lib/rows';
import { HEINEKEN_COLORS } from '../lib/theme';
import { toNum, fmtInt, fmtUsd, fmtDate, fmtPct } from '../lib/formatters';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataGrid } from '../components/DataGrid';
import type { Column } from '../components/DataGrid';
import { PageHeader, ChartCard } from '../components/ui-bits';

interface Annotation {
  id: number;
  space_id: string;
  note: string;
  author: string;
  created_at: string;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function SpaceDetail() {
  const { id = '' } = useParams();
  const { start, end } = useFilters();
  const t = useT();

  const params = useMemo(
    () => ({ p_space_id: sql.string(id), p_start: sql.date(start), p_end: sql.date(end) }),
    [id, start, end],
  );

  const { data: kpiData } = useAnalyticsQuery('space_detail_kpi', params);
  const { data: topUsers, loading: loadingUsers } = useAnalyticsQuery('space_detail_top_users', params);

  const [notes, setNotes] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/annotations?space_id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((a: Annotation[]) => setNotes(Array.isArray(a) ? a : []))
      .catch(() => setNotes([]));
  }, [id]);

  const addNote = async () => {
    const note = draft.trim();
    if (!note) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_id: id, note }),
      });
      if (res.ok) {
        const created = (await res.json()) as Annotation;
        setNotes((prev) => [created, ...prev]);
        setDraft('');
      }
    } finally {
      setSaving(false);
    }
  };

  const removeNote = async (noteId: number) => {
    const res = await fetch(`/api/admin/annotations/${noteId}`, { method: 'DELETE' });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const k = firstRow(kpiData);
  const name = String(k.space_name ?? id);

  const userCols: Column[] = [
    { key: 'user_email', header: t('col.user') },
    { key: 'area', header: t('col.area') },
    { key: 'perguntas', header: t('col.questions'), align: 'right', render: (r) => fmtInt(r.perguntas) },
  ];

  return (
    <div className="space-y-6">
      <Link to="/spaces" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t('sd.back')}
      </Link>

      <div className="flex items-center gap-3">
        <PageHeader title={name} />
        {k.status ? <StatusBadge status={String(k.status)} /> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={t('sd.users30d')} value={fmtInt(k.users_30d)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label={t('sd.questions30d')} value={fmtInt(k.questions_30d)} icon={<MessageSquare className="h-5 w-5" />} />
        <KpiCard label={t('sd.cost30d')} value={fmtUsd(k.cost_30d)} tone="warning" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard
          label={t('sd.successRate')}
          value={fmtPct(k.taxa_sucesso)}
          tone={toNum(k.taxa_sucesso) >= 75 ? 'success' : 'warning'}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title={t('sd.card')} className="lg:col-span-1">
          <div className="space-y-0.5">
            <MetaRow label={t('sd.owner')} value={String(k.owner_email ?? '—')} />
            <MetaRow label={t('sd.area')} value={String(k.area ?? '—')} />
            <MetaRow label={t('sd.workspace')} value={String(k.workspace_name ?? '—')} />
            <MetaRow label={t('sd.warehouse')} value={String(k.warehouse_id ?? '—')} />
            <MetaRow label={t('sd.tables')} value={fmtInt(k.num_tables)} />
            <MetaRow label={t('sd.created')} value={fmtDate(k.created_at)} />
            <MetaRow label={t('sd.lastActivity')} value={fmtDate(k.last_activity)} />
          </div>
        </ChartCard>

        <ChartCard title={t('sd.trend')} description={t('sd.trendDesc')} className="lg:col-span-2">
          <LineChart
            queryKey="space_detail_timeseries"
            parameters={params}
            xKey="usage_date"
            yKey={['perguntas', 'usuarios']}
            colors={HEINEKEN_COLORS}
            height={280}
            smooth
            showLegend
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t('sd.topUsers')}>
          <DataGrid columns={userCols} rows={asRows(topUsers)} loading={loadingUsers} maxHeight="360px" />
        </ChartCard>

        <ChartCard title={t('sd.annotations')} description={t('sd.annotationsDesc')}>
          <div className="mb-3 flex gap-2">
            <Input placeholder={t('sd.annotationPlaceholder')} value={draft} onChange={(e) => setDraft(e.target.value)} className="flex-1" />
            <Button onClick={addNote} disabled={saving || !draft.trim()}>
              {saving ? t('common.saving') : t('sd.add')}
            </Button>
          </div>
          {notes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('sd.noAnnotations')}</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-2.5">
                  <div>
                    <p className="text-sm text-foreground">{n.note}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {n.author} · {fmtDate(n.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNote(n.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={t('sd.add')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
