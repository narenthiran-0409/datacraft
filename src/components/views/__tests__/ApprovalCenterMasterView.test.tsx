import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalCenterMasterView, ApprovalMasterRow } from '../ApprovalCenterMasterView';

function makeRows(): ApprovalMasterRow[] {
  return [
    {
      datasetId: 'ds-1',
      datasetName: 'DataCraft_AI_Test',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      approvalRequestId: 'approval-1',
      changesCount: 5,
      recordsAffected: 5,
      submittedLabel: 'Sep 12, 2026',
      status: 'PENDING',
      updatedLabel: 'Sep 12, 2026',
      reviewReadyNotSubmitted: false,
    },
    {
      datasetId: 'ds-2',
      datasetName: 'Customer_Orders',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      approvalRequestId: 'approval-2',
      changesCount: 3,
      recordsAffected: 3,
      submittedLabel: 'Sep 1, 2026',
      status: 'APPROVED',
      updatedLabel: 'Sep 3, 2026',
      reviewReadyNotSubmitted: false,
    },
  ];
}

describe('ApprovalCenterMasterView', () => {
  it('renders pending/approved requests, full width', () => {
    render(<ApprovalCenterMasterView rows={makeRows()} loading={false} error={null} onOpenApproval={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
  });

  it('filters by approval status', async () => {
    const user = userEvent.setup();
    render(<ApprovalCenterMasterView rows={makeRows()} loading={false} error={null} onOpenApproval={vi.fn()} />);
    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(screen.getByRole('option', { name: 'Approved' }));
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('opens the approval detail on row click', async () => {
    const user = userEvent.setup();
    const onOpenApproval = vi.fn();
    render(<ApprovalCenterMasterView rows={makeRows()} loading={false} error={null} onOpenApproval={onOpenApproval} />);
    await user.click(screen.getByText('DataCraft_AI_Test'));
    expect(onOpenApproval).toHaveBeenCalledWith('ds-1');
  });

  it('shows the "no approvals waiting" empty state', () => {
    render(<ApprovalCenterMasterView rows={[]} loading={false} error={null} onOpenApproval={vi.fn()} />);
    expect(screen.getByText('No approvals waiting')).toBeInTheDocument();
  });
});
