import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagingMasterView, StagingMasterRow } from '../StagingMasterView';

function makeRows(): StagingMasterRow[] {
  return [
    {
      datasetId: 'ds-1',
      datasetName: 'DataCraft_AI_Test',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      approvedChangesCount: 2,
      rowsAffected: 2,
      status: 'READY_TO_STAGE',
      lastStagedLabel: null,
    },
    {
      datasetId: 'ds-2',
      datasetName: 'Customer_Orders',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      approvedChangesCount: 0,
      rowsAffected: 0,
      status: 'DRAFT',
      lastStagedLabel: null,
    },
  ];
}

describe('StagingMasterView', () => {
  it('renders a full-width dataset table, not a narrow explorer', () => {
    render(<StagingMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
  });

  it('opens the dataset workspace on row click', async () => {
    const user = userEvent.setup();
    const onOpenDataset = vi.fn();
    render(<StagingMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={onOpenDataset} />);
    await user.click(screen.getByText('DataCraft_AI_Test'));
    expect(onOpenDataset).toHaveBeenCalledWith('ds-1');
  });

  it('filters by search text across dataset/connection/schema', async () => {
    const user = userEvent.setup();
    render(<StagingMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Search datasets…'), 'Customer');
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no rows at all', () => {
    render(<StagingMasterView rows={[]} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByText('No approved changes ready to stage')).toBeInTheDocument();
  });
});
