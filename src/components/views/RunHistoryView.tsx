import React, { useState } from 'react';
import { NavScreen, RunHistoryItem } from '../../types';

interface RunHistoryViewProps {
  onNavigate: (screen: NavScreen) => void;
  runHistory: RunHistoryItem[];
}

const RUN_TYPE_STYLES: Record<RunHistoryItem['runType'], string> = {
  PROFILE: 'bg-tertiary-fixed text-on-tertiary-fixed',
  VALIDATION: 'bg-primary-fixed text-on-primary-fixed',
  STAGING: 'bg-secondary-fixed text-on-secondary-fixed',
  PUBLISH: 'bg-surface-container-high text-primary',
};

const RUN_TYPE_ICON: Record<RunHistoryItem['runType'], string> = {
  PROFILE: 'query_stats',
  VALIDATION: 'checklist',
  STAGING: 'inventory',
  PUBLISH: 'cloud_upload',
};

const RUN_TYPES: RunHistoryItem['runType'][] = ['PROFILE', 'VALIDATION', 'STAGING', 'PUBLISH'];

const isTerminalFailure = (status: string) => status === 'FAILED' || status === 'CANCELLED';
const isTerminalSuccess = (status: string) =>
  status === 'COMPLETED' || status === 'PUBLISHED' || status === 'READY';

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({ onNavigate, runHistory }) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | RunHistoryItem['runType']>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = Array.from(new Set(runHistory.map((r) => r.status))).sort();

  const filtered = runHistory
    .filter((r) => typeFilter === 'ALL' || r.runType === typeFilter)
    .filter((r) => statusFilter === 'ALL' || r.status === statusFilter)
    .filter(
      (r) =>
        r.datasetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.summary.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          All Pipeline Activity
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Run History
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          A merged, chronological log of every profiling, validation, staging, and publish run
          across your datasets.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Types
            </button>
            {RUN_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-all cursor-pointer ${
                  typeFilter === t ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-base">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dataset or summary..."
            className="w-full bg-surface-container-low border border-outline-variant rounded-md pl-9 pr-3 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">
            No runs match your filters.
          </div>
        ) : (
          <div className="divide-y divide-surface-container">
            {filtered.map((run) => (
              <div key={run.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-surface-container-low/60 transition-colors">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 w-fit ${RUN_TYPE_STYLES[run.runType]}`}
                >
                  <span className="material-symbols-outlined text-xs">{RUN_TYPE_ICON[run.runType]}</span>
                  {run.runType}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-on-surface">{run.datasetName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isTerminalFailure(run.status)
                          ? 'bg-error-container text-on-error-container'
                          : isTerminalSuccess(run.status)
                          ? 'bg-primary-fixed text-on-primary-fixed'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{run.summary}</p>
                </div>

                <div className="text-[11px] text-outline text-left sm:text-right shrink-0 font-mono">
                  <p>Started: {run.startedAt}</p>
                  <p>{run.completedAt ? `Completed: ${run.completedAt}` : 'In progress'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
