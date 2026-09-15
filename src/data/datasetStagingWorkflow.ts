// Staging & Publish dataset-centric redesign — UI-phase helpers.
//
// This module is the one place that isolates "future staging preview" concepts
// (a derived per-dataset workflow status, a placeholder staging destination name,
// the staging job's progress steps) from real API data, per the task's own
// instruction to keep FUTURE STAGING PREVIEW UI STATE cleanly separated from
// CURRENT LIVE DATA. Nothing here is persisted or sent to the backend; swapping
// any of it for a real Phase 4.12 endpoint later should mean deleting the
// relevant function here, not hunting through the view components.

import { ApprovalRequestItem, DatasetStagingStatus, ReviewRun } from '../types';

// --- Dataset workflow status (derived, not fabricated) ----------------------
// Every input is a real value already fetched elsewhere in the app (a review
// run's status, an approval request's status/decision, resolved-issue counts).
// The only thing that's "invented" is the priority order used to collapse them
// into a single status — there is no backend field for that.

export interface DeriveDatasetStagingStatusInput {
  /** Present only if some review run was found for this dataset. */
  reviewStatus?: ReviewRun['status'];
  resolvedIssues?: number;
  /** Present only if an approval request was found for that review run. */
  approvalStatus?: ApprovalRequestItem['status'];
  // Staging/publish run status is only ever known for the dataset currently open
  // in the workspace — there is no list-staging-runs-by-dataset endpoint, so it
  // cannot be resolved for every row in the left explorer.
  stagingRunStatus?: string | null;
  publishRunStatus?: string | null;
  // Phase 4.12B — real materialization phase (StagingRunResponse.materialization_phase),
  // known for the same dataset-currently-open-in-the-workspace scope as
  // stagingRunStatus above. Takes priority over stagingRunStatus when present:
  // the old audit-layer status can already read READY while materialization is
  // still BUILDING (or has independently FAILED/been CANCELLED), so it's no
  // longer an accurate "is this dataset actually staged" signal on its own.
  materializationPhase?: string | null;
}

export function deriveDatasetStagingStatus(input: DeriveDatasetStagingStatusInput): DatasetStagingStatus {
  if (input.materializationPhase) {
    if (input.materializationPhase === 'FAILED') return 'FAILED';
    if (input.materializationPhase === 'CANCELLED') return 'CANCELLED';
    if (input.materializationPhase === 'READY') return 'STAGED';
    // PREPARING_SCHEMA | CREATING_TABLE | COPYING_SOURCE | APPLYING_CORRECTIONS | VALIDATING | FINALIZING
    return 'STAGING';
  }

  if (input.stagingRunStatus === 'FAILED') return 'FAILED';
  if (input.stagingRunStatus === 'READY') return 'STAGED';
  if (input.stagingRunStatus === 'BUILDING' || input.stagingRunStatus === 'NOT_STARTED') return 'STAGING';

  if (input.approvalStatus === 'APPROVED' || input.approvalStatus === 'PARTIALLY_APPROVED') {
    return (input.resolvedIssues ?? 0) > 0 ? 'READY_TO_STAGE' : 'NO_APPROVED_CHANGES';
  }
  if (input.approvalStatus === 'PENDING') return 'READY_FOR_APPROVAL';
  if (input.approvalStatus === 'REJECTED') return 'IN_REVIEW';

  if (input.reviewStatus === 'READY_FOR_APPROVAL') return 'READY_FOR_APPROVAL';
  if (input.reviewStatus === 'IN_REVIEW') return 'IN_REVIEW';
  if (input.reviewStatus === 'ARCHIVED') return 'IN_REVIEW';
  if (input.reviewStatus === 'DRAFT') return 'DRAFT';

  // No review run found for this dataset at all yet.
  return 'DRAFT';
}

export const DATASET_STATUS_META: Record<DatasetStagingStatus, { label: string; badgeClass: string }> = {
  DRAFT: { label: 'Draft', badgeClass: 'bg-surface-container text-on-surface-variant' },
  IN_REVIEW: { label: 'In Review', badgeClass: 'bg-secondary-fixed text-on-secondary-fixed' },
  READY_FOR_APPROVAL: { label: 'Ready for Approval', badgeClass: 'bg-secondary-fixed text-on-secondary-fixed' },
  APPROVED: { label: 'Approved', badgeClass: 'bg-primary-fixed text-on-primary-fixed' },
  READY_TO_STAGE: { label: 'Ready to Stage', badgeClass: 'bg-primary-fixed text-on-primary-fixed' },
  STAGING: { label: 'Staging…', badgeClass: 'bg-secondary-fixed text-on-secondary-fixed' },
  STAGED: { label: 'Staged', badgeClass: 'bg-primary text-on-primary' },
  FAILED: { label: 'Failed', badgeClass: 'bg-error-container text-on-error-container' },
  CANCELLED: { label: 'Cancelled', badgeClass: 'bg-surface-container text-on-surface-variant' },
  NO_APPROVED_CHANGES: { label: 'No Approved Changes', badgeClass: 'bg-surface-container text-on-surface-variant' },
};

/** Only these statuses make "Stage Dataset" a real, clickable action. */
export function isEligibleForStaging(status: DatasetStagingStatus): boolean {
  return status === 'READY_TO_STAGE' || status === 'FAILED' || status === 'CANCELLED';
}

/** "READY_FOR_APPROVAL" -> "Ready For Approval" — for surfacing a raw backend enum in prose. */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

// --- Record matching (best-effort, for the full preview table) --------------
// StagingRecordResponse.record_ref and Issue.recordRef are backend-formatted
// "col=value[,col=value...]" strings (confirmed via existing fixtures/tests,
// e.g. "id=1"). Used only to line up a corrected row with its real row from
// GET /datasets/{id}/preview when possible — never persisted, never sent back.

export function parseRecordRef(recordRef: string): Record<string, string> {
  const result: Record<string, string> = {};
  recordRef.split(/[,&]/).forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx <= 0) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) result[key] = value;
  });
  return result;
}

export function findMatchingPreviewRow(
  recordRef: string,
  rows: Record<string, unknown>[]
): Record<string, unknown> | null {
  const keyVals = parseRecordRef(recordRef);
  const keys = Object.keys(keyVals);
  if (keys.length === 0) return null;
  return rows.find((row) => keys.every((k) => k in row && String(row[k]) === keyVals[k])) ?? null;
}

// --- Staging destination ------------------------------------------------------
// Phase 4.12B: real destination naming (database/schema/table) is entirely
// backend-owned (app/modules/staging/destination_naming.py) and only knowable
// once a StagingRun's materialization job has actually created the physical
// table — GET /staging-runs/{id}/destination, or destination_schema/
// destination_table directly on a polled StagingRunResponse. There is no
// frontend naming convention to replicate any more.

export interface StagingDestination {
  database: string;
  schema: string;
  table: string;
  fullReference: string;
}

/**
 * Shown only BEFORE a StagingRun exists (the Create Staging Dataset
 * confirmation, which by definition has no run id to ask the backend about
 * yet) — a truthful placeholder, never a fabricated physical table name.
 * Replaced by stagingDestinationFromRun() the moment a run exists.
 */
export const PENDING_STAGING_DESTINATION: StagingDestination = {
  database: 'DataCraft-managed staging',
  schema: 'staging_data',
  table: 'Generated when staging starts',
  fullReference: 'Generated when staging starts',
};

/** Real destination once the backend has created the physical table; null until then. */
export function stagingDestinationFromRun(run: {
  destination_schema: string | null;
  destination_table: string | null;
}): StagingDestination | null {
  if (!run.destination_schema || !run.destination_table) return null;
  return {
    database: 'DataCraft-managed staging',
    schema: run.destination_schema,
    table: run.destination_table,
    fullReference: `${run.destination_schema}.${run.destination_table}`,
  };
}

// --- Materialization phase (Phase 4.12B) -------------------------------------
// Mirrors app/modules/staging/tasks.py's real materialization_phase values
// exactly (PREPARING_SCHEMA -> CREATING_TABLE -> COPYING_SOURCE ->
// APPLYING_CORRECTIONS -> VALIDATING -> FINALIZING -> READY, or FAILED/
// CANCELLED). QUEUED and LEGACY are frontend-only concepts layered on top of
// a null materialization_phase — see resolveMaterializationUiPhase below for
// exactly how they're told apart.

export type MaterializationUiPhase =
  | 'QUEUED'
  | 'PREPARING_SCHEMA'
  | 'CREATING_TABLE'
  | 'COPYING_SOURCE'
  | 'APPLYING_CORRECTIONS'
  | 'VALIDATING'
  | 'FINALIZING'
  | 'READY'
  | 'FAILED'
  | 'CANCELLED'
  | 'LEGACY';

export const MATERIALIZATION_PHASE_LABELS: Record<MaterializationUiPhase, string> = {
  QUEUED: 'Queued',
  PREPARING_SCHEMA: 'Preparing staging schema',
  CREATING_TABLE: 'Creating destination table',
  COPYING_SOURCE: 'Copying source data',
  APPLYING_CORRECTIONS: 'Applying approved changes',
  VALIDATING: 'Validating staged records',
  FINALIZING: 'Finalizing dataset',
  READY: 'Staging dataset ready',
  FAILED: 'Staging failed',
  CANCELLED: 'Staging cancelled',
  LEGACY: 'Legacy staging run',
};

/** The in-flight step list, in order — READY/FAILED/CANCELLED/LEGACY are terminal/exception states rendered separately, not steps. */
export const MATERIALIZATION_PHASE_STEPS: MaterializationUiPhase[] = [
  'QUEUED',
  'PREPARING_SCHEMA',
  'CREATING_TABLE',
  'COPYING_SOURCE',
  'APPLYING_CORRECTIONS',
  'VALIDATING',
  'FINALIZING',
];

const TERMINAL_MATERIALIZATION_PHASES: MaterializationUiPhase[] = ['READY', 'FAILED', 'CANCELLED', 'LEGACY'];

/** Whether polling GET /staging-runs/{id} should stop. */
export function isTerminalMaterializationPhase(phase: MaterializationUiPhase): boolean {
  return TERMINAL_MATERIALIZATION_PHASES.includes(phase);
}

/**
 * Resolves the real backend materialization_phase (or null) into the UI's
 * phase enum. destination_table === null is the backend's own single
 * authoritative "not materialized" signal (see StagingRunNotMaterializedError
 * in the backend) — a null materialization_phase means exactly that, and
 * covers two different real situations the backend deliberately doesn't
 * distinguish at the data-model level: a run whose materialization job
 * hasn't reached its first phase yet, and a historical pre-Phase-4.12 run
 * that was never materialized at all. `isFreshlyTriggeredThisSession` is the
 * frontend's own disambiguating signal — true only for a run this browser
 * session itself just created (see App.tsx) — so a run WE just triggered
 * reads as QUEUED (keep polling; it'll move to a real phase within seconds)
 * while any other null-phase run (loaded from a list, resumed via URL/
 * refresh without our having just triggered it) reads as LEGACY (stop —
 * never poll it forever, never fabricate a destination/preview for it).
 */
export function resolveMaterializationUiPhase(
  materializationPhase: string | null,
  isFreshlyTriggeredThisSession: boolean
): MaterializationUiPhase {
  if (materializationPhase) return materializationPhase as MaterializationUiPhase;
  return isFreshlyTriggeredThisSession ? 'QUEUED' : 'LEGACY';
}
