import React, { useState } from 'react';
import { DatasetStagingStatus, NavScreen } from '../../types';
import {
  PublishRunResponse,
  StagedRuleRevalidationResponse,
  StagingDestinationResponse,
  StagingRecordResponse,
  StagingRunResponse,
} from '../../api/client';
import { DatasetWorkspaceHeader } from '../dataset-workflow/DatasetWorkspaceHeader';
import { StagingPreviewModal } from '../dataset-workflow/StagingPreviewModal';
import { StagingConfirmationModal, TableStructureColumn } from '../dataset-workflow/StagingConfirmationModal';
import { StagingProgressView } from '../dataset-workflow/StagingProgressView';
import { MaterializedPreviewModal } from '../dataset-workflow/MaterializedPreviewModal';
import { PreviewColumn, PreviewRow, RowFilter } from '../dataset-workflow/ChangePreviewTable';
import { DatasetStatusBadge } from '../dataset-workflow/DatasetStatusBadge';
import { EmptyWorkflowState } from '../dataset-workflow/EmptyWorkflowState';
import { MaterializationUiPhase, StagingDestination, isEligibleForStaging } from '../../data/datasetStagingWorkflow';

export interface ApprovedChangeRow {
  recordRef: string;
  columnName: string;
  originalValue: string;
  stagedValue: string;
}

export interface SelectedDatasetWorkspace {
  id: string;
  name: string;
  connectionName: string;
  schemaName: string;
  keyStrategy: string | null;
  sourceRowCount: number | null;
  lastValidationLabel: string | null;
  approvalStatusLabel: string | null;
  resolvedIssueCount: number;
  totalIssueCount: number;
  status: DatasetStagingStatus;
}

interface StagingPublishViewProps {
  onNavigate: (screen: NavScreen) => void;

  // The dataset this detail workspace is scoped to — resolved by the caller
  // (App.tsx) from the master list's row click, per the master/detail redesign.
  selectedDataset: SelectedDatasetWorkspace | null;
  approvedChanges: ApprovedChangeRow[];

  // Preview Staging modal content
  previewColumns: PreviewColumn[];
  previewRows: PreviewRow[];
  previewLimitationNote: string | null;

  // Create Staging Dataset confirmation — pre-create only, so `stagingDestination`
  // is always the truthful "not generated yet" placeholder (see
  // PENDING_STAGING_DESTINATION), never a fabricated physical table name.
  tableStructureColumns: TableStructureColumn[];
  stagingDestination: StagingDestination;

  // Real staging/publish state for the selected dataset's review (unchanged capability)
  stagingRun: StagingRunResponse | null;
  stagingRecords: StagingRecordResponse[];
  driftOnly: boolean;
  onToggleDriftOnly: (value: boolean) => void;
  publishRun: PublishRunResponse | null;
  canCreateStaging: boolean;
  canPublish: boolean;
  isActionPending: boolean;
  actionError: string | null;
  onCreateStagingRun: () => void;
  onPublish: () => void;
  onAcknowledgeDrift: () => void;
  revalidationByRecordId: Map<string, StagedRuleRevalidationResponse[]>;
  revalidationLoadingIds: Set<string>;
  revalidationErrorByRecordId: Map<string, string>;
  onLoadRevalidation: (stagingRecordId: string) => void;

  // Phase 4.12B — real materialization progress, driven by App.tsx's polling
  // of GET /staging-runs/{id}. `isProgressOpen` is URL-derived (the
  // ?stagingRunId= query param — see App.tsx), not local component state, so
  // a refresh mid-materialization reopens the same progress/result view for
  // the same run instead of losing it.
  materializationPhase: MaterializationUiPhase | null;
  progressPercentage: number | null;
  copiedRowCount: number | null;
  materializationSourceRowCount: number | null;
  materializedRowCount: number | null;
  materializationError: string | null;
  realDestinationLabel: string | null;
  isProgressOpen: boolean;
  onCloseProgress: () => void;
  pollError: string | null;
  onRetryPoll: () => void;

  // "View Staged Dataset" — the real materialized preview (Phase 4.12B).
  isMaterializedPreviewOpen: boolean;
  onOpenMaterializedPreview: () => void;
  onCloseMaterializedPreview: () => void;
  materializedDestination: StagingDestinationResponse | null;
  materializedDestinationLoading: boolean;
  materializedDestinationError: string | null;
  materializedPreviewColumns: PreviewColumn[];
  materializedPreviewRows: PreviewRow[];
  materializedPreviewTotalRows: number;
  materializedPreviewLimit: number;
  materializedPreviewOffset: number;
  materializedPreviewLoading: boolean;
  materializedPreviewError: string | null;
  onRetryMaterializedPreview: () => void;
  materializedPreviewFilter: RowFilter;
  onMaterializedPreviewFilterChange: (filter: RowFilter) => void;
  onMaterializedPreviewOffsetChange: (offset: number) => void;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  COMPLETENESS: 'Completeness Rule',
  RANGE: 'Range Rule',
  PATTERN: 'Pattern Rule',
  CROSS_COLUMN: 'Cross-Column Rule',
  UNIQUENESS: 'Uniqueness Rule',
  DUPLICATE: 'Duplicate Rule',
};

function ruleTypeLabel(ruleType: string): string {
  return RULE_TYPE_LABELS[ruleType] ?? `${ruleType.charAt(0)}${ruleType.slice(1).toLowerCase()} Rule`;
}

const REVALIDATION_STATUS_LABEL: Record<string, string> = {
  REVALIDATED_PASS: 'Passed',
  REVALIDATED_FAIL: 'Still failing',
  REQUIRES_DATASET_REVALIDATION: 'Dataset revalidation required',
};

const REVALIDATION_STATUS_STYLES: Record<string, string> = {
  REVALIDATED_PASS: 'bg-primary-fixed text-on-primary-fixed',
  REVALIDATED_FAIL: 'bg-error-container text-on-error-container',
  REQUIRES_DATASET_REVALIDATION: 'bg-surface-container text-on-surface-variant',
};

/**
 * The Staging & Publish dataset workspace — the Level 2 detail screen a
 * steward drills into from StagingMasterView's full-width dataset list.
 * Everything here (approved changes, preview, confirmation, progress,
 * revalidation, publish) is unchanged from the dataset-centric redesign —
 * only the left ConnectionDatasetExplorer + DatasetWorkflowLayout shell that
 * used to wrap it was removed, since the master list now owns dataset
 * selection (see the master/detail redesign's App.tsx wiring).
 */
export const StagingPublishView: React.FC<StagingPublishViewProps> = ({
  onNavigate,
  selectedDataset,
  approvedChanges,
  previewColumns,
  previewRows,
  previewLimitationNote,
  tableStructureColumns,
  stagingDestination,
  stagingRun,
  stagingRecords,
  driftOnly,
  onToggleDriftOnly,
  publishRun,
  canCreateStaging,
  canPublish,
  isActionPending,
  actionError,
  onCreateStagingRun,
  onPublish,
  onAcknowledgeDrift,
  revalidationByRecordId,
  revalidationLoadingIds,
  revalidationErrorByRecordId,
  onLoadRevalidation,
  materializationPhase,
  progressPercentage,
  copiedRowCount,
  materializationSourceRowCount,
  materializedRowCount,
  materializationError,
  realDestinationLabel,
  isProgressOpen,
  onCloseProgress,
  pollError,
  onRetryPoll,
  isMaterializedPreviewOpen,
  onOpenMaterializedPreview,
  onCloseMaterializedPreview,
  materializedDestination,
  materializedDestinationLoading,
  materializedDestinationError,
  materializedPreviewColumns,
  materializedPreviewRows,
  materializedPreviewTotalRows,
  materializedPreviewLimit,
  materializedPreviewOffset,
  materializedPreviewLoading,
  materializedPreviewError,
  onRetryMaterializedPreview,
  materializedPreviewFilter,
  onMaterializedPreviewFilterChange,
  onMaterializedPreviewOffsetChange,
}) => {
  const [expandedRecordIds, setExpandedRecordIds] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleRecordExpanded = (recordId: string) => {
    setExpandedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
        onLoadRevalidation(recordId);
      }
      return next;
    });
  };

  // Real Phase 4.12B flow: create the run, then close this modal — App.tsx
  // navigates to this dataset's page with ?stagingRunId=<id> the instant the
  // run exists, which is what actually opens StagingProgressView (see
  // isProgressOpen) and starts polling GET /staging-runs/{id}. Nothing here
  // simulates a result; the progress view only ever renders what the parent's
  // real polling gives it.
  const runStaging = () => {
    setShowConfirm(false);
    onCreateStagingRun();
  };

  if (!selectedDataset) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 pb-10">
        <EmptyWorkflowState icon="hourglass_top" title="Loading dataset…" description="Resolving this dataset's staging readiness." />
      </div>
    );
  }

  const driftedFieldNames = Array.from(
    new Set(
      stagingRecords
        .filter((r) => r.source_drift_status !== 'UNCHANGED' && r.source_drift_fields)
        .flatMap((r) => (r.source_drift_fields as string[]) ?? [])
    )
  );

  // Phase 4.12B publish safety: publishing still only ever exports
  // staging_records.row_snapshot (the affected-row audit trail), never the
  // full materialized dataset a user can now see via "View Staged Dataset" —
  // so the legacy publish action stays available ONLY for a genuinely legacy
  // (pre-4.12, never-materialized) run, where that was always the entire
  // meaning of "staged." For any real Phase 4.12 materialized run, Publish is
  // disabled with a truthful explanation instead of risking the natural (but
  // false) inference that it publishes the full staged dataset just viewed.
  const isLegacyRun = materializationPhase === null || materializationPhase === 'LEGACY';
  const publishBlockedOnDrift =
    !!publishRun && publishRun.status === 'PENDING' && !!stagingRun?.has_source_drift && !publishRun.drift_acknowledged;
  const isPublished = publishRun?.status === 'PUBLISHED';
  const isPublishing = publishRun?.status === 'PUBLISHING' || (publishRun?.status === 'PENDING' && !publishBlockedOnDrift);
  const canTriggerPublish =
    isLegacyRun &&
    canPublish &&
    !!stagingRun &&
    stagingRun.status === 'READY' &&
    (!publishRun || publishRun.status === 'FAILED');

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 pb-10 space-y-6 animate-in fade-in duration-300">
      {actionError && (
        <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span className="material-symbols-outlined text-base shrink-0">error</span>
          <span>{actionError}</span>
        </div>
      )}

      <DatasetWorkspaceHeader
        datasetName={selectedDataset.name}
        connectionName={selectedDataset.connectionName}
        schemaName={selectedDataset.schemaName}
        status={selectedDataset.status}
        sourceRowCount={selectedDataset.sourceRowCount}
        approvedCorrectionCount={approvedChanges.length}
        keyStrategy={selectedDataset.keyStrategy}
        lastValidationLabel={selectedDataset.lastValidationLabel}
        approvalStatusLabel={selectedDataset.approvalStatusLabel}
        primaryActionLabel="Preview Staging"
        onPrimaryAction={() => setShowPreview(true)}
      />

      {selectedDataset.status === 'DRAFT' && (
        <EmptyWorkflowState
          icon="edit_note"
          title="No review has started yet"
          description="This dataset hasn't been through Review & Corrections yet, so there are no approved changes to stage."
          actionLabel="Go to Review & Corrections"
          onAction={() => onNavigate('review-corrections')}
        />
      )}

      {selectedDataset.status === 'IN_REVIEW' && (
        <EmptyWorkflowState
          icon="fact_check"
          title="Still in review"
          description={`${selectedDataset.resolvedIssueCount} of ${selectedDataset.totalIssueCount} issues resolved so far. Staging opens up once this review is submitted and approved.`}
          actionLabel="Open Review & Corrections"
          onAction={() => onNavigate('review-corrections')}
        />
      )}

      {selectedDataset.status === 'READY_FOR_APPROVAL' && (
        <EmptyWorkflowState
          icon="verified"
          title="Waiting for approval"
          description="This dataset's review has been submitted and is waiting on a decision in Approval Center."
          actionLabel="Open Approval Center"
          onAction={() => onNavigate('approval-center')}
        />
      )}

      {selectedDataset.status === 'NO_APPROVED_CHANGES' && (
        <EmptyWorkflowState
          icon="check_circle"
          title="No approved corrections"
          description="This dataset's review was approved, but no corrections were approved in it — there's nothing to stage."
        />
      )}

      {(selectedDataset.status === 'APPROVED' ||
        selectedDataset.status === 'READY_TO_STAGE' ||
        selectedDataset.status === 'STAGING' ||
        selectedDataset.status === 'STAGED' ||
        selectedDataset.status === 'FAILED' ||
        selectedDataset.status === 'CANCELLED') && (
        <>
          {/* Approved Changes */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
              <h3 className="font-editorial font-bold text-base text-on-surface">Approved Changes</h3>
              <p className="text-[11px] text-outline mt-0.5">
                {approvedChanges.length} field correction{approvedChanges.length === 1 ? '' : 's'} approved for staging.
              </p>
            </div>
            {approvedChanges.length === 0 ? (
              <p className="p-5 text-xs text-outline italic">No approved corrections found for this dataset's review.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-outline bg-surface-container-low">
                      <th className="px-4 py-2">Record</th>
                      <th className="px-4 py-2">Column</th>
                      <th className="px-4 py-2">Source Value</th>
                      <th className="px-4 py-2">Staged Value</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {approvedChanges.map((c, idx) => (
                      <tr key={`${c.recordRef}-${c.columnName}-${idx}`}>
                        <td className="px-4 py-2.5 font-mono text-on-surface-variant whitespace-nowrap">{c.recordRef}</td>
                        <td className="px-4 py-2.5 font-semibold text-on-surface whitespace-nowrap">{c.columnName}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono bg-error-container text-on-error-container rounded px-1.5 py-0.5 break-all">
                            {c.originalValue || '(empty)'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono bg-primary-fixed text-on-primary-fixed rounded px-1.5 py-0.5 break-all font-semibold">
                            {c.stagedValue}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stage Dataset */}
          <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="font-editorial font-bold text-lg text-on-surface">Stage Dataset</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-lg">
                {selectedDataset.status === 'STAGING'
                  ? 'A staging job is currently running for this dataset.'
                  : selectedDataset.status === 'STAGED'
                  ? 'This dataset has already been staged. See Publish below to push it further.'
                  : selectedDataset.status === 'FAILED'
                  ? materializationError ?? stagingRun?.error_message ?? 'The previous staging attempt failed. You can retry below.'
                  : selectedDataset.status === 'CANCELLED'
                  ? 'The previous staging attempt was cancelled. You can start a new attempt below.'
                  : canCreateStaging
                  ? `Copy ${selectedDataset.sourceRowCount ?? 0} rows into staging with ${approvedChanges.length} approved correction${approvedChanges.length === 1 ? '' : 's'} applied. Source data will not be modified.`
                  : 'Creating a staging dataset requires the staging.create permission.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!canCreateStaging || !isEligibleForStaging(selectedDataset.status) || isActionPending}
              className="shrink-0 px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {selectedDataset.status === 'FAILED' || selectedDataset.status === 'CANCELLED' ? 'Retry Staging' : 'Stage Dataset'}
            </button>
          </div>

          {/* Existing real staging run status/drift/publish/records — unchanged capability */}
          {stagingRun && (
            <>
              <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-outline">Attempt #{stagingRun.attempt_number}</span>
                    <DatasetStatusBadge status={selectedDataset.status} />
                    {stagingRun.has_source_drift && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                        Drift
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {stagingRun.record_count.toLocaleString()} records &bull; {stagingRun.field_count} fields
                  </span>
                </div>
                {materializationPhase === 'READY' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-surface-container">
                    <span className="text-xs text-on-surface-variant font-mono truncate">{realDestinationLabel}</span>
                    <button
                      type="button"
                      onClick={onOpenMaterializedPreview}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-outline-variant hover:bg-surface-container-low text-xs font-semibold text-on-surface transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      View Staged Dataset
                    </button>
                  </div>
                )}
              </div>

              {stagingRun.has_source_drift && (
                <div className="rounded-lg border border-on-error-container/20 bg-error-container p-6 text-on-error-container">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl mt-0.5">warning</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">Source drift detected</p>
                      <p className="text-xs mt-1 leading-relaxed max-w-2xl">
                        The source values for specific corrected fields have changed since this review was
                        approved. This does not mean the whole row drifted — only the fields listed below.
                      </p>
                      {driftedFieldNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {driftedFieldNames.map((f) => (
                            <span key={f} className="font-mono text-[11px] bg-white/60 border border-on-error-container/20 rounded px-2 py-0.5">
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] mt-2 italic">Drifted field names unavailable — load staging records below to see detail.</p>
                      )}
                      <label className="flex items-center gap-2 mt-4 text-xs font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          className="accent-primary w-4 h-4"
                          checked={driftOnly}
                          onChange={(e) => onToggleDriftOnly(e.target.checked)}
                        />
                        Show only drifted records ({stagingRecords.length} loaded)
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg border border-outline-variant shadow-ambient p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-editorial font-bold text-lg text-on-surface">Publish</h3>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-lg">
                    {isPublished
                      ? `Published ${publishRun?.published_record_count?.toLocaleString()} records to ${publishRun?.target_reference}.`
                      : publishBlockedOnDrift
                      ? 'Publish was created but is blocked — acknowledge the source drift above to let it continue.'
                      : isPublishing
                      ? 'Publishing the current staged snapshot to its file export target...'
                      : publishRun?.status === 'FAILED'
                      ? publishRun.error_message ?? 'The previous publish attempt failed.'
                      : !isLegacyRun
                      ? "Full dataset publishing will be enabled after publish integration. The affected-row audit trail above already reflects this run's approved corrections."
                      : stagingRun.status !== 'READY'
                      ? 'Staging must be READY before this can be published.'
                      : `Ready to publish ${stagingRun.record_count.toLocaleString()} records as a FILE_EXPORT.`}
                  </p>
                </div>
                {publishBlockedOnDrift ? (
                  canPublish && (
                    <button
                      type="button"
                      onClick={onAcknowledgeDrift}
                      disabled={isActionPending}
                      className="px-5 py-2.5 rounded-md bg-on-error-container text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isActionPending ? 'Acknowledging…' : 'Acknowledge Drift & Continue'}
                    </button>
                  )
                ) : (
                  canPublish && (
                    <button
                      type="button"
                      onClick={onPublish}
                      disabled={!canTriggerPublish || isActionPending}
                      className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold transition-all shadow-ambient active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-2"
                    >
                      {isPublishing && <span className="material-symbols-outlined text-base animate-spin">sync</span>}
                      {isPublished ? 'Published' : isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                  )
                )}
              </div>

              {stagingRecords.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-editorial font-bold text-lg text-on-surface">
                    Staging Records {driftOnly ? '(drifted only)' : ''}
                  </h3>
                  <p className="text-[11px] text-outline -mt-2">
                    Expand a record to see its corrected fields and check whether the staged value now passes the dataset's rules.
                  </p>
                  <div className="bg-white rounded-lg border border-outline-variant shadow-ambient divide-y divide-surface-container">
                    {stagingRecords.slice(0, 25).map((r) => {
                      const isExpanded = expandedRecordIds.has(r.id);
                      const reports = revalidationByRecordId.get(r.id);
                      const isLoading = revalidationLoadingIds.has(r.id);
                      const loadError = revalidationErrorByRecordId.get(r.id);
                      return (
                        <div key={r.id}>
                          <button
                            type="button"
                            onClick={() => toggleRecordExpanded(r.id)}
                            aria-expanded={isExpanded}
                            className="w-full p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="material-symbols-outlined text-sm text-outline shrink-0">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                              <span className="font-mono text-on-surface-variant truncate">{r.record_ref}</span>
                              {r.corrected_fields.length > 0 && (
                                <span className="text-[10px] text-outline shrink-0">
                                  {r.corrected_fields.length} corrected field{r.corrected_fields.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </span>
                            <span className={r.source_drift_status !== 'UNCHANGED' ? 'text-on-error-container font-semibold' : 'text-outline'}>
                              {r.source_drift_status !== 'UNCHANGED' && r.source_drift_fields
                                ? `Drifted: ${(r.source_drift_fields as string[]).join(', ')}`
                                : 'No drift'}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-4 text-xs">
                              {r.corrected_fields.length > 0 && (
                                <div className="space-y-2">
                                  {r.corrected_fields.map((field, idx) => (
                                    <div key={`${field.issue_id}-${idx}`} className="bg-surface-container-low border border-outline-variant rounded-md p-3">
                                      <p className="text-[11px] font-semibold text-on-surface mb-1.5">{field.column_name ?? '(unknown field)'}</p>
                                      <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
                                        <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded line-through break-all">
                                          {field.original_value || '(empty)'}
                                        </span>
                                        <span className="material-symbols-outlined text-sm text-outline shrink-0">arrow_forward</span>
                                        <span className="bg-surface-container-high text-primary px-2 py-0.5 rounded font-bold break-all">
                                          {field.final_value}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-semibold text-outline uppercase tracking-wider mb-1.5">Revalidation</p>
                                {isLoading ? (
                                  <div className="space-y-1.5">
                                    <div className="h-3 w-32 bg-surface-container rounded animate-pulse" />
                                    <div className="h-3 w-24 bg-surface-container rounded animate-pulse" />
                                  </div>
                                ) : loadError ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-error flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-sm">error</span>
                                      {loadError}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onLoadRevalidation(r.id)}
                                      className="text-primary font-semibold hover:underline cursor-pointer shrink-0"
                                    >
                                      Retry
                                    </button>
                                  </div>
                                ) : !reports || reports.length === 0 ? (
                                  <p className="text-outline italic">No enabled rules apply to this record's dataset.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {reports.map((report) => (
                                      <details key={report.rule_assignment_id} className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-2">
                                        <summary className="flex items-center justify-between gap-2 cursor-pointer select-none">
                                          <span className="text-on-surface">
                                            {ruleTypeLabel(report.rule_type)}
                                            {report.column_name && <span className="text-outline"> &middot; {report.column_name}</span>}
                                          </span>
                                          <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                                              REVALIDATION_STATUS_STYLES[report.status] ?? 'bg-surface-container text-on-surface-variant'
                                            }`}
                                          >
                                            {REVALIDATION_STATUS_LABEL[report.status] ?? report.status}
                                          </span>
                                        </summary>
                                        <div className="mt-2 pt-2 border-t border-outline-variant space-y-1 text-[11px] text-on-surface-variant">
                                          {report.checked_value != null && report.checked_value !== '' && (
                                            <p>
                                              <span className="text-outline">Checked value:</span>{' '}
                                              <span className="font-mono">{String(report.checked_value)}</span>
                                            </p>
                                          )}
                                          {report.reason && <p>{report.reason}</p>}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <StagingPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        datasetName={selectedDataset.name}
        columns={previewColumns}
        rows={previewRows}
        limitationNote={previewLimitationNote}
        onProceedToStage={() => {
          setShowPreview(false);
          setShowConfirm(true);
        }}
        canStage={canCreateStaging && isEligibleForStaging(selectedDataset.status)}
      />

      <StagingConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={runStaging}
        isSubmitting={isActionPending}
        sourceConnectionName={selectedDataset.connectionName}
        sourceSchemaName={selectedDataset.schemaName}
        sourceDatasetName={selectedDataset.name}
        destination={stagingDestination}
        tableColumns={tableStructureColumns}
        rowsToCopy={selectedDataset.sourceRowCount ?? 0}
        approvedCorrections={approvedChanges.length}
        rowsAffected={new Set(approvedChanges.map((c) => c.recordRef)).size}
      />

      {materializationPhase && (
        <StagingProgressView
          isOpen={isProgressOpen}
          onClose={onCloseProgress}
          phase={materializationPhase}
          progressPercentage={progressPercentage}
          copiedRowCount={copiedRowCount}
          sourceRowCount={materializationSourceRowCount}
          materializedRowCount={materializedRowCount}
          sourceLabel={`${selectedDataset.connectionName} / ${selectedDataset.schemaName}.${selectedDataset.name}`}
          destinationLabel={realDestinationLabel}
          errorMessage={materializationError}
          pollError={pollError}
          onRetryPoll={onRetryPoll}
          canRetryStaging={canCreateStaging}
          onRetryStaging={() => {
            onCloseProgress();
            setShowConfirm(true);
          }}
          onViewStagedDataset={() => {
            onCloseProgress();
            onOpenMaterializedPreview();
          }}
        />
      )}

      <MaterializedPreviewModal
        isOpen={isMaterializedPreviewOpen}
        onClose={onCloseMaterializedPreview}
        datasetName={selectedDataset.name}
        destination={materializedDestination}
        destinationLoading={materializedDestinationLoading}
        destinationError={materializedDestinationError}
        columns={materializedPreviewColumns}
        rows={materializedPreviewRows}
        totalRows={materializedPreviewTotalRows}
        limit={materializedPreviewLimit}
        offset={materializedPreviewOffset}
        previewLoading={materializedPreviewLoading}
        previewError={materializedPreviewError}
        onRetryPreview={onRetryMaterializedPreview}
        filter={materializedPreviewFilter}
        onFilterChange={onMaterializedPreviewFilterChange}
        onOffsetChange={onMaterializedPreviewOffsetChange}
      />
    </div>
  );
};
