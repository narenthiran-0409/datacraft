import React, { useState } from 'react';
import { NavScreen, QualityMetric } from '../../types';
import { DATASET_ISSUES, RECENT_ACTIVITIES } from '../../data/mockData';

interface DatasetOverviewViewProps {
  onNavigate: (screen: NavScreen) => void;
  onOpenEditSchema?: () => void;
}

export const DatasetOverviewView: React.FC<DatasetOverviewViewProps> = ({
  onNavigate,
  onOpenEditSchema,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'preview' | 'rules' | 'lineage'>('overview');
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [checkFinished, setCheckFinished] = useState(false);

  const metrics: QualityMetric[] = [
    {
      name: 'Completeness',
      percentage: 98,
      icon: 'check_circle',
      status: 'healthy',
      details: '45 null values in non-critical columns',
    },
    {
      name: 'Uniqueness',
      percentage: 100,
      icon: 'check_circle',
      status: 'healthy',
      details: '0 duplicate primary keys found',
    },
    {
      name: 'Accuracy',
      percentage: 85,
      icon: 'warning',
      status: 'warning',
      details: '14 format anomalies flagged by AI check',
    },
  ];

  const handleRunCheck = () => {
    setIsRunningCheck(true);
    setCheckFinished(false);
    setTimeout(() => {
      setIsRunningCheck(false);
      setCheckFinished(true);
      setTimeout(() => setCheckFinished(false), 4000);
    }, 1500);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumb & Header */}
      <div className="border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
          <button
            onClick={() => onNavigate('data-sources')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Data Sources
          </button>
          <span>/</span>
          <button
            onClick={() => onNavigate('data-sources')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Corporate PostgreSQL
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">Customer Data</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 shadow-xs">
              <span
                className="material-symbols-outlined text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person_pin
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
                  Customer Data
                </h1>
                <span className="bg-surface-container-high text-primary text-xs font-extrabold px-3 py-1 rounded-full border border-outline-variant">
                  91% Score
                </span>
              </div>
              <p className="text-xs text-outline mt-1 flex flex-wrap items-center gap-2 font-sans">
                <span>12.4k records</span>
                <span>•</span>
                <span>18 columns</span>
                <span>•</span>
                <span className="text-primary font-semibold">
                  Last checked: Today, 9:30 AM
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenEditSchema}
              className="flex items-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface px-4 py-2.5 rounded-md font-medium text-xs border border-outline-variant transition-colors shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-on-surface-variant">
                schema
              </span>
              <span>Edit Schema</span>
            </button>

            <button
              onClick={handleRunCheck}
              disabled={isRunningCheck}
              className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] disabled:opacity-80 cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  isRunningCheck ? 'animate-spin' : ''
                }`}
              >
                {isRunningCheck ? 'sync' : 'play_circle'}
              </span>
              <span>{isRunningCheck ? 'Scanning 12.4k Rows...' : 'Run Data Check'}</span>
            </button>
          </div>
        </div>

        {/* Live Validation Alert Notification */}
        {checkFinished && (
          <div className="mt-4 p-3 bg-surface-container-high/60 border border-outline-variant text-primary rounded-md text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 font-medium">
              <span className="material-symbols-outlined text-base text-primary">
                verified
              </span>
              <span>
                Automated validation scan complete! 12,418 records analyzed across 6 active rules.
              </span>
            </div>
            <span className="text-[11px] font-semibold underline cursor-pointer" onClick={() => onNavigate('review-corrections')}>
              Inspect 14 Suggestions
            </span>
          </div>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-8 mt-8 border-b border-surface-container">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
              activeTab === 'overview'
                ? 'text-primary'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>

          <button
            onClick={() => onNavigate('dataset-preview')}
            className="pb-3 text-sm font-semibold text-outline hover:text-on-surface transition-all cursor-pointer"
          >
            Preview Table
          </button>

          <button
            onClick={() => onNavigate('quality-rules')}
            className="pb-3 text-sm font-semibold text-outline hover:text-on-surface transition-all cursor-pointer"
          >
            Quality Rules (6)
          </button>

          <button
            onClick={() => onNavigate('approval-center')}
            className="pb-3 text-sm font-semibold text-outline hover:text-on-surface transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Pending Approvals</span>
            <span className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              1
            </span>
          </button>
        </div>
      </div>

      {/* Quality Highlights (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                {m.name}
              </span>
              <span
                className={`p-2 rounded-md ${
                  m.status === 'warning'
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-primary-fixed text-on-primary-fixed'
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {m.icon}
                </span>
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span
                className={`font-editorial text-4xl font-extrabold ${
                  m.status === 'warning' ? 'text-secondary' : 'text-primary'
                }`}
              >
                {m.percentage}%
              </span>
              <span className="text-xs text-outline">of 12,418 rows</span>
            </div>

            <p className="text-xs text-outline mt-3 font-sans">{m.details}</p>
          </div>
        ))}
      </div>

      {/* 2-Column: Important Issues + Data Distribution & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Important Issues & Data Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Important Issues */}
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-on-surface">
                  Important Issues & Anomalies
                </h3>
                <p className="text-xs text-outline">
                  Rules that flagged non-compliant values during recent evaluation
                </p>
              </div>
              <button
                onClick={() => onNavigate('review-corrections')}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Review All &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {DATASET_ISSUES.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 bg-surface-container-low rounded-md border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`material-symbols-outlined text-xl mt-0.5 ${
                        issue.severity === 'high'
                          ? 'text-on-error-container'
                          : issue.severity === 'medium'
                          ? 'text-secondary'
                          : 'text-tertiary'
                      }`}
                    >
                      {issue.icon}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-0.5 font-sans">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-xs font-bold text-on-error-container bg-error-container px-2 py-1 rounded border border-on-error-container/20">
                      {issue.affectedCount} rows
                    </span>
                    <button
                      onClick={() => onNavigate('review-corrections')}
                      className="px-3 py-1.5 bg-white hover:bg-primary text-primary hover:text-white border border-outline-variant rounded text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                      Fix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional & Channel Distribution */}
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">
              Geographic Distribution of Records
            </h3>
            <p className="text-xs text-outline mb-5">
              Breakdown of customer segments across global operational hubs
            </p>

            <div className="space-y-3.5">
              {[
                { region: 'North America (US/CA)', pct: 54, count: '6,705', color: 'bg-primary' },
                { region: 'EMEA (UK/EU/IE)', pct: 28, count: '3,477', color: 'bg-primary-container' },
                { region: 'APAC (AU/SG/JP)', pct: 13, count: '1,614', color: 'bg-tertiary' },
                { region: 'LATAM (BR/MX)', pct: 5, count: '622', color: 'bg-secondary' },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-on-surface">{item.region}</span>
                    <span className="text-outline">
                      <strong className="text-on-surface">{item.count}</strong> ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Activity & Schema Summary */}
        <div className="space-y-6">
          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
            <h3 className="font-editorial text-xl font-bold text-on-surface mb-4">
              Recent Activity
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
              {RECENT_ACTIVITIES.map((act) => (
                <div key={act.id} className="relative">
                  <span
                    className={`absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      act.type === 'system'
                        ? 'bg-primary'
                        : act.type === 'approval'
                        ? 'bg-secondary'
                        : 'bg-tertiary'
                    }`}
                  />
                  <p className="text-xs font-semibold text-on-surface leading-snug">
                    {act.title}
                  </p>
                  <p className="text-[11px] text-outline mt-0.5">
                    {act.timestamp} • {act.author}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-surface-container-low rounded-lg p-6 border border-outline-variant">
            <h4 className="font-editorial font-bold text-base text-on-surface mb-2">
              Next Recommended Action
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4 font-sans">
              Clean 14 email records with double "@" syntax using AI Standardizer, then commit changes to PostgreSQL.
            </p>
            <button
              onClick={() => onNavigate('review-corrections')}
              className="w-full py-2.5 bg-primary hover:bg-primary-container text-white rounded-md text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer"
            >
              Start AI Cleaning (14 records)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
