import React from 'react';
import { StagingDestinationResponse } from '../../api/client';
import { ChangePreviewTable, PreviewColumn, PreviewRow, RowFilter } from './ChangePreviewTable';

interface MaterializedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;

  // Real destination metadata (GET /staging-runs/{id}/destination) — powers
  // the summary line and the real per-filter row counts. Null while it's
  // still loading or hasn't been requested yet; the table itself doesn't
  // depend on it.
  destination: StagingDestinationResponse | null;
  destinationLoading: boolean;
  destinationError: string | null;

  // The physical materialized rows for the CURRENT filter+page (GET
  // /staging-runs/{id}/preview) — already exactly what should render, never
  // re-filtered or re-paginated locally.
  columns: PreviewColumn[];
  rows: PreviewRow[];
  totalRows: number;
  limit: number;
  offset: number;
  previewLoading: boolean;
  previewError: string | null;
  onRetryPreview: () => void;

  filter: RowFilter;
  onFilterChange: (filter: RowFilter) => void;
  /** Pass the new offset directly (e.g. offset - limit / offset + limit). */
  onOffsetChange: (offset: number) => void;
}

/**
 * "View Staged Dataset" — the REAL physical staging_data.<table> preview for
 * a materialized StagingRun (Phase 4.12B). Distinct from StagingPreviewModal
 * (the pre-create "what staging would look like" preview, which has no real
 * run to ask the backend about yet and stays a live-source-preview overlay).
 */
export const MaterializedPreviewModal: React.FC<MaterializedPreviewModalProps> = ({
  isOpen,
  onClose,
  datasetName,
  destination,
  destinationLoading,
  destinationError,
  columns,
  rows,
  totalRows,
  limit,
  offset,
  previewLoading,
  previewError,
  onRetryPreview,
  filter,
  onFilterChange,
  onOffsetChange,
}) => {
  if (!isOpen) return null;

  const totalKnownRows = destination?.materialized_row_count ?? destination?.source_row_count ?? null;
  const changedRows = destination?.affected_row_count ?? null;
  const filterCounts =
    totalKnownRows != null && changedRows != null
      ? { all: totalKnownRows, changed: changedRows, unchanged: totalKnownRows - changedRows }
      : undefined;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Staged Dataset"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-surface rounded-lg shadow-2xl w-full max-w-6xl max-h-[85vh] my-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-outline-variant shrink-0">
          <div className="min-w-0">
            <h2 className="font-editorial text-2xl font-bold text-on-surface">Staged Dataset</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{datasetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close staged dataset preview"
            className="text-outline hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-outline-variant shrink-0 space-y-3">
          {destinationLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-container-low rounded-md p-3 h-14 animate-pulse" />
              ))}
            </div>
          ) : destinationError ? (
            <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{destinationError}</span>
            </div>
          ) : destination ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-container-low rounded-md p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Staged Rows</p>
                  <p className="text-xl font-bold text-on-surface mt-0.5">
                    {(destination.materialized_row_count ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-md p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Affected Records</p>
                  <p className="text-xl font-bold text-on-surface mt-0.5">{destination.affected_row_count.toLocaleString()}</p>
                </div>
                <div className="bg-surface-container-low rounded-md p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Approved Corrections</p>
                  <p className="text-xl font-bold text-on-surface mt-0.5">
                    {destination.approved_correction_count.toLocaleString()}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-md p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Columns</p>
                  <p className="text-xl font-bold text-on-surface mt-0.5">{destination.columns.length.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Destination: {destination.destination_schema}.{destination.destination_table}
              </p>
            </>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          {previewLoading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-xs text-outline">Loading staged rows…</div>
          ) : previewError ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <span className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{previewError}</span>
              </span>
              <button type="button" onClick={onRetryPreview} className="font-semibold hover:underline cursor-pointer shrink-0">
                Retry
              </button>
            </div>
          ) : (
            <ChangePreviewTable
              columns={columns}
              rows={rows}
              controlledFilter={filter}
              onFilterChange={onFilterChange}
              filterCounts={filterCounts}
              footer={
                <div className="shrink-0 flex items-center justify-between text-[11px] text-outline px-1">
                  <span>
                    Page <strong className="text-on-surface">{currentPage}</strong> of{' '}
                    <strong className="text-on-surface">{totalPages}</strong> &bull;{' '}
                    <strong className="text-on-surface">{totalRows.toLocaleString()}</strong> rows
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={offset <= 0}
                      onClick={() => onOffsetChange(Math.max(0, offset - limit))}
                      className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-on-surface font-medium cursor-pointer text-xs"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={offset + limit >= totalRows}
                      onClick={() => onOffsetChange(offset + limit)}
                      className="px-3 py-1.5 rounded border border-outline-variant bg-white hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed text-on-surface font-medium cursor-pointer text-xs"
                    >
                      Next
                    </button>
                  </div>
                </div>
              }
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
