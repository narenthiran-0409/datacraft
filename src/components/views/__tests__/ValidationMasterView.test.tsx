import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationMasterView, ValidationMasterRow } from '../ValidationMasterView';

function makeRows(): ValidationMasterRow[] {
  return [
    {
      datasetId: 'ds-1',
      datasetName: 'DataCraft_AI_Test',
      connectionName: 'CBE_OnPrem',
      schemaName: 'dbo',
      lastValidationLabel: 'Sep 15, 2026',
      qualityScorePct: 76.9,
      noApplicableRules: false,
      failedRows: 3,
      rulesEvaluatedCount: 10,
      status: 'COMPLETED',
      lastRunAt: '1:02 AM',
    },
    {
      datasetId: 'ds-2',
      datasetName: 'Product_Master',
      connectionName: 'Test',
      schemaName: 'dbo',
      lastValidationLabel: null,
      qualityScorePct: null,
      noApplicableRules: false,
      failedRows: 0,
      rulesEvaluatedCount: 0,
      status: 'NOT_VALIDATED',
      lastRunAt: null,
    },
  ];
}

describe('ValidationMasterView', () => {
  it('renders the full-width dataset table with quality scores', () => {
    render(<ValidationMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('76.9%')).toBeInTheDocument();
  });

  it('filters by connection', async () => {
    const user = userEvent.setup();
    render(<ValidationMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.click(screen.getByLabelText('Filter by connection'));
    await user.click(screen.getByRole('option', { name: 'Test' }));
    expect(screen.getByText('Product_Master')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<ValidationMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={vi.fn()} />);
    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(screen.getByRole('option', { name: 'Not Validated' }));
    expect(screen.getByText('Product_Master')).toBeInTheDocument();
    expect(screen.queryByText('DataCraft_AI_Test')).not.toBeInTheDocument();
  });

  it('opens the dataset detail on row click', async () => {
    const user = userEvent.setup();
    const onOpenDataset = vi.fn();
    render(<ValidationMasterView rows={makeRows()} loading={false} error={null} onOpenDataset={onOpenDataset} />);
    await user.click(screen.getByText('DataCraft_AI_Test'));
    expect(onOpenDataset).toHaveBeenCalledWith('ds-1');
  });

  it('shows a loading state', () => {
    render(<ValidationMasterView rows={[]} loading error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByText('Loading validation status…')).toBeInTheDocument();
  });

  it('shows an empty state with no datasets', () => {
    render(<ValidationMasterView rows={[]} loading={false} error={null} onOpenDataset={vi.fn()} />);
    expect(screen.getByText('No datasets available')).toBeInTheDocument();
  });
});
