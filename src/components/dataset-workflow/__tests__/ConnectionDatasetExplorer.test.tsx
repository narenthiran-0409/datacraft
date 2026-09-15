import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectionDatasetExplorer, ExplorerConnectionGroup } from '../ConnectionDatasetExplorer';

function makeConnections(): ExplorerConnectionGroup[] {
  return [
    {
      id: 'conn-1',
      name: 'CBE_OnPrem',
      datasets: [
        { id: 'ds-1', name: 'Customer_Orders', status: 'READY_TO_STAGE' },
        { id: 'ds-2', name: 'Customer_Orders_PK_Test', status: 'DRAFT' },
      ],
    },
    {
      id: 'conn-2',
      name: 'Analytics_Cloud',
      datasets: [{ id: 'ds-3', name: 'DataCraft_AI_Test', status: 'STAGED' }],
    },
  ];
}

describe('ConnectionDatasetExplorer', () => {
  it('renders every connection expanded by default with its datasets nested below', () => {
    render(
      <ConnectionDatasetExplorer connections={makeConnections()} selectedDatasetId={null} onSelectDataset={vi.fn()} />
    );
    expect(screen.getByText('CBE_OnPrem')).toBeInTheDocument();
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
    expect(screen.getByText('Analytics_Cloud')).toBeInTheDocument();
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
  });

  it('collapses and re-expands a connection on click', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionDatasetExplorer connections={makeConnections()} selectedDatasetId={null} onSelectDataset={vi.fn()} />
    );
    const toggle = screen.getByRole('button', { name: /CBE_OnPrem/ });
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();

    await user.click(toggle);
    expect(screen.queryByText('Customer_Orders')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText('Customer_Orders')).toBeInTheDocument();
  });

  it('calls onSelectDataset with the dataset and connection id when a dataset is clicked', async () => {
    const user = userEvent.setup();
    const onSelectDataset = vi.fn();
    render(<ConnectionDatasetExplorer connections={makeConnections()} selectedDatasetId={null} onSelectDataset={onSelectDataset} />);
    await user.click(screen.getByText('Customer_Orders'));
    expect(onSelectDataset).toHaveBeenCalledWith('ds-1', 'conn-1');
  });

  it('highlights the selected dataset', () => {
    render(
      <ConnectionDatasetExplorer connections={makeConnections()} selectedDatasetId="ds-1" onSelectDataset={vi.fn()} />
    );
    const button = screen.getByText('Customer_Orders').closest('button');
    expect(button).toHaveAttribute('aria-current', 'true');
  });

  it('filters datasets by search text', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionDatasetExplorer connections={makeConnections()} selectedDatasetId={null} onSelectDataset={vi.fn()} />
    );
    await user.type(screen.getByPlaceholderText('Search datasets…'), 'DataCraft');
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.queryByText('Customer_Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('CBE_OnPrem')).not.toBeInTheDocument();
  });

  it('filters datasets by status when the status filter is used', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionDatasetExplorer
        connections={makeConnections()}
        selectedDatasetId={null}
        onSelectDataset={vi.fn()}
        showStatusFilter
      />
    );
    await user.click(screen.getByLabelText('Filter by status'));
    await user.click(screen.getByRole('option', { name: 'Staged' }));
    expect(screen.getByText('DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.queryByText('Customer_Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer_Orders_PK_Test')).not.toBeInTheDocument();
  });
});
