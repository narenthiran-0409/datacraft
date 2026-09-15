import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, getStagingDestination, getStagingPreview, getStagingRun } from '../client';

// Focused tests for the Phase 4.12B materialized-staging API client additions.
// Mocks global fetch directly rather than a network layer, matching this
// module's own real shape (rawRequest -> fetch -> res.json()).

function mockFetchOnce(status: number, body: unknown) {
  const ok = status >= 200 && status < 300;
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    status,
    ok,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getStagingRun', () => {
  it('requests /staging-runs/{id} and returns the real materialization fields', async () => {
    const body = {
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
      destination_schema: 'staging_data',
      destination_table: 'datacraft_ai_test__abc123',
      source_row_count: 13,
      materialized_row_count: 13,
      copied_row_count: 13,
      materialization_phase: 'READY',
      progress_percentage: 100,
      materialization_error: null,
    };
    mockFetchOnce(200, body);

    const result = await getStagingRun('run-1');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/staging-runs/run-1');
    expect(result.materialization_phase).toBe('READY');
    expect(result.destination_schema).toBe('staging_data');
    expect(result.destination_table).toBe('datacraft_ai_test__abc123');
    expect(result.progress_percentage).toBe(100);
  });

  it('propagates a real backend failure without pretending it succeeded', async () => {
    mockFetchOnce(404, { error: { code: 'STAGING_RUN_NOT_FOUND', message: 'Staging run not found' } });
    await expect(getStagingRun('missing')).rejects.toMatchObject({ status: 404, code: 'STAGING_RUN_NOT_FOUND' });
  });
});

describe('getStagingDestination', () => {
  it('requests /staging-runs/{id}/destination and returns real column/count metadata', async () => {
    const body = {
      staging_run_id: 'run-1',
      destination_schema: 'staging_data',
      destination_table: 'datacraft_ai_test__abc123',
      columns: [{ name: 'order_id', normalized_data_type: 'INTEGER', staging_data_type: 'integer' }],
      source_row_count: 13,
      materialized_row_count: 13,
      copied_row_count: 13,
      materialization_phase: 'READY',
      progress_percentage: 100,
      approved_correction_count: 1,
      affected_row_count: 1,
    };
    mockFetchOnce(200, body);

    const result = await getStagingDestination('run-1');

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/staging-runs/run-1/destination');
    expect(result.destination_table).toBe('datacraft_ai_test__abc123');
    expect(result.columns).toHaveLength(1);
    expect(result.affected_row_count).toBe(1);
  });

  it('surfaces the backend 409 STAGING_RUN_NOT_MATERIALIZED as a typed ApiError rather than crashing', async () => {
    mockFetchOnce(409, {
      error: { code: 'STAGING_RUN_NOT_MATERIALIZED', message: 'Staging run has no materialized dataset' },
    });

    try {
      await getStagingDestination('run-legacy');
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(409);
      expect((err as ApiError).code).toBe('STAGING_RUN_NOT_MATERIALIZED');
    }
  });
});

describe('getStagingPreview', () => {
  const previewBody = {
    columns: ['order_id', 'order_amount'],
    rows: [
      {
        values: { order_id: 1012, order_amount: 980 },
        record_ref: '1012',
        is_changed: true,
        corrected_fields: [{ column_name: 'order_amount', original_value: '-500.00', final_value: '980', issue_id: 'issue-1' }],
      },
    ],
    total_rows: 13,
    limit: 50,
    offset: 0,
    has_more: false,
  };

  it('defaults to filter=ALL with no query string when called with no options', async () => {
    mockFetchOnce(200, previewBody);
    await getStagingPreview('run-1');
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/staging-runs/run-1/preview');
    expect(url).not.toContain('filter=');
  });

  it('sends filter=CHANGED with limit/offset as real query params', async () => {
    mockFetchOnce(200, previewBody);
    await getStagingPreview('run-1', { filter: 'CHANGED', limit: 25, offset: 25 });
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('filter=CHANGED');
    expect(url).toContain('limit=25');
    expect(url).toContain('offset=25');
  });

  it('sends filter=UNCHANGED', async () => {
    mockFetchOnce(200, previewBody);
    await getStagingPreview('run-1', { filter: 'UNCHANGED' });
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('filter=UNCHANGED');
  });

  it('returns the real record_ref (e.g. "1012") from the backend without any client-side parsing', async () => {
    mockFetchOnce(200, previewBody);
    const result = await getStagingPreview('run-1', { filter: 'CHANGED' });
    expect(result.rows[0].record_ref).toBe('1012');
    expect(result.rows[0].is_changed).toBe(true);
    expect(result.rows[0].corrected_fields[0].final_value).toBe('980');
    expect(result.total_rows).toBe(13);
  });
});
