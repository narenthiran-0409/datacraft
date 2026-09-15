import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../App';
import type { MeResponse } from '../api/client';

// Focused, real-URL-routing tests. These deliberately use an authenticated
// user with NO granted permissions for most cases: every heavy data-fetch
// effect in App.tsx is gated behind its own hasPermission(...) check *before*
// the API call fires (confirmed by reading every such effect), so a
// permission-less user triggers zero of those calls and every module's
// gated screen renders its "You need the X permission..." denied message
// instead of real content — which is exactly enough to prove routing itself
// (which screen, which dataset id, which run id) resolved correctly from the
// URL, without needing to hand-build realistic fixtures for dozens of
// unrelated API responses. One test below grants a single extra permission
// (rules.read) to also verify a real detail screen + its breadcrumb.

const { bootstrapSessionMock, onSessionExpiredMock, logoutMock, listRulesMock, listRuleAssignmentsMock } = vi.hoisted(
  () => ({
    bootstrapSessionMock: vi.fn(),
    onSessionExpiredMock: vi.fn(() => () => {}),
    logoutMock: vi.fn(async () => {}),
    listRulesMock: vi.fn(async () => []),
    listRuleAssignmentsMock: vi.fn(async () => []),
  })
);

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    bootstrapSession: bootstrapSessionMock,
    onSessionExpired: onSessionExpiredMock,
    logout: logoutMock,
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

function currentPath(): string {
  return screen.getByTestId('location-probe').textContent ?? '';
}

const NO_PERMS_USER: MeResponse = {
  id: 'user-1',
  email: 'qa@example.com',
  username: 'qa',
  full_name: 'QA User',
  status: 'ACTIVE',
  permissions: [],
};

beforeEach(() => {
  bootstrapSessionMock.mockReset();
  onSessionExpiredMock.mockClear();
  logoutMock.mockClear();
  listRulesMock.mockClear();
  listRuleAssignmentsMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App routing', () => {
  it('redirects "/" to "/dashboard" for a logged-in user', async () => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp('/');
    await waitFor(() => expect(currentPath()).toBe('/dashboard'));
  });

  it('redirects "/" to "/login" (not "/dashboard") when there is no session, so the address bar matches the Login screen it shows', async () => {
    bootstrapSessionMock.mockResolvedValue(null);
    renderApp('/');
    await screen.findByText('Welcome back');
    await waitFor(() => expect(currentPath()).toBe('/login'));
  });

  it('shows Login without discarding a deep-linked protected URL when there is no session', async () => {
    bootstrapSessionMock.mockResolvedValue(null);
    renderApp('/review-corrections/ds-1');
    await screen.findByText('Welcome back');
    // The URL is left exactly as requested — once a session resolves, the
    // very next render shows whatever the address bar already says, with no
    // separate "return to originally requested route" redirect needed.
    expect(currentPath()).toBe('/review-corrections/ds-1');
  });

  it('resolves a dataset detail route directly, with no prior master-list click (the refresh/direct-URL scenario)', async () => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp('/review-corrections/ds-1?reviewId=rev-1');
    // Denied-permission message proves currentScreen resolved to
    // 'review-corrections' (not Dashboard) purely from the URL on first
    // render — the historic bug reloaded straight to Dashboard instead.
    await screen.findByText(/review\.read permission/i);
    expect(screen.queryByText(/You need the metadata\.read permission/i)).not.toBeInTheDocument();
  });

  it.each([
    ['/validation/ds-1', /metadata\.read permission to view validation/i],
    ['/data-quality-rules/ds-1', /rules\.read permission/i],
    ['/approval-center/ds-1', /approval\.read permission/i],
    ['/staging-publish/ds-1', /staging\.read permission/i],
  ])('resolves %s to its own module, not a different one', async (path, expectedMessage) => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp(path);
    await screen.findByText(expectedMessage);
  });

  it('shows a dedicated Not Found page for an unknown URL, never silently rendering Dashboard', async () => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp('/this-page-does-not-exist');
    await screen.findByText('Page not found');
    expect(screen.queryByText(/Datasets Needing Attention|Welcome/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Back to Dashboard'));
    await waitFor(() => expect(currentPath()).toBe('/dashboard'));
  });

  it('highlights the sidebar item matching the current route', async () => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp('/data-quality-rules');
    const navButton = (await screen.findByText('Data Quality')).closest('button');
    expect(navButton).not.toBeNull();
    expect(navButton!.className).toMatch(/font-semibold/);
  });

  it('keeps Reports and AI Insights out of the sidebar while routing still works for them internally', async () => {
    bootstrapSessionMock.mockResolvedValue(NO_PERMS_USER);
    renderApp('/reports');
    expect(screen.queryByRole('button', { name: /^Reports$/ })).not.toBeInTheDocument();
    // The route itself still resolves (not 404, not silently Dashboard).
    await screen.findByText(/reports\.read permission/i);
  });

  it('renders real detail content for a directly-visited dataset URL, and the breadcrumb navigates back to the module master route', async () => {
    bootstrapSessionMock.mockResolvedValue({ ...NO_PERMS_USER, permissions: ['rules.read'] });
    renderApp('/data-quality-rules/ds-1');

    const backButton = await screen.findByRole('button', { name: /Data Quality Rules/i });
    expect(screen.queryByText(/rules\.read permission/i)).not.toBeInTheDocument();
    await waitFor(() => expect(listRulesMock).toHaveBeenCalled());
    await userEvent.click(backButton);
    await waitFor(() => expect(currentPath()).toBe('/data-quality-rules'));
  });
});
