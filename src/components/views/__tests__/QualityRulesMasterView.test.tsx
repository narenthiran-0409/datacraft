import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualityRulesMasterView, RulesMasterRow } from '../QualityRulesMasterView';

function makeRows(): RulesMasterRow[] {
  return [
    {
      datasetId: 'ds-1',
      datasetName: 'DataCraft_AI_Test',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      appliedRulesCount: 4,
      activeRulesCount: 4,
      pendingCount: 2,
      lastUpdatedLabel: 'Sep 12, 2026',
      status: 'CONFIGURED',
    },
    {
      datasetId: 'ds-2',
      datasetName: 'Customer_Orders',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      appliedRulesCount: 0,
      activeRulesCount: 0,
      pendingCount: 0,
      lastUpdatedLabel: null,
      status: 'NO_RULES',
    },
  ];
}

describe('QualityRulesMasterView', () => {
  it('renders every dataset with its rule counts, full width', () => {
    render(<QualityRulesMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<QualityRulesMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(screen.getByRole('option', { name: 'No Rules' }));
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('searches by dataset name', async () => {
    const user = userEvent.setup();
    render(<QualityRulesMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Search datasets…'), 'Customer');
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('opens the dataset rule detail on row click', async () => {
    const user = userEvent.setup();
    const onOpenDataset = vi.fn();
    render(<QualityRulesMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={onOpenDataset} />);
    await user.click(screen.getByText('DataCraft_AI_Test'));
    expect(onOpenDataset).toHaveBeenCalledWith('ds-1');
  });
});
