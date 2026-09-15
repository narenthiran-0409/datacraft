import { matchPath } from 'react-router-dom';
import { NavScreen } from './types';

// Real URL routing (replaces the old in-memory `currentScreen` state — see
// App.tsx). This module is the single source of truth for the URL <-> screen
// mapping, kept dependency-free (no React, no api/client) so it can be unit
// tested directly without mounting the whole app.
//
// Master/detail modules (Validation, Data Quality Rules, Review & Corrections,
// Approval Center, Staging & Publish) are all dataset-centric in this app's
// actual architecture (every master row/click-through is keyed by datasetId,
// confirmed directly in App.tsx's *MasterRow definitions) — so each module's
// detail route is `/<module>/:datasetId`, not `/<module>/:someOtherId`, even
// though "approvalId"/"reviewId"-shaped routes might look more RESTful in the
// abstract. A specific review within a dataset's Review & Corrections page is
// addressable via the `?reviewId=` query param instead (see App.tsx), since
// it's a sub-selection within the dataset's review list, not a distinct page.

export interface ScreenRouteEntry {
  screen: NavScreen;
  path: string;
}

// Ordered by module; resolveScreen() itself is order-independent (it picks
// the most specific/longest matching pattern), but keeping run-details above
// its parent dataset pattern above its parent bare pattern documents the
// nesting for readers.
export const SCREEN_ROUTES: ScreenRouteEntry[] = [
  { screen: 'login', path: '/login' },
  // "/" is never a settled address — App.tsx immediately replaces it with
  // "/dashboard" on mount — but resolving it to 'dashboard' here (rather than
  // 'not-found') avoids a one-frame Not Found flash before that redirect runs.
  { screen: 'dashboard', path: '/' },
  { screen: 'dashboard', path: '/dashboard' },
  { screen: 'data-sources', path: '/data-sources' },
  { screen: 'add-data-source', path: '/data-sources/new' },
  { screen: 'data-explorer', path: '/data-explorer' },
  { screen: 'data-profiling', path: '/data-profiling' },
  { screen: 'dataset-overview', path: '/datasets/:datasetId' },
  { screen: 'dataset-preview', path: '/datasets/:datasetId/preview' },
  { screen: 'validation-workspace', path: '/validation' },
  { screen: 'validation-workspace', path: '/validation/:datasetId' },
  { screen: 'validation-run-details', path: '/validation/:datasetId/runs/:runId' },
  { screen: 'quality-rules', path: '/data-quality-rules' },
  { screen: 'quality-rules', path: '/data-quality-rules/:datasetId' },
  { screen: 'review-corrections', path: '/review-corrections' },
  { screen: 'review-corrections', path: '/review-corrections/:datasetId' },
  { screen: 'approval-center', path: '/approval-center' },
  { screen: 'approval-center', path: '/approval-center/:datasetId' },
  { screen: 'staging-publish', path: '/staging-publish' },
  { screen: 'staging-publish', path: '/staging-publish/:datasetId' },
  { screen: 'data-lineage', path: '/data-lineage' },
  { screen: 'data-lineage', path: '/data-lineage/:datasetId' },
  { screen: 'run-history', path: '/run-history' },
  { screen: 'reports', path: '/reports' },
  { screen: 'insights', path: '/insights' },
  { screen: 'user-management', path: '/user-management' },
  { screen: 'settings', path: '/settings' },
];

// Bare (no-id) path for every screen that has one — used by handleNavigate()
// for the many existing `onNavigate(screen: NavScreen)` callbacks threaded
// through the view components. Screens whose only meaningful route requires
// an id ('dataset-overview', 'dataset-preview', 'validation-run-details') are
// deliberately omitted; App.tsx resolves those from the currently-selected
// dataset instead (see handleNavigate).
export const SCREEN_TO_PATH: Partial<Record<NavScreen, string>> = {
  dashboard: '/dashboard',
  'data-sources': '/data-sources',
  'add-data-source': '/data-sources/new',
  'data-explorer': '/data-explorer',
  'data-profiling': '/data-profiling',
  'validation-workspace': '/validation',
  'quality-rules': '/data-quality-rules',
  'review-corrections': '/review-corrections',
  'approval-center': '/approval-center',
  'staging-publish': '/staging-publish',
  'data-lineage': '/data-lineage',
  'run-history': '/run-history',
  reports: '/reports',
  insights: '/insights',
  'user-management': '/user-management',
  settings: '/settings',
  login: '/login',
};

export interface ResolvedRoute {
  screen: NavScreen;
  params: Record<string, string>;
}

/**
 * Resolves a URL pathname to the NavScreen the legacy `currentScreen`-keyed
 * render tree in App.tsx should show, plus any route params (datasetId,
 * runId). Picks the most specific (most path segments) match so
 * `/validation/:datasetId/runs/:runId` wins over `/validation/:datasetId`
 * over `/validation` — this is order-independent, unlike a plain
 * first-match `.find()`.
 */
export function resolveScreen(pathname: string): ResolvedRoute {
  let best: (ResolvedRoute & { specificity: number }) | null = null;
  for (const entry of SCREEN_ROUTES) {
    const match = matchPath({ path: entry.path, end: true }, pathname);
    if (!match) continue;
    const specificity = entry.path.split('/').length;
    if (!best || specificity > best.specificity) {
      best = { screen: entry.screen, params: match.params as Record<string, string>, specificity };
    }
  }
  if (!best) return { screen: 'not-found', params: {} };
  return { screen: best.screen, params: best.params };
}
