import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagingConfirmationModal } from '../StagingConfirmationModal';
import { PENDING_STAGING_DESTINATION } from '../../../data/datasetStagingWorkflow';

function baseProps(overrides: Partial<React.ComponentProps<typeof StagingConfirmationModal>> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    sourceConnectionName: 'CBE_OnPrem',
    sourceSchemaName: 'dbo',
    sourceDatasetName: 'DataCraft_AI_Test',
    destination: PENDING_STAGING_DESTINATION,
    tableColumns: [
      { name: 'order_id', dataType: 'INT', isPrimaryKey: true },
      { name: 'email', dataType: 'VARCHAR' },
    ],
    rowsToCopy: 13,
    approvedCorrections: 2,
    rowsAffected: 2,
    ...overrides,
  };
}

describe('StagingConfirmationModal', () => {
  it('shows the "Source data will not be modified" warning', () => {
    render(<StagingConfirmationModal {...baseProps()} />);
    expect(screen.getByText('Source data will not be modified.')).toBeInTheDocument();
  });

  it('renders the source reference and a truthful "not generated yet" destination — never a fabricated physical table name', () => {
    render(<StagingConfirmationModal {...baseProps()} />);
    expect(screen.getByText('CBE_OnPrem')).toBeInTheDocument();
    expect(screen.getByText('dbo.DataCraft_AI_Test')).toBeInTheDocument();
    expect(screen.getByText('DataCraft-managed staging')).toBeInTheDocument();
    expect(screen.getByText('Generated when staging starts')).toBeInTheDocument();
  });

  it('renders the staging table structure with primary key labeled', () => {
    render(<StagingConfirmationModal {...baseProps()} />);
    expect(screen.getByText('order_id')).toBeInTheDocument();
    expect(screen.getByText('Primary Key')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('calls onConfirm when Create Staging Dataset is clicked', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StagingConfirmationModal {...props} />);
    await user.click(screen.getByRole('button', { name: 'Create Staging Dataset' }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StagingConfirmationModal {...props} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    const { container } = render(<StagingConfirmationModal {...baseProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
