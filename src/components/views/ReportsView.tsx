import React, { useState } from 'react';
import {
  ApprovalMetricsSummary,
  NavScreen,
  QualityByDatasetRow,
  QualityTrendPoint,
  ReviewPerformanceSummary,
  RuleEffectivenessRow,
} from '../../types';

interface ReportsViewProps {
  onNavigate: (screen: NavScreen) => void;
  qualityTrend: QualityTrendPoint[];
  ruleEffectiveness: RuleEffectivenessRow[];
  qualityByDataset: QualityByDatasetRow[];
  reviewPerformance: ReviewPerformanceSummary;
  approvalMetrics: ApprovalMetricsSummary;
}

type Tab = 'trend' | 'rules' | 'datasets' | 'review' | 'approval';

const TABS: { id: Tab; label: string }[] = [
  { id: 'trend', label: 'Quality Trend' },
  { id: 'rules', label: 'Rule Effectiveness' },
  { id: 'datasets', label: 'Quality by Dataset' },
  { id: 'review', label: 'Review Performance' },
  { id: 'approval', label: 'Approval Metrics' },
];

const formatMinutes = (minutes: number) => {
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = Math.round(minutes % 60);
  return `${hours}h ${remMinutes}m`;
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  qualityTrend,
  ruleEffectiveness,
  qualityByDataset,
  reviewPerformance,
  approvalMetrics,
}) => {
  const [tab, setTab] = useState<Tab>('trend');

  const scores = qualityTrend.map((p) => p.qualityScore);
  const minScore = scores.length ? Math.min(...scores) : 0;
  const maxScore = scores.length ? Math.max(...scores) : 100;
  const scoreRange = Math.max(maxScore - minScore, 1);
  const paddedMin = minScore - scoreRange * 0.15;
  const paddedMax = maxScore + scoreRange * 0.15;

  const points = qualityTrend.map((p, i) => {
    const x = qualityTrend.length > 1 ? (i / (qualityTrend.length - 1)) * 480 + 10 : 250;
    const y = 160 - ((p.qualityScore - paddedMin) / (paddedMax - paddedMin)) * 130;
    return { x, y, ...p };
  });
  const pathD = points.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`
      : '';

  const sortedRules = [...ruleEffectiveness].sort((a, b) => b.failureCount - a.failureCount);
  const maxFailures = Math.max(...sortedRules.map((r) => r.failureCount), 1);

  const sortedDatasets = [...qualityByDataset].sort((a, b) => {
    if (a.latestQualityScore === null) return 1;
    if (b.latestQualityScore === null) return -1;
    return b.latestQualityScore - a.latestQualityScore;
  });

  const maxThroughput = Math.max(...reviewPerformance.throughputByReviewer.map((r) => r.count), 1);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          Analytics
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          Reports
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          Aggregate quality, review, and approval metrics across your enterprise pipelines.
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex flex-wrap bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
              tab === t.id ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Quality Trend */}
      {tab === 'trend' && (
        <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
          <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">
            Overall Quality Trend
          </h3>
          <p className="text-xs text-on-surface-variant mb-4">
            Aggregate quality score across all validated datasets, by week
          </p>

          <div className="h-56 w-full pt-4 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
              <line x1="0" y1="20" x2="500" y2="20" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="var(--color-outline-variant)" strokeDasharray="4 4" strokeWidth="1" />
              <line x1="0" y1="160" x2="500" y2="160" stroke="var(--color-outline-variant)" strokeWidth="1" />

              <defs>
                <linearGradient id="reportsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {areaD && <path d={areaD} fill="url(#reportsGrad)" />}
              <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {points.map((p, idx) => (
                <g key={idx} className="group/dot cursor-pointer">
                  <circle cx={p.x} cy={p.y} r="4.5" className="fill-white stroke-primary stroke-2 transition-all" />
                  <text x={p.x} y="175" textAnchor="middle" className="text-[9px] fill-outline font-semibold">
                    {p.date.replace(', 2026', '')}
                  </text>
                  <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[11px] fill-primary font-bold">
                    {p.qualityScore}%
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Rule Effectiveness */}
      {tab === 'rules' && (
        <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
          <div className="p-6 border-b border-surface-container">
            <h3 className="font-editorial text-xl font-bold text-on-surface">Rule Effectiveness</h3>
            <p className="text-xs text-on-surface-variant mt-1">Ranked by failure count, with the reviewer reject rate for each rule's suggested corrections</p>
          </div>
          <div className="divide-y divide-surface-container">
            {sortedRules.map((rule) => (
              <div key={rule.ruleName} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-on-surface">{rule.ruleName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-high text-primary">
                      {rule.ruleType}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden mt-2 max-w-sm">
                    <div
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${(rule.failureCount / maxFailures) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-editorial text-lg font-bold text-on-surface">{rule.failureCount}</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider font-semibold">Failures</p>
                </div>
                <div className="text-right shrink-0 w-24">
                  <p className="font-editorial text-lg font-bold text-secondary">{rule.rejectRate}%</p>
                  <p className="text-[10px] text-outline uppercase tracking-wider font-semibold">Reject Rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality by Dataset */}
      {tab === 'datasets' && (
        <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
          <div className="p-6 border-b border-surface-container">
            <h3 className="font-editorial text-xl font-bold text-on-surface">Quality by Dataset</h3>
            <p className="text-xs text-on-surface-variant mt-1">Ranked by latest quality score — datasets without a completed validation run show no score</p>
          </div>
          <div className="divide-y divide-surface-container">
            {sortedDatasets.map((d) => (
              <div key={d.datasetName} className="p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">{d.datasetName}</p>
                  <p className="text-xs text-outline mt-0.5">{d.dataSourceName}</p>
                </div>
                <div className="text-right">
                  <p className={`font-editorial text-xl font-extrabold ${d.latestQualityScore !== null ? 'text-primary' : 'text-outline'}`}>
                    {d.latestQualityScore !== null ? `${d.latestQualityScore}%` : '—'}
                  </p>
                  <p className="text-[10px] text-outline">
                    {d.lastValidatedAt ?? 'Never validated'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Performance */}
      {tab === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
              Avg Time to Decision
            </span>
            <span className="font-editorial text-3xl font-extrabold text-primary">
              {formatMinutes(reviewPerformance.avgTimeToDecisionMinutes)}
            </span>
            <p className="text-xs text-on-surface-variant mt-1">Across all resolved and skipped issues</p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <h3 className="font-editorial text-lg font-bold text-on-surface mb-4">Throughput by Reviewer</h3>
            <div className="space-y-3">
              {reviewPerformance.throughputByReviewer.map((r) => (
                <div key={r.name} className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-on-surface w-32 truncate shrink-0">{r.name}</span>
                  <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(r.count / maxThroughput) * 100}%` }} />
                  </div>
                  <span className="text-outline font-mono shrink-0 w-16 text-right">{r.count} issues</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approval Metrics */}
      {tab === 'approval' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
              Approval Rate
            </span>
            <span className="font-editorial text-3xl font-extrabold text-primary">
              {approvalMetrics.approvalRate}%
            </span>
            <p className="text-xs text-on-surface-variant mt-1">Of all decided approval requests</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block mb-2">
              Avg Decision Latency
            </span>
            <span className="font-editorial text-3xl font-extrabold text-on-surface">
              {formatMinutes(approvalMetrics.avgDecisionLatencyMinutes)}
            </span>
            <p className="text-xs text-on-surface-variant mt-1">From request submission to decision</p>
          </div>
        </div>
      )}
    </div>
  );
};
