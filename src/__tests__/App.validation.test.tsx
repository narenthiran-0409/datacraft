import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import type { DatasetResponse, MeResponse, ValidationRunResponse } from '../api/client';

// V1.0 UX polish — the critical "navigate away while a background operation
// runs" scenario, for Validation (the highest-priority flow per the task).
// Proves the completion toast (with its "View Results" CTA) reaches the user
// even after they've left the page that started the run, and that the CTA
// navigates to the real run.

const {
  bootstrapSessionMock,
  onSessionExpiredMock,
  getDatasetMock,
  listDatasetColumnsMock,
  listValidationRunsMock,
  createValidationRunMock,
  getValidationRunMock,
  listDatasetsMock,
} = vi.hoisted(() => ({
  bootstrapSessionMock: vi.fn(),
  onSessionExpiredMock: vi.fn(() => () => {}),
  getDatasetMock: vi.fn(),
  listDatasetColumnsMock: vi.fn(),
  listValidationRunsMock: vi.fn(),
  createValidationRunMock: vi.fn(),
  getValidationRunMock: vi.fn(),
  listDatasetsMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    bootstrapSession: bootstrapSessionMock,
    onSessionExpired: onSessionExpiredMock,
    getDataset: getDatasetMock,
    listDatasetColumns: listDatasetColumnsMock,
    listValidationRuns: listValidationRunsMock,
    createValidationRun: createValidationRunMock,
    getValidationRun: getValidationRunMock,
    listDatasets: listDatasetsMock,
  };
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

const VALIDATION_USER: MeResponse = {
  id: 'user-1',
  email: 'qa@example.com',
  username: 'qa',
  full_name: 'QA User',
  status: 'ACTIVE',
  permissions: ['metadata.read', 'validation.run'],
};

const DATASET: DatasetResponse = {
  id: 'ds-1',
  schema_id: 'schema-1',
  name: 'Customer_Orders',
  object_type: 'TABLE',
  key_strategy: 'order_id',
  row_count_estimate: 13,
  column_count: 2,
  last_quality_score: null,
  is_active: true,
  discovered_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: null,
};

function makeValidationRun(overrides: Partial<ValidationRunResponse> = {}): ValidationRunResponse {
  return {
    id: 'run-1',
    dataset_id: 'ds-1',
    template_id: null,
    job_id: 'job-1',
    status: 'CREATED',
    sample_size: null,
    total_rows: 13,
    passed_rows: 0,
    warning_rows: 0,
    failed_rows: 0,
    quality_score: null,
    rules_evaluated_count: 0,
    no_applicable_rules: false,
    error_message: null,
    triggered_by: null,
    started_at: null,
    completed_at: null,
    duration_ms: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  bootstrapSessionMock.mockReset();
  onSessionExpiredMock.mockClear();
  getDatasetMock.mockReset();
  listDatasetColumnsMock.mockReset();
  listValidationRunsMock.mockReset();
  createValidationRunMock.mockReset();
  getValidationRunMock.mockReset();
  listDatasetsMock.mockReset();

  bootstrapSessionMock.mockResolvedValue(VALIDATION_USER);
  getDatasetMock.mockResolvedValue(DATASET);
  listDatasetColumnsMock.mockResolvedValue([]);
  listValidationRunsMock.mockResolvedValue([]);
  listDatasetsMock.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 200 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Validation — navigate-away operation visibility', () => {
  it('acknowledges the run, then still delivers the completion toast + View Results CTA after navigating to Dashboard', async () => {
    const user = userEvent.setup();
    createValidationRunMock.mockResolvedValue(makeValidationRun({ status: 'CREATED' }));
    getValidationRunMock.mockResolvedValue(
      makeValidationRun({ status: 'COMPLETED', warning_rows: 1, failed_rows: 2, completed_at: '2026-01-01T00:05:00Z' })
    );

    renderApp('/datasets/ds-1');

    const runButton = await screen.findByRole('button', { name: /Run Validation/ });
    await user.click(runButton);

    // No enabled rule assignments for this dataset (none mocked) -> the
    // guided pre-check modal appears first, exactly as it does for a real
    // zero-rule dataset.
    const runAnyway = await screen.findByText('Run Anyway');
    await user.click(runAnyway);

    await waitFor(() => expect(createValidationRunMock).toHaveBeenCalledWith('ds-1', {}));
    await screen.findByText(/Validation started for "Customer_Orders"/);

    // Navigate away entirely before the run finishes. (Sidebar buttons pair an
    // icon-font span with the label, so their accessible name concatenates
    // both — matched with a substring regex, same convention used elsewhere.)
    const sidebarButtons = screen.getAllByRole('button', { name: /Dashboard/ });
    await user.click(sidebarButtons[0]);
    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/dashboard'));

    // The completion toast must still reach the user here, with real counts
    // (1 + 2 = 3 issues) and a working CTA into the actual run.
    await screen.findByText(/Validation completed for "Customer_Orders" · 3 issues found/, {}, { timeout: 5000 });
    const viewResults = screen.getByRole('button', { name: 'View Results' });
    await user.click(viewResults);

    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/validation/ds-1/runs/run-1'));
  }, 15000);

  it('shows a failure toast (not a success one) when the watched run fails', async () => {
    const user = userEvent.setup();
    createValidationRunMock.mockResolvedValue(makeValidationRun({ status: 'CREATED' }));
    getValidationRunMock.mockResolvedValue(makeValidationRun({ status: 'FAILED', error_message: 'Source unreachable' }));

    renderApp('/datasets/ds-1');

    const runButton = await screen.findByRole('button', { name: /Run Validation/ });
    await user.click(runButton);
    const runAnyway = await screen.findByText('Run Anyway');
    await user.click(runAnyway);

    await screen.findByText(/Validation failed for "Customer_Orders"/, {}, { timeout: 5000 });
    expect(screen.queryByText(/Validation completed/)).not.toBeInTheDocument();
  }, 15000);

  it('prevents a duplicate validation trigger while a run is already active for this dataset', async () => {
    const user = userEvent.setup();
    createValidationRunMock.mockResolvedValue(makeValidationRun({ status: 'CREATED' }));
    // Never resolves to a terminal status during this test — the run stays active.
    getValidationRunMock.mockResolvedValue(makeValidationRun({ status: 'RUNNING' }));

    renderApp('/datasets/ds-1');

    const runButton = await screen.findByRole('button', { name: /Run Validation/ });
    await user.click(runButton);
    const runAnyway = await screen.findByText('Run Anyway');
    await user.click(runAnyway);

    await waitFor(() => expect(createValidationRunMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Running…/ })).toBeDisabled());
  }, 15000);
});
