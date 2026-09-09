import React, { useState } from 'react';
import { User, NavScreen } from '../../types';

interface DashboardViewProps {
  currentUser: User;
  onNavigate: (screen: NavScreen) => void;
  onOpenNewDataset: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onNavigate,
  onOpenNewDataset,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  // Chart data for 7d vs 30d
  const data7d = [
    { day: 'Mon', score: 87, scans: 1420 },
    { day: 'Tue', score: 88, scans: 1850 },
    { day: 'Wed', score: 89, scans: 2100 },
    { day: 'Thu', score: 88, scans: 1940 },
    { day: 'Fri', score: 90, scans: 2400 },
    { day: 'Sat', score: 91, scans: 1100 },
    { day: 'Sun', score: 92, scans: 1680 },
  ];

  const data30d = [
    { day: 'W1', score: 82, scans: 8200 },
    { day: 'W2', score: 86, scans: 9500 },
    { day: 'W3', score: 89, scans: 11200 },
    { day: 'W4', score: 92, scans: 12400 },
  ];

  const activeData = timeRange === '7d' ? data7d : data30d;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="uppercase tracking-wider text-[11px] font-semibold text-on-surface-variant">
              Enterprise Engine Active • Auto-Scan 12m ago
            </span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1 font-sans">
            Here is your daily data reliability snapshot across all 5 connected systems.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('review-corrections')}
            className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2.5 rounded-md font-medium text-xs border border-outline-variant transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg text-secondary">
              auto_fix_high
            </span>
            <span>Review 14 AI Suggestions</span>
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
          onClick={() => onNavigate('dataset-overview')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Health Score
            </span>
            <span className="p-2 rounded-md bg-surface-container-high/60 text-primary">
              <span className="material-symbols-outlined text-xl">
                health_and_safety
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-extrabold text-primary">
              92%
            </span>
            <span className="text-xs font-bold text-primary bg-surface-container-high/80 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +4.2%
            </span>
          </div>
          <p className="text-xs text-outline mt-2">
            Healthy quality threshold met across 94% tables.
          </p>
        </div>

        {/* Metric 2: Anomalies / Issues */}
        <div
          onClick={() => onNavigate('review-corrections')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Issues Found
            </span>
            <span className="p-2 rounded-md bg-secondary-fixed text-secondary">
              <span className="material-symbols-outlined text-xl">warning</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-extrabold text-secondary">
              14
            </span>
            <span className="text-xs font-medium text-outline">
              requiring review
            </span>
          </div>
          <p className="text-xs text-outline mt-2 flex items-center justify-between">
            <span>Customer Data (emails)</span>
            <span className="font-semibold text-secondary group-hover:underline">
              Fix now &rarr;
            </span>
          </p>
        </div>

        {/* Metric 3: Pending Approvals */}
        <div
          onClick={() => onNavigate('approval-center')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Pending Approvals
            </span>
            <span className="p-2 rounded-md bg-tertiary-fixed text-tertiary">
              <span className="material-symbols-outlined text-xl">
                fact_check
              </span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-extrabold text-tertiary">
              3
            </span>
            <span className="text-xs font-medium text-outline">
              schema / rows
            </span>
          </div>
          <p className="text-xs text-outline mt-2 flex items-center justify-between">
            <span>Customer Data + 2 others</span>
            <span className="font-semibold text-tertiary group-hover:underline">
              Inspect &rarr;
            </span>
          </p>
        </div>

        {/* Metric 4: Total Records Monitored */}
        <div
          onClick={() => onNavigate('data-sources')}
          className="bg-white rounded-lg p-5 border border-outline-variant shadow-ambient shadow-ambient-hover cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider">
              Records Monitored
            </span>
            <span className="p-2 rounded-md bg-surface-container-low text-on-surface">
              <span className="material-symbols-outlined text-xl">database</span>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-extrabold text-on-surface">
              24.5M
            </span>
            <span className="text-xs font-bold text-primary bg-surface-container-high px-1.5 py-0.5 rounded">
              5 Sources
            </span>
          </div>
          <p className="text-xs text-outline mt-2">
            PostgreSQL, Shopify, Snowflake, S3
          </p>
        </div>
      </div>

      {/* Middle Section: Quality Trends Chart + Priority Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quality Trends Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-on-surface">
                  Data Quality & Validation Trend
                </h3>
                <p className="text-xs text-outline">
                  Automated rule pass rate across active enterprise catalogs
                </p>
              </div>

              {/* Time Range Toggle */}
              <div className="inline-flex bg-surface-container-low p-1 rounded-md border border-outline-variant text-xs font-semibold">
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    timeRange === '7d'
                      ? 'bg-white text-on-surface shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1 rounded transition-all cursor-pointer ${
                    timeRange === '30d'
                      ? 'bg-white text-on-surface shadow-xs'
                      : 'text-on-surface-variant'
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* SVG Interactive Trend Visualizer */}
            <div className="h-56 w-full pt-4 relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180">
                {/* Horizontal Guide Lines */}
                <line
                  x1="0"
                  y1="20"
                  x2="500"
                  y2="20"
                  stroke="var(--color-outline-variant)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="70"
                  x2="500"
                  y2="70"
                  stroke="var(--color-outline-variant)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="120"
                  x2="500"
                  y2="120"
                  stroke="var(--color-outline-variant)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <line
                  x1="0"
                  y1="160"
                  x2="500"
                  y2="160"
                  stroke="var(--color-outline-variant)"
                  strokeWidth="1"
                />

                {/* Data Points calculation */}
                {(() => {
                  const points = activeData.map((d, i) => {
                    const x = (i / (activeData.length - 1)) * 480 + 10;
                    const y = 160 - ((d.score - 75) / 25) * 130;
                    return { x, y, score: d.score, day: d.day, scans: d.scans };
                  });

                  const pathD = points.reduce((acc, curr, i) => {
                    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
                  }, '');

                  const areaD = `${pathD} L ${points[points.length - 1].x} 160 L ${points[0].x} 160 Z`;

                  return (
                    <>
                      {/* Gradient Fill */}
                      <defs>
                        <linearGradient id="editorialGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d={areaD} fill="url(#editorialGrad)" />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Dots & Labels */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/dot cursor-pointer">
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="4.5"
                            className="fill-white stroke-primary stroke-2 hover:r-6.5 transition-all"
                          />
                          <text
                            x={p.x}
                            y="175"
                            textAnchor="middle"
                            className="text-[10px] fill-outline font-semibold"
                          >
                            {p.day}
                          </text>
                          {/* Value label on top */}
                          <text
                            x={p.x}
                            y={p.y - 10}
                            textAnchor="middle"
                            className="text-[11px] fill-primary font-bold"
                          >
                            {p.score}%
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Metric Sub-breakdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-surface-container mt-4">
            <div className="p-2.5 bg-surface-container-low rounded-md">
              <span className="text-[11px] text-outline block">Completeness</span>
              <span className="font-editorial text-lg font-bold text-on-surface">98.4%</span>
            </div>
            <div className="p-2.5 bg-surface-container-low rounded-md">
              <span className="text-[11px] text-outline block">Uniqueness</span>
              <span className="font-editorial text-lg font-bold text-on-surface">100%</span>
            </div>
            <div className="p-2.5 bg-surface-container-low rounded-md">
              <span className="text-[11px] text-outline block">Validity</span>
              <span className="font-editorial text-lg font-bold text-on-surface">85.0%</span>
            </div>
            <div className="p-2.5 bg-surface-container-low rounded-md">
              <span className="text-[11px] text-outline block">Freshness</span>
              <span className="font-editorial text-lg font-bold text-on-surface">99.2%</span>
            </div>
          </div>
        </div>

        {/* Right: Priority Actions */}
        <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col justify-between">
          <div>
            <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">
              Priority Actions
            </h3>
            <p className="text-xs text-outline mb-4">
              3 high-impact remediation tasks pending your confirmation
            </p>

            <div className="space-y-3">
              {/* Action 1 */}
              <div className="p-3.5 bg-secondary-fixed border border-secondary/20 rounded-md flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-xl mt-0.5">
                  alternate_email
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Clean Customer Emails
                    </span>
                    <span className="text-[9px] font-semibold text-secondary uppercase bg-white px-1.5 py-0.5 rounded border border-secondary/20">
                      High
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    14 malformed email syntax errors detected by AI logic.
                  </p>
                  <button
                    onClick={() => onNavigate('review-corrections')}
                    className="mt-2 text-xs font-semibold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Review Corrections</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Action 2 */}
              <div className="p-3.5 bg-tertiary-fixed border border-tertiary/20 rounded-md flex items-start gap-3">
                <span className="material-symbols-outlined text-tertiary text-xl mt-0.5">
                  schema
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Approve Schema Request
                    </span>
                    <span className="text-[9px] font-semibold text-tertiary uppercase bg-white px-1.5 py-0.5 rounded border border-tertiary/20">
                      Med
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    REQ-9421: Add Region column to 'users_master'.
                  </p>
                  <button
                    onClick={() => onNavigate('approval-center')}
                    className="mt-2 text-xs font-semibold text-tertiary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Changes</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Action 3 */}
              <div className="p-3.5 bg-error-container border border-on-error-container/20 rounded-md flex items-start gap-3">
                <span className="material-symbols-outlined text-on-error-container text-xl mt-0.5">
                  sync_problem
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">
                      Marketing CSVs Pipeline
                    </span>
                    <span className="text-[9px] font-semibold text-on-error-container uppercase bg-white px-1.5 py-0.5 rounded border border-on-error-container/20">
                      Fix
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    FTP auth token expired. 156 campaign files delayed.
                  </p>
                  <button
                    onClick={() => onNavigate('data-sources')}
                    className="mt-2 text-xs font-semibold text-on-error-container hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Re-authenticate Source</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-surface-container text-center">
            <button
              onClick={() => onNavigate('quality-rules')}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Manage 6 Quality Automation Rules &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Monitored Datasets */}
      <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">
              Active Catalogs & Datasets
            </h3>
            <p className="text-xs text-outline">
              Quick status and health telemetry across production tables
            </p>
          </div>
          <button
            onClick={() => onNavigate('data-sources')}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            View All Sources &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Item 1: Customer Data */}
          <div
            onClick={() => onNavigate('dataset-overview')}
            className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-on-surface group-hover:text-primary">
                Customer Data
              </span>
              <span className="text-xs font-bold text-primary bg-white px-2 py-0.5 rounded-full border border-outline-variant">
                91%
              </span>
            </div>
            <div className="text-[11px] text-outline space-y-1">
              <div>12.4k records • 18 cols</div>
              <div className="text-secondary font-medium">1 format issue detected</div>
            </div>
          </div>

          {/* Item 2: Global Sales */}
          <div
            onClick={() => onNavigate('dataset-preview')}
            className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-on-surface group-hover:text-primary">
                Global Sales
              </span>
              <span className="text-xs font-bold text-primary bg-white px-2 py-0.5 rounded-full border border-outline-variant">
                85%
              </span>
            </div>
            <div className="text-[11px] text-outline space-y-1">
              <div>45.2k records • 24 cols</div>
              <div className="text-primary">Healthy • Updated 5h ago</div>
            </div>
          </div>

          {/* Item 3: Product Inventory */}
          <div
            onClick={() => onNavigate('dataset-preview')}
            className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-on-surface group-hover:text-primary">
                Product Inventory
              </span>
              <span className="text-xs font-bold text-primary bg-white px-2 py-0.5 rounded-full border border-outline-variant">
                95%
              </span>
            </div>
            <div className="text-[11px] text-outline space-y-1">
              <div>8.1k records • 14 cols</div>
              <div className="text-primary">Healthy • Updated 1d ago</div>
            </div>
          </div>

          {/* Item 4: Financial Projections Q3 */}
          <div
            onClick={() => onNavigate('approval-center')}
            className="p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant rounded-md cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-xs text-on-surface group-hover:text-primary">
                Financial Projections Q3
              </span>
              <span className="text-xs font-bold text-tertiary bg-white px-2 py-0.5 rounded-full border border-outline-variant">
                88%
              </span>
            </div>
            <div className="text-[11px] text-outline space-y-1">
              <div>3.5k records • 32 cols</div>
              <div className="text-tertiary font-medium">Pending Approval REQ-9422</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
