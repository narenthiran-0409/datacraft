import React, { useState } from 'react';
import { Issue, NavScreen, ReviewRun } from '../../types';
import { AITraceResponse } from '../../api/client';

interface ReviewCorrectionsViewProps {
  onNavigate: (screen: NavScreen) => void;
  reviewRuns: ReviewRun[];
  selectedReviewId: string | null;
  onSelectReview: (reviewId: string) => void;
  issues: Issue[];
  canEdit: boolean;
  actionError: string | null;
  pendingIssueIds: string[];
  onGenerateSuggestions: (reviewRunId: string) => void;
  isGeneratingSuggestions: boolean;
  // Real AI-backed suggestions (app.modules.ai.suggestion_service.
  // AISuggestionService.generate_corrections) — comprehensive across every
  // rule type, filling in whatever onGenerateSuggestions' deterministic
  // pass couldn't resolve (no generator for the rule type, or it declined
  // for lack of evidence). Previously only reachable from the separate AI
  // Insights screen; wired directly here so it's discoverable from Review
  // & Corrections itself.
  canUseAISuggestions: boolean;
  onGenerateAISuggestions: (reviewRunId: string) => void;
  isGeneratingAISuggestions: boolean;
  aiSuggestionsError: string | null;
  onAcceptIssue: (issueId: string) => void;
  onEditIssue: (issueId: string, finalValue: string) => void;
  onRejectIssue: (issueId: string) => void;
  onSkipIssue: (issueId: string) => void;
  onBulkAccept: (issueIds: string[]) => void;
  onBulkReject: (issueIds: string[]) => void;
  onSubmitForApproval: (reviewRunId: string) => void;
  // Phase 4.10 — AI Details (AI Trace), lazy-loaded per suggestion id only
  // when a user opens that section for a given issue.
  aiTraceBySuggestionId: Map<string, AITraceResponse>;
  aiTraceLoadingIds: Set<string>;
  aiTraceErrorBySuggestionId: Map<string, string>;
  onLoadAiTrace: (suggestionId: string) => void;
}

const SEVERITY_STYLES: Record<Issue['severity'], string> = {
  CRITICAL: 'bg-error-container text-on-error-container border-on-error-container/20',
  HIGH: 'bg-error-container text-on-error-container border-on-error-container/20',
  MEDIUM: 'bg-secondary-fixed text-on-secondary-fixed border-secondary/20',
  LOW: 'bg-surface-container text-on-surface-variant border-outline-variant',
};

type SuggestionCategory = NonNullable<Issue['suggestionCategory']>;

// Data-Steward-friendly labels — see Phase 4.10 spec's CATEGORY DISPLAY
// section. AI_HIGH_CONFIDENCE deliberately never implies auto-accepted;
// human action is still required regardless of this label.
const CATEGORY_LABEL: Record<SuggestionCategory, string> = {
  DETERMINISTIC: 'Deterministic',
  AI_HIGH_CONFIDENCE: 'AI-assisted · High confidence',
  NEEDS_REVIEW: 'Needs review',
  CANNOT_INFER: 'No reliable suggestion',
};

const CATEGORY_STYLES: Record<SuggestionCategory, string> = {
  DETERMINISTIC: 'bg-secondary-fixed text-on-secondary-fixed',
  AI_HIGH_CONFIDENCE: 'bg-tertiary-fixed text-on-tertiary-fixed',
  NEEDS_REVIEW: 'bg-error-container text-on-error-container',
  CANNOT_INFER: 'bg-error-container text-on-error-container',
};

const STATUS_LABEL: Record<ReviewRun['status'], string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  READY_FOR_APPROVAL: 'Ready for Approval',
  ARCHIVED: 'Archived',
};

const STATUS_STYLES: Record<ReviewRun['status'], string> = {
  DRAFT: 'bg-surface-container text-on-surface-variant',
  IN_REVIEW: 'bg-secondary-fixed text-on-secondary-fixed',
  READY_FOR_APPROVAL: 'bg-primary-fixed text-on-primary-fixed',
  ARCHIVED: 'bg-surface-container text-outline',
};

// Method labels — the strategy that produced a suggested value (Phase 4.10
// spec's "String Template" / "Sequence Gap" / etc mapping). Keyed on the
// UPPERCASE strategy constant so both the SEQUENCE/TEMPLATE/TEMPORAL
// modules' UPPER_SNAKE_CASE names and the older relationship-evidence
// module's lower_snake_case names (app/modules/ai/evidence.py) resolve
// through the same table.
const STRATEGY_LABELS: Record<string, string> = {
  STRING_TEMPLATE: 'String Template',
  SEQUENCE_GAP: 'Sequence Gap',
  SEQUENCE_NEXT_VALUE: 'Sequence Prediction',
  TEMPORAL_GAP: 'Date Pattern',
  TEMPORAL_NEXT_VALUE: 'Date Prediction',
  RATIO_CONSISTENCY: 'Numeric Relationship',
  PRODUCT_CONSISTENCY: 'Numeric Relationship',
  SUM_CONSISTENCY: 'Numeric Relationship',
  DIFFERENCE_CONSISTENCY: 'Numeric Relationship',
  CONSTANT_WITHIN_GROUP: 'Numeric Relationship',
};

/** Never shows the raw enum — falls back to a humanized version of whatever comes in. */
function strategyLabel(strategy: string): string {
  const known = STRATEGY_LABELS[strategy.toUpperCase()];
  if (known) return known;
  return strategy
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Live-acceptance fix: a strategy enum can leak into the AI's own free-text
// reasoning (e.g. "The STRING_TEMPLATE strategy identified..."). The stored
// backend reasoning is never touched — this only humanizes known strategy
// tokens for display, the same table strategyLabel() already uses.
const STRATEGY_TOKEN_PATTERN = new RegExp(`\\b(${Object.keys(STRATEGY_LABELS).join('|')})\\b`, 'g');

function humanizeReasoning(reasoning: string): string {
  return reasoning.replace(STRATEGY_TOKEN_PATTERN, (token) => strategyLabel(token));
}

const RULE_TYPE_LABELS: Record<string, string> = {
  COMPLETENESS: 'Completeness Rule',
  RANGE: 'Range Rule',
  PATTERN: 'Pattern Rule',
  CROSS_COLUMN: 'Cross-Column Rule',
  UNIQUENESS: 'Uniqueness Rule',
  DUPLICATE: 'Duplicate Rule',
};

// Live-acceptance fix: pattern/AI-detected rules are auto-named
// "{column}: {RULE_TYPE} ({category}) [{hex6}]" (app/modules/rules/
// detection_service.py's create_rule_from_detection) — the trailing
// bracketed id disambiguates same-shaped auto-generated names in the
// backend's own data and must stay there; it just shouldn't be the
// headline of a Data Steward's card. Any hand-authored rule name (no
// bracket suffix, doesn't match the auto-generated shape) passes through
// unchanged.
function displayRuleTitle(ruleName: string): string {
  const withoutId = ruleName.replace(/\s*\[[0-9a-f]{4,}\]\s*$/i, '');
  const autoGenerated = withoutId.match(/^(.+?):\s*([A-Z_]+)\s*\([^)]*\)$/);
  if (!autoGenerated) return withoutId;
  const [, column, ruleType] = autoGenerated;
  const typeLabel = RULE_TYPE_LABELS[ruleType] ?? strategyLabel(ruleType) + ' Rule';
  return `${capitalizeWord(column.trim())} · ${typeLabel}`;
}

/** Purely a display tier for the raw confidence number — never overrides
 * or contradicts the backend's own DETERMINISTIC/AI_HIGH_CONFIDENCE/
 * NEEDS_REVIEW/CANNOT_INFER safety category shown alongside it. */
function confidenceTier(confidence: number): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.85) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

function capitalizeWord(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatLatency(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

export const ReviewCorrectionsView: React.FC<ReviewCorrectionsViewProps> = ({
  onNavigate,
  reviewRuns,
  selectedReviewId,
  onSelectReview,
  issues,
  canEdit,
  actionError,
  pendingIssueIds,
  onGenerateSuggestions,
  isGeneratingSuggestions,
  canUseAISuggestions,
  onGenerateAISuggestions,
  isGeneratingAISuggestions,
  aiSuggestionsError,
  onAcceptIssue,
  onEditIssue,
  onRejectIssue,
  onSkipIssue,
  onBulkAccept,
  onBulkReject,
  onSubmitForApproval,
  aiTraceBySuggestionId,
  aiTraceLoadingIds,
  aiTraceErrorBySuggestionId,
  onLoadAiTrace,
}) => {
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  // Progressive disclosure (Phase 4.10): both start collapsed per issue —
  // Evidence is already-loaded local data (no fetch), AI Details triggers
  // onLoadAiTrace the first time it's opened for a given suggestion.
  const [expandedEvidenceIds, setExpandedEvidenceIds] = useState<Set<string>>(new Set());
  const [expandedAiDetailsIds, setExpandedAiDetailsIds] = useState<Set<string>>(new Set());

  const toggleEvidence = (issueId: string) => {
    setExpandedEvidenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  };

  const toggleAiDetails = (issue: Issue) => {
    setExpandedAiDetailsIds((prev) => {
      const next = new Set(prev);
      if (next.has(issue.id)) {
        next.delete(issue.id);
      } else {
        next.add(issue.id);
        if (issue.suggestionId) onLoadAiTrace(issue.suggestionId);
      }
      return next;
    });
  };

  const selectedRun = reviewRuns.find((r) => r.id === selectedReviewId) ?? reviewRuns[0];
  const runIssues = issues.filter((i) => i.reviewRunId === selectedRun?.id);
  const pendingIssues = runIssues.filter((i) => i.status === 'PENDING');
  const isEditableRun =
    canEdit && (selectedRun?.status === 'IN_REVIEW' || selectedRun?.status === 'DRAFT');
  const canSubmit = isEditableRun && runIssues.length > 0 && pendingIssues.length === 0;
  const isIssuePending = (issueId: string) => pendingIssueIds.includes(issueId);

  const toggleSelected = (issueId: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(issueId) ? prev.filter((id) => id !== issueId) : [...prev, issueId]
    );
  };

  const toggleSelectAllPending = () => {
    const pendingIds = pendingIssues.map((i) => i.id);
    const allSelected = pendingIds.every((id) => selectedIssueIds.includes(id));
    setSelectedIssueIds(allSelected ? [] : pendingIds);
  };

  const handleStartEdit = (issue: Issue) => {
    setEditingIssueId(issue.id);
    setEditValue(issue.suggestedValue ?? issue.originalValue);
  };

  const handleConfirmEdit = (issueId: string) => {
    if (!editValue.trim()) return;
    onEditIssue(issueId, editValue.trim());
    setEditingIssueId(null);
    setEditValue('');
  };

  const handleBulkAccept = () => {
    onBulkAccept(selectedIssueIds);
    setSelectedIssueIds([]);
  };

  const handleBulkReject = () => {
    onBulkReject(selectedIssueIds);
    setSelectedIssueIds([]);
  };

  if (!selectedRun) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <p className="text-sm text-on-surface-variant">No review runs available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight">
            Review &amp; Corrections
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 font-sans">
            Decide accept, edit, reject, or skip for each AI-assisted and rule-based suggestion
            before submitting a run for approval.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-surface-container-low rounded-md border border-outline-variant p-3.5 flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-base text-outline">lock</span>
          You have read-only access to reviews — deciding issues requires the review.edit permission.
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Review Run Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {reviewRuns.map((run) => {
          const runResolved = issues.filter((i) => i.reviewRunId === run.id && i.status !== 'PENDING').length;
          const runTotal = issues.filter((i) => i.reviewRunId === run.id).length;
          const isSelected = run.id === selectedRun.id;
          return (
            <button
              key={run.id}
              onClick={() => {
                onSelectReview(run.id);
                setSelectedIssueIds([]);
                setEditingIssueId(null);
              }}
              className={`text-left p-4 rounded-md border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-white border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-on-primary' : STATUS_STYLES[run.status]
                  }`}
                >
                  {STATUS_LABEL[run.status]}
                </span>
              </div>
              <p className="text-sm font-bold leading-snug">{run.name}</p>
              <p className={`text-xs mt-1 ${isSelected ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                {run.datasetName} &bull; {runResolved}/{runTotal} decided
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Run Summary */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_STYLES[selectedRun.status]}`}>
              {STATUS_LABEL[selectedRun.status]}
            </span>
            <span className="text-xs text-outline font-mono">{selectedRun.validationRunLabel}</span>
          </div>
          <h2 className="font-editorial text-xl font-bold text-on-surface">{selectedRun.name}</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            {selectedRun.datasetName} &bull; Created {selectedRun.createdAt}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-editorial font-extrabold text-primary">
              {runIssues.filter((i) => i.status !== 'PENDING').length}
              <span className="text-outline text-base font-sans font-medium">/{runIssues.length}</span>
            </p>
            <p className="text-[11px] text-outline uppercase tracking-wider font-semibold">Decided</p>
          </div>
          <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden hidden sm:block">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${runIssues.length ? (runIssues.filter((i) => i.status !== 'PENDING').length / runIssues.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {isEditableRun ? (
        <>
          <div className="flex flex-col items-end gap-2">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onGenerateSuggestions(selectedRun.id)}
                disabled={isGeneratingSuggestions}
                title="Fast, deterministic fixes only (whitespace trim, range clamp, mode/median fill)"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border border-outline-variant text-primary hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base ${isGeneratingSuggestions ? 'animate-spin' : ''}`}>
                  {isGeneratingSuggestions ? 'sync' : 'rule'}
                </span>
                {isGeneratingSuggestions ? 'Generating…' : 'Generate Suggestions'}
              </button>
              {canUseAISuggestions && (
                <button
                  type="button"
                  onClick={() => onGenerateAISuggestions(selectedRun.id)}
                  disabled={isGeneratingAISuggestions}
                  title="Covers every remaining issue the deterministic pass couldn't resolve — never invents a value; may propose 'needs review' instead"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-tertiary-fixed text-on-tertiary-fixed hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-base ${isGeneratingAISuggestions ? 'animate-spin' : ''}`}>
                    {isGeneratingAISuggestions ? 'sync' : 'auto_awesome'}
                  </span>
                  {isGeneratingAISuggestions ? 'Asking AI…' : 'Generate AI Suggestions'}
                </button>
              )}
            </div>
            {aiSuggestionsError && (
              <p className="text-xs text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {aiSuggestionsError}
              </p>
            )}
          </div>

          {/* Bulk Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low rounded-md border border-outline-variant p-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary w-4 h-4"
                checked={pendingIssues.length > 0 && pendingIssues.every((i) => selectedIssueIds.includes(i.id))}
                onChange={toggleSelectAllPending}
                disabled={pendingIssues.length === 0}
              />
              {selectedIssueIds.length > 0
                ? `${selectedIssueIds.length} issue${selectedIssueIds.length > 1 ? 's' : ''} selected`
                : 'Select all pending issues'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkReject}
                disabled={selectedIssueIds.length === 0 || selectedIssueIds.some(isIssuePending)}
                className="px-3.5 py-2 rounded-md text-xs font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Bulk Reject
              </button>
              <button
                type="button"
                onClick={handleBulkAccept}
                disabled={selectedIssueIds.length === 0 || selectedIssueIds.some(isIssuePending)}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Bulk Accept
              </button>
            </div>
          </div>

          {/* Issue List */}
          <div className="space-y-4">
            {runIssues.map((issue) => {
              const isPending = issue.status === 'PENDING';
              const isEditing = editingIssueId === issue.id;
              const hasSuggestedValue = !!issue.suggestedValue;
              const noCandidateFound = !hasSuggestedValue && !!issue.suggestionCategory;
              const methodLabel = issue.suggestionStrategy
                ? strategyLabel(issue.suggestionStrategy)
                : issue.suggestionSource === 'RULE_BASED'
                  ? 'Rule-based'
                  : issue.suggestionSource === 'AI'
                    ? 'AI-assisted'
                    : null;
              const evidence = issue.suggestionEvidence?.available ? issue.suggestionEvidence : null;
              const hasEvidenceCounts =
                !!evidence && evidence.supporting_count != null && evidence.contradicting_count != null;
              // strategies_attempted is category-level (e.g. "TEMPLATE", "SEQUENCE",
              // "RELATIONSHIP", "TEMPORAL" — app/modules/ai/candidates.py's
              // AggregationResult), never the same granularity as recommended_strategy
              // (a specific strategy like "STRING_TEMPLATE") — the two can never be
              // string-equal, so only show this when more than one category was
              // genuinely attempted, rather than excluding by a comparison that would
              // never match and would otherwise always claim "also checked" the very
              // category that produced the recommendation.
              const otherStrategiesAttempted =
                (evidence?.strategies_attempted?.length ?? 0) > 1 ? evidence?.strategies_attempted ?? [] : [];
              const isEvidenceExpanded = expandedEvidenceIds.has(issue.id);
              const isAiDetailsExpanded = expandedAiDetailsIds.has(issue.id);
              const trace = issue.suggestionId ? aiTraceBySuggestionId.get(issue.suggestionId) : undefined;
              const traceLoading = !!issue.suggestionId && aiTraceLoadingIds.has(issue.suggestionId);
              const traceError = issue.suggestionId ? aiTraceErrorBySuggestionId.get(issue.suggestionId) : undefined;
              const latestUsage = trace && trace.usage.length > 0 ? trace.usage[trace.usage.length - 1] : null;

              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col md:flex-row items-start justify-between gap-6"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    {/* Record identity + severity + category */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPending && (
                        <input
                          type="checkbox"
                          className="accent-primary w-4 h-4 mr-1"
                          checked={selectedIssueIds.includes(issue.id)}
                          onChange={() => toggleSelected(issue.id)}
                          aria-label={`Select issue ${issue.recordRef}`}
                        />
                      )}
                      <span className="text-[11px] font-mono text-outline bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant">
                        {issue.recordRef}
                      </span>
                      <span className="text-[11px] font-mono text-on-surface-variant">
                        {issue.columnName}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${SEVERITY_STYLES[issue.severity]}`}
                      >
                        {issue.severity}
                      </span>
                      {issue.suggestionCategory ? (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${CATEGORY_STYLES[issue.suggestionCategory]}`}
                          title={
                            issue.suggestionCategory === 'AI_HIGH_CONFIDENCE'
                              ? 'A strong AI-assisted candidate — still requires your accept/edit/reject decision'
                              : issue.suggestionCategory === 'NEEDS_REVIEW'
                                ? 'AI found partial signal but declined to guess a value — use Edit to enter one manually'
                                : issue.suggestionCategory === 'CANNOT_INFER'
                                  ? 'No reliable signal was found (or the AI call failed) — use Edit to enter a value manually'
                                  : undefined
                          }
                        >
                          {CATEGORY_LABEL[issue.suggestionCategory]}
                        </span>
                      ) : (
                        <>
                          {issue.suggestionSource === 'AI' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed">
                              AI
                            </span>
                          )}
                          {issue.suggestionSource === 'RULE_BASED' && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                              Rule
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* 1. Issue */}
                    <p className="text-sm font-bold text-on-surface leading-snug">{displayRuleTitle(issue.ruleTriggered)}</p>

                    {/* 2. Original vs Suggested */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
                          aria-label="Final value"
                          className="flex-1 min-w-[180px] bg-surface-container-low border border-outline-variant rounded-md px-3 py-1.5 text-xs font-mono text-on-surface focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmEdit(issue.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIssueId(null)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                        <span className="bg-error-container text-on-error-container px-2.5 py-1 rounded line-through border border-on-error-container/30 break-all">
                          {issue.originalValue || '(empty)'}
                        </span>
                        <span className="material-symbols-outlined text-sm text-outline shrink-0">
                          arrow_forward
                        </span>
                        {hasSuggestedValue ? (
                          <span className="bg-surface-container-high text-primary px-2.5 py-1 rounded font-bold border border-outline-variant break-all">
                            {issue.suggestedValue}
                          </span>
                        ) : (
                          <span className="text-outline italic font-sans text-[11px]">
                            {noCandidateFound ? 'No reliable correction found' : 'No suggestion generated yet'}
                          </span>
                        )}
                        {issue.status !== 'PENDING' && issue.finalValue && (
                          <span className="text-[11px] font-sans text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            Final: <strong className="text-on-surface">{issue.finalValue}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {/* 3. Confidence / Method */}
                    {!isEditing && hasSuggestedValue && (issue.confidence !== null || methodLabel) && (
                      <div className="flex items-center gap-4 text-[11px] font-sans flex-wrap">
                        {issue.confidence !== null && (
                          <span className="text-on-surface-variant">
                            <span className="text-outline uppercase tracking-wider font-semibold mr-1">Confidence</span>
                            <span className="font-semibold text-primary">
                              {confidenceTier(issue.confidence)} ·{' '}
                              {/* BUG FIX (found via live E2E testing): the backend stores confidence as a
                                  0-1 fraction (e.g. 0.85 — see range_clamp.py), but this appended "%"
                                  straight to that raw value, showing "0.85% confidence" instead of "85%". */}
                              {Math.round(issue.confidence * 100)}%
                            </span>
                          </span>
                        )}
                        {methodLabel && (
                          <span className="text-on-surface-variant">
                            <span className="text-outline uppercase tracking-wider font-semibold mr-1">Method</span>
                            <span className="font-semibold">{methodLabel}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* 4. Reason */}
                    {!isEditing && issue.suggestionReasoning && (
                      <p className="text-[11px] text-on-surface-variant italic max-w-xl">
                        {humanizeReasoning(issue.suggestionReasoning)}
                      </p>
                    )}

                    {/* 6. Evidence — progressive disclosure, never raw JSON */}
                    {!isEditing && evidence && (
                      <div className="pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasEvidenceCounts && (
                            <span className="text-[11px] text-on-surface-variant">
                              {evidence.supporting_count} supporting record{evidence.supporting_count === 1 ? '' : 's'} ·{' '}
                              {evidence.contradicting_count} contradiction{evidence.contradicting_count === 1 ? '' : 's'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleEvidence(issue.id)}
                            className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            {isEvidenceExpanded ? 'Hide Evidence' : 'View Evidence'}
                          </button>
                        </div>
                        {isEvidenceExpanded && (
                          <div className="mt-2 bg-surface-container-low border border-outline-variant rounded-md p-3 space-y-1 text-[11px] text-on-surface-variant max-w-xl">
                            {otherStrategiesAttempted.length > 0 && (
                              <p>
                                <span className="font-semibold text-on-surface">Strategies checked:</span>{' '}
                                {otherStrategiesAttempted.map((s) => strategyLabel(s)).join(', ')}
                              </p>
                            )}
                            {evidence.ambiguous && (
                              <p className="flex items-center gap-1.5 text-secondary font-semibold">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Multiple strategies disagreed on a value — none was chosen automatically.
                              </p>
                            )}
                            {evidence.reason && <p>{evidence.reason}</p>}
                            {!hasEvidenceCounts && !otherStrategiesAttempted.length && !evidence.ambiguous && !evidence.reason && (
                              <p className="italic">No further evidence detail available.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. AI Details — secondary technical detail, lazy-loaded */}
                    {!isEditing && issue.suggestionId && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleAiDetails(issue)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isAiDetailsExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                          AI Details
                        </button>
                        {isAiDetailsExpanded && (
                          <div className="mt-2 bg-surface-container-low border border-outline-variant rounded-md p-3 text-[11px] max-w-xl">
                            {traceLoading ? (
                              <div className="space-y-1.5">
                                <div className="h-3 w-24 bg-surface-container rounded animate-pulse" />
                                <div className="h-3 w-40 bg-surface-container rounded animate-pulse" />
                              </div>
                            ) : traceError ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-error flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">error</span>
                                  {traceError}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => issue.suggestionId && onLoadAiTrace(issue.suggestionId)}
                                  className="text-primary font-semibold hover:underline cursor-pointer shrink-0"
                                >
                                  Retry
                                </button>
                              </div>
                            ) : !trace ? (
                              <p className="text-outline italic">No trace data yet.</p>
                            ) : !trace.is_llm_backed ? (
                              <div className="space-y-1 text-on-surface-variant">
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Generation</span>
                                  Deterministic
                                </p>
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">AI Used</span>
                                  No
                                </p>
                              </div>
                            ) : !latestUsage ? (
                              <div className="space-y-1 text-on-surface-variant">
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Generation</span>
                                  AI-assisted
                                </p>
                                <p className="italic text-outline">Trace details are unavailable for this suggestion.</p>
                              </div>
                            ) : latestUsage.status === 'FAILED' ? (
                              <div className="space-y-1 text-on-surface-variant">
                                <p className="text-error font-semibold flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">error</span>
                                  AI attempt failed
                                </p>
                                {trace.provider && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Provider</span>
                                    {capitalizeWord(trace.provider)}
                                  </p>
                                )}
                                {trace.model && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Model</span>
                                    {trace.model}
                                  </p>
                                )}
                                {trace.prompt && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Prompt Version</span>
                                    {trace.prompt.key} v{trace.prompt.version_number}
                                  </p>
                                )}
                                {latestUsage.latency_ms != null && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Latency</span>
                                    {formatLatency(latestUsage.latency_ms)}
                                  </p>
                                )}
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Generated</span>
                                  {latestUsage.created_at}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1 text-on-surface-variant">
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Generation</span>
                                  AI-assisted
                                </p>
                                {trace.provider && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Provider</span>
                                    {capitalizeWord(trace.provider)}
                                  </p>
                                )}
                                {trace.model && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Model</span>
                                    {trace.model}
                                  </p>
                                )}
                                {trace.prompt && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Prompt Version</span>
                                    {trace.prompt.key} v{trace.prompt.version_number}
                                  </p>
                                )}
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Status</span>
                                  Success
                                </p>
                                {latestUsage.input_tokens != null && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Input Tokens</span>
                                    {latestUsage.input_tokens.toLocaleString()}
                                  </p>
                                )}
                                {latestUsage.output_tokens != null && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Output Tokens</span>
                                    {latestUsage.output_tokens.toLocaleString()}
                                  </p>
                                )}
                                {latestUsage.total_tokens != null && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Total Tokens</span>
                                    {latestUsage.total_tokens.toLocaleString()}
                                  </p>
                                )}
                                {latestUsage.latency_ms != null && (
                                  <p>
                                    <span className="text-outline uppercase tracking-wider font-semibold mr-1">Latency</span>
                                    {formatLatency(latestUsage.latency_ms)}
                                  </p>
                                )}
                                <p>
                                  <span className="text-outline uppercase tracking-wider font-semibold mr-1">Generated</span>
                                  {latestUsage.created_at}
                                </p>
                              </div>
                            )}
                            {trace && (trace.ai_suggestion_id || trace.correction_suggestion_id) && (
                              <details className="mt-2 pt-2 border-t border-outline-variant">
                                <summary className="text-outline cursor-pointer select-none">Technical IDs</summary>
                                <p className="mt-1 font-mono text-outline break-all">
                                  Suggestion: {trace.correction_suggestion_id}
                                  {trace.ai_suggestion_id && (
                                    <>
                                      <br />
                                      AI call: {trace.ai_suggestion_id}
                                    </>
                                  )}
                                </p>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {issue.status === 'RESOLVED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-primary-fixed bg-primary-fixed px-3 py-1.5 rounded-md">
                        <span className="material-symbols-outlined text-base">check</span>
                        Resolved
                      </span>
                    ) : issue.status === 'SKIPPED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-md">
                        <span className="material-symbols-outlined text-base">redo</span>
                        Skipped
                      </span>
                    ) : !isEditing ? (
                      <>
                        <button
                          onClick={() => onSkipIssue(issue.id)}
                          disabled={isIssuePending(issue.id)}
                          className="px-3 py-2 rounded-md text-xs font-semibold border border-outline-variant hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => onRejectIssue(issue.id)}
                          disabled={isIssuePending(issue.id) || (!issue.suggestionId && !issue.suggestedValue)}
                          title={!issue.suggestionId && !issue.suggestedValue ? 'No suggestion to reject for this issue' : undefined}
                          className="px-3 py-2 rounded-md text-xs font-semibold border border-outline-variant hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleStartEdit(issue)}
                          disabled={isIssuePending(issue.id)}
                          className="px-3 py-2 rounded-md text-xs font-semibold border border-outline-variant hover:bg-surface-container-low text-on-surface-variant transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onAcceptIssue(issue.id)}
                          disabled={!issue.suggestedValue || isIssuePending(issue.id)}
                          className="px-4 py-2 rounded-md text-xs font-semibold bg-primary hover:bg-primary-container text-on-primary transition-colors cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Accept
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit for Approval */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-editorial font-bold text-lg text-on-surface">Submit for Approval</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-lg">
                {canSubmit
                  ? 'Every issue in this run has been decided. Submitting will move it to the Approval Center for sign-off.'
                  : `${pendingIssues.length} issue${pendingIssues.length === 1 ? '' : 's'} still ${pendingIssues.length === 1 ? 'needs' : 'need'} a decision (accept, edit, reject, or skip) before this run can be submitted.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSubmitForApproval(selectedRun.id)}
              disabled={!canSubmit}
              title={!canSubmit ? 'Resolve or skip every issue before submitting' : undefined}
              className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Submit for Approval
            </button>
          </div>
        </>
      ) : (
        <div className="bg-surface-container-low rounded-lg border border-outline-variant p-6 flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">info</span>
          <div>
            <p className="text-sm font-bold text-on-surface">
              This run is {STATUS_LABEL[selectedRun.status].toLowerCase()} and is read-only here.
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {selectedRun.status === 'READY_FOR_APPROVAL'
                ? 'It has been submitted and is now awaiting sign-off in the Approval Center.'
                : 'Decided issues from this run are kept for reference.'}
            </p>
            {selectedRun.status === 'READY_FOR_APPROVAL' && (
              <button
                onClick={() => onNavigate('approval-center')}
                className="mt-3 text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Go to Approval Center &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
