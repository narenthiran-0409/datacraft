import React from 'react';
import { NavScreen, ValidationRun } from '../../types';

interface ValidationWorkspaceViewProps {
  onNavigate: (screen: NavScreen) => void;
  datasetName: string;
  validationRuns: ValidationRun[];
  onRunValidation: () => void;
  onSelectRun: (runId: string) => void;
  canTriggerValidation: boolean;
  isTriggering: boolean;
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

const STATUS_ICON: Record<ValidationRun['status'], string> = {
  CREATED: 'schedule',
  QUEUED: 'hourglass_top',
  RUNNING: 'sync',
  COMPLETED: 'check_circle',
  FAILED: 'error',
  CANCELLED: 'cancel',
};

export const ValidationWorkspaceView: React.FC<ValidationWorkspaceViewProps> = ({
  onNavigate,
  datasetName,
  validationRuns,
  onRunValidation,
  onSelectRun,
  canTriggerValidation,
  isTriggering,
  actionError,
}) => {
  // BUG FIX (found via live E2E testing): this used to re-sort by (a.id < b.id ? 1 : -1),
  // a lexicographic comparison of random UUIDs with no relationship to recency — it was
  // silently scrambling the list. The backend already returns runs ordered by
  // created_at DESC (app/modules/validation/service.py), so the fix is to stop re-sorting.
  const datasetRuns = validationRuns;

  const hasActiveRun = datasetRuns.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING');

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
            <button
              onClick={() => onNavigate('dataset-overview')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {datasetName}
            </button>
            <span>/</span>
            <span className="text-on-surface font-bold">Validation Workspace</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Validation Workspace
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans">
            Trigger a new validation run and review the history of past runs for this dataset.
          </p>
        </div>

        {canTriggerValidation && (
          <button
            onClick={onRunValidation}
            disabled={hasActiveRun || isTriggering}
            title={hasActiveRun ? 'A run is already queued or in progress for this dataset' : undefined}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <span className={`material-symbols-outlined text-lg ${isTriggering ? 'animate-spin' : ''}`}>
              {isTriggering ? 'sync' : 'play_circle'}
            </span>
            <span>{isTriggering ? 'Starting…' : 'Run Validation'}</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Run History */}
      <div className="space-y-4">
        {datasetRuns.length === 0 ? (
          <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
            No validation runs yet for {datasetName}.
          </div>
        ) : (
          datasetRuns.map((run) => {
            const total = run.passedRows + run.warningRows + run.failedRows;
            const passedPct = total ? (run.passedRows / total) * 100 : 0;
            const warningPct = total ? (run.warningRows / total) * 100 : 0;
            const failedPct = total ? (run.failedRows / total) * 100 : 0;

            return (
              <button
                key={run.id}
                onClick={() => onSelectRun(run.id)}
                className="w-full text-left bg-white rounded-lg p-6 border border-outline-variant shadow-ambient shadow-ambient-hover transition-all cursor-pointer"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${STATUS_STYLES[run.status]}`}
                    >
                      <span
                        className={`material-symbols-outlined text-xs ${run.status === 'RUNNING' ? 'animate-spin' : ''}`}
                      >
                        {STATUS_ICON[run.status]}
                      </span>
                      {run.status}
                    </span>
                    <span className="text-xs text-outline font-mono">{run.id}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-editorial text-xl font-extrabold text-primary">
                      {run.qualityScore !== null ? `${run.qualityScore}%` : '—'}
                    </span>
                    <p className="text-[10px] text-outline uppercase tracking-wider font-semibold">
                      Quality Score
                    </p>
                  </div>
                </div>

                {/* Proportional row bar */}
                {total > 0 && (
                  <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface-container mb-3">
                    <div className="h-full bg-primary" style={{ width: `${passedPct}%` }} />
                    <div className="h-full bg-secondary" style={{ width: `${warningPct}%` }} />
                    <div className="h-full bg-error" style={{ width: `${failedPct}%` }} />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary" /> {run.passedRows.toLocaleString()} passed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary" /> {run.warningRows.toLocaleString()} warning
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error" /> {run.failedRows.toLocaleString()} failed
                  </span>
                  <span className="ml-auto text-outline">{run.startedAt}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
