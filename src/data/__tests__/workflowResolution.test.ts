import { describe, expect, it } from 'vitest';
import {
  getApprovalForReview,
  getCurrentReviewForDataset,
  getPendingReviewRulesForDataset,
  getRelevantApprovalForDataset,
  getReviewsForDataset,
  getStagingEligibleReview,
} from '../workflowResolution';
import { ApprovalRequestItem, ReviewRun } from '../../types';
import { RuleResponse, RuleVersionResponse } from '../../api/client';

function makeReview(overrides: Partial<ReviewRun> = {}): ReviewRun {
  return {
    id: 'review-1',
    name: 'Review 1',
    status: 'DRAFT',
    datasetName: 'Customer_Orders',
    validationRunLabel: 'abcd1234',
    totalIssues: 5,
    resolvedIssues: 0,
    createdAt: 'Jan 1, 2026',
    datasetId: 'ds-1',
    createdAtRaw: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeApproval(overrides: Partial<ApprovalRequestItem> = {}): ApprovalRequestItem {
  return {
    id: 'approval-1',
    reviewRunName: 'Review 1',
    datasetName: 'Customer_Orders',
    status: 'PENDING',
    affectedIssueCount: 5,
    affectedRecordCount: 5,
    requestedBy: 'sara',
    requestedAt: 'Jan 2, 2026',
    decidedCount: 0,
    remainingCount: 5,
    reviewRunId: 'review-1',
    requestedAtRaw: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

describe('getReviewsForDataset / getCurrentReviewForDataset', () => {
  it('sorts by real created_at, newest first — never by array order', () => {
    const older = makeReview({ id: 'r-old', createdAtRaw: '2026-01-01T00:00:00Z' });
    const newer = makeReview({ id: 'r-new', createdAtRaw: '2026-06-01T00:00:00Z' });
    // Deliberately returned in "wrong" (oldest-first) array order.
    const reviews = getReviewsForDataset([older, newer], 'ds-1');
    expect(reviews.map((r) => r.id)).toEqual(['r-new', 'r-old']);
    expect(getCurrentReviewForDataset([older, newer], 'ds-1')?.id).toBe('r-new');
  });

  it('only returns reviews for the requested dataset', () => {
    const mine = makeReview({ id: 'r-mine', datasetId: 'ds-1' });
    const other = makeReview({ id: 'r-other', datasetId: 'ds-2' });
    expect(getReviewsForDataset([mine, other], 'ds-1').map((r) => r.id)).toEqual(['r-mine']);
  });
});

describe('getStagingEligibleReview', () => {
  it('never picks a Draft review just because it is the latest', () => {
    const approvedOld = makeReview({ id: 'r-approved', status: 'ARCHIVED', createdAtRaw: '2026-01-01T00:00:00Z' });
    const draftNew = makeReview({ id: 'r-draft', status: 'DRAFT', createdAtRaw: '2026-06-01T00:00:00Z' });
    const approval = makeApproval({ reviewRunId: 'r-approved', status: 'APPROVED' });

    const eligible = getStagingEligibleReview([approvedOld, draftNew], [approval], 'ds-1');
    expect(eligible?.id).toBe('r-approved');
  });

  it('returns null when nothing has ever been approved for this dataset', () => {
    const draft = makeReview({ id: 'r-draft', status: 'DRAFT' });
    expect(getStagingEligibleReview([draft], [], 'ds-1')).toBeNull();
  });

  it('prefers the most recently approved review when more than one qualifies', () => {
    const approvedOld = makeReview({ id: 'r-old', createdAtRaw: '2026-01-01T00:00:00Z' });
    const approvedNew = makeReview({ id: 'r-new', createdAtRaw: '2026-03-01T00:00:00Z' });
    const approvals = [
      makeApproval({ id: 'a-old', reviewRunId: 'r-old', status: 'APPROVED' }),
      makeApproval({ id: 'a-new', reviewRunId: 'r-new', status: 'APPROVED' }),
    ];
    expect(getStagingEligibleReview([approvedOld, approvedNew], approvals, 'ds-1')?.id).toBe('r-new');
  });

  it('accepts PARTIALLY_APPROVED as eligible too', () => {
    const review = makeReview();
    const approval = makeApproval({ status: 'PARTIALLY_APPROVED' });
    expect(getStagingEligibleReview([review], [approval], 'ds-1')?.id).toBe('review-1');
  });
});

describe('getApprovalForReview / getRelevantApprovalForDataset', () => {
  it('finds the approval tied to a specific review run', () => {
    const approval = makeApproval({ reviewRunId: 'review-1' });
    expect(getApprovalForReview([approval], 'review-1')?.id).toBe('approval-1');
    expect(getApprovalForReview([approval], 'review-2')).toBeNull();
  });

  it('prefers a still-pending approval over an older terminal one', () => {
    const oldReview = makeReview({ id: 'r-old', createdAtRaw: '2026-01-01T00:00:00Z' });
    const newReview = makeReview({ id: 'r-new', createdAtRaw: '2026-05-01T00:00:00Z' });
    const approvals = [
      makeApproval({ id: 'a-old', reviewRunId: 'r-old', status: 'REJECTED', requestedAtRaw: '2026-01-02T00:00:00Z' }),
      makeApproval({ id: 'a-new', reviewRunId: 'r-new', status: 'PENDING', requestedAtRaw: '2026-05-02T00:00:00Z' }),
    ];
    expect(getRelevantApprovalForDataset([oldReview, newReview], approvals, 'ds-1')?.id).toBe('a-new');
  });

  it('falls back to the most recent terminal approval when nothing is pending', () => {
    const review = makeReview();
    const approval = makeApproval({ status: 'APPROVED' });
    expect(getRelevantApprovalForDataset([review], [approval], 'ds-1')?.id).toBe('approval-1');
  });

  it('returns null when the dataset has never had an approval request', () => {
    const review = makeReview();
    expect(getRelevantApprovalForDataset([review], [], 'ds-1')).toBeNull();
  });
});

describe('getPendingReviewRulesForDataset', () => {
  function makeRule(overrides: Partial<RuleResponse> = {}): RuleResponse {
    return {
      id: 'rule-1',
      name: 'email: PATTERN (detected) [abc123]',
      description: null,
      category: null,
      rule_type: 'PATTERN',
      origin: 'PATTERN_DETECTED',
      status: 'PENDING_REVIEW',
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: null,
      ...overrides,
    };
  }

  function makeVersion(overrides: Partial<RuleVersionResponse> = {}): RuleVersionResponse {
    return {
      id: 'v-1',
      rule_id: 'rule-1',
      version_number: 1,
      definition: {},
      severity: 'MEDIUM',
      error_message_template: null,
      is_current: true,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
      ...overrides,
    };
  }

  it('matches only PENDING_REVIEW rules detected for this exact dataset', () => {
    const rule = makeRule();
    const version = makeVersion({ definition: { _detected_for: { dataset_id: 'ds-1' } } });
    const result = getPendingReviewRulesForDataset([rule], { 'rule-1': [version] }, 'ds-1');
    expect(result).toHaveLength(1);
    expect(getPendingReviewRulesForDataset([rule], { 'rule-1': [version] }, 'ds-2')).toHaveLength(0);
  });

  it('excludes rules that are not PENDING_REVIEW', () => {
    const rule = makeRule({ status: 'ACTIVE' });
    const version = makeVersion({ definition: { _detected_for: { dataset_id: 'ds-1' } } });
    expect(getPendingReviewRulesForDataset([rule], { 'rule-1': [version] }, 'ds-1')).toHaveLength(0);
  });
});
