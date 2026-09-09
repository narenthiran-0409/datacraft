import React, { useState } from 'react';
import { AISuggestionItem, NavScreen } from '../../types';

interface AIInsightsViewProps {
  onNavigate: (screen: NavScreen) => void;
  suggestions: AISuggestionItem[];
}

const TYPE_LABEL: Record<AISuggestionItem['suggestionType'], string> = {
  EXPLANATION: 'Explanation',
  RUN_SUMMARY: 'Run Summary',
  PRIORITIZATION: 'Prioritization',
  CLUSTER: 'Cluster',
};

const TYPE_ICON: Record<AISuggestionItem['suggestionType'], string> = {
  EXPLANATION: 'lightbulb',
  RUN_SUMMARY: 'summarize',
  PRIORITIZATION: 'low_priority',
  CLUSTER: 'scatter_plot',
};

const STATUS_STYLES: Record<AISuggestionItem['status'], string> = {
  PROPOSED: 'bg-secondary-fixed text-on-secondary-fixed',
  ACCEPTED: 'bg-primary-fixed text-on-primary-fixed',
  REJECTED: 'bg-error-container text-on-error-container',
  EXPIRED: 'bg-surface-container text-outline',
};

const TYPE_FILTERS: ('ALL' | AISuggestionItem['suggestionType'])[] = [
  'ALL',
  'EXPLANATION',
  'RUN_SUMMARY',
  'PRIORITIZATION',
  'CLUSTER',
];

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({ suggestions }) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | AISuggestionItem['suggestionType']>('ALL');

  const filtered = suggestions
    .filter((s) => typeFilter === 'ALL' || s.suggestionType === typeFilter)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          Advisory Only
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          AI Insights
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          Explanations, run summaries, prioritization suggestions, and issue clusters generated
          alongside your pipelines. This screen is read-only — corrections you can act on live in
          Review &amp; Corrections.
        </p>
      </div>

      {/* Type Filter */}
      <div className="inline-flex flex-wrap bg-surface-container-low p-1 rounded-md border border-outline-variant shadow-2xs gap-1">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
              typeFilter === t ? 'bg-white text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {t === 'ALL' ? 'All' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Suggestions */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
            No AI insights match this filter.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reused "AI" badge convention from Review & Corrections */}
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                    AI
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-xs">{TYPE_ICON[s.suggestionType]}</span>
                    {TYPE_LABEL[s.suggestionType]}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <span className="text-[11px] text-outline">{s.createdAt}</span>
              </div>

              <p className="text-xs font-semibold text-on-surface-variant mb-2 font-mono">
                {s.sourceContextLabel}
              </p>
              <p className="text-sm text-on-surface leading-relaxed">{s.content}</p>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-container text-xs text-outline">
                <span className="font-mono">
                  {s.provider} / {s.model}
                </span>
                <span>
                  Confidence:{' '}
                  <strong className="text-on-surface">
                    {s.confidence !== null ? `${s.confidence}%` : '—'}
                  </strong>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
