import React, { useMemo, useState } from 'react';

export interface PreviewColumn {
  name: string;
  isPrimaryKey?: boolean;
}

export interface PreviewCell {
  value: unknown;
  isChanged: boolean;
  originalValue?: unknown;
}

export interface PreviewRow {
  /** Record ref (or a synthetic id for genuinely unmatched rows) — also the sticky key column display. */
  key: string;
  isChanged: boolean;
  cells: Record<string, PreviewCell>;
}

export type RowFilter = 'ALL' | 'CHANGED' | 'UNCHANGED';

interface ChangePreviewTableProps {
  columns: PreviewColumn[];
  rows: PreviewRow[];
  /** Label for the sticky leading column (defaults to "Record"). */
  keyColumnLabel?: string;
  // Controlled mode — for a backend-paginated/filtered source (the real
  // materialized staging preview): `rows` is already exactly the current
  // page for `controlledFilter`, so it must not be re-filtered locally, and
  // the filter tabs must ask the caller for a new page instead of slicing
  // the small local array. Omitting these keeps the original local-filter
  // behavior (used by the pre-create source-preview modal) unchanged.
  controlledFilter?: RowFilter;
  onFilterChange?: (filter: RowFilter) => void;
  /** Real total counts for the tab labels when controlled — `rows.length` alone is just the current page. */
  filterCounts?: { all: number; changed: number; unchanged: number };
  /** Replaces the built-in "Showing X of Y rows" footer line — e.g. real Previous/Next pagination. */
  footer?: React.ReactNode;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

/**
 * Reusable changed-vs-unchanged row/cell preview table. Used by the Staging &
 * Publish preview modal today; generic enough (no staging-specific concept in
 * its props) to reuse for other dataset-centric "before you commit" previews.
 */
export const ChangePreviewTable: React.FC<ChangePreviewTableProps> = ({
  columns,
  rows,
  keyColumnLabel = 'Record',
  controlledFilter,
  onFilterChange,
  filterCounts,
  footer,
}) => {
  const isControlled = controlledFilter !== undefined && onFilterChange !== undefined;
  const [localFilter, setLocalFilter] = useState<RowFilter>('ALL');
  const [changedColumnsOnly, setChangedColumnsOnly] = useState(false);
  const [inspecting, setInspecting] = useState<{ rowKey: string; column: string } | null>(null);

  const filter = isControlled ? controlledFilter : localFilter;
  const setFilter = isControlled ? onFilterChange! : setLocalFilter;

  const filteredRows = useMemo(() => {
    // Controlled mode: `rows` is already exactly the caller's current
    // filtered/paginated page — re-filtering it locally would silently
    // narrow an already-narrow page instead of asking the backend for one.
    if (isControlled) return rows;
    if (filter === 'CHANGED') return rows.filter((r) => r.isChanged);
    if (filter === 'UNCHANGED') return rows.filter((r) => !r.isChanged);
    return rows;
  }, [rows, filter, isControlled]);

  const visibleColumns = useMemo(() => {
    if (!changedColumnsOnly) return columns;
    const changedNames = new Set<string>();
    filteredRows.forEach((r) => {
      Object.entries(r.cells).forEach(([col, cell]) => {
        if (cell.isChanged) changedNames.add(col);
      });
    });
    return columns.filter((c) => changedNames.has(c.name));
  }, [columns, changedColumnsOnly, filteredRows]);

  const inspectedCell =
    inspecting != null ? filteredRows.find((r) => r.key === inspecting.rowKey)?.cells[inspecting.column] : undefined;

  const localChangedCount = rows.filter((r) => r.isChanged).length;
  const allLabelCount = filterCounts ? filterCounts.all : rows.length;
  const changedLabelCount = filterCounts ? filterCounts.changed : localChangedCount;
  const unchangedLabelCount = filterCounts ? filterCounts.unchanged : rows.length - localChangedCount;

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="inline-flex rounded-md border border-outline-variant overflow-hidden text-xs font-semibold" role="tablist">
          {(
            [
              ['ALL', `All Rows (${allLabelCount})`],
              ['CHANGED', `Changed Rows Only (${changedLabelCount})`],
              ['UNCHANGED', `Unchanged Rows (${unchangedLabelCount})`],
            ] as [RowFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 cursor-pointer transition-colors ${
                filter === value ? 'bg-primary text-on-primary' : 'bg-white text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant cursor-pointer">
          <input
            type="checkbox"
            className="accent-primary w-3.5 h-3.5"
            checked={changedColumnsOnly}
            onChange={(e) => setChangedColumnsOnly(e.target.checked)}
          />
          Show changed columns only
        </label>
      </div>

      {inspecting && inspectedCell && (
        <div className="shrink-0 rounded-md border border-outline-variant bg-surface-container-low p-3 text-xs flex items-start justify-between gap-4">
          <div className="grid grid-cols-2 gap-6 flex-1 min-w-0">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">Original Value</p>
              <p className="font-mono bg-error-container text-on-error-container rounded px-2 py-1 break-all inline-block max-w-full">
                {formatCellValue(inspectedCell.originalValue)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-1">Staged Value</p>
              <p className="font-mono bg-primary-fixed text-on-primary-fixed rounded px-2 py-1 break-all inline-block max-w-full">
                {formatCellValue(inspectedCell.value)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setInspecting(null)}
            aria-label="Close inspector"
            className="text-outline hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* A fixed cap in rem (not vh) — matches DatasetPreviewView's own
          working pattern (max-h-[40rem]) rather than a viewport-relative
          unit, which this host doesn't always measure against what's
          actually visible. Shows roughly the first ~10 rows before an
          internal scrollbar takes over for the rest. */}
      <div className="flex-1 min-h-0 max-h-[26rem] overflow-auto border border-outline-variant rounded-lg">
        {/* border-separate (not border-collapse) — a sticky <thead>/sticky first
            column inside a border-collapse table renders with torn/ghosting
            backgrounds during scroll in Chromium, since collapsed cell borders
            don't establish a clean paint boundary for position: sticky. */}
        <table className="min-w-full text-xs border-separate border-spacing-0">
          {/* Header z-index must beat every body row's sticky-left cell, not
              just tie with it — with equal z-index, the body cell (later in
              DOM order) paints ON TOP of the header as each row scrolls
              under it, which is exactly the "row leaking over the header"
              glitch this fixes. The corner cell (sticky in both directions)
              goes higher still, since it's the one place both stickies meet. */}
          <thead className="sticky top-0 z-30">
            <tr>
              <th className="sticky left-0 z-40 bg-surface-container-high text-left font-semibold text-on-surface-variant px-3 py-2 border-b border-outline-variant whitespace-nowrap">
                {keyColumnLabel}
              </th>
              {visibleColumns.map((col) => (
                <th
                  key={col.name}
                  className="bg-surface-container-high text-left font-semibold text-on-surface-variant px-3 py-2 border-b border-outline-variant whitespace-nowrap"
                >
                  {col.name}
                  {col.isPrimaryKey && <span className="ml-1 text-[9px] text-outline">(PK)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-3 py-6 text-center text-outline italic">
                  No rows match this filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.key} className={row.isChanged ? 'bg-primary-fixed/10' : undefined}>
                  <td className="sticky left-0 z-10 bg-white font-mono text-on-surface-variant px-3 py-2 border-b border-surface-container whitespace-nowrap">
                    {row.key}
                  </td>
                  {visibleColumns.map((col) => {
                    const cell = row.cells[col.name];
                    if (!cell) {
                      return (
                        <td key={col.name} className="px-3 py-2 border-b border-surface-container text-outline italic">
                          not shown
                        </td>
                      );
                    }
                    return (
                      <td
                        key={col.name}
                        className={`px-3 py-2 border-b border-surface-container ${
                          cell.isChanged ? 'bg-primary-fixed/30 font-semibold text-on-surface cursor-pointer' : 'text-on-surface-variant'
                        }`}
                        onClick={() => cell.isChanged && setInspecting({ rowKey: row.key, column: col.name })}
                        title={cell.isChanged ? 'Click to inspect original vs. staged value' : undefined}
                      >
                        {formatCellValue(cell.value)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer ?? (
        <div className="shrink-0 flex items-center justify-between text-[11px] text-outline px-1">
          <span>
            Showing <strong className="text-on-surface">{filteredRows.length}</strong> of{' '}
            <strong className="text-on-surface">{rows.length}</strong> rows
          </span>
          {changedColumnsOnly && (
            <span>
              <strong className="text-on-surface">{visibleColumns.length}</strong> of{' '}
              <strong className="text-on-surface">{columns.length}</strong> columns shown
            </span>
          )}
        </div>
      )}
    </div>
  );
};
