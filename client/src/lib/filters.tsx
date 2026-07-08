import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { sql } from '@databricks/appkit-ui/js';
import {
  useAnalyticsQuery,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@databricks/appkit-ui/react';
import { CalendarDays, Building2, Layers } from 'lucide-react';
import { daysAgoStr } from './formatters';
import { asRows } from './rows';
import { useT } from './i18n';

interface FilterValue {
  period: string;
  ws: string;
  area: string;
  start: string;
  end: string;
  set: (patch: Partial<{ period: string; ws: string; area: string }>) => void;
}

const FilterContext = createContext<FilterValue | null>(null);

const periodToStart = (period: string): string => {
  if (period === '7') return daysAgoStr(6);
  if (period === '90') return daysAgoStr(89);
  return daysAgoStr(29);
};

export function FilterProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const period = params.get('period') ?? '30';
  const ws = params.get('ws') ?? '';
  const area = params.get('area') ?? '';

  const value = useMemo<FilterValue>(() => {
    const set = (patch: Partial<{ period: string; ws: string; area: string }>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (!v) next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true },
      );
    };
    return {
      period,
      ws,
      area,
      start: periodToStart(period),
      end: daysAgoStr(0),
      set,
    };
  }, [period, ws, area, setParams]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters(): FilterValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}

// Memoized SQL parameter bundle shared by every analytics query.
export function useFilterParams() {
  const { start, end, ws, area } = useFilters();
  return useMemo(
    () => ({
      p_start: sql.date(start),
      p_end: sql.date(end),
      p_ws: sql.string(ws),
      p_area: sql.string(area),
    }),
    [start, end, ws, area],
  );
}

const ALL = 'all';

export function FilterBar() {
  const { period, ws, area, set } = useFilters();
  const t = useT();
  const { data: wsRows } = useAnalyticsQuery('filters_workspaces', {});
  const { data: areaRows } = useAnalyticsQuery('filters_areas', {});

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <Select value={period} onValueChange={(v) => set({ period: v })}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('filter.period7')}</SelectItem>
            <SelectItem value="30">{t('filter.period30')}</SelectItem>
            <SelectItem value="90">{t('filter.period90')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={ws || ALL}
          onValueChange={(v) => set({ ws: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-[210px]">
            <SelectValue placeholder={t('filter.allWorkspaces')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filter.allWorkspaces')}</SelectItem>
            {asRows(wsRows).map((r) => {
              const name = String(r.workspace_name);
              return (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <Select
          value={area || ALL}
          onValueChange={(v) => set({ area: v === ALL ? '' : v })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('filter.allAreas')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filter.allAreas')}</SelectItem>
            {asRows(areaRows).map((r) => {
              const name = String(r.area);
              return (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
