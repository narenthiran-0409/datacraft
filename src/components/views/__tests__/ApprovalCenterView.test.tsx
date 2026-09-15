import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalCenterView } from '../ApprovalCenterView';
import { ApprovalRequestItem } from '../../../types';

function makeRequest(overrides: Partial<ApprovalRequestItem> = {}): ApprovalRequestItem {
  return {
    id: 'approval-1',
    reviewRunName: 'Review for DataCraft_AI_Test',
    datasetName: 'DataCraft_AI_Test',
    status: 'PENDING',
    affectedIssueCount: 5,
    affectedRecordCount: 5,
    requestedBy: 'sara',
    requestedAt: 'Sep 12, 2026',
    decidedCount: 0,
    remainingCount: 5,
    reviewRunId: 'review-1',
    ...overrides,
  };
}

describe('ApprovalCenterView (detail)', () => {
  it('lets a decider approve a pending request', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <ApprovalCenterView
        request={makeRequest()}
        canDecide
        isPending={false}
        actionError={null}
        onApprove={onApprove}
        onReject={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith('approval-1', '');
  });

  it('lets a decider reject a pending request', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <ApprovalCenterView
        request={makeRequest()}
        canDecide
        isPending={false}
        actionError={null}
        onApprove={vi.fn()}
        onReject={onReject}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Reject' }));
    expect(onReject).toHaveBeenCalledWith('approval-1', '');
  });

  it('shows a read-only guard when the viewer cannot decide', () => {
    render(
      <ApprovalCenterView
        request={makeRequest()}
        canDecide={false}
        isPending={false}
        actionError={null}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/approval.decide permission/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows a terminal message for an already-approved request, with no decision controls', () => {
    render(
      <ApprovalCenterView
        request={makeRequest({ status: 'APPROVED' })}
        canDecide
        isPending={false}
        actionError={null}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );
    expect(screen.getByText(/already been approved/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
