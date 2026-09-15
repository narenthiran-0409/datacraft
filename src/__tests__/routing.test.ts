import { describe, expect, it } from 'vitest';
import { resolveScreen, SCREEN_TO_PATH } from '../routing';

describe('resolveScreen', () => {
  it('resolves "/" and "/dashboard" to the dashboard screen', () => {
    expect(resolveScreen('/').screen).toBe('dashboard');
    expect(resolveScreen('/dashboard').screen).toBe('dashboard');
  });

  it('resolves every top-level module to its own screen', () => {
    expect(resolveScreen('/data-sources').screen).toBe('data-sources');
    expect(resolveScreen('/data-sources/new').screen).toBe('add-data-source');
    expect(resolveScreen('/data-explorer').screen).toBe('data-explorer');
    expect(resolveScreen('/data-profiling').screen).toBe('data-profiling');
    expect(resolveScreen('/validation').screen).toBe('validation-workspace');
    expect(resolveScreen('/data-quality-rules').screen).toBe('quality-rules');
    expect(resolveScreen('/review-corrections').screen).toBe('review-corrections');
    expect(resolveScreen('/approval-center').screen).toBe('approval-center');
    expect(resolveScreen('/staging-publish').screen).toBe('staging-publish');
    expect(resolveScreen('/data-lineage').screen).toBe('data-lineage');
    expect(resolveScreen('/run-history').screen).toBe('run-history');
    expect(resolveScreen('/reports').screen).toBe('reports');
    expect(resolveScreen('/insights').screen).toBe('insights');
    expect(resolveScreen('/user-management').screen).toBe('user-management');
    expect(resolveScreen('/settings').screen).toBe('settings');
    expect(resolveScreen('/login').screen).toBe('login');
  });

  it('resolves a dataset detail route and extracts the datasetId param', () => {
    const result = resolveScreen('/validation/ds-123');
    expect(result.screen).toBe('validation-workspace');
    expect(result.params.datasetId).toBe('ds-123');
  });

  it('resolves the same dataset-detail pattern for all five master/detail modules', () => {
    expect(resolveScreen('/data-quality-rules/ds-1')).toMatchObject({
      screen: 'quality-rules',
      params: { datasetId: 'ds-1' },
    });
    expect(resolveScreen('/review-corrections/ds-1')).toMatchObject({
      screen: 'review-corrections',
      params: { datasetId: 'ds-1' },
    });
    expect(resolveScreen('/approval-center/ds-1')).toMatchObject({
      screen: 'approval-center',
      params: { datasetId: 'ds-1' },
    });
    expect(resolveScreen('/staging-publish/ds-1')).toMatchObject({
      screen: 'staging-publish',
      params: { datasetId: 'ds-1' },
    });
  });

  it('prefers the most specific match: a validation run route over its parent dataset route', () => {
    const result = resolveScreen('/validation/ds-123/runs/run-456');
    expect(result.screen).toBe('validation-run-details');
    expect(result.params).toEqual({ datasetId: 'ds-123', runId: 'run-456' });
  });

  it('resolves dataset-overview and dataset-preview routes', () => {
    expect(resolveScreen('/datasets/ds-1')).toMatchObject({
      screen: 'dataset-overview',
      params: { datasetId: 'ds-1' },
    });
    expect(resolveScreen('/datasets/ds-1/preview')).toMatchObject({
      screen: 'dataset-preview',
      params: { datasetId: 'ds-1' },
    });
  });

  it('falls back to not-found for an unknown route', () => {
    expect(resolveScreen('/this-page-does-not-exist').screen).toBe('not-found');
    expect(resolveScreen('/validation/ds-1/runs').screen).toBe('not-found');
  });
});

describe('SCREEN_TO_PATH', () => {
  it('has a bare path for every screen reachable via a plain sidebar/onNavigate(screen) call', () => {
    for (const screen of [
      'dashboard',
      'data-sources',
      'data-explorer',
      'data-profiling',
      'validation-workspace',
      'quality-rules',
      'review-corrections',
      'approval-center',
      'staging-publish',
      'data-lineage',
      'run-history',
      'reports',
      'insights',
      'user-management',
      'settings',
    ] as const) {
      expect(SCREEN_TO_PATH[screen]).toBeTruthy();
    }
  });

  it('round-trips every bare path back through resolveScreen to the same screen', () => {
    for (const [screen, path] of Object.entries(SCREEN_TO_PATH)) {
      expect(resolveScreen(path as string).screen).toBe(screen);
    }
  });
});
