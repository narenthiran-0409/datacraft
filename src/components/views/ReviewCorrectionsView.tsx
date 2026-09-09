import React, { useState } from 'react';
import { Issue, NavScreen, ReviewRun } from '../../types';

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
  onAcceptIssue: (issueId: string) => void;
  onEditIssue: (issueId: string, finalValue: string) => void;
  onRejectIssue: (issueId: string) => void;
  onSkipIssue: (issueId: string) => void;
  onBulkAccept: (issueIds: string[]) => void;
  onBulkReject: (issueIds: string[]) => void;
  onSubmitForApproval: (reviewRunId: string) => void;
}

const SEVERITY_STYLES: Record<Issue['severity'], string> = {
  CRITICAL: 'bg-error-container text-on-error-container border-on-error-container/20',
  HIGH: 'bg-error-container text-on-error-container border-on-error-container/20',
  MEDIUM: 'bg-secondary-fixed text-on-secondary-fixed border-secondary/20',
  LOW: 'bg-surface-container text-on-surface-variant border-outline-variant',
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
  onAcceptIssue,
  onEditIssue,
  onRejectIssue,
  onSkipIssue,
  onBulkAccept,
  onBulkReject,
  onSubmitForApproval,
}) => {
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
          <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
            <button
              onClick={() => onNavigate('dataset-overview')}
              className="hover:text-primary transition-colors cursor-pointer"
            >
              {selectedRun.datasetName}
            </button>
            <span>/</span>
            <span className="text-on-surface font-bold">Review &amp; Corrections</span>
          </div>
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onGenerateSuggestions(selectedRun.id)}
              disabled={isGeneratingSuggestions}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold border border-outline-variant text-primary hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-base ${isGeneratingSuggestions ? 'animate-spin' : ''}`}>
                {isGeneratingSuggestions ? 'sync' : 'auto_awesome'}
              </span>
              {isGeneratingSuggestions ? 'Generating…' : 'Generate Suggestions'}
            </button>
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

              return (
                <div
                  key={issue.id}
                  className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPending && (
                        <input
                          type="checkbox"
                          className="accent-primary w-4 h-4 mr-1"
                          checked={selectedIssueIds.includes(issue.id)}
                          onChange={() => toggleSelected(issue.id)}
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
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          autoFocus
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
                        <span className="bg-error-container text-on-error-container px-2.5 py-1 rounded line-through border border-on-error-container/30">
                          {issue.originalValue || '(empty)'}
                        </span>
                        <span className="material-symbols-outlined text-sm text-outline">
                          arrow_forward
                        </span>
                        {issue.suggestedValue ? (
                          <span className="bg-surface-container-high text-primary px-2.5 py-1 rounded font-bold border border-outline-variant">
                            {issue.suggestedValue}
                          </span>
                        ) : (
                          <span className="text-outline italic font-sans text-[11px]">No suggestion available</span>
                        )}
                        {issue.confidence !== null && (
                          <span className="text-[11px] font-sans text-primary font-semibold">
                            {/* BUG FIX (found via live E2E testing): the backend stores confidence as a
                                0-1 fraction (e.g. 0.85 — see range_clamp.py), but this appended "%"
                                straight to that raw value, showing "0.85% confidence" instead of "85%". */}
                            ({Math.round(issue.confidence * 100)}% confidence)
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

                    <p className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                      {issue.ruleTriggered}
                    </p>
                  </div>

                  {/* Action buttons */}
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
