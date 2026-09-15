import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import type { MeResponse, StagingRunResponse } from '../api/client';

// Phase 4.12B — focused tests for App.tsx's real materialization polling/
// resume orchestration: the piece with the most genuinely new risk (the
// null-materialization_phase QUEUED-vs-LEGACY ambiguity, the refresh-must-
// not-create-a-second-run requirement, and the reset-effect ordering hazard
// fixed alongside this). Uses a user with only staging.read (not
// staging.create) so the workspace's own dataset/review data doesn't need
// mocking — every effect that would need it is gated behind metadata.read/
// review.read, which this user doesn't have, so those simply never fire
// (same technique as App.routing.test.tsx). Only the staging-run resume/poll
// path is under test here.

const { bootstrapSessionMock, onSessionExpiredMock, getStagingRunMock, createStagingRunMock } = vi.hoisted(() => ({
  bootstrapSessionMock: vi.fn(),
  onSessionExpiredMock: vi.fn(() => () => {}),
  getStagingRunMock: vi.fn(),
  createStagingRunMock: vi.fn(),
}));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    bootstrapSession: bootstrapSessionMock,
    onSessionExpired: onSessionExpiredMock,
    getStagingRun: getStagingRunMock,
    createStagingRun: createStagingRunMock,
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

const STAGING_USER: MeResponse = {
  id: 'user-1',
  email: 'qa@example.com',
  username: 'qa',
  full_name: 'QA User',
  status: 'ACTIVE',
  permissions: ['staging.read'],
};

function makeRun(overrides: Partial<StagingRunResponse> = {}): StagingRunResponse {
  return {
    id: 'run-1',
    review_run_id: 'rr-1',
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

beforeEach(() => {
  bootstrapSessionMock.mockReset();
  onSessionExpiredMock.mockClear();
  getStagingRunMock.mockReset();
  createStagingRunMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Real-timer wait — the 1.5s poll interval doesn't combine reliably with
 * fake timers here (React effect scheduling + testing-library's own
 * real-setTimeout-based waitFor), so these tests trade a couple of real
 * seconds for a genuinely reliable signal instead. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('App staging run resume (Phase 4.12B refresh safety)', () => {
  it('loads the run named in ?stagingRunId= directly from a fresh mount, without ever calling createStagingRun', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingRunMock.mockResolvedValue(makeRun({ materialization_phase: 'COPYING_SOURCE', progress_percentage: 40 }));

    renderApp('/staging-publish/ds-1?stagingRunId=run-1');

    await waitFor(() => expect(getStagingRunMock).toHaveBeenCalledWith('run-1'));
    expect(createStagingRunMock).not.toHaveBeenCalled();
  });

  it('keeps polling a genuinely in-progress run and reflects a later terminal READY state', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingRunMock
      .mockResolvedValueOnce(makeRun({ materialization_phase: 'COPYING_SOURCE' }))
      .mockResolvedValue(makeRun({ materialization_phase: 'READY', materialized_row_count: 13 }));

    renderApp('/staging-publish/ds-1?stagingRunId=run-1');

    await waitFor(() => expect(getStagingRunMock).toHaveBeenCalledTimes(1));
    // A second poll (the run reaching READY) should land within ~1.5s.
    await waitFor(() => expect(getStagingRunMock).toHaveBeenCalledTimes(2), { timeout: 3000 });

    const callsAtReady = getStagingRunMock.mock.calls.length;
    await sleep(2500);
    // No further polling once the run reached a terminal (READY) phase.
    expect(getStagingRunMock.mock.calls.length).toBe(callsAtReady);
  }, 10000);

  it('never polls a resumed run with no materialization info (legacy / pre-4.12) beyond the initial fetch', async () => {
    bootstrapSessionMock.mockResolvedValue(STAGING_USER);
    getStagingRunMock.mockResolvedValue(makeRun({ materialization_phase: null, destination_table: null }));

    renderApp('/staging-publish/ds-1?stagingRunId=run-legacy');

    await waitFor(() => expect(getStagingRunMock).toHaveBeenCalledTimes(1));
    await sleep(2500);
    // A run we did NOT just create ourselves, with a null phase, is LEGACY —
    // resolveMaterializationUiPhase says so, and LEGACY is terminal.
    expect(getStagingRunMock).toHaveBeenCalledTimes(1);
  }, 10000);
});
