import React, { useState } from 'react';
import { ExplorerDataset, NavScreen } from '../../types';
import { ProfileRunResponse } from '../../api/client';

interface DataProfilingViewProps {
  onNavigate: (screen: NavScreen) => void;
  datasets: ExplorerDataset[];
  profileRuns: ProfileRunResponse[];
}

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const DataProfilingView: React.FC<DataProfilingViewProps> = ({ onNavigate, datasets, profileRuns }) => {
  const activeDatasets = datasets.filter((d) => d.isActive);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(activeDatasets[0]?.id ?? '');

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const runsForDataset = profileRuns
    .filter((r) => r.dataset_id === selectedDatasetId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
            Profiling History
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Data Profiling
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
            Dataset-level profiling runs — row counts, sampling, and duplicate estimates from each
            completed scan. Starting a new profiling run isn't wired up here yet.
          </p>
        </div>
        <button
          onClick={() => onNavigate('data-explorer')}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
        >
          &larr; Back to Data Explorer
        </button>
      </div>

      {activeDatasets.length === 0 ? (
        <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No datasets available to profile.
        </div>
      ) : (
        <>
          {/* Dataset Selector */}
          <div className="inline-flex flex-wrap bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs gap-1">
            {activeDatasets.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDatasetId(d.id)}
                className={`px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  selectedDatasetId === d.id
                    ? 'bg-white text-on-surface shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {runsForDataset.length === 0 ? (
            <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
              No profiling runs recorded yet for {selectedDataset?.name ?? 'this dataset'}.
            </div>
          ) : (
            <div className="space-y-4">
              {runsForDataset.map((run, idx) => (
                <div key={run.id} className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-lg text-outline">query_stats</span>
                      <h3 className="font-editorial font-bold text-lg text-on-surface">
                        {idx === 0 ? 'Latest run' : `Run from ${formatDateTime(run.created_at)}`}
                      </h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          run.status === 'COMPLETED'
                            ? 'bg-primary-fixed text-on-primary-fixed'
                            : run.status === 'FAILED'
                            ? 'bg-error-container text-on-error-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-outline">
                      Started {formatDateTime(run.started_at)}
                      {run.completed_at ? ` • Completed ${formatDateTime(run.completed_at)}` : ''}
                    </span>
                  </div>

                  {run.error_message && (
                    <p className="text-xs text-on-error-container bg-error-container/40 rounded-md px-3 py-2 mb-4">
                      {run.error_message}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-surface-container-low rounded-md">
                      <span className="text-[11px] text-outline block">Rows Profiled</span>
                      <span className="font-editorial text-lg font-bold text-on-surface">
                        {run.row_count !== null ? run.row_count.toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-md">
                      <span className="text-[11px] text-outline block">Sample Size</span>
                      <span className="font-editorial text-lg font-bold text-on-surface">
                        {run.sample_size !== null ? run.sample_size.toLocaleString() : 'Full scan'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-md">
                      <span className="text-[11px] text-outline block">Duplicate %</span>
                      <span className="font-editorial text-lg font-bold text-on-surface">
                        {run.duplicate_percentage !== null ? `${run.duplicate_percentage}%` : '—'}
                      </span>
                    </div>
                    <div className="p-2.5 bg-surface-container-low rounded-md">
                      <span className="text-[11px] text-outline block">Quality Score</span>
                      <span className="font-editorial text-lg font-bold text-on-surface">
                        {run.quality_score !== null ? `${run.quality_score}%` : 'Not yet available'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
