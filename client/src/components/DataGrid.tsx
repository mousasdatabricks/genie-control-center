import type { ReactNode } from 'react';

export interface Column {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: Record<string, unknown>) => ReactNode;
}

interface DataGridProps {
  columns: Column[];
  rows: Record<string, unknown>[] | undefined;
  loading?: boolean;
  onRowClick?: (row: Record<string, unknown>) => void;
  empty?: string;
  maxHeight?: string;
}

const alignCls: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataGrid({
  columns,
  rows,
  loading,
  onRowClick,
  empty = 'Sem dados para os filtros selecionados.',
  maxHeight,
}: DataGridProps) {
  if (loading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={`row-skel-${i}`} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-auto rounded-md border" style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-semibold text-muted-foreground ${alignCls[c.align ?? 'left']}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`r-${i}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-t border-border/60 ${
                onRowClick ? 'cursor-pointer hover:bg-accent/50' : 'hover:bg-muted/40'
              }`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-foreground ${alignCls[c.align ?? 'left']}`}
                >
                  {c.render ? c.render(row) : String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
