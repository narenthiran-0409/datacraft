import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import type { DatasetResponse, JobResponse, MeResponse } from '../api/client';

// V1.0 UX polish — AI rule suggestion feedback: immediate acknowledgement
// once the backend accepts the job, a completion toast with real counts and
// a "Review Suggestions" CTA into the real dataset's Data Quality Rules page.

const {
  bootstrapSessionMock,
  onSessionExpiredMock,
  getDatasetMock,
  listDatasetColumnsMock,
  listValidationRunsMock,
  triggerRuleDetectionMock,
  getJobMock,
  listRulesMock,
  listRuleAssignmentsMock,
} = vi.hoisted(() => ({
  bootstrapSessionMock: vi.fn(),
  onSessionExpiredMock: vi.fn(() => () => {}),
  getDatasetMock: vi.fn(),
  listDatasetColumnsMock: vi.fn(),
  listValidationRunsMock: vi.fn(),
  triggerRuleDetectionMock: vi.fn(),
  getJobMock: vi.fn(),
  listRulesMock: vi.fn(),
  listRuleAssignmentsMock: vi.fn(),
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
    triggerRuleDetection: triggerRuleDetectionMock,
    getJob: getJobMock,
    listRules: listRulesMock,
    listRuleAssignments: listRuleAssignmentsMock,
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

const USER: MeResponse = {
  id: 'user-1',
  email: 'qa@example.com',
  username: 'qa',
  full_name: 'QA User',
  status: 'ACTIVE',
  permissions: ['metadata.read', 'ai.suggest', 'rules.read'],
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

function makeJob(overrides: Partial<JobResponse> = {}): JobResponse {
  return {
    id: 'job-1',
    job_type: 'AI_SUGGESTION',
    entity_type: 'DATASET',
    entity_id: 'ds-1',
    status: 'COMPLETED',
    progress_percentage: null,
    error_message: null,
    result: { pattern_detected_count: 2, ai_recommended_count: 1 },
    ...overrides,
  } as JobResponse;
}

beforeEach(() => {
  bootstrapSessionMock.mockReset();
  onSessionExpiredMock.mockClear();
  getDatasetMock.mockReset();
  listDatasetColumnsMock.mockReset();
  listValidationRunsMock.mockReset();
  triggerRuleDetectionMock.mockReset();
  getJobMock.mockReset();
  listRulesMock.mockReset();
  listRuleAssignmentsMock.mockReset();

  bootstrapSessionMock.mockResolvedValue(USER);
  getDatasetMock.mockResolvedValue(DATASET);
  listDatasetColumnsMock.mockResolvedValue([]);
  listValidationRunsMock.mockResolvedValue([]);
  listRulesMock.mockResolvedValue([]);
  listRuleAssignmentsMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI rule detection feedback', () => {
  it('acknowledges the job, then shows a completion toast with real counts and a Review Suggestions CTA', async () => {
    const user = userEvent.setup();
    triggerRuleDetectionMock.mockResolvedValue({ job_id: 'job-1' });
    // A real AI job takes real time — delaying the first status check lets the
    // "started" acknowledgement actually be observed before it's replaced by
    // the completion toast (this app shows one toast at a time).
    getJobMock.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve(makeJob()), 300)));
    getJobMock.mockResolvedValue(makeJob());

    renderApp('/datasets/ds-1');

    await user.click(await screen.findByText('Quality Rules'));
    const suggestButton = await screen.findByRole('button', { name: /Suggest Rules/ });
    await user.click(suggestButton);

    await screen.findByText(/Rule analysis started for "Customer_Orders"/);
    await screen.findByText(/Rule analysis completed for "Customer_Orders" · 3 suggestions found/, {}, { timeout: 5000 });

    const cta = screen.getByRole('button', { name: 'Review Suggestions' });
    await user.click(cta);
    await waitFor(() => expect(screen.getByTestId('location-probe').textContent).toBe('/data-quality-rules/ds-1'));
  }, 15000);

  it('shows a failure toast when the AI job fails, without claiming success', async () => {
    const user = userEvent.setup();
    triggerRuleDetectionMock.mockResolvedValue({ job_id: 'job-1' });
    getJobMock.mockResolvedValue(makeJob({ status: 'FAILED', error_message: 'LLM unavailable', result: null }));

    renderApp('/datasets/ds-1');

    await user.click(await screen.findByText('Quality Rules'));
    const suggestButton = await screen.findByRole('button', { name: /Suggest Rules/ });
    await user.click(suggestButton);

    await screen.findByText(/Rule analysis failed for "Customer_Orders"/, {}, { timeout: 5000 });
    expect(screen.queryByText(/Rule analysis completed/)).not.toBeInTheDocument();
  }, 15000);
});
