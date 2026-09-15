// Master/detail workflow redesign — dataset -> review/approval/rule
// resolution rules, kept in one place so every master screen (and the
// dataset-detail screens they drill into) resolves "which review/approval is
// the relevant one for this dataset" the exact same way. See each function's
// own comment for the deterministic rule it applies and why.

import { ApprovalRequestItem, ReviewRun } from '../types';
import { RuleResponse, RuleVersionResponse } from '../api/client';

/**
 * Every ReviewRun for a dataset, newest first by its real created_at
 * timestamp (never by array order or by the pre-formatted display string).
 * A dataset can have several review runs over time (an old approved one, a
 * newer draft re-review, etc.) — this is the shared ordering every other
 * function here builds on.
 */
export function getReviewsForDataset(reviewRuns: ReviewRun[], datasetId: string): ReviewRun[] {
  return reviewRuns
    .filter((r) => r.datasetId === datasetId)
    .slice()
    .sort((a, b) => {
      const aTime = a.createdAtRaw ? Date.parse(a.createdAtRaw) : 0;
      const bTime = b.createdAtRaw ? Date.parse(b.createdAtRaw) : 0;
      return bTime - aTime;
    });
}

/**
 * "What is this dataset's review doing right now" — the newest review run,
 * full stop. This is deliberately the same review a steward would land on by
 * opening Review & Corrections for this dataset today: the most recent
 * activity, regardless of whether it happens to be approved yet. Used by the
 * Review & Corrections master/detail (where "in progress" is exactly what
 * should show) — NOT used for staging eligibility (see
 * getStagingEligibleReview below), since a brand-new draft re-review must
 * never be read as "this dataset is ready to stage."
 */
export function getCurrentReviewForDataset(reviewRuns: ReviewRun[], datasetId: string): ReviewRun | null {
  return getReviewsForDataset(reviewRuns, datasetId)[0] ?? null;
}

/** The approval request associated with a specific review run, if any. */
export function getApprovalForReview(
  approvalQueue: ApprovalRequestItem[],
  reviewRunId: string
): ApprovalRequestItem | null {
  return approvalQueue.find((a) => a.reviewRunId === reviewRunId) ?? null;
}

/**
 * The dataset's most recent APPROVED (or PARTIALLY_APPROVED) review — i.e.
 * the one whose accepted corrections are actually eligible to stage.
 *
 * Deliberately NOT "the latest review for this dataset": a dataset can have
 * an older review that was approved, superseded later by a brand-new DRAFT
 * re-review that hasn't been decided yet. Falling back to "latest review
 * regardless of status" would silently offer staging for a Draft with zero
 * real approval — exactly what this task's own audit called out as unsafe.
 * This searches every review run for the dataset (newest-approved-first) and
 * returns the first one with a real APPROVED/PARTIALLY_APPROVED decision, or
 * null if none exists yet.
 *
 * Known limitation (see final report): if a dataset has two independently
 * approved reviews (e.g. approved, staged, then a second correction round
 * later also approved), this picks the more recent of the two — there is no
 * backend concept of "supersedes" to consult instead, so recency is the most
 * defensible real signal available.
 */
export function getStagingEligibleReview(
  reviewRuns: ReviewRun[],
  approvalQueue: ApprovalRequestItem[],
  datasetId: string
): ReviewRun | null {
  const reviews = getReviewsForDataset(reviewRuns, datasetId);
  for (const review of reviews) {
    const approval = getApprovalForReview(approvalQueue, review.id);
    if (approval && (approval.status === 'APPROVED' || approval.status === 'PARTIALLY_APPROVED')) {
      return review;
    }
  }
  return null;
}

/**
 * Every approval request that belongs to one of this dataset's review runs
 * (joined via ApprovalRequestItem.reviewRunId -> ReviewRun.datasetId, never
 * by datasetName string-matching — ApprovalRequestItem carries no dataset id
 * of its own), newest request first.
 */
export function getApprovalsForDataset(
  reviewRuns: ReviewRun[],
  approvalQueue: ApprovalRequestItem[],
  datasetId: string
): ApprovalRequestItem[] {
  const reviewIds = new Set(getReviewsForDataset(reviewRuns, datasetId).map((r) => r.id));
  return approvalQueue
    .filter((a) => a.reviewRunId && reviewIds.has(a.reviewRunId))
    .slice()
    .sort((a, b) => {
      const aTime = a.requestedAtRaw ? Date.parse(a.requestedAtRaw) : 0;
      const bTime = b.requestedAtRaw ? Date.parse(b.requestedAtRaw) : 0;
      return bTime - aTime;
    });
}

/**
 * The single approval request a dataset's Approval Center master row should
 * show: a request still awaiting a decision (PENDING/PARTIALLY_APPROVED) is
 * always more relevant than an old terminal one, so it wins regardless of
 * recency; among same-relevance requests, the most recently requested wins.
 */
export function getRelevantApprovalForDataset(
  reviewRuns: ReviewRun[],
  approvalQueue: ApprovalRequestItem[],
  datasetId: string
): ApprovalRequestItem | null {
  const candidates = getApprovalsForDataset(reviewRuns, approvalQueue, datasetId);
  const pending = candidates.find((a) => a.status === 'PENDING' || a.status === 'PARTIALLY_APPROVED');
  return pending ?? candidates[0] ?? null;
}

/**
 * PENDING_REVIEW rules detected for a specific dataset. The only place that
 * association is recorded is inside each rule's current version's
 * definition, under a `_detected_for` key (RuleDetectionService writes it;
 * rules carry no first-class dataset_id column) — identical logic to
 * DatasetOverviewView's existing pendingReviewRules derivation, extracted
 * here so the Data Quality Rules master/detail screens use the exact same
 * rule rather than a second, possibly-drifting reimplementation.
 */
export function getPendingReviewRulesForDataset(
  rules: RuleResponse[],
  ruleVersionsByRuleId: Record<string, RuleVersionResponse[]>,
  datasetId: string
): RuleResponse[] {
  return rules.filter((r) => {
    if (r.status !== 'PENDING_REVIEW') return false;
    const currentVersion = (ruleVersionsByRuleId[r.id] ?? []).find((v) => v.is_current);
    const detectedFor = currentVersion?.definition?._detected_for as { dataset_id?: string } | undefined;
    return detectedFor?.dataset_id === datasetId;
  });
}
