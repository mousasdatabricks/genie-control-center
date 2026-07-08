// AppKit's useAnalyticsQuery types `data` as a union of all query row shapes,
// which blocks field access. These helpers normalize any query result into
// Record<string, unknown> so the UI can coerce fields explicitly (toNum, etc.).

export function asRows(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export function firstRow(data: unknown): Record<string, unknown> {
  const rows = asRows(data);
  return rows[0] ?? {};
}
