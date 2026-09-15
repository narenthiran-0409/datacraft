import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StagingProgressView } from '../StagingProgressView';

function baseProps(overrides: Partial<React.ComponentProps<typeof StagingProgressView>> = {}) {
  return {
    isOpen: true,
    onClose: vi.fn(),
    phase: 'COPYING_SOURCE' as const,
    progressPercentage: null,
    copiedRowCount: null,
    sourceRowCount: null,
    materializedRowCount: null,
    sourceLabel: 'CBE_OnPrem / dbo.DataCraft_AI_Test',
    destinationLabel: 'staging_data.datacraft_ai_test__abc123',
    ...overrides,
  };
}

describe('StagingProgressView', () => {
  it('renders every in-flight step, marking earlier ones done', () => {
    render(<StagingProgressView {...baseProps({ phase: 'APPLYING_CORRECTIONS' })} />);
    expect(screen.getByText('Preparing staging schema')).toBeInTheDocument();
    expect(screen.getByText('Creating destination table')).toBeInTheDocument();
    expect(screen.getByText('Copying source data')).toBeInTheDocument();
    expect(screen.getByText('Applying approved changes')).toBeInTheDocument();
    // QUEUED, PREPARING_SCHEMA, CREATING_TABLE, COPYING_SOURCE are all before APPLYING_CORRECTIONS.
    expect(screen.getAllByText('check_circle')).toHaveLength(4);
  });

  it('uses the real backend progress_percentage when known, as a determinate progressbar', () => {
    render(<StagingProgressView {...baseProps({ phase: 'COPYING_SOURCE', progressPercentage: 42 })} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders an indeterminate progressbar (no aria-valuenow) when the percentage is unknown, never inventing one', () => {
    render(<StagingProgressView {...baseProps({ phase: 'PREPARING_SCHEMA', progressPercentage: null })} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('shows real copied/source row counters', () => {
    render(<StagingProgressView {...baseProps({ phase: 'COPYING_SOURCE', copiedRowCount: 8000, sourceRowCount: 12500 })} />);
    expect(screen.getByText('8,000 / 12,500 rows copied')).toBeInTheDocument();
  });

  it('shows the completion summary and a View Staged Dataset action when phase is READY', () => {
    const onViewStagedDataset = vi.fn();
    render(
      <StagingProgressView
        {...baseProps({ phase: 'READY', materializedRowCount: 13 })}
        onViewStagedDataset={onViewStagedDataset}
      />
    );
    expect(screen.getByText('Staging Complete')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('Rows Staged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Staged Dataset' })).toBeInTheDocument();
  });

  it('shows the sanitized error message when phase is FAILED, with no stack trace', () => {
    render(<StagingProgressView {...baseProps({ phase: 'FAILED', errorMessage: 'Source connection unreachable' })} />);
    expect(screen.getByText('Staging Failed')).toBeInTheDocument();
    expect(screen.getByText('Source connection unreachable')).toBeInTheDocument();
  });

  it('offers Retry for a FAILED run only when the caller says retry is safe', () => {
    const onRetryStaging = vi.fn();
    const { rerender } = render(<StagingProgressView {...baseProps({ phase: 'FAILED' })} canRetryStaging={false} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    rerender(
      <StagingProgressView {...baseProps({ phase: 'FAILED' })} canRetryStaging onRetryStaging={onRetryStaging} />
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a cancelled message for phase CANCELLED', () => {
    render(<StagingProgressView {...baseProps({ phase: 'CANCELLED' })} />);
    expect(screen.getByText('Staging Cancelled')).toBeInTheDocument();
  });

  it('shows a legacy explanation for phase LEGACY, with no progress bar or steps', () => {
    render(<StagingProgressView {...baseProps({ phase: 'LEGACY' })} />);
    expect(screen.getByText('Legacy Staging Run')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows a transient poll-error banner distinct from the run itself failing, with its own retry', () => {
    const onRetryPoll = vi.fn();
    render(
      <StagingProgressView
        {...baseProps({ phase: 'COPYING_SOURCE' })}
        pollError="Couldn't refresh status — check your connection."
        onRetryPoll={onRetryPoll}
      />
    );
    expect(screen.getByText("Couldn't refresh status — check your connection.")).toBeInTheDocument();
    expect(screen.queryByText('Staging Failed')).not.toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<StagingProgressView {...baseProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
