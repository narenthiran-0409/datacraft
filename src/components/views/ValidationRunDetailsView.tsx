import React from 'react';
import { NavScreen, ValidationRun } from '../../types';

interface ValidationRunDetailsViewProps {
  onNavigate: (screen: NavScreen) => void;
  run: ValidationRun | undefined;
  canCancel: boolean;
  isCancelling: boolean;
  onCancel: () => void;
  canStartReview: boolean;
  isStartingReview: boolean;
  onStartReview: () => void;
  actionError: string | null;
}

const STATUS_STYLES: Record<ValidationRun['status'], string> = {
  CREATED: 'bg-surface-container text-on-surface-variant',
  QUEUED: 'bg-surface-container text-on-surface-variant',
  RUNNING: 'bg-secondary-fixed text-on-secondary-fixed',
  COMPLETED: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
  CANCELLED: 'bg-surface-container text-outline',
};

const formatDuration = (ms: number | null) => {
  if (ms === null) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  return `${minutes}m ${remSeconds}s`;
};

export const ValidationRunDetailsView: React.FC<ValidationRunDetailsViewProps> = ({
  onNavigate,
  run,
  canCancel,
  isCancelling,
  onCancel,
  canStartReview,
  isStartingReview,
  onStartReview,
  actionError,
}) => {
  if (!run) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No validation run selected.
          <div className="mt-4">
            <button
              onClick={() => onNavigate('validation-workspace')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              &larr; Back to Validation Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const total = run.passedRows + run.warningRows + run.failedRows;
  const passedPct = total ? (run.passedRows / total) * 100 : 0;
  const warningPct = total ? (run.warningRows / total) * 100 : 0;
  const failedPct = total ? (run.failedRows / total) * 100 : 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
          <button
            onClick={() => onNavigate('validation-workspace')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Validation Workspace
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">{run.id}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Validation Run Details
          </h1>
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[run.status]}`}>
            {run.status}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant mt-1 font-sans">{run.datasetName}</p>

        {canCancel && run.jobId && (run.status === 'QUEUED' || run.status === 'RUNNING') && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${isCancelling ? 'animate-spin' : ''}`}>
              {isCancelling ? 'sync' : 'cancel'}
            </span>
            {isCancelling ? 'Cancelling…' : 'Cancel Run'}
          </button>
        )}

        {canStartReview && run.status === 'COMPLETED' && (
          <button
            type="button"
            onClick={onStartReview}
            disabled={isStartingReview}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${isStartingReview ? 'animate-spin' : ''}`}>
              {isStartingReview ? 'sync' : 'fact_check'}
            </span>
            {isStartingReview ? 'Starting review…' : 'Start Review'}
          </button>
        )}

        {actionError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error max-w-lg">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
            Quality Score
          </span>
          <span className="font-editorial text-3xl font-extrabold text-primary">
            {run.qualityScore !== null ? `${run.qualityScore}%` : '—'}
          </span>
          {run.qualityScore === null && (
            <p className="text-[11px] text-outline mt-1">
              Not available — this run did not complete.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
            Timing
          </span>
          <p className="text-xs text-on-surface">
            <span className="text-outline">Started:</span> {run.startedAt}
          </p>
          <p className="text-xs text-on-surface mt-1">
            <span className="text-outline">Completed:</span> {run.completedAt}
          </p>
        </div>

        <div className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient">
          <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
            Duration
          </span>
          <span className="font-editorial text-3xl font-extrabold text-on-surface">
            {formatDuration(run.durationMs)}
          </span>
        </div>
      </div>

      {/* Row Counts */}
      <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
        <h3 className="font-editorial font-bold text-lg text-on-surface mb-4">Row Outcomes</h3>

        {total > 0 ? (
          <>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-surface-container mb-4">
              <div className="h-full bg-primary" style={{ width: `${passedPct}%` }} />
              <div className="h-full bg-secondary" style={{ width: `${warningPct}%` }} />
              <div className="h-full bg-error" style={{ width: `${failedPct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="font-editorial text-2xl font-bold text-primary block">
                  {run.passedRows.toLocaleString()}
                </span>
                <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Passed</span>
              </div>
              <div>
                <span className="font-editorial text-2xl font-bold text-secondary block">
                  {run.warningRows.toLocaleString()}
                </span>
                <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Warning</span>
              </div>
              <div>
                <span className="font-editorial text-2xl font-bold text-error block">
                  {run.failedRows.toLocaleString()}
                </span>
                <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Failed</span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-outline italic">
            No rows were scored — total target rows: {run.totalRows.toLocaleString()}.
          </p>
        )}
      </div>

      {/* Failure Detail — explicit, honest empty state */}
      <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-outline text-xl mt-0.5">construction</span>
        <div>
          <p className="text-sm font-bold text-on-surface">Row-level failure detail isn't available yet</p>
          <p className="text-xs text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
            This screen shows run-level outcomes only. Browsing the individual rows and columns
            that produced warnings or failures for this run is not yet supported here — that
            capability doesn't exist in the backend today, so it isn't shown as if it did.
          </p>
        </div>
      </div>
    </div>
  );
};
