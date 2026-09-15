import React from 'react';
import { ChangePreviewTable, PreviewColumn, PreviewRow } from './ChangePreviewTable';

interface SummaryStat {
  label: string;
  value: number;
}

interface StagingPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
  columns: PreviewColumn[];
  rows: PreviewRow[];
  /** Note shown when the preview can't represent the full live table (permission, cap, etc). */
  limitationNote?: string | null;
  onProceedToStage?: () => void;
  canStage?: boolean;
}

export const StagingPreviewModal: React.FC<StagingPreviewModalProps> = ({
  isOpen,
  onClose,
  datasetName,
  columns,
  rows,
  limitationNote,
  onProceedToStage,
  canStage = false,
}) => {
  if (!isOpen) return null;

  const changedCount = rows.filter((r) => r.isChanged).length;
  const stats: SummaryStat[] = [
    { label: 'Source Rows', value: rows.length },
    { label: 'Rows Changing', value: changedCount },
    { label: 'Unchanged Rows', value: rows.length - changedCount },
    { label: 'Columns', value: columns.length },
  ];

  return (
    // overflow-y-auto on the backdrop itself is a deliberate safety net: if
    // the panel's max-h-[85vh] ever computes taller than what's actually
    // visible (a short window, or "vh" measured against a host frame rather
    // than the real viewport), the whole overlay can still be scrolled to
    // reach the rest of it — items-start (not items-center) so that scroll
    // reveals content from the top down instead of clipping it symmetrically.
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Preview Staged Dataset"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative bg-surface rounded-lg shadow-2xl w-full max-w-6xl max-h-[85vh] my-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-outline-variant shrink-0">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-on-surface">Preview Staged Dataset</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{datasetName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-outline hover:text-on-surface cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-outline-variant shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface-container-low rounded-md p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">{s.label}</p>
              <p className="text-xl font-bold text-on-surface mt-0.5">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {limitationNote && (
          <div className="mx-6 mt-4 shrink-0 flex items-start gap-2 rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">info</span>
            <span>{limitationNote}</span>
          </div>
        )}

        {/* overflow-y-auto, not overflow-hidden: this wrapper's job is only to
            size ChangePreviewTable to the space flex-1 allocates it — hidden
            would silently CLIP rows if that allocation (or the browser's own
            flex-shrink math) ever comes up short, with no way to reach them
            even via the backdrop's own scroll (clipped content isn't just
            scrolled-past, it's gone). ChangePreviewTable still owns its own
            internal scroll for the common case; this is the fallback. */}
        <div className="flex-1 min-h-0 px-6 py-4 overflow-y-auto">
          <ChangePreviewTable columns={columns} rows={rows} />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Close
          </button>
          {onProceedToStage && (
            <button
              type="button"
              onClick={onProceedToStage}
              disabled={!canStage}
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Stage Dataset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
