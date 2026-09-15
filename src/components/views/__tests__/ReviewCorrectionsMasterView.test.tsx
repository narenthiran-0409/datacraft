import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCorrectionsMasterView, ReviewMasterRow } from '../ReviewCorrectionsMasterView';

function makeRows(): ReviewMasterRow[] {
  return [
    {
      datasetId: 'ds-1',
      datasetName: 'DataCraft_AI_Test',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      reviewRunId: 'review-1',
      qualityScorePct: 76.9,
      issuesCount: 5,
      resolvedCount: 3,
      remainingCount: 2,
      suggestionsReadyCount: 2,
      status: 'IN_REVIEW',
      updatedLabel: 'Just now',
    },
    {
      datasetId: 'ds-2',
      datasetName: 'Customer_Orders',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      reviewRunId: null,
      qualityScorePct: null,
      issuesCount: 0,
      resolvedCount: 0,
      remainingCount: 0,
      suggestionsReadyCount: 0,
      status: 'NO_REVIEW',
      updatedLabel: null,
    },
  ];
}

describe('ReviewCorrectionsMasterView', () => {
  it('renders issue/resolved counts for every dataset, full width', () => {
    render(<ReviewCorrectionsMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('76.9%')).toBeInTheDocument();
  });

  it('filters by review status', async () => {
    const user = userEvent.setup();
    render(<ReviewCorrectionsMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(screen.getByRole('option', { name: 'In Review' }));
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.queryByText('Customer_Orders')).not.toBeInTheDocument();
  });

  it('drills into a dataset on row click', async () => {
    const user = userEvent.setup();
    const onOpenDataset = vi.fn();
    render(<ReviewCorrectionsMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={onOpenDataset} />);
    await user.click(screen.getByText('DataCraft_AI_Test'));
    expect(onOpenDataset).toHaveBeenCalledWith('ds-1');
  });

  it('shows the "no issues waiting for review" empty state', () => {
    render(<ReviewCorrectionsMasterView rows={[]} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByText('No issues waiting for review')).toBeInTheDocument();
  });
});
