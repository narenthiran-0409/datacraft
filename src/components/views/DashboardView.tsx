import React, { useMemo, useState } from 'react';
import { User, NavScreen, QualityTrendPoint, RuleEffectivenessRow, QualityByDatasetRow } from '../../types';
import { ApprovalRequestResponse, DatasetResponse } from '../../api/client';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (screen: NavScreen) => void;
  onOpenNewDataset: () => void;
  onOpenDataset: (datasetId: string) => void;

  canReadReports: boolean;
  reportsLoading: boolean;
  reportsError: string | null;
  qualityTrend: QualityTrendPoint[];
  ruleEffectiveness: RuleEffectivenessRow[];
  qualityByDataset: QualityByDatasetRow[];

  canReadApprovals: boolean;
  approvalsLoading: boolean;
  approvalsError: string | null;
  pendingApprovals: ApprovalRequestResponse[];

  canReadDatasets: boolean;
  datasetsLoading: boolean;
  datasetsError: string | null;
  datasets: DatasetResponse[];

  canReadDataSources: boolean;
  dataSourcesLoading: boolean;
  dataSourcesError: string | null;
  activeSourceCount: number;
}

function PermissionNotice({ code }: { code: string }) {
  return (
    <p className="text-xs text-outline flex items-center gap-1.5">
      <span className="material-symbols-outlined text-sm">lock</span>
      Requires the {code} permission
    </p>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <p className="text-xs text-error flex items-center gap-1.5">
      <span className="material-symbols-outlined text-sm">error</span>
      {message}
    </p>
  );
}

function avgRuleTypeScore(rows: RuleEffectivenessRow[], types: string[]): number | null {
  const matching = rows.filter((r) => types.includes(r.ruleType));
  if (matching.length === 0) return null;
  const avgFailureRate = matching.reduce((sum, r) => sum + r.rejectRate, 0) / matching.length;
  return Math.round((1 - avgFailureRate) * 1000) / 10;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigate,
  onOpenNewDataset,
  onOpenDataset,
  canReadReports,
  reportsLoading,
  reportsError,
  qualityTrend,
  ruleEffectiveness,
  qualityByDataset,
  canReadApprovals,
  approvalsLoading,
  approvalsError,
  pendingApprovals,
  canReadDatasets,
  datasetsLoading,
  datasetsError,
  datasets,
  canReadDataSources,
  dataSourcesLoading,
  dataSourcesError,
  activeSourceCount,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  // Real trend points, sorted oldest-first (quality-trend report has no guaranteed
  // order), sliced to the last N points for the toggle — there's no fixed "day"
  // cadence in real validation-run data, so this is "last N runs" not "last N days".
  const sortedTrend = useMemo(
    () => [...qualityTrend].sort((a, b) => (a.date < b.date ? -1 : 1)),
    [qualityTrend]
  );
  const activePoints = useMemo(
    () => sortedTrend.slice(-(timeRange === '7d' ? 7 : 30)),
    [sortedTrend, timeRange]
  );

  const healthScore = useMemo(() => {
    const scored = qualityByDataset.filter((d) => d.latestQualityScore !== null);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, d) => sum + (d.latestQualityScore ?? 0), 0) / scored.length;
    return Math.round(avg * 10) / 10;
  }, [qualityByDataset]);

  const ruleFailures90d = useMemo(
    () => ruleEffectiveness.reduce((sum, r) => sum + r.failureCount, 0),
    [ruleEffectiveness]
  );

  const totalRecordsMonitored = useMemo(
    () => datasets.reduce((sum, d) => sum + (d.row_count_estimate ?? 0), 0),
    [datasets]
  );

  const subMetrics = useMemo(
    () => ({
      completeness: avgRuleTypeScore(ruleEffectiveness, ['COMPLETENESS']),
      uniqueness: avgRuleTypeScore(ruleEffectiveness, ['UNIQUENESS']),
      // No single rule type maps to "validity" — RANGE and PATTERN together are the
      // closest real proxy (both are format/bounds checks), combined here.
      validity: avgRuleTypeScore(ruleEffectiveness, ['RANGE', 'PATTERN']),
      // No last-validated timestamp survives into this shared (formatted-for-display)
      // type, so "freshness" is honestly redefined as validation coverage — % of
      // tracked datasets with at least one completed validation — rather than
      // fabricating a recency number from data that isn't available here.
      freshness:
        qualityByDataset.length > 0
          ? Math.round((qualityByDataset.filter((d) => d.lastValidatedAt !== null).length / qualityByDataset.length) * 1000) / 10
          : null,
    }),
    [ruleEffectiveness, qualityByDataset]
  );

  const datasetsNeedingAttention = useMemo(
    () =>
      qualityByDataset
        .filter((d) => d.latestQualityScore !== null)
        .sort((a, b) => (a.latestQualityScore ?? 0) - (b.latestQualityScore ?? 0))
        .slice(0, 3),
    [qualityByDataset]
  );

  const qualityScoreByDatasetId = useMemo(() => {
    const map = new Map<string, number | null>();
    qualityByDataset.forEach((d) => map.set(d.datasetId, d.latestQualityScore));
    return map;
  }, [qualityByDataset]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-wider text-[11px] font-semibold text-on-surface-variant">
              Live Data Reliability Snapshot
            </span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-sans">
            {canReadDataSources
              ? `Your data reliability snapshot across ${activeSourceCount} connected source${activeSourceCount === 1 ? '' : 's'}.`
              : 'Your data reliability snapshot.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('review-corrections')}
            className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2.5 rounded-md font-medium text-xs border border-outline-variant transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-secondary">fact_check</span>
            <span>Review Corrections</span>
          </button>

          <button
            onClick={onOpenNewDataset}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>New Dataset</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Health Score */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Health Score</span>
            <span className="p-2 rounded-md bg-surface-container-high/60 text-primary">
              <span className="material-symbols-outlined text-xl">health_and_safety</span>
            </span>
          </div>
          {!canReadReports ? (
            <PermissionNotice code="reports.read" />
          ) : reportsLoading ? (
            <div className="h-9 w-20 bg-surface-container-low rounded animate-pulse" />
          ) : reportsError ? (
            <SectionError message={reportsError} />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-3xl font-extrabold text-primary">
                  {healthScore !== null ? `${healthScore}%` : '—'}
                </span>
              </div>
              <p className="text-xs text-outline mt-2">
                Average latest quality score across {qualityByDataset.filter((d) => d.latestQualityScore !== null).length} validated dataset(s).
              </p>
            </>
          )}
        </div>

        {/* Metric 2: Rule Failures */}
        <div
          onClick={() => onNavigate('quality-rules')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Rule Failures</span>
            <span className="p-2 rounded-md bg-secondary-fixed text-secondary">
              <span className="material-symbols-outlined text-xl">warning</span>
            </span>
          </div>
          {!canReadReports ? (
            <PermissionNotice code="reports.read" />
          ) : reportsLoading ? (
            <div className="h-9 w-20 bg-surface-container-low rounded animate-pulse" />
          ) : reportsError ? (
            <SectionError message={reportsError} />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-3xl font-extrabold text-secondary">{ruleFailures90d}</span>
                <span className="text-xs font-medium text-outline">last 90 days</span>
              </div>
              <p className="text-xs text-outline mt-2 flex items-center justify-between">
                <span>Across {ruleEffectiveness.length} active rule(s)</span>
                <span className="font-semibold text-secondary group-hover:underline">Manage rules &rarr;</span>
              </p>
            </>
          )}
        </div>

        {/* Metric 3: Pending Approvals */}
        <div
          onClick={() => onNavigate('approval-center')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Pending Approvals</span>
            <span className="p-2 rounded-md bg-tertiary-fixed text-tertiary">
              <span className="material-symbols-outlined text-xl">fact_check</span>
            </span>
          </div>
          {!canReadApprovals ? (
            <PermissionNotice code="approval.read" />
          ) : approvalsLoading ? (
            <div className="h-9 w-20 bg-surface-container-low rounded animate-pulse" />
          ) : approvalsError ? (
            <SectionError message={approvalsError} />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-3xl font-extrabold text-tertiary">{pendingApprovals.length}</span>
                <span className="text-xs font-medium text-outline">requests</span>
              </div>
              <p className="text-xs text-outline mt-2 flex items-center justify-between">
                <span>{pendingApprovals.length === 0 ? 'Nothing waiting' : 'Awaiting sign-off'}</span>
                <span className="font-semibold text-tertiary group-hover:underline">Inspect &rarr;</span>
              </p>
            </>
          )}
        </div>

        {/* Metric 4: Total Records Monitored */}
        <div
          onClick={() => onNavigate('data-sources')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">Records Monitored</span>
            <span className="p-2 rounded-md bg-surface-container-low text-on-surface">
              <span className="material-symbols-outlined text-xl">database</span>
            </span>
          </div>
          {!canReadDatasets ? (
            <PermissionNotice code="metadata.read" />
          ) : datasetsLoading ? (
            <div className="h-9 w-20 bg-surface-container-low rounded animate-pulse" />
          ) : datasetsError ? (
            <SectionError message={datasetsError} />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-editorial text-3xl font-extrabold text-on-surface">
                  {totalRecordsMonitored.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-primary bg-surface-container-high px-1.5 py-0.5 rounded">
                  {canReadDataSources
                    ? dataSourcesLoading
                      ? '…'
                      : dataSourcesError
                      ? '—'
                      : `${activeSourceCount} Source${activeSourceCount === 1 ? '' : 's'}`
                    : '—'}
                </span>
              </div>
              <p className="text-xs text-outline mt-2">Across {datasets.length} discovered dataset(s)</p>
            </>
          )}
        </div>
      </div>

      {/* Middle Section: Quality Trends Chart + Datasets Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quality Trends Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-on-surface">
                  Data Quality &amp; Validation Trend
                </h3>
                <p className="text-xs text-outline">Real quality score per validation run, last 90 days</p>
              </div>

              <div className="inline-flex bg-surface-container-low p-1 rounded-md border border-outline-variant text-xs font-semibold">
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    timeRange === '7d' ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Last 7 Runs
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    timeRange === '30d' ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  Last 30 Runs
                </button>
              </div>
            </div>

            {!canReadReports ? (
              <div className="h-56 flex items-center justify-center">
                <PermissionNotice code="reports.read" />
              </div>
            ) : reportsLoading ? (
              <div className="h-56 bg-surface-container-low rounded animate-pulse" />
            ) : reportsError ? (
              <div className="h-56 flex items-center justify-center">
                <SectionError message={reportsError} />
              </div>
            ) : activePoints.length === 0 ? (
              <div className="h-56 flex items-center justify-center">
                <p className="text-xs text-outline">No validation runs in this window yet.</p>
              </div>
            ) : (
              <div className="h-56 w-full pt-4 relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                  <line x1="0" y1="20" x2="500" y2="20" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
                  <line x1="0" y1="160" x2="500" y2="160" stroke="var(--color-outline-variant)" strokeWidth="1" />

                  {(() => {
                    const points = activePoints.map((d, i) => {
                      const x = activePoints.length > 1 ? (i / (activePoints.length - 1)) * 480 + 10 : 250;
                      const clampedScore = Math.max(0, Math.min(100, d.qualityScore));
                      const y = 160 - (clampedScore / 100) * 140;
                      // BUG FIX: `date` here is already a formatted display string
                      // (e.g. "Sep 9, 2026"), not a raw ISO date — a fixed-index
                      // slice(5,10) assumed the latter and produced garbage labels
                      // like "2026". Strips the year the same way ReportsView does
                      // for the same field, instead.
                      return { x, y, score: d.qualityScore, label: d.date.replace(/, \d{4}$/, '') };
                    });

                    const pathD = points.reduce((acc, curr, i) => (i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`), '');
                    const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

                    return (
                      <>
                        <defs>
                          <linearGradient id="editorialGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={areaD} fill="url(#editorialGrad)" />
                        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, idx) => (
                          <g key={idx} className="group/dot cursor-pointer">
                            <circle cx={p.x} cy={p.y} r="4.5" className="fill-white stroke-primary stroke-2 hover:r-6.5 transition-all" />
                            <text x={p.x} y="175" textAnchor="middle" className="text-[10px] fill-outline font-semibold">
                              {p.label}
                            </text>
                            <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[11px] fill-primary font-bold">
                              {p.score}%
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Metric Sub-breakdowns */}
          {canReadReports && !reportsLoading && !reportsError && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-container mt-4">
              <div className="p-2.5 bg-surface-container-low rounded-md">
                <span className="text-[11px] text-outline block">Completeness</span>
                <span className="font-editorial text-lg font-bold text-on-surface">
                  {subMetrics.completeness !== null ? `${subMetrics.completeness}%` : '—'}
                </span>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-md">
                <span className="text-[11px] text-outline block">Uniqueness</span>
                <span className="font-editorial text-lg font-bold text-on-surface">
                  {subMetrics.uniqueness !== null ? `${subMetrics.uniqueness}%` : '—'}
                </span>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-md">
                <span className="text-[11px] text-outline block">Validity</span>
                <span className="font-editorial text-lg font-bold text-on-surface">
                  {subMetrics.validity !== null ? `${subMetrics.validity}%` : '—'}
                </span>
              </div>
              <div className="p-2.5 bg-surface-container-low rounded-md">
                <span className="text-[11px] text-outline block" title="% of tracked datasets with at least one completed validation">
                  Freshness
                </span>
                <span className="font-editorial text-lg font-bold text-on-surface">
                  {subMetrics.freshness !== null ? `${subMetrics.freshness}%` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Datasets Needing Attention */}
        <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col justify-between">
          <div>
            <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">Datasets Needing Attention</h3>
            <p className="text-xs text-outline mb-4">Lowest quality score among validated datasets</p>

            {!canReadReports ? (
              <PermissionNotice code="reports.read" />
            ) : reportsLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 bg-surface-container-low rounded-md animate-pulse" />
                ))}
              </div>
            ) : reportsError ? (
              <SectionError message={reportsError} />
            ) : datasetsNeedingAttention.length === 0 ? (
              <p className="text-xs text-outline italic">No validated datasets with a quality score yet.</p>
            ) : (
              <div className="space-y-3">
                {datasetsNeedingAttention.map((d) => (
                  <div
                    key={d.datasetId}
                    className="p-3.5 bg-secondary-fixed border border-secondary/20 rounded-md flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-secondary text-xl mt-0.5">table_chart</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">{d.datasetName}</span>
                        <span className="text-[9px] font-semibold text-secondary uppercase bg-white px-1.5 py-0.5 rounded border border-secondary/20">
                          {d.latestQualityScore}%
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {d.lastValidatedAt ? `Last validated ${d.lastValidatedAt}` : 'Not yet validated'}
                      </p>
                      <button
                        onClick={() => onOpenDataset(d.datasetId)}
                        className="mt-2 text-xs font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Dataset</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container text-center">
            <button
              onClick={() => onNavigate('quality-rules')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Manage Quality Automation Rules &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Monitored Datasets */}
      <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">Active Catalogs &amp; Datasets</h3>
            <p className="text-xs text-outline">Quick status and health telemetry across discovered tables</p>
          </div>
          <button
            onClick={() => onNavigate('data-sources')}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            View All Sources &rarr;
          </button>
        </div>

        {!canReadDatasets ? (
          <PermissionNotice code="metadata.read" />
        ) : datasetsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface-container-low rounded-md animate-pulse" />
            ))}
          </div>
        ) : datasetsError ? (
          <SectionError message={datasetsError} />
        ) : datasets.length === 0 ? (
          <p className="text-xs text-outline italic">No datasets discovered yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {datasets.slice(0, 8).map((d) => {
              const score = qualityScoreByDatasetId.get(d.id) ?? d.last_quality_score;
              return (
                <div
                  key={d.id}
                  onClick={() => onOpenDataset(d.id)}
                  className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-on-surface group-hover:text-primary truncate">{d.name}</span>
                    {score !== null && score !== undefined && (
                      <span className="text-xs font-bold text-primary bg-white px-2 py-0.5 rounded-full border border-outline-variant shrink-0 ml-2">
                        {score}%
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-outline space-y-1">
                    <div>
                      {(d.row_count_estimate ?? 0).toLocaleString()} records • {d.column_count ?? 0} cols
                    </div>
                    <div>{d.is_active ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
