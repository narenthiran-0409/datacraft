import React, { useState } from 'react';
import { ColumnProfile, ExplorerColumn, ExplorerDataset, NavScreen } from '../../types';

interface DataProfilingViewProps {
  onNavigate: (screen: NavScreen) => void;
  datasets: ExplorerDataset[];
  columns: ExplorerColumn[];
  columnProfiles: ColumnProfile[];
}

const STRING_TYPES = ['VARCHAR', 'TEXT', 'STRING', 'CHAR'];

const isNumericLike = (value: string | number | null) => typeof value === 'number';

export const DataProfilingView: React.FC<DataProfilingViewProps> = ({
  onNavigate,
  datasets,
  columns,
  columnProfiles,
}) => {
  const activeDatasets = datasets.filter((d) => d.isActive);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(activeDatasets[0]?.id ?? '');

  const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);
  const datasetColumns = columns.filter((c) => c.datasetId === selectedDatasetId);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
            Column Statistics
          </span>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Data Profiling
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
            Distributional statistics computed for each column. Estimated stats are labeled
            separately from exact, full-scan stats.
          </p>
        </div>
        <button
          onClick={() => onNavigate('data-explorer')}
          className="text-xs font-semibold text-primary hover:underline cursor-pointer shrink-0"
        >
          &larr; Back to Data Explorer
        </button>
      </div>

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

      {!selectedDataset ? (
        <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          No datasets available to profile.
        </div>
      ) : (
        <div className="space-y-4">
          {datasetColumns.map((col) => {
            const profile = columnProfiles.find((p) => p.columnId === col.id);
            const isStringType = STRING_TYPES.includes(col.dataType.toUpperCase());
            const hasLengthStats =
              isStringType && profile && (profile.minLength !== null || profile.maxLength !== null || profile.avgLength !== null);
            const hasRangeStats =
              profile &&
              (profile.minValue !== null || profile.maxValue !== null || profile.meanValue !== null || profile.medianValue !== null || profile.modeValue !== null);

            return (
              <div
                key={col.id}
                className={`bg-white rounded-lg border border-outline-variant shadow-ambient p-6 ${
                  !col.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-lg text-outline">
                      {col.isPrimaryKey ? 'key' : 'view_column'}
                    </span>
                    <h3 className="font-editorial font-bold text-lg text-on-surface font-mono">
                      {col.name}
                    </h3>
                    <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant">
                      {col.dataType}
                    </span>
                    {!col.isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-outline">
                        Inactive column
                      </span>
                    )}
                  </div>

                  {profile && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        profile.exactStats
                          ? 'bg-primary-fixed text-on-primary-fixed'
                          : 'bg-secondary-fixed text-on-secondary-fixed'
                      }`}
                      title={
                        profile.exactStats
                          ? 'Computed from a full scan of the column'
                          : 'Estimated from a sample of the column, not a full scan'
                      }
                    >
                      <span className="material-symbols-outlined text-xs">
                        {profile.exactStats ? 'verified' : 'query_stats'}
                      </span>
                      {profile.exactStats ? 'Exact' : 'Estimated (sample)'}
                    </span>
                  )}
                </div>

                {!profile ? (
                  <p className="text-xs text-outline italic">No profiling data available for this column yet.</p>
                ) : (
                  <>
                    {/* Core stats grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-2.5 bg-surface-container-low rounded-md">
                        <span className="text-[11px] text-outline block">Null %</span>
                        <span className="font-editorial text-lg font-bold text-on-surface">
                          {profile.nullPercentage}%
                        </span>
                      </div>
                      <div className="p-2.5 bg-surface-container-low rounded-md">
                        <span className="text-[11px] text-outline block">Distinct %</span>
                        <span className="font-editorial text-lg font-bold text-on-surface">
                          {profile.distinctPercentage}%
                        </span>
                      </div>

                      {hasRangeStats && (
                        <>
                          {profile.minValue !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Min</span>
                              <span className="font-mono text-sm font-bold text-on-surface">
                                {isNumericLike(profile.minValue) ? Number(profile.minValue).toLocaleString() : profile.minValue}
                              </span>
                            </div>
                          )}
                          {profile.maxValue !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Max</span>
                              <span className="font-mono text-sm font-bold text-on-surface">
                                {isNumericLike(profile.maxValue) ? Number(profile.maxValue).toLocaleString() : profile.maxValue}
                              </span>
                            </div>
                          )}
                          {profile.meanValue !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Mean</span>
                              <span className="font-mono text-sm font-bold text-on-surface">
                                {profile.meanValue.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {profile.medianValue !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Median</span>
                              <span className="font-mono text-sm font-bold text-on-surface">
                                {isNumericLike(profile.medianValue) ? Number(profile.medianValue).toLocaleString() : profile.medianValue}
                              </span>
                            </div>
                          )}
                          {profile.modeValue !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Mode</span>
                              <span className="font-mono text-sm font-bold text-on-surface">
                                {profile.modeValue}
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {hasLengthStats && (
                        <>
                          {profile.minLength !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Min Length</span>
                              <span className="font-mono text-sm font-bold text-on-surface">{profile.minLength}</span>
                            </div>
                          )}
                          {profile.maxLength !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Max Length</span>
                              <span className="font-mono text-sm font-bold text-on-surface">{profile.maxLength}</span>
                            </div>
                          )}
                          {profile.avgLength !== null && (
                            <div className="p-2.5 bg-surface-container-low rounded-md">
                              <span className="text-[11px] text-outline block">Avg Length</span>
                              <span className="font-mono text-sm font-bold text-on-surface">{profile.avgLength}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Top Values */}
                    {profile.topValues && profile.topValues.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-surface-container">
                        <p className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-2">
                          Top Values
                        </p>
                        <div className="space-y-2">
                          {profile.topValues.map((tv) => {
                            const total = profile.topValues!.reduce((sum, v) => sum + v.count, 0);
                            const pct = total ? (tv.count / total) * 100 : 0;
                            return (
                              <div key={tv.value} className="flex items-center gap-3 text-xs">
                                <span className="font-mono font-semibold text-on-surface w-28 truncate shrink-0">
                                  {tv.value}
                                </span>
                                <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-outline font-mono shrink-0">
                                  {tv.count.toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
