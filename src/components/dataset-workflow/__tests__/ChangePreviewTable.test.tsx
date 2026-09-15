import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChangePreviewTable, PreviewColumn, PreviewRow } from '../ChangePreviewTable';

const columns: PreviewColumn[] = [{ name: 'email', isPrimaryKey: false }, { name: 'status' }];

function makeRows(): PreviewRow[] {
  return [
    {
      key: 'id=1011',
      isChanged: true,
      cells: {
        email: { value: 'suresh.kumar@gmail.com', isChanged: true, originalValue: 'suresh-invalid-email' },
        status: { value: 'Active', isChanged: false },
      },
    },
    {
      key: 'id=1012',
      isChanged: false,
      cells: {
        email: { value: 'anita@example.com', isChanged: false },
        status: { value: 'Active', isChanged: false },
      },
    },
  ];
}

describe('ChangePreviewTable', () => {
  it('highlights only changed cells, not unchanged ones', () => {
    render(<ChangePreviewTable columns={columns} rows={makeRows()} />);
    const changedCell = screen.getByText('suresh.kumar@gmail.com');
    const unchangedCell = screen.getByText('anita@example.com');
    expect(changedCell.className).toMatch(/bg-primary-fixed/);
    expect(unchangedCell.className).not.toMatch(/bg-primary-fixed/);
  });

  it('shows an original-vs-staged inspector when a changed cell is clicked', async () => {
    const user = userEvent.setup();
    render(<ChangePreviewTable columns={columns} rows={makeRows()} />);
    await user.click(screen.getByText('suresh.kumar@gmail.com'));
    expect(screen.getByText('Original Value')).toBeInTheDocument();
    expect(screen.getByText('suresh-invalid-email')).toBeInTheDocument();
    expect(screen.getByText('Staged Value')).toBeInTheDocument();
  });

  it('filters to changed rows only', async () => {
    const user = userEvent.setup();
    render(<ChangePreviewTable columns={columns} rows={makeRows()} />);
    await user.click(screen.getByRole('tab', { name: /Changed Rows Only/ }));
    expect(screen.getByText('id=1011')).toBeInTheDocument();
    expect(screen.queryByText('id=1012')).not.toBeInTheDocument();
  });

  it('filters to unchanged rows only', async () => {
    const user = userEvent.setup();
    render(<ChangePreviewTable columns={columns} rows={makeRows()} />);
    await user.click(screen.getByRole('tab', { name: /Unchanged Rows/ }));
    expect(screen.getByText('id=1012')).toBeInTheDocument();
    expect(screen.queryByText('id=1011')).not.toBeInTheDocument();
  });

  it('shows changed columns only when that toggle is checked', async () => {
    const user = userEvent.setup();
    render(<ChangePreviewTable columns={columns} rows={makeRows()} />);
    await user.click(screen.getByLabelText('Show changed columns only'));
    const table = screen.getByRole('table');
    expect(within(table).queryByText('status')).not.toBeInTheDocument();
    expect(within(table).getByText('email')).toBeInTheDocument();
  });
});
