import React from 'react';
import {
  MATERIALIZATION_PHASE_LABELS,
  MATERIALIZATION_PHASE_STEPS,
  MaterializationUiPhase,
} from '../../data/datasetStagingWorkflow';

interface StagingProgressViewProps {
  isOpen: boolean;
  onClose: () => void;
  phase: MaterializationUiPhase;
  /** Real backend progress_percentage (0-100), or null for an indeterminate phase — never invented. */
  progressPercentage: number | null;
  copiedRowCount: number | null;
  sourceRowCount: number | null;
  materializedRowCount: number | null;
  sourceLabel: string;
  /** Null until the backend has actually created the destination table (materialization_phase reaches CREATING_TABLE). */
  destinationLabel: string | null;
  /** Sanitized materialization_error for a FAILED run. */
  errorMessage?: string | null;
  /** A transient "couldn't refresh status" condition, distinct from the run itself having FAILED. */
  pollError?: string | null;
  onRetryPoll?: () => void;
  onViewStagedDataset?: () => void;
  canRetryStaging?: boolean;
  onRetryStaging?: () => void;
}

const PHASE_TITLES: Record<MaterializationUiPhase, string> = {
  QUEUED: 'Creating Staging Dataset',
  PREPARING_SCHEMA: 'Creating Staging Dataset',
  CREATING_TABLE: 'Creating Staging Dataset',
  COPYING_SOURCE: 'Creating Staging Dataset',
  APPLYING_CORRECTIONS: 'Creating Staging Dataset',
  VALIDATING: 'Creating Staging Dataset',
  FINALIZING: 'Creating Staging Dataset',
  READY: 'Staging Complete',
  FAILED: 'Staging Failed',
  CANCELLED: 'Staging Cancelled',
  LEGACY: 'Legacy Staging Run',
};

/**
 * Job-style progress UI for the "Stage Dataset" action — real Phase 4.12
 * backend state throughout. The caller (StagingPublishView, driven by
 * App.tsx's polling of GET /staging-runs/{id}) supplies the current
 * materialization phase/percentage/counters on every poll tick; this
 * component only ever renders what it's given, never animates or advances
 * anything on its own.
 */
export const StagingProgressView: React.FC<StagingProgressViewProps> = ({
  isOpen,
  onClose,
  phase,
  progressPercentage,
  copiedRowCount,
  sourceRowCount,
  materializedRowCount,
  sourceLabel,
  destinationLabel,
  errorMessage,
  pollError,
  onRetryPoll,
  onViewStagedDataset,
  canRetryStaging = false,
  onRetryStaging,
}) => {
  if (!isOpen) return null;

  const isStep = MATERIALIZATION_PHASE_STEPS.includes(phase);
  const currentStepIndex = MATERIALIZATION_PHASE_STEPS.indexOf(phase);
  const showBar = isStep || phase === 'READY';
  const percent = phase === 'READY' ? 100 : progressPercentage;
  const isIndeterminate = showBar && percent == null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Staging progress"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" />
      <div className="relative bg-surface rounded-lg shadow-2xl w-full max-w-lg max-h-[85vh] my-auto overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-outline-variant">
          <h2 className="font-editorial text-2xl font-bold text-on-surface">{PHASE_TITLES[phase]}</h2>
        </div>

        <div className="p-6 space-y-5">
          {pollError && (
            <div className="flex items-start justify-between gap-3 rounded-md border border-secondary/30 bg-secondary-fixed/40 px-4 py-3 text-xs text-on-surface">
              <span className="flex items-start gap-2">
                <span className="material-symbols-outlined text-base shrink-0">wifi_off</span>
                <span>{pollError}</span>
              </span>
              {onRetryPoll && (
                <button
                  type="button"
                  onClick={onRetryPoll}
                  className="font-semibold text-primary hover:underline cursor-pointer shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant bg-surface-container-low rounded-md p-3">
            <span className="truncate">{sourceLabel}</span>
            <span className="material-symbols-outlined text-sm text-outline shrink-0">arrow_forward</span>
            <span className="truncate">{destinationLabel ?? 'Generating destination…'}</span>
          </div>

          {showBar && (
            <div>
              <div
                role="progressbar"
                aria-label={MATERIALIZATION_PHASE_LABELS[phase]}
                aria-valuemin={0}
                aria-valuemax={100}
                {...(isIndeterminate ? {} : { 'aria-valuenow': percent ?? 0 })}
                className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden"
              >
                {isIndeterminate ? (
                  <div className="h-full w-full bg-primary rounded-full animate-pulse" />
                ) : (
                  <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${percent}%` }} />
                )}
              </div>
              {copiedRowCount != null && sourceRowCount ? (
                <p className="text-[11px] text-outline mt-1.5">
                  {copiedRowCount.toLocaleString()} / {sourceRowCount.toLocaleString()} rows copied
                </p>
              ) : null}
            </div>
          )}

          {isStep && (
            <ul className="space-y-2">
              {MATERIALIZATION_PHASE_STEPS.map((step, idx) => {
                const done = idx < currentStepIndex;
                const active = idx === currentStepIndex;
                return (
                  <li key={step} className="flex items-center gap-2.5 text-xs">
                    <span
                      className={`material-symbols-outlined text-base shrink-0 ${
                        done ? 'text-primary' : active ? 'text-secondary animate-pulse' : 'text-outline-variant'
                      }`}
                    >
                      {done ? 'check_circle' : active ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span className={done || active ? 'text-on-surface font-medium' : 'text-outline'}>
                      {MATERIALIZATION_PHASE_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {phase === 'READY' && (
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-surface-container-low rounded-md p-3 text-center">
                <p className="text-xl font-bold text-on-surface">
                  {(materializedRowCount ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mt-0.5">Rows Staged</p>
              </div>
            </div>
          )}

          {phase === 'FAILED' && (
            <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errorMessage ?? 'Staging could not be completed.'}</span>
            </div>
          )}

          {phase === 'CANCELLED' && (
            <div className="flex items-start gap-2 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base shrink-0">cancel</span>
              <span>This staging attempt was cancelled before it finished.</span>
            </div>
          )}

          {phase === 'LEGACY' && (
            <div className="flex items-start gap-2 rounded-md border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-base shrink-0">info</span>
              <span>
                This staging run was created before full dataset materialization was available, so there's no
                physical staged dataset to show for it.
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Close
          </button>
          {phase === 'FAILED' && canRetryStaging && onRetryStaging && (
            <button
              type="button"
              onClick={onRetryStaging}
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient cursor-pointer"
            >
              Retry
            </button>
          )}
          {phase === 'READY' && onViewStagedDataset && (
            <button
              type="button"
              onClick={onViewStagedDataset}
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient cursor-pointer"
            >
              View Staged Dataset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
