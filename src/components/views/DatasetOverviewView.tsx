import React, { useState } from 'react';
import { NavScreen, ValidationRun, ApprovalRequestItem } from '../../types';
import {
  ColumnResponse,
  DatasetResponse,
  ValidationFailureResponse,
  RuleResponse,
  RuleVersionResponse,
  RuleAssignmentResponse,
} from '../../api/client';

interface DatasetOverviewViewProps {
  onNavigate: (screen: NavScreen) => void;
  onOpenEditSchema?: () => void;
  dataset: DatasetResponse;
  columns: ColumnResponse[];
  // Additive: derived client-side from schema.connection_id -> connection.is_active.
  // Visual only — never blocks any action on this screen.
  connectionInactive?: boolean;
  // Real data (this task) — see App.tsx's broadened validation-runs/rules/approvals
  // fetch effects, which now also populate on this screen, not just their own.
  validationRuns: ValidationRun[];
  latestFailures: ValidationFailureResponse[];
  onRunValidation: () => void;
  canTriggerValidation: boolean;
  isTriggeringValidation: boolean;
  validationActionError: string | null;
  canViewRules: boolean;
  rules: RuleResponse[];
  ruleVersionsByRuleId: Record<string, RuleVersionResponse[]>;
  ruleAssignments: RuleAssignmentResponse[]; // pre-filtered to this dataset by the caller
  // Whole-dataset rule detection + review (this task)
  canSuggestRules: boolean;
  onDetectRules: () => void;
  isDetectingRules: boolean;
  ruleDetectionError: string | null;
  ruleDetectionSummary: string | null;
  canManageRuleReview: boolean;
  onPromoteRule: (ruleId: string) => void;
  onDismissRule: (ruleId: string) => void;
  ruleReviewActionPendingId: string | null;
  ruleReviewActionError: string | null;
  canViewApprovals: boolean;
  approvals: ApprovalRequestItem[]; // pre-filtered to this dataset by the caller
}

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-primary-fixed text-on-primary-fixed',
  FAILED: 'bg-error-container text-on-error-container',
  RUNNING: 'bg-secondary-fixed text-on-secondary-fixed',
  QUEUED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-surface-container text-outline',
  CREATED: 'bg-surface-container text-outline',
};

export const DatasetOverviewView: React.FC<DatasetOverviewViewProps> = ({
  onNavigate,
  onOpenEditSchema,
  dataset,
  columns,
  connectionInactive = false,
  validationRuns,
  latestFailures,
  onRunValidation,
  canTriggerValidation,
  isTriggeringValidation,
  validationActionError,
  canViewRules,
  rules,
  ruleVersionsByRuleId,
  ruleAssignments,
  canSuggestRules,
  onDetectRules,
  isDetectingRules,
  ruleDetectionError,
  ruleDetectionSummary,
  canManageRuleReview,
  onPromoteRule,
  onDismissRule,
  ruleReviewActionPendingId,
  ruleReviewActionError,
  canViewApprovals,
  approvals,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'approvals'>('overview');

  const rowCount = dataset.row_count_estimate ?? 0;
  const columnCount = dataset.column_count ?? columns.length;
  const latestCompletedRun = validationRuns.find((r) => r.status === 'COMPLETED') ?? null;
  const hasActiveValidationRun = validationRuns.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING');

  // Resolves an assignment's rule name the same way QualityRulesView does: match
  // the assignment's rule_version_id against each rule's known set of version ids.
  const ruleNameByVersionId = new Map<string, string>();
  rules.forEach((rule) => {
    (ruleVersionsByRuleId[rule.id] ?? []).forEach((v) => ruleNameByVersionId.set(v.id, rule.name));
  });

  // PENDING_REVIEW rules detected for THIS dataset specifically — the only place
  // that association is recorded is inside each rule's current version's
  // definition, under a _detected_for key written by RuleDetectionService
  // (confirmed via source: rules carry no first-class dataset_id column, and no
  // rule_assignment is ever created for a detected-but-not-yet-promoted rule).
  const pendingReviewRules = rules
    .filter((r) => r.status === 'PENDING_REVIEW')
    .map((r) => {
      const currentVersion = (ruleVersionsByRuleId[r.id] ?? []).find((v) => v.is_current);
      const detectedFor = currentVersion?.definition?._detected_for as
        | { dataset_id?: string; column_id?: string; column_name?: string; confidence?: number | null }
        | undefined;
      return { rule: r, detectedFor };
    })
    .filter(({ detectedFor }) => detectedFor?.dataset_id === dataset.id);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Breadcrumb & Header */}
      <div className="border-b border-outline-variant pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-outline mb-2 font-sans">
          <button
            onClick={() => onNavigate('data-explorer')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            Data Explorer
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">{dataset.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0 shadow-xs">
              <span
                className="material-symbols-outlined text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                table_chart
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-editorial text-3xl md:text-4xl font-bold text-on-surface tracking-tight font-mono">
                  {dataset.name}
                </h1>
                <span className="bg-surface-container-high text-primary text-xs font-extrabold px-3 py-1 rounded-full border border-outline-variant">
                  {/* BUG FIX (Decimal-serialization sweep): last_quality_score is a
                      Decimal-as-string on the wire — Number() added, since Math.round
                      requires an actual number argument. */}
                  {dataset.last_quality_score !== null
                    ? `${Math.round(Number(dataset.last_quality_score))}% Score`
                    : 'No score yet'}
                </span>
                {!dataset.is_active && (
                  <span className="bg-surface-container text-outline text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Inactive
                  </span>
                )}
                {connectionInactive && (
                  <span
                    className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    title="This dataset's underlying connection has been deactivated. Informational only — every action on this page still works normally."
                  >
                    Connection Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-outline mt-1 flex flex-wrap items-center gap-2 font-sans">
                <span>~{rowCount.toLocaleString()} records</span>
                <span>•</span>
                <span>{columnCount} columns</span>
                <span>•</span>
                <span className="text-primary font-semibold">
                  Last discovered: {formatDateTime(dataset.discovered_at)}
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

            {/* BUG FIX (this task): used to be a fake setTimeout "scan" with a
                fabricated completion banner. Now the exact same real trigger as
                Validation Workspace's own "Run Validation" — same permission gate
                (hidden, not just disabled, matching that screen's convention),
                same in-flight guard. */}
            {!connectionInactive && canTriggerValidation && (
              <button
                onClick={onRunValidation}
                disabled={hasActiveValidationRun || isTriggeringValidation}
                title={hasActiveValidationRun ? 'A run is already queued or in progress for this dataset' : undefined}
                className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    isTriggeringValidation ? 'animate-spin' : ''
                  }`}
                >
                  {isTriggeringValidation ? 'sync' : 'play_circle'}
                </span>
                <span>{isTriggeringValidation ? 'Starting…' : 'Run Validation'}</span>
              </button>
            )}
          </div>
        </div>

        {validationActionError && !connectionInactive && (
          <div className="mt-4 p-3 bg-error-container border border-outline-variant text-on-error-container rounded-md text-xs">
            {validationActionError}
          </div>
        )}

        {/* Sub-Navigation Tabs — hidden when the connection is inactive (see the
            centered state card below instead). */}
        {!connectionInactive && (
          <div className="flex items-center gap-8 mt-8 border-b border-surface-container">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-semibold transition-all relative cursor-pointer ${
                activeTab === 'overview' ? 'text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              Overview
              {activeTab === 'overview' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>

            <button
              onClick={() => onNavigate('dataset-preview')}
              className="pb-3 text-sm font-semibold text-outline hover:text-on-surface transition-all cursor-pointer"
            >
              Preview Table
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rules' ? 'text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              <span>Quality Rules</span>
              {canViewRules && (
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {ruleAssignments.length}
                </span>
              )}
              {canViewRules && pendingReviewRules.length > 0 && (
                <span
                  className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full"
                  title="Rules awaiting review"
                >
                  {pendingReviewRules.length} pending
                </span>
              )}
              {activeTab === 'rules' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>

            <button
              onClick={() => setActiveTab('approvals')}
              className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'approvals' ? 'text-primary' : 'text-outline hover:text-on-surface'
              }`}
            >
              <span>Pending Approvals</span>
              {canViewApprovals && approvals.length > 0 && (
                <span className="bg-secondary text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {approvals.filter((a) => a.status === 'PENDING').length}
                </span>
              )}
              {activeTab === 'approvals' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>
        )}
      </div>

      {connectionInactive ? (
        <div className="flex items-center justify-center py-20">
          <div className="max-w-md w-full bg-white rounded-lg border border-outline-variant shadow-ambient p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">cable</span>
            </div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">Connection Inactive</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-2">
              The connection this dataset was discovered through has been deactivated, so
              overview metrics and previews aren't shown here. The dataset itself hasn't been
              changed — reactivate the connection from Data Sources to see this dataset's
              details again.
            </p>
            <button
              onClick={() => onNavigate('data-sources')}
              className="mt-5 px-5 py-2.5 bg-primary hover:bg-primary-container text-white rounded-md text-xs font-semibold transition-colors shadow-ambient cursor-pointer"
            >
              Go to Data Sources
            </button>
          </div>
        </div>
      ) : activeTab === 'rules' ? (
        <div className="space-y-6">
          {/* Suggest Rules — whole-dataset detection (this task). Real async
              trigger (a real LLM call for the AI-fallback half, so genuinely not
              instant); no safety logic added here — the backend structurally
              guarantees every rule this produces lands PENDING_REVIEW with no
              rule_assignment, so nothing it creates can affect a validation run
              before a human explicitly promotes it below. */}
          {canSuggestRules && !connectionInactive && (
            <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">Suggest Rules for This Dataset</h3>
                  <p className="text-xs text-outline mt-1">
                    Scans every column: a fast pattern-matching pass, falling back to one AI call for
                    whatever it isn't confident about. Every result lands below for review — nothing is
                    ever active automatically.
                  </p>
                </div>
                <button
                  onClick={onDetectRules}
                  disabled={isDetectingRules}
                  className="flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-md font-medium text-xs transition-all shadow-ambient active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <span className={`material-symbols-outlined text-lg ${isDetectingRules ? 'animate-spin' : ''}`}>
                    {isDetectingRules ? 'sync' : 'auto_awesome'}
                  </span>
                  <span>{isDetectingRules ? 'Scanning columns…' : 'Suggest Rules'}</span>
                </button>
              </div>

              {ruleDetectionError && (
                <div className="mt-4 p-3 bg-error-container border border-outline-variant text-on-error-container rounded-md text-xs">
                  {ruleDetectionError}
                </div>
              )}
              {ruleDetectionSummary && !ruleDetectionError && (
                <div className="mt-4 p-3 bg-surface-container-high/60 border border-outline-variant text-on-surface rounded-md text-xs">
                  {ruleDetectionSummary}
                </div>
              )}
            </div>
          )}

          {/* Pending Review — real PENDING_REVIEW rules for this dataset (this
              task). Origin labeled honestly and distinctly: a reviewer should be
              able to tell "a regex matched" from "an LLM proposed this". */}
          {canViewRules && pendingReviewRules.length > 0 && (
            <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
              <div className="mb-4">
                <h3 className="font-editorial text-xl font-bold text-on-surface">Pending Review</h3>
                <p className="text-xs text-outline">
                  Detected candidate rules — inert until explicitly promoted; nothing here can affect a
                  validation run on its own.
                </p>
              </div>
              <div className="space-y-2">
                {pendingReviewRules.map(({ rule, detectedFor }) => {
                  const isPending = ruleReviewActionPendingId === rule.id;
                  const isAiRecommended = rule.origin === 'AI_RECOMMENDED';
                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded-md border border-outline-variant"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-on-surface truncate">{rule.name}</p>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                              isAiRecommended
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : 'bg-surface-container-high text-primary'
                            }`}
                            title={
                              isAiRecommended
                                ? 'Proposed by the AI fallback, not a deterministic pattern match'
                                : 'Matched by deterministic column-name/value/stat heuristics, no LLM involved'
                            }
                          >
                            {isAiRecommended ? 'AI suggested' : 'Pattern detected'}
                          </span>
                        </div>
                        <p className="text-[11px] text-outline mt-0.5">
                          {rule.rule_type}
                          {detectedFor?.column_name ? ` on column "${detectedFor.column_name}"` : ''}
                          {typeof detectedFor?.confidence === 'number'
                            ? ` — ${Math.round(detectedFor.confidence * 100)}% confidence`
                            : ''}
                        </p>
                        {rule.description && (
                          <p className="text-[11px] text-on-surface-variant mt-1">{rule.description}</p>
                        )}
                      </div>
                      {canManageRuleReview && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => onDismissRule(rule.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-white hover:bg-error-container text-on-surface-variant hover:text-on-error-container border border-outline-variant rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => onPromoteRule(rule.id)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isPending ? 'Working…' : 'Promote'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {ruleReviewActionError && (
                <div className="mt-4 p-3 bg-error-container border border-outline-variant text-on-error-container rounded-md text-xs">
                  {ruleReviewActionError}
                </div>
              )}
              {!canManageRuleReview && (
                <div className="mt-4 bg-surface-container-low rounded-md border border-outline-variant p-3 flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-base text-outline">lock</span>
                  You need the rules.manage permission to promote or dismiss these.
                </div>
              )}
            </div>
          )}

          {/* Quality Rules — real assignments for this dataset. Replaces the old
              "Quality Rules (6)" nav-away link with an in-page, real, scoped list;
              "View All Rules" still goes to the full Quality Rules screen. */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-on-surface">Assigned Quality Rules</h3>
                <p className="text-xs text-outline">Rules currently evaluated against this dataset</p>
              </div>
              <button
                onClick={() => onNavigate('quality-rules')}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                View All Rules &rarr;
              </button>
            </div>
            {!canViewRules ? (
              <div className="bg-surface-container-low rounded-md border border-outline-variant p-4 flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-base text-outline">lock</span>
                You need the rules.read permission to see rules assigned to this dataset.
              </div>
            ) : ruleAssignments.length === 0 ? (
              <p className="text-xs text-outline italic py-4">No quality rules are assigned to this dataset yet.</p>
            ) : (
              <div className="space-y-2">
                {ruleAssignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded-md border border-outline-variant"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">
                        {ruleNameByVersionId.get(a.rule_version_id) ?? 'Unknown rule'}
                      </p>
                      <p className="text-[11px] text-outline mt-0.5">Scope: {a.assignment_scope}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                        a.is_enabled ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-outline'
                      }`}
                    >
                      {a.is_enabled ? 'Enabled' : 'Paused'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'approvals' ? (
        /* Pending Approvals — real approvals scoped to this dataset by name (this
           task) — ApprovalRequestResponse carries no dataset id directly, only
           resolvable via review_run -> validation_run -> dataset_id, already done
           once for the whole Approval Center list this reuses. */
        <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-editorial text-xl font-bold text-on-surface">Approvals for This Dataset</h3>
              <p className="text-xs text-outline">Review runs on this dataset awaiting a publish decision</p>
            </div>
            <button
              onClick={() => onNavigate('approval-center')}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              View All Approvals &rarr;
            </button>
          </div>
          {!canViewApprovals ? (
            <div className="bg-surface-container-low rounded-md border border-outline-variant p-4 flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-base text-outline">lock</span>
              You need the approval.read permission to see approvals for this dataset.
            </div>
          ) : approvals.length === 0 ? (
            <p className="text-xs text-outline italic py-4">No approval requests reference this dataset yet.</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3.5 bg-surface-container-low rounded-md border border-outline-variant"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{a.reviewRunName}</p>
                    <p className="text-[11px] text-outline mt-0.5">
                      {a.affectedIssueCount} issue{a.affectedIssueCount === 1 ? '' : 's'} &bull; requested by{' '}
                      {a.requestedBy}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      a.status === 'PENDING'
                        ? 'bg-secondary-fixed text-on-secondary-fixed'
                        : a.status === 'APPROVED'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Overview — real validation-run summary (this task) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {latestCompletedRun ? (
              <>
                <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">Passed Rows</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="font-editorial text-4xl font-extrabold text-primary">
                      {latestCompletedRun.totalRows > 0
                        ? Math.round((latestCompletedRun.passedRows / latestCompletedRun.totalRows) * 100)
                        : 0}
                      %
                    </span>
                    <span className="text-xs text-outline">of {latestCompletedRun.totalRows.toLocaleString()} rows</span>
                  </div>
                  <p className="text-xs text-outline mt-3 font-sans">{latestCompletedRun.passedRows.toLocaleString()} rows passed every check</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">Warning Rows</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="font-editorial text-4xl font-extrabold text-secondary">
                      {latestCompletedRun.warningRows.toLocaleString()}
                    </span>
                    <span className="text-xs text-outline">rows</span>
                  </div>
                  <p className="text-xs text-outline mt-3 font-sans">Flagged by rules but not rejected</p>
                </div>
                <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">Failed Rows</span>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className="font-editorial text-4xl font-extrabold text-on-error-container">
                      {latestCompletedRun.failedRows.toLocaleString()}
                    </span>
                    <span className="text-xs text-outline">rows</span>
                  </div>
                  <p className="text-xs text-outline mt-3 font-sans">
                    From the run completed {latestCompletedRun.completedAt}
                  </p>
                </div>
              </>
            ) : (
              <div className="md:col-span-3 bg-white rounded-lg p-6 border border-outline-variant shadow-ambient text-center text-sm text-on-surface-variant">
                No completed validation run yet for this dataset — run one above to see real quality metrics here.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Real top validation failures from the latest completed run */}
              <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-editorial text-xl font-bold text-on-surface">Important Issues &amp; Anomalies</h3>
                    <p className="text-xs text-outline">
                      {latestCompletedRun ? 'Top failures from the most recent completed run' : 'No completed run to draw issues from yet'}
                    </p>
                  </div>
                  {latestFailures.length > 0 && (
                    <button
                      onClick={() => onNavigate('review-corrections')}
                      className="text-xs font-bold text-primary hover:underline cursor-pointer"
                    >
                      Review All &rarr;
                    </button>
                  )}
                </div>

                {latestFailures.length === 0 ? (
                  <p className="text-xs text-outline italic py-4">
                    {latestCompletedRun ? 'No failures recorded in the most recent run.' : 'Run validation to see real issues here.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latestFailures.map((issue) => (
                      <div
                        key={issue.id}
                        className="p-4 bg-surface-container-low rounded-md border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className={`material-symbols-outlined text-xl mt-0.5 shrink-0 ${
                              issue.severity === 'CRITICAL' || issue.severity === 'HIGH'
                                ? 'text-on-error-container'
                                : issue.severity === 'MEDIUM'
                                ? 'text-secondary'
                                : 'text-tertiary'
                            }`}
                          >
                            warning
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-on-surface truncate">{issue.rule_name}</h4>
                            <p className="text-xs text-on-surface-variant mt-0.5 font-sans truncate">
                              {issue.column_name ? `Column: ${issue.column_name} — ` : ''}
                              {issue.reason ?? issue.rule_type}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-on-error-container bg-error-container px-2 py-1 rounded border border-on-error-container/20 shrink-0 self-end sm:self-auto">
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Real columns list — replaces the fabricated "Geographic
                  Distribution of Records" card with data this component was
                  already given but never rendered. */}
              <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">Columns</h3>
                <p className="text-xs text-outline mb-5">Schema discovered for this dataset</p>

                {columns.length === 0 ? (
                  <p className="text-xs text-outline italic">No columns discovered yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {columns.map((col) => (
                      <div
                        key={col.id}
                        className={`flex items-center gap-2.5 py-2 px-3 rounded-md text-xs ${
                          !col.is_active ? 'opacity-60' : 'bg-surface-container-low'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm text-outline">
                          {col.is_primary_key ? 'key' : 'view_column'}
                        </span>
                        <span className="font-mono font-semibold text-on-surface">{col.name}</span>
                        <span className="font-mono text-[11px] text-on-surface-variant bg-white px-1.5 py-0.5 rounded border border-outline-variant">
                          {col.normalized_data_type}
                        </span>
                        {!col.is_nullable && (
                          <span className="text-[10px] font-semibold text-outline uppercase tracking-wider">Not Null</span>
                        )}
                        {!col.is_active && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-outline ml-auto">
                            Inactive
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Real recent validation run history — replaces the fabricated
                account-activity timeline. */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-outline-variant shadow-ambient">
                <h3 className="font-editorial text-xl font-bold text-on-surface mb-4">Recent Validation Runs</h3>

                {validationRuns.length === 0 ? (
                  <p className="text-xs text-outline italic">No validation runs yet for this dataset.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container">
                    {validationRuns.slice(0, 6).map((run) => (
                      <div key={run.id} className="relative">
                        <span
                          className={`absolute -left-[23px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                            run.status === 'COMPLETED'
                              ? 'bg-primary'
                              : run.status === 'FAILED'
                              ? 'bg-error'
                              : 'bg-secondary'
                          }`}
                        />
                        <p className="text-xs font-semibold text-on-surface leading-snug">
                          Validation run{' '}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                              STATUS_STYLES[run.status] ?? 'bg-surface-container text-outline'
                            }`}
                          >
                            {run.status}
                          </span>
                        </p>
                        <p className="text-[11px] text-outline mt-0.5">{run.startedAt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
