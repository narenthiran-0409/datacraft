import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StagingPublishView, SelectedDatasetWorkspace } from '../StagingPublishView';
import { StagingRunResponse } from '../../../api/client';
import { PENDING_STAGING_DESTINATION } from '../../../data/datasetStagingWorkflow';

function makeSelectedDataset(overrides: Partial<SelectedDatasetWorkspace> = {}): SelectedDatasetWorkspace {
  return {
    id: 'ds-1',
    name: 'DataCraft_AI_Test',
    connectionName: 'CBE_OnPrem',
    schemaName: 'dbo',
    keyStrategy: 'order_id',
    sourceRowCount: 13,
    lastValidationLabel: 'Completed Sep 10, 2026',
    approvalStatusLabel: 'Approved',
    resolvedIssueCount: 2,
    totalIssueCount: 2,
    status: 'READY_TO_STAGE',
    ...overrides,
  };
}

function makeStagingRun(overrides: Partial<StagingRunResponse> = {}): StagingRunResponse {
  return {
    id: 'staging-1',
    review_run_id: 'run-1',
    dataset_id: 'ds-1',
    job_id: 'job-1',
    attempt_number: 1,
    is_current: true,
    status: 'READY',
    record_count: 1,
    field_count: 1,
    has_source_drift: false,
    error_message: null,
    created_by: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    destination_schema: null,
    destination_table: null,
    source_row_count: null,
    materialized_row_count: null,
    copied_row_count: 0,
    materialization_phase: null,
    progress_percentage: null,
    materialization_error: null,
    ...overrides,
  };
}

function baseProps(overrides: Partial<React.ComponentProps<typeof StagingPublishView>> = {}) {
  return {
    onNavigate: vi.fn(),
    selectedDataset: makeSelectedDataset(),
    approvedChanges: [
      { recordRef: 'id=1011', columnName: 'Email', originalValue: 'suresh-invalid-email', stagedValue: 'suresh.kumar@gmail.com' },
    ],
    previewColumns: [{ name: 'email' }],
    previewRows: [
      { key: 'id=1011', isChanged: true, cells: { email: { value: 'suresh.kumar@gmail.com', isChanged: true, originalValue: 'suresh-invalid-email' } } },
    ],
    previewLimitationNote: null,
    tableStructureColumns: [{ name: 'order_id', dataType: 'INT', isPrimaryKey: true }],
    stagingDestination: PENDING_STAGING_DESTINATION,
    stagingRun: null,
    stagingRecords: [],
    driftOnly: false,
    onToggleDriftOnly: vi.fn(),
    publishRun: null,
    canCreateStaging: true,
    canPublish: true,
    isActionPending: false,
    actionError: null,
    onCreateStagingRun: vi.fn(),
    onPublish: vi.fn(),
    onAcknowledgeDrift: vi.fn(),
    revalidationByRecordId: new Map(),
    revalidationLoadingIds: new Set<string>(),
    revalidationErrorByRecordId: new Map(),
    onLoadRevalidation: vi.fn(),
    materializationPhase: null,
    progressPercentage: null,
    copiedRowCount: null,
    materializationSourceRowCount: null,
    materializedRowCount: null,
    materializationError: null,
    realDestinationLabel: null,
    isProgressOpen: false,
    onCloseProgress: vi.fn(),
    pollError: null,
    onRetryPoll: vi.fn(),
    isMaterializedPreviewOpen: false,
    onOpenMaterializedPreview: vi.fn(),
    onCloseMaterializedPreview: vi.fn(),
    materializedDestination: null,
    materializedDestinationLoading: false,
    materializedDestinationError: null,
    materializedPreviewColumns: [],
    materializedPreviewRows: [],
    materializedPreviewTotalRows: 0,
    materializedPreviewLimit: 25,
    materializedPreviewOffset: 0,
    materializedPreviewLoading: false,
    materializedPreviewError: null,
    onRetryMaterializedPreview: vi.fn(),
    materializedPreviewFilter: 'ALL' as const,
    onMaterializedPreviewFilterChange: vi.fn(),
    onMaterializedPreviewOffsetChange: vi.fn(),
    ...overrides,
  };
}

describe('StagingPublishView', () => {
  it('shows a loading state while the dataset is still being resolved', () => {
    render(<StagingPublishView {...baseProps({ selectedDataset: null })} />);
    expect(screen.getByText('Loading dataset…')).toBeInTheDocument();
  });

  it('opens the Preview Staging modal from the workspace header', async () => {
    const user = userEvent.setup();
    render(<StagingPublishView {...baseProps()} />);
    expect(screen.queryByText('Preview Staged Dataset')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Preview Staging/ }));
    expect(screen.getByText('Preview Staged Dataset')).toBeInTheDocument();
  });

  it('disables Stage Dataset for a non-ready (already Approved but not yet Ready to Stage) dataset', () => {
    render(<StagingPublishView {...baseProps({ selectedDataset: makeSelectedDataset({ status: 'APPROVED' }) })} />);
    expect(screen.getByRole('button', { name: 'Stage Dataset' })).toBeDisabled();
  });

  it('does not show a Stage Dataset action at all for a Draft dataset', () => {
    render(<StagingPublishView {...baseProps({ selectedDataset: makeSelectedDataset({ status: 'DRAFT' }) })} />);
    expect(screen.queryByRole('button', { name: 'Stage Dataset' })).not.toBeInTheDocument();
    expect(screen.getByText('No review has started yet')).toBeInTheDocument();
  });

  it('enables Stage Dataset when the dataset is Ready to Stage', () => {
    render(<StagingPublishView {...baseProps()} />);
    expect(screen.getByRole('button', { name: 'Stage Dataset' })).toBeEnabled();
  });

  it('offers Retry Staging (not Stage Dataset) for a Cancelled attempt', () => {
    render(<StagingPublishView {...baseProps({ selectedDataset: makeSelectedDataset({ status: 'CANCELLED' }) })} />);
    expect(screen.getByRole('button', { name: 'Retry Staging' })).toBeEnabled();
  });

  it('opens the confirmation modal (not staging immediately) when Stage Dataset is clicked', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StagingPublishView {...props} />);
    await user.click(screen.getByRole('button', { name: 'Stage Dataset' }));
    expect(screen.getByRole('heading', { name: 'Create Staging Dataset' })).toBeInTheDocument();
    expect(screen.getByText('Source data will not be modified.')).toBeInTheDocument();
    expect(props.onCreateStagingRun).not.toHaveBeenCalled();
  });

  it('calls the real create-staging action exactly once when confirmed, and never simulates a result locally', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<StagingPublishView {...props} />);
    await user.click(screen.getByRole('button', { name: 'Stage Dataset' }));
    await user.click(screen.getByRole('button', { name: 'Create Staging Dataset' }));
    expect(props.onCreateStagingRun).toHaveBeenCalledTimes(1);
    // The progress modal's visibility is entirely parent-controlled
    // (isProgressOpen, URL-derived in App.tsx) — confirming doesn't flip any
    // local "show progress" state on its own.
    expect(screen.queryByText('Staging Complete')).not.toBeInTheDocument();
  });

  it('renders real backend progress once the parent reports an active materialization phase', () => {
    render(
      <StagingPublishView
        {...baseProps({
          stagingRun: makeStagingRun({ materialization_phase: 'COPYING_SOURCE' }),
          materializationPhase: 'COPYING_SOURCE',
          progressPercentage: 42,
          isProgressOpen: true,
        })}
      />
    );
    expect(screen.getByText('Copying source data')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('shows a "View Staged Dataset" action once materialization is READY, and opens the real materialized preview', async () => {
    const user = userEvent.setup();
    const props = baseProps({
      stagingRun: makeStagingRun({
        materialization_phase: 'READY',
        destination_schema: 'staging_data',
        destination_table: 'datacraft_ai_test__abc123',
      }),
      materializationPhase: 'READY',
      realDestinationLabel: 'staging_data.datacraft_ai_test__abc123',
    });
    render(<StagingPublishView {...props} />);
    await user.click(screen.getByRole('button', { name: /View Staged Dataset/ }));
    expect(props.onOpenMaterializedPreview).toHaveBeenCalled();
  });

  it('renders the real materialized preview modal with backend-filtered rows when open', () => {
    render(
      <StagingPublishView
        {...baseProps({
          stagingRun: makeStagingRun({ materialization_phase: 'READY' }),
          materializationPhase: 'READY',
          isMaterializedPreviewOpen: true,
          materializedPreviewColumns: [{ name: 'order_amount' }],
          materializedPreviewRows: [
            { key: '1012', isChanged: true, cells: { order_amount: { value: 980, isChanged: true, originalValue: -500 } } },
          ],
          materializedPreviewTotalRows: 1,
        })}
      />
    );
    expect(screen.getByText('Staged Dataset')).toBeInTheDocument();
    expect(screen.getByText('1012')).toBeInTheDocument();
  });

  it('disables Publish for a real materialized (non-legacy) run with a truthful explanation, never falsely enabling full-dataset publish', () => {
    render(
      <StagingPublishView
        {...baseProps({
          stagingRun: makeStagingRun({ status: 'READY', materialization_phase: 'READY' }),
          materializationPhase: 'READY',
        })}
      />
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(/Full dataset publishing will be enabled after publish integration/)).toBeInTheDocument();
  });

  it('keeps the legacy publish flow available for a pre-4.12 run with no materialization info', () => {
    render(
      <StagingPublishView
        {...baseProps({
          stagingRun: makeStagingRun({ status: 'READY', materialization_phase: null }),
          materializationPhase: 'LEGACY',
        })}
      />
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });
});
