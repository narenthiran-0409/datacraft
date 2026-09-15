import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import type {
  ConnectionResponse,
  DatasetResponse,
  MeResponse,
  StagingCandidateResponse,
} from '../api/client';

// V1.0 acceptance fix — the Staging page's "Ready to Stage" counter/list must
// come from the backend-authoritative GET /api/v1/staging-candidates, never
// a client-side re-derivation of "is this approved" (see App.tsx's
// computeStagingDatasetStatus). This is exactly the Employee_Payroll_Test
// forensic scenario: an approved review with zero staging_run yet.

const {
  bootstrapSessionMock,
  onSessionExpiredMock,
  getStagingCandidatesMock,
  listDatasetsMock,
  listConnectionsMock,
  listSchemasMock,
} = vi.hoisted(() => ({
  bootstrapSessionMock: vi.fn(),
  onSessionExpiredMock: vi.fn(() => () => {}),
  getStagingCandidatesMock: vi.fn(),
  listDatasetsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  listSchemasMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    bootstrapSession: bootstrapSessionMock,
    onSessionExpired: onSessionExpiredMock,
    getStagingCandidates: getStagingCandidatesMock,
    listDatasets: listDatasetsMock,
    listConnections: listConnectionsMock,
    listSchemas: listSchemasMock,
  };
});

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

// staging.read + metadata.read is enough to reach the Staging & Publish
// master list without needing to mock review.read/approval.read's own
// fetches too — computeStagingDatasetStatus finds a match in
// stagingCandidates directly and never falls back to the client-derived
// reviewRuns/approvalQueue path for a dataset that has one.
const STAGING_USER: MeResponse = {
  id: 'user-1',
  email: 'qa@example.com',
  username: 'qa',
  full_name: 'QA User',
  status: 'ACTIVE',
  permissions: ['staging.read', 'metadata.read'],
};

const DATASET: DatasetResponse = {
  id: 'ds-payroll',
  schema_id: 'schema-1',
  name: 'Employee_Payroll_Test',
  object_type: 'TABLE',
  key_strategy: 'SINGLE_COLUMN',
  row_count_estimate: 15,
  column_count: 8,
  last_quality_score: '73.33',
  is_active: true,
  discovered_at: '2026-09-15T00:00:00Z',
  created_at: '2026-09-15T00:00:00Z',
  updated_at: null,
};

const CONNECTION: ConnectionResponse = {
  id: 'conn-1',
  data_source_id: 'ds-source-1',
  connection_type_id: 'ct-1',
  name: 'CBE_SQL',
  environment: 'production',
  host: '172.16.17.251',
  port: 1433,
  database_name: 'datacraft_test',
  service_name: null,
  username: 'cams',
  config: {},
  status: 'ACTIVE',
  last_tested_at: null,
  last_test_latency_ms: null,
  is_active: true,
  deactivated_at: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: null,
};

function makeCandidate(overrides: Partial<StagingCandidateResponse> = {}): StagingCandidateResponse {
  return {
    review_run_id: 'rr-payroll',
    validation_run_id: 'vr-payroll',
    dataset_id: 'ds-payroll',
    dataset_name: 'Employee_Payroll_Test',
    connection_id: 'conn-1',
    connection_name: 'CBE_SQL',
    approval_request_id: 'ar-payroll',
    approval_status: 'APPROVED',
    affected_issue_count: 4,
    affected_record_count: 4,
    approval_decided_at: '2026-09-15T15:37:22Z',
    staging_run_id: null,
    staging_status: null,
    staging_attempt_number: null,
    readiness: 'READY_TO_STAGE',
    not_ready_reason: null,
    ...overrides,
  };
}

beforeEach(() => {
  bootstrapSessionMock.mockReset();
  onSessionExpiredMock.mockClear();
  getStagingCandidatesMock.mockReset();
  listDatasetsMock.mockReset();
  listConnectionsMock.mockReset();
  listSchemasMock.mockReset();

  listDatasetsMock.mockResolvedValue({ items: [DATASET], total: 1, page: 1, page_size: 200 });
  listConnectionsMock.mockResolvedValue([CONNECTION]);
  listSchemasMock.mockResolvedValue([{ id: 'schema-1', connection_id: 'conn-1', name: 'dbo', is_active: true, discovered_at: '2026-09-01T00:00:00Z' }]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The summary strip's label text (e.g. "Failed", "Staged") can collide with
// the same word rendered as a per-row status badge — this disambiguates by
// requiring the match's OWN previous sibling to be a bare digit, which only
// WorkflowSummaryCards' <p>{value}</p><p>{label}</p> pairing produces.
function summaryCount(label: string): string {
  const match = screen.getAllByText(label).find((el) => /^\d+$/.test(el.previousElementSibling?.textContent ?? ''));
  if (!match) throw new Error(`No summary card found for label "${label}"`);
  return match.previousElementSibling!.textContent!;
}

describe('Staging page — backend-authoritative Ready to Stage (V1.0 acceptance fix)', () => {
  it('shows Ready to Stage = 1 and the approved dataset for an APPROVED, unstaged candidate', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingCandidatesMock.mockResolvedValue([makeCandidate()]);

    renderApp('/staging-publish');

    await waitFor(() => expect(getStagingCandidatesMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Employee_Payroll_Test')).toBeInTheDocument());

    expect(summaryCount('Ready to Stage')).toBe('1');
    expect(summaryCount('Staged')).toBe('0');
  });

  it('shows Staged = 1 for a candidate with a READY staging run, not Ready to Stage', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingCandidatesMock.mockResolvedValue([
      makeCandidate({ readiness: 'STAGED', staging_run_id: 'run-1', staging_status: 'READY', staging_attempt_number: 1 }),
    ]);

    renderApp('/staging-publish');

    await waitFor(() => expect(screen.getByText('Employee_Payroll_Test')).toBeInTheDocument());
    expect(summaryCount('Staged')).toBe('1');
    expect(summaryCount('Ready to Stage')).toBe('0');
  });

  it('shows Failed = 1 for a candidate with a FAILED staging run', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingCandidatesMock.mockResolvedValue([
      makeCandidate({ readiness: 'FAILED', staging_run_id: 'run-1', staging_status: 'FAILED', staging_attempt_number: 1 }),
    ]);

    renderApp('/staging-publish');

    await waitFor(() => expect(screen.getByText('Employee_Payroll_Test')).toBeInTheDocument());
    expect(summaryCount('Failed')).toBe('1');
  });

  it('never derives Ready to Stage from review.status — a dataset absent from the candidates response shows 0, not fabricated', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingCandidatesMock.mockResolvedValue([]); // no candidate at all for DATASET

    renderApp('/staging-publish');

    await waitFor(() => expect(getStagingCandidatesMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Employee_Payroll_Test')).toBeInTheDocument());
    expect(summaryCount('Ready to Stage')).toBe('0');
  });
});
