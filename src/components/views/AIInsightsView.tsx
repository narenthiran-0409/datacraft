import React, { useState } from 'react';
import { AISuggestionItem, Issue, NavScreen, ReviewRun, ValidationRun } from '../../types';

interface AIInsightsViewProps {
  onNavigate: (screen: NavScreen) => void;
  suggestions: AISuggestionItem[];
  validationRuns: ValidationRun[];
  reviewRuns: ReviewRun[];
  issues: Issue[];
  generatingType: string | null;
  error: string | null;
  onGenerateExplanation: (issueId: string) => void;
  onGenerateRunSummary: (validationRunId: string) => void;
  onGeneratePrioritization: (reviewRunId: string) => void;
  onGenerateCluster: (reviewRunId: string) => void;
  onGenerateCorrections: (reviewRunId: string) => void;
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

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  suggestions,
  validationRuns,
  reviewRuns,
  issues,
  generatingType,
  error,
  onGenerateExplanation,
  onGenerateRunSummary,
  onGeneratePrioritization,
  onGenerateCluster,
  onGenerateCorrections,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | AISuggestionItem['suggestionType']>('ALL');
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [selectedValidationRunId, setSelectedValidationRunId] = useState('');
  const [selectedReviewRunId, setSelectedReviewRunId] = useState('');

  const filtered = suggestions
    .filter((s) => typeFilter === 'ALL' || s.suggestionType === typeFilter)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const isBusy = generatingType !== null;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-outline-variant pb-6">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1 block">
          Advisory Only — AI-Generated
        </span>
        <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
          AI Insights
        </h1>
        <p className="text-xs text-on-surface-variant mt-1 font-sans max-w-2xl">
          Explanations, run summaries, prioritization suggestions, and issue clusters generated
          on demand by the AI Orchestrator. Everything on this screen is AI-generated and purely
          informational — nothing here is applied automatically. AI-proposed corrections are not
          shown here: they route directly into Review &amp; Corrections' existing accept/edit/reject
          flow, alongside rule-based suggestions, for a human to decide on.
        </p>
      </div>

      {error && (
        <div className="bg-error-container border border-outline-variant rounded-lg p-3.5 text-xs text-on-error-container">
          {error}
        </div>
      )}

      {/* Generation Controls */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Generate AI Insight
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Explanation */}
          <div className="flex items-center gap-2">
            <select
              value={selectedIssueId}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-2 text-xs text-on-surface"
            >
              <option value="">Select an issue…</option>
              {issues.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.columnName} — {i.recordRef}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedIssueId && onGenerateExplanation(selectedIssueId)}
              disabled={isBusy || !selectedIssueId}
              className="px-3 py-2 bg-primary hover:bg-primary-container text-white rounded-md text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {generatingType === 'EXPLANATION' ? 'Generating…' : 'Explain Issue'}
            </button>
          </div>

          {/* Run Summary */}
          <div className="flex items-center gap-2">
            <select
              value={selectedValidationRunId}
              onChange={(e) => setSelectedValidationRunId(e.target.value)}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-2 text-xs text-on-surface"
            >
              <option value="">Select a validation run…</option>
              {validationRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.datasetName} — {r.startedAt}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedValidationRunId && onGenerateRunSummary(selectedValidationRunId)}
              disabled={isBusy || !selectedValidationRunId}
              className="px-3 py-2 bg-primary hover:bg-primary-container text-white rounded-md text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {generatingType === 'RUN_SUMMARY' ? 'Generating…' : 'Summarize Run'}
            </button>
          </div>

          {/* Prioritization */}
          <div className="flex items-center gap-2">
            <select
              value={selectedReviewRunId}
              onChange={(e) => setSelectedReviewRunId(e.target.value)}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-2 text-xs text-on-surface"
            >
              <option value="">Select a review…</option>
              {reviewRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedReviewRunId && onGeneratePrioritization(selectedReviewRunId)}
              disabled={isBusy || !selectedReviewRunId}
              className="px-3 py-2 bg-primary hover:bg-primary-container text-white rounded-md text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {generatingType === 'PRIORITIZATION' ? 'Generating…' : 'Prioritize Issues'}
            </button>
          </div>

          {/* Cluster */}
          <div className="flex items-center gap-2">
            <select
              value={selectedReviewRunId}
              onChange={(e) => setSelectedReviewRunId(e.target.value)}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-2 text-xs text-on-surface"
            >
              <option value="">Select a review…</option>
              {reviewRuns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedReviewRunId && onGenerateCluster(selectedReviewRunId)}
              disabled={isBusy || !selectedReviewRunId}
              className="px-3 py-2 bg-primary hover:bg-primary-container text-white rounded-md text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {generatingType === 'CLUSTER' ? 'Generating…' : 'Cluster Issues'}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-surface-container flex items-center gap-2">
          <select
            value={selectedReviewRunId}
            onChange={(e) => setSelectedReviewRunId(e.target.value)}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-2 text-xs text-on-surface"
          >
            <option value="">Select a review…</option>
            {reviewRuns.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => selectedReviewRunId && onGenerateCorrections(selectedReviewRunId)}
            disabled={isBusy || !selectedReviewRunId}
            className="px-3 py-2 bg-tertiary-fixed hover:opacity-90 text-on-tertiary-fixed rounded-md text-[11px] font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {generatingType === 'CORRECTION' ? 'Generating…' : 'Generate AI Corrections'}
          </button>
        </div>
        <p className="text-[10px] text-outline">
          AI corrections aren't shown below — they're added directly to Review &amp; Corrections
          for that review, alongside rule-based suggestions, for a human to accept, edit, or reject.
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
            No AI insights yet — generate one above.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reused "AI" badge convention from Review & Corrections */}
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                    AI-generated
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
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{s.content}</p>

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
