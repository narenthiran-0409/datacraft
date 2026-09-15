import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { resolveScreen, SCREEN_TO_PATH } from './routing';
import {
  NavScreen,
  User,
  DataSource,
  ReviewRun,
  Issue,
  ApprovalRequestItem,
  SchemaNode,
  ExplorerDataset,
  ExplorerColumn,
  ValidationRun,
  LineageNode,
  LineageEdge,
  RunHistoryItem,
  QualityTrendPoint,
  RuleEffectivenessRow,
  QualityByDatasetRow,
  ReviewPerformanceSummary,
  ApprovalMetricsSummary,
  AISuggestionItem,
  AppSettings,
  DatasetStagingStatus,
} from './types';
import {
  bootstrapSession,
  logout as apiLogout,
  mapMeResponseToUser,
  onSessionExpired,
  changePassword as apiChangePassword,
  ApiError,
  listDataSources,
  updateDataSource as apiUpdateDataSource,
  deleteDataSource as apiDeleteDataSource,
  reactivateDataSource as apiReactivateDataSource,
  DataSourceUpdateRequest,
  listConnections,
  listConnectionTypes,
  deleteConnection as apiDeleteConnection,
  reactivateConnection as apiReactivateConnection,
  discoverConnection as apiDiscoverConnection,
  ConnectionResponse,
  ConnectionTypeResponse,
  listSchemas as apiListSchemas,
  SchemaResponse,
  listDatasets,
  getDataset,
  listDatasetColumns,
  getDatasetPreview,
  DatasetResponse,
  DatasetPreviewResponse,
  ColumnResponse,
  listProfileRuns,
  ProfileRunResponse,
  getLineage,
  getQualityTrendReport,
  getRuleEffectivenessReport,
  getQualityByDatasetReport,
  getReviewPerformanceReport,
  getApprovalMetricsReport,
  listValidationRuns,
  listUsers,
  UserResponse,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  resetUserPassword as apiResetUserPassword,
  listRoles,
  RoleResponse,
  // AI
  sendChatMessage,
  generateExplanation,
  triggerRunSummary,
  triggerPrioritization,
  triggerCluster,
  triggerCorrections,
  getAISuggestion,
  AISuggestionResponse,
  // Rules
  listRules,
  createRule as apiCreateRule,
  listRuleVersions,
  createRuleVersion as apiCreateRuleVersion,
  listRuleAssignments,
  createRuleAssignment as apiCreateRuleAssignment,
  deleteRuleAssignment as apiDeleteRuleAssignment,
  promoteRule as apiPromoteRule,
  dismissRule as apiDismissRule,
  triggerRuleDetection,
  RuleResponse,
  RuleVersionResponse,
  RuleAssignmentResponse,
  RuleCreateRequest,
  RuleAssignmentCreateRequest,
  RuleType,
  RuleAssignmentScope,
  // Validation
  createValidationRun,
  getValidationRun,
  ValidationRunResponse,
  listValidationFailures,
  ValidationFailureResponse,
  ValidationFailureListResponse,
  listEvaluatedRules,
  EvaluatedRuleResponse,
  // Jobs
  cancelJob as apiCancelJob,
  getJob as apiGetJob,
  JobResponse,
  // Review
  createReview,
  listReviews,
  getReview,
  listReviewIssues,
  listReviewSuggestions,
  listReviewCorrections,
  generateReviewSuggestions as apiGenerateReviewSuggestions,
  bulkReviewAction as apiBulkReviewAction,
  acceptSuggestion as apiAcceptSuggestion,
  editSuggestion as apiEditSuggestion,
  rejectSuggestion as apiRejectSuggestion,
  correctIssue as apiCorrectIssue,
  ReviewRunResponse,
  IssueResponse,
  CorrectionSuggestionResponse,
  CorrectionResponse,
  getSuggestionAiTrace,
  AITraceResponse,
  // Approval
  listApprovals,
  submitApproval as apiSubmitApproval,
  approveApproval as apiApproveApproval,
  rejectApproval as apiRejectApproval,
  ApprovalRequestResponse,
  // Staging
  createStagingRun as apiCreateStagingRun,
  getStagingRun,
  getStagingCandidates,
  StagingCandidateResponse,
  listStagingRecords,
  getStagingRecordRevalidation,
  getStagingDestination,
  getStagingPreview,
  StagingRunResponse,
  StagingRecordResponse,
  StagedRuleRevalidationResponse,
  StagingDestinationResponse,
  MaterializedPreviewResponse,
  // Publishing
  triggerPublish as apiTriggerPublish,
  acknowledgeDrift as apiAcknowledgeDrift,
  getPublishRun,
  PublishRunResponse,
} from './api/client';
import { usePermissions } from './hooks/usePermissions';
import { INITIAL_APP_SETTINGS } from './data/mockData';
import { SideNavBar } from './components/layout/SideNavBar';
import { TopAppBar } from './components/layout/TopAppBar';
import { DashboardView } from './components/views/DashboardView';
import { DataSourcesView } from './components/views/DataSourcesView';
import { DatasetOverviewView } from './components/views/DatasetOverviewView';
import { DatasetPreviewView } from './components/views/DatasetPreviewView';
import { QualityRulesView } from './components/views/QualityRulesView';
import { LoginView } from './components/views/LoginView';
import { AddDataSourceView, NewDataSourceInput } from './components/views/AddDataSourceView';
import { ReviewCorrectionsView } from './components/views/ReviewCorrectionsView';
import { ApprovalCenterView } from './components/views/ApprovalCenterView';
import { DataExplorerView } from './components/views/DataExplorerView';
import { DataProfilingView } from './components/views/DataProfilingView';
import { ValidationWorkspaceView } from './components/views/ValidationWorkspaceView';
import { ValidationRunDetailsView } from './components/views/ValidationRunDetailsView';
import { StagingPublishView } from './components/views/StagingPublishView';
import { PreviewColumn, PreviewRow, RowFilter } from './components/dataset-workflow/ChangePreviewTable';
import { TableStructureColumn } from './components/dataset-workflow/StagingConfirmationModal';
import { WorkflowBreadcrumb } from './components/dataset-workflow/WorkflowBreadcrumb';
import { Select } from './components/ui/Select';
import {
  PENDING_STAGING_DESTINATION,
  deriveDatasetStagingStatus,
  findMatchingPreviewRow,
  humanizeEnum,
  isTerminalMaterializationPhase,
  resolveMaterializationUiPhase,
  stagingDestinationFromRun,
  MaterializationUiPhase,
} from './data/datasetStagingWorkflow';
import {
  getApprovalForReview,
  getCurrentReviewForDataset,
  getPendingReviewRulesForDataset,
  getRelevantApprovalForDataset,
  getReviewsForDataset,
  getStagingEligibleReview,
} from './data/workflowResolution';
import { ValidationMasterView, ValidationMasterRow, ValidationMasterStatus } from './components/views/ValidationMasterView';
import { QualityRulesMasterView, RulesMasterRow, RulesMasterStatus } from './components/views/QualityRulesMasterView';
import {
  ReviewCorrectionsMasterView,
  ReviewMasterRow,
  ReviewMasterStatus,
} from './components/views/ReviewCorrectionsMasterView';
import {
  ApprovalCenterMasterView,
  ApprovalMasterRow,
  ApprovalMasterStatus,
} from './components/views/ApprovalCenterMasterView';
import { StagingMasterView, StagingMasterRow } from './components/views/StagingMasterView';
import { DataLineageView } from './components/views/DataLineageView';
import { RunHistoryView } from './components/views/RunHistoryView';
import { ReportsView } from './components/views/ReportsView';
import { AIInsightsView } from './components/views/AIInsightsView';
import { UserManagementView } from './components/views/UserManagementView';
import { SettingsView } from './components/views/SettingsView';

// V1.0 UX polish — the one reusable toast/snackbar shape used for every
// acknowledgement (started/completed/failed) across the app. `action` is
// optional: only meaningful async operations with an obvious result
// destination (View Results, View Staged Dataset, ...) get one.
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastState {
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  /** Defaults to 7s when an action CTA is present (needs time to read + click), else 4s. */
  durationMs?: number;
}

const TOAST_ICON: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

const TOAST_STYLES: Record<ToastVariant, string> = {
  success: 'bg-primary text-white border-primary-container',
  error: 'bg-error text-white border-error',
  warning: 'bg-secondary-fixed text-on-secondary-fixed border-secondary',
  info: 'bg-primary text-white border-primary-container',
};

// Shared loading/error presentation for the real-data screens below — mirrors the
// full-page spinner already used for session bootstrap and the error-banner style
// already used in LoginView, rather than inventing a third visual pattern.
function ScreenLoading({ label }: { label: string }) {
  return (
    <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
      <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-outline">{label}</p>
    </div>
  );
}

function ScreenError({ message }: { message: string }) {
  return (
    <div className="p-10 max-w-xl mx-auto">
      <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
        <span className="material-symbols-outlined text-base shrink-0">error</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

function ScreenPrompt({ message }: { message: string }) {
  return (
    <div className="p-10 max-w-xl mx-auto text-center">
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  );
}

function extractErrorMessage(err: unknown): string {
  // BUG FIX (found via live E2E testing): this used to discard the message of any
  // non-ApiError exception — including deliberate, specific, actionable errors thrown
  // by this file's own action handlers (e.g. decideApproval's "No accepted/edited/
  // corrected issues are known for this review in the current session..." message) —
  // and replaced it with a generic, actively misleading "Something went wrong loading
  // this screen," even when nothing was "loading" at all. A real user hit this via the
  // realistic flow of switching users and going straight to Approval Center to decide,
  // which left no useful clue about what had actually happened or what to do next.
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong loading this screen.';
}

/** Resolves which of {denied, loading, error, content} a gated real-data screen should show. */
function renderGated(
  allowed: boolean,
  deniedMessage: string,
  loading: boolean,
  loadingLabel: string,
  error: string | null,
  content: React.ReactNode
): React.ReactNode {
  if (!allowed) return <ScreenError message={deniedMessage} />;
  if (loading) return <ScreenLoading label={loadingLabel} />;
  if (error) return <ScreenError message={error} />;
  return content;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function mapValidationRun(vr: ValidationRunResponse, datasetName: string): ValidationRun {
  return {
    id: vr.id,
    datasetName,
    status: (vr.status as ValidationRun['status']) || 'CREATED',
    totalRows: vr.total_rows,
    passedRows: vr.passed_rows,
    warningRows: vr.warning_rows,
    failedRows: vr.failed_rows,
    // BUG FIX (Decimal-serialization sweep): quality_score is a Decimal-as-string
    // on the wire — passed through unconverted here, unlike its siblings in the
    // Reports effect that already got the Number() treatment.
    qualityScore: vr.quality_score !== null ? Number(vr.quality_score) : null,
    rulesEvaluatedCount: vr.rules_evaluated_count,
    noApplicableRules: vr.no_applicable_rules,
    startedAt: formatDateTime(vr.started_at),
    completedAt: vr.completed_at ? formatDateTime(vr.completed_at) : 'Not completed',
    durationMs: vr.duration_ms,
    jobId: vr.job_id,
  };
}

function mapReviewRun(
  rr: ReviewRunResponse,
  datasetName: string,
  totalIssues: number,
  resolvedIssues: number,
  datasetId?: string
): ReviewRun {
  return {
    id: rr.id,
    name: rr.name || `Review ${rr.id.slice(0, 8)}`,
    status: (rr.status as ReviewRun['status']) || 'DRAFT',
    datasetName,
    validationRunLabel: rr.validation_run_id.slice(0, 8),
    totalIssues,
    resolvedIssues,
    createdAt: formatDateTime(rr.created_at),
    datasetId,
    createdAtRaw: rr.created_at,
    updatedAt: formatDateTime(rr.updated_at ?? rr.created_at),
  };
}

function mapApprovalRequest(
  ar: ApprovalRequestResponse,
  reviewRunName: string,
  datasetName: string,
  requestedByName: string
): ApprovalRequestItem {
  // The list endpoint has no decided/remaining split — only the detail endpoint
  // (ApprovalRequestDetailResponse) does. Approximate from status here; overlaid with
  // the precise decided_count/remaining_count once a specific request's detail loads.
  const isTerminal = ar.status === 'APPROVED' || ar.status === 'REJECTED';
  return {
    id: ar.id,
    reviewRunName,
    datasetName,
    status: (ar.status as ApprovalRequestItem['status']) || 'PENDING',
    affectedIssueCount: ar.affected_issue_count,
    affectedRecordCount: ar.affected_record_count,
    requestedBy: requestedByName,
    requestedAt: formatDateTime(ar.requested_at),
    decidedCount: isTerminal ? ar.affected_issue_count : 0,
    remainingCount: isTerminal ? 0 : ar.affected_issue_count,
    reviewRunId: ar.review_run_id,
    requestedAtRaw: ar.requested_at,
    updatedAt: formatDateTime(ar.decided_at ?? ar.updated_at ?? ar.requested_at),
  };
}

// Fetches every page of a validation run's real, JOIN-resolved failures (GET
// /validation-runs/{id}/failures) — used to resolve real column/rule names for
// Review & Corrections issues (see the review-corrections effect and
// handleGenerateSuggestions), each of which traces back to exactly one failure via
// Issue.validation_failure_id (a real, NOT NULL FK — confirmed in
// app/db/models/review.py). Swallows its own errors (e.g. missing metadata.read)
// by returning whatever was fetched so far — callers treat "not found in the map"
// as the honest fallback, not a hard failure.
async function fetchAllValidationFailures(
  runId: string,
  fetchPage: (runId: string, page: number, pageSize: number) => Promise<ValidationFailureListResponse>
): Promise<ValidationFailureResponse[]> {
  const pageSize = 200;
  let page = 1;
  let seen = 0;
  let total = Infinity;
  const all: ValidationFailureResponse[] = [];
  try {
    while (seen < total) {
      const resp = await fetchPage(runId, page, pageSize);
      all.push(...resp.items);
      seen += resp.items.length;
      total = resp.total;
      if (resp.items.length === 0) break;
      page += 1;
    }
  } catch {
    // Return whatever was fetched so far — see doc comment above.
  }
  return all;
}

function mapUserResponseToUser(u: UserResponse, roleById: Map<string, RoleResponse>): User {
  const roleNames = u.role_ids
    .map((id) => roleById.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  // The backend's status enum (ACTIVE | INACTIVE | LOCKED) has no "invited" concept —
  // approximated here from require_password_reset (a real field: true for a newly
  // created account that hasn't completed its first login) rather than fabricated.
  const accountStatus: User['accountStatus'] =
    u.status !== 'ACTIVE' ? 'disabled' : u.require_password_reset ? 'invited' : 'active';
  const name = u.full_name || u.username || u.email;
  return {
    id: u.id,
    name,
    email: u.email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    roleNames,
    accountStatus,
    // Per-user permissions aren't exposed by GET /users — only /auth/me returns the
    // current viewer's own permissions. Left empty rather than guessed from roleNames.
    permissions: [],
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'checking' | 'resolved'>('checking');

  // Real URL routing (replaces the old `useState<NavScreen>('dashboard')`,
  // which is the root cause of the "refresh returns to Dashboard" bug: the
  // URL is now the single source of truth for which screen renders — see
  // src/routing.ts. `currentScreen`/`routeDatasetId`/`routeRunId` are derived
  // fresh from the URL on every render rather than stored, so a hard refresh,
  // a pasted/bookmarked URL, and browser Back/Forward all reconstruct the
  // exact same page with no dependence on prior in-memory React state.
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { screen: currentScreen, params: routeParams } = useMemo(
    () => resolveScreen(location.pathname),
    [location.pathname]
  );
  const routeDatasetId = routeParams.datasetId ?? null;
  const routeRunId = routeParams.runId ?? null;

  // "/" has no page of its own. Waits for the session bootstrap to actually
  // resolve before picking a destination — otherwise this fired while
  // currentUser was still null (bootstrapSession is async), sent "/" to
  // "/dashboard" unconditionally, and then the login check further below
  // rendered LoginView there anyway: the address bar said /dashboard while
  // the screen showed Welcome back. Authenticated -> /dashboard;
  // unauthenticated -> /login, so the URL always matches what's on screen.
  useEffect(() => {
    if (location.pathname !== '/') return;
    if (authStatus === 'checking') return;
    navigate(currentUser ? '/dashboard' : '/login', { replace: true });
  }, [location.pathname, navigate, authStatus, currentUser]);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Session bootstrap: try to silently resume a session from a stored refresh token
  // before ever showing the Login screen, so a page reload doesn't force a fresh login.
  useEffect(() => {
    let cancelled = false;
    bootstrapSession().then((me) => {
      if (cancelled) return;
      if (me) setCurrentUser(mapMeResponseToUser(me));
      setAuthStatus('resolved');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      setCurrentUser(null);
      navigate('/login');
      triggerToast('Your session expired. Please sign in again.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permission checks for the real-data screens below — codes match each backend
  // route's own require_permission(), confirmed by grepping every routes.py directly.
  const { hasPermission } = usePermissions(currentUser);

  // App State
  // Real data (this task) — was mock (INITIAL_AI_SUGGESTIONS). Populated only by
  // explicit user-triggered generation on the AI Insights screen; starts empty.
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestionItem[]>([]);
  const [aiGeneratingType, setAiGeneratingType] = useState<string | null>(null);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_APP_SETTINGS);

  // User & Role Management — real data (Phase 3). Shared with Settings, which needs
  // the current user's own real role name(s), only resolvable via this same
  // users.read-gated list (no self-service "my roles" endpoint exists).
  const [platformUsers, setPlatformUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userActionPendingId, setUserActionPendingId] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  // One-time real credential from resetUserPassword's generated temporary_password —
  // shown as a persistent, explicitly-dismissed banner rather than an auto-dismissing
  // toast, since the admin needs time to actually copy and relay it.
  const [createdUserCredential, setCreatedUserCredential] = useState<{ email: string; temporaryPassword: string } | null>(null);

  // Resolves the real logged-in user's own role name(s) for the profile dropdown
  // (TopAppBar) — root cause of the "No role assigned" bug: mapMeResponseToUser
  // always sets roleNames: [] on login (see its own BUG FIX comment — /auth/me has
  // no role_ids, only permissions), and nothing merged the real names back in
  // unless the user happened to already visit Settings/User Management first
  // (which independently resolve it via this same listUsers()+listRoles() call,
  // per the comment above). Runs once per login for any user with users.read —
  // reuses/primes the same platformUsers/roles state those screens use, so
  // visiting them afterward doesn't refetch. Skipped if platformUsers is already
  // populated (already resolved, no need to redo it).
  useEffect(() => {
    if (!currentUser) return;
    if (!hasPermission('users.read')) return;
    if (platformUsers.length > 0) return;

    let cancelled = false;
    Promise.all([listUsers(), listRoles()])
      .then(([users, rolesList]) => {
        if (cancelled) return;
        setRoles(rolesList);
        const roleById = new Map(rolesList.map((r) => [r.id, r]));
        const mappedUsers = users.map((u) => mapUserResponseToUser(u, roleById));
        setPlatformUsers(mappedUsers);
        const self = mappedUsers.find((u) => u.id === currentUser.id);
        if (self && self.roleNames.length > 0) {
          setCurrentUser((prev) => (prev ? { ...prev, roleNames: self.roleNames } : prev));
        }
      })
      .catch(() => {
        // Silent — background enrichment for a dropdown label, not a screen load;
        // the dropdown already has an honest fallback (see TopAppBar) if this
        // never resolves.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, platformUsers.length]);

  // --- Real-data screens (this batch) -----------------------------------------

  // Data Sources
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
  const [dataSourcesError, setDataSourcesError] = useState<string | null>(null);
  const [dataSourceActionPendingId, setDataSourceActionPendingId] = useState<string | null>(null);
  const [dataSourceActionError, setDataSourceActionError] = useState<string | null>(null);
  // Connections (this task) — the raw list + types, kept in state (not just a
  // local map inside the fetch effect) so the Manage Connections modal can
  // render and update them after a real deactivate call.
  const [dataSourceConnections, setDataSourceConnections] = useState<ConnectionResponse[]>([]);
  const [dataSourceConnectionTypes, setDataSourceConnectionTypes] = useState<ConnectionTypeResponse[]>([]);
  const [connectionActionPendingId, setConnectionActionPendingId] = useState<string | null>(null);
  const [connectionActionError, setConnectionActionError] = useState<string | null>(null);
  // "Sync Now" (this task) — was pure local mock (setTimeout + unconditional
  // success toast, zero network calls). Keyed by connection id, since discovery
  // runs against a connection, not a data source directly.
  const [syncingConnectionId, setSyncingConnectionId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Data Explorer — separate from the mock schemas/explorerDatasets/explorerColumns
  // above (those stay mock for Validation Workspace's sake).
  const [deSchemas, setDeSchemas] = useState<SchemaNode[]>([]);
  const [deDatasets, setDeDatasets] = useState<ExplorerDataset[]>([]);
  const [deColumns, setDeColumns] = useState<ExplorerColumn[]>([]);
  const [dataExplorerLoading, setDataExplorerLoading] = useState(false);
  const [dataExplorerError, setDataExplorerError] = useState<string | null>(null);
  // BUG FIX (this task): "View Datasets" on a Data Source card used to navigate to
  // Dataset Overview with no dataset selected, landing on its "no selection" empty
  // prompt. Routes to Data Explorer instead, scoped to just this source's schemas —
  // cleared automatically on leaving the screen so a stale filter doesn't persist
  // if the user returns via the sidebar directly.
  const [explorerDataSourceFilter, setExplorerDataSourceFilter] = useState<{ id: string; name: string } | null>(
    null
  );

  // Dataset Overview — selection comes from Data Explorer's "Open Dataset" action
  // (or, now, directly from the URL — see routeDatasetId above). Every one of this
  // app's five master/detail modules is dataset-centric (confirmed via each
  // *MasterRow definition further below, all keyed by datasetId), so the same
  // routeDatasetId serves as the "which dataset is open" identity everywhere.
  const selectedDatasetId = routeDatasetId;
  const [selectedDataset, setSelectedDataset] = useState<DatasetResponse | null>(null);
  const [selectedDatasetColumns, setSelectedDatasetColumns] = useState<ColumnResponse[]>([]);
  const [datasetOverviewLoading, setDatasetOverviewLoading] = useState(false);
  const [datasetOverviewError, setDatasetOverviewError] = useState<string | null>(null);
  // Real top validation failures from this dataset's latest COMPLETED run (this
  // task) — replaces the Overview tab's old hardcoded DATASET_ISSUES mock list.
  const [datasetOverviewFailures, setDatasetOverviewFailures] = useState<ValidationFailureResponse[]>([]);
  const [datasetOverviewFailuresLoading, setDatasetOverviewFailuresLoading] = useState(false);
  // Real live preview rows from GET /datasets/{id}/preview (this task) — this
  // endpoint was built on the backend but never had a frontend consumer before.
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreviewResponse | null>(null);
  const [datasetPreviewLoading, setDatasetPreviewLoading] = useState(false);
  const [datasetPreviewError, setDatasetPreviewError] = useState<string | null>(null);

  // Data Profiling — dataset-level ProfileRunResponse history, not per-column stats
  // (the backend's ColumnProfileResponse schema exists but isn't wired to any route).
  const [profilingDatasets, setProfilingDatasets] = useState<ExplorerDataset[]>([]);
  const [profileRuns, setProfileRuns] = useState<ProfileRunResponse[]>([]);
  const [profilingLoading, setProfilingLoading] = useState(false);
  const [profilingError, setProfilingError] = useState<string | null>(null);

  // Data Lineage — traced from whichever dataset is selected (see selectedDatasetId).
  const [lineageNodes, setLineageNodes] = useState<LineageNode[]>([]);
  const [lineageEdges, setLineageEdges] = useState<LineageEdge[]>([]);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [lineageError, setLineageError] = useState<string | null>(null);

  // Reports
  const [qualityTrend, setQualityTrend] = useState<QualityTrendPoint[]>([]);
  const [ruleEffectiveness, setRuleEffectiveness] = useState<RuleEffectivenessRow[]>([]);
  const [qualityByDataset, setQualityByDataset] = useState<QualityByDatasetRow[]>([]);
  const [reviewPerformance, setReviewPerformance] = useState<ReviewPerformanceSummary>({
    avgTimeToDecisionMinutes: 0,
    throughputByReviewer: [],
  });
  const [approvalMetrics, setApprovalMetrics] = useState<ApprovalMetricsSummary>({
    approvalRate: 0,
    avgDecisionLatencyMinutes: 0,
  });
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  // Dashboard — quality trend/rule-effectiveness/quality-by-dataset are shared with
  // Reports (same reports.read-gated data, see the effect below). Pending approvals,
  // datasets, and data sources are fetched independently per section so one failing
  // or denied call doesn't blank the rest of the screen.
  const [dashboardPendingApprovals, setDashboardPendingApprovals] = useState<ApprovalRequestResponse[]>([]);
  const [dashboardApprovalsLoading, setDashboardApprovalsLoading] = useState(false);
  const [dashboardApprovalsError, setDashboardApprovalsError] = useState<string | null>(null);

  const [dashboardDatasets, setDashboardDatasets] = useState<DatasetResponse[]>([]);
  const [dashboardDatasetsLoading, setDashboardDatasetsLoading] = useState(false);
  const [dashboardDatasetsError, setDashboardDatasetsError] = useState<string | null>(null);

  const [dashboardActiveSourceCount, setDashboardActiveSourceCount] = useState(0);
  const [dashboardDataSourcesLoading, setDashboardDataSourcesLoading] = useState(false);
  const [dashboardDataSourcesError, setDashboardDataSourcesError] = useState<string | null>(null);

  // Run History — validation-runs + profile-runs only. staging-runs, publish-runs, and
  // jobs have no list-all endpoint anywhere in this backend (only get-by-id), so they
  // cannot be included without inventing an endpoint that doesn't exist.
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [runHistoryLoading, setRunHistoryLoading] = useState(false);
  const [runHistoryError, setRunHistoryError] = useState<string | null>(null);

  // --- Core decision workflow (this batch: real reads AND real mutations) ----------

  // Data Quality Rules
  const [rules, setRules] = useState<RuleResponse[]>([]);
  const [ruleAssignments, setRuleAssignments] = useState<RuleAssignmentResponse[]>([]);
  const [ruleVersionsByRuleId, setRuleVersionsByRuleId] = useState<Record<string, RuleVersionResponse[]>>({});
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rulesActionError, setRulesActionError] = useState<string | null>(null);
  // Dataset-first Quality Rules page (this task): real dataset list for the
  // picker, so it can show names instead of truncated RuleAssignment.dataset_id UUIDs.
  const [qualityRulesDatasets, setQualityRulesDatasets] = useState<DatasetResponse[]>([]);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  // Whole-dataset rule detection + review workflow (this task)
  const [isDetectingRules, setIsDetectingRules] = useState(false);
  const [ruleDetectionError, setRuleDetectionError] = useState<string | null>(null);
  const [ruleDetectionSummary, setRuleDetectionSummary] = useState<string | null>(null);
  const [ruleReviewActionPendingId, setRuleReviewActionPendingId] = useState<string | null>(null);
  const [ruleReviewActionError, setRuleReviewActionError] = useState<string | null>(null);

  // Validation Workspace — uses selectedDatasetId (shared with Data Explorer/Lineage).
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationActionError, setValidationActionError] = useState<string | null>(null);
  const [isTriggeringValidation, setIsTriggeringValidation] = useState(false);
  // V1.0 — global operation visibility for a just-triggered validation run:
  // watched independently of whatever screen is currently open, so its
  // completion/failure toast (with a "View Results" CTA into the real run)
  // still reaches the user even if they've navigated away. Cleared the
  // moment the run reaches a terminal status.
  const [watchedValidationRun, setWatchedValidationRun] = useState<{
    runId: string;
    datasetId: string;
    datasetName: string;
  } | null>(null);
  // Master/detail redesign — bulk, per-dataset validation run history (newest
  // first, matching the backend's own ordering) for the Validation and Review
  // & Corrections master tables' "Quality Score" / "Last Validation" columns.
  // No bulk "validation runs across datasets" endpoint exists, so this is a
  // real N+1 fetch (one listValidationRuns per dataset) — see the effect below.
  const [validationSummaryByDatasetId, setValidationSummaryByDatasetId] = useState<Record<string, ValidationRun[]>>(
    {}
  );
  const [validationSummaryLoading, setValidationSummaryLoading] = useState(false);
  // Guided pre-check modal shown when "Run Validation" is clicked for a
  // dataset with zero enabled RuleAssignments (see handleRunValidation).
  const [showNoRulesConfirm, setShowNoRulesConfirm] = useState(false);

  // Validation Run Details — real route param (/validation/:datasetId/runs/:runId).
  const selectedValidationRunId = routeRunId;
  const [selectedValidationRun, setSelectedValidationRun] = useState<ValidationRun | null>(null);
  const [validationDetailLoading, setValidationDetailLoading] = useState(false);
  const [validationDetailError, setValidationDetailError] = useState<string | null>(null);
  const [validationDetailActionError, setValidationDetailActionError] = useState<string | null>(null);
  const [isCancellingValidationJob, setIsCancellingValidationJob] = useState(false);
  const [isStartingReview, setIsStartingReview] = useState(false);

  // Validation Run Details — row-level failure detail (real, paginated; GET
  // /validation-runs/{id}/failures did not exist before this task).
  const [validationFailures, setValidationFailures] = useState<ValidationFailureResponse[]>([]);
  const [validationFailuresTotal, setValidationFailuresTotal] = useState(0);
  const [validationFailuresPage, setValidationFailuresPage] = useState(1);
  const [validationFailuresSeverity, setValidationFailuresSeverity] = useState<string>('');
  const [validationFailuresLoading, setValidationFailuresLoading] = useState(false);
  const [validationFailuresError, setValidationFailuresError] = useState<string | null>(null);
  const VALIDATION_FAILURES_PAGE_SIZE = 25;

  // Validation Run Details — which rules were actually evaluated (real; GET
  // /validation-runs/{id}/evaluated-rules), including ones that produced
  // zero failures — proof that rulesEvaluatedCount corresponds to concrete,
  // named rules rather than a bare number.
  const [evaluatedRules, setEvaluatedRules] = useState<EvaluatedRuleResponse[]>([]);
  const [evaluatedRulesLoading, setEvaluatedRulesLoading] = useState(false);
  const [evaluatedRulesError, setEvaluatedRulesError] = useState<string | null>(null);

  // Review & Corrections
  const [reviewRuns, setReviewRuns] = useState<ReviewRun[]>([]);
  const [reviewRunsLoading, setReviewRunsLoading] = useState(false);
  const [reviewRunsError, setReviewRunsError] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [reviewActionPendingIds, setReviewActionPendingIds] = useState<string[]>([]);

  // AI Trace (Phase 4.10) — lazy-loaded per suggestion id, only when a user opens
  // the "AI Details" section for a given issue's suggestion (never eagerly for
  // every issue on the page — there is no bulk trace endpoint).
  const [aiTraceBySuggestionId, setAiTraceBySuggestionId] = useState<Map<string, AITraceResponse>>(new Map());
  const [aiTraceLoadingIds, setAiTraceLoadingIds] = useState<Set<string>>(new Set());
  const [aiTraceErrorBySuggestionId, setAiTraceErrorBySuggestionId] = useState<Map<string, string>>(new Map());

  // Approval Center
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequestItem[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [approvalActionError, setApprovalActionError] = useState<string | null>(null);
  const [approvalActionPendingId, setApprovalActionPendingId] = useState<string | null>(null);

  // Staging & Publish — keyed off selectedReviewId (set from Review & Corrections or
  // Approval Center).
  const [currentStagingRun, setCurrentStagingRun] = useState<StagingRunResponse | null>(null);
  const [stagingRecords, setStagingRecords] = useState<StagingRecordResponse[]>([]);
  const [driftOnlyFilter, setDriftOnlyFilter] = useState(false);
  const [currentPublishRun, setCurrentPublishRun] = useState<PublishRunResponse | null>(null);
  const [stagingActionError, setStagingActionError] = useState<string | null>(null);
  const [isStagingActionPending, setIsStagingActionPending] = useState(false);

  // Staged revalidation (Phase 4.10) — lazy-loaded per staging record id, only
  // on row expand (never eagerly for every listed record — no bulk endpoint,
  // and the record list can be large).
  const [revalidationByRecordId, setRevalidationByRecordId] = useState<Map<string, StagedRuleRevalidationResponse[]>>(
    new Map()
  );
  const [revalidationLoadingIds, setRevalidationLoadingIds] = useState<Set<string>>(new Set());
  const [revalidationErrorByRecordId, setRevalidationErrorByRecordId] = useState<Map<string, string>>(new Map());

  // Phase 4.12B — real materialized staging dataset. `justTriggeredStagingRunId`
  // is this browser session's own disambiguating signal for a null
  // materialization_phase (see resolveMaterializationUiPhase's own doc comment):
  // set the instant WE create a run, so its transient pre-first-phase window
  // reads as QUEUED (keep polling) rather than LEGACY (never fetched again).
  const [justTriggeredStagingRunId, setJustTriggeredStagingRunId] = useState<string | null>(null);
  // A transient "couldn't refresh status" condition from the poll itself —
  // distinct from the run genuinely having FAILED (materialization_phase).
  const [stagingPollError, setStagingPollError] = useState<string | null>(null);
  // Guards the global staging completion/failure toast against re-firing for
  // the same already-terminal run on a later remount/re-render.
  const announcedStagingRunIdRef = useRef<string | null>(null);

  const [isMaterializedPreviewOpen, setIsMaterializedPreviewOpen] = useState(false);
  const [materializedDestination, setMaterializedDestination] = useState<StagingDestinationResponse | null>(null);
  const [materializedDestinationLoading, setMaterializedDestinationLoading] = useState(false);
  const [materializedDestinationError, setMaterializedDestinationError] = useState<string | null>(null);
  const [materializedPreview, setMaterializedPreview] = useState<MaterializedPreviewResponse | null>(null);
  const [materializedPreviewLoading, setMaterializedPreviewLoading] = useState(false);
  const [materializedPreviewError, setMaterializedPreviewError] = useState<string | null>(null);
  const [materializedPreviewFilter, setMaterializedPreviewFilter] = useState<RowFilter>('ALL');
  const [materializedPreviewOffset, setMaterializedPreviewOffset] = useState(0);
  const MATERIALIZED_PREVIEW_PAGE_SIZE = 25;

  // Staging & Publish dataset-centric redesign — left explorer's own real
  // connections/schemas/datasets fetch (independent of Data Explorer's own copy
  // of this, so neither screen's loading/error state leaks into the other).
  const [workflowCatalogConnections, setWorkflowCatalogConnections] = useState<ConnectionResponse[]>([]);
  const [workflowCatalogSchemas, setWorkflowCatalogSchemas] = useState<SchemaResponse[]>([]);
  const [workflowCatalogDatasets, setWorkflowCatalogDatasets] = useState<DatasetResponse[]>([]);
  const [workflowCatalogLoading, setWorkflowCatalogLoading] = useState(false);
  const [workflowCatalogError, setWorkflowCatalogError] = useState<string | null>(null);

  // V1.0 acceptance fix — backend-authoritative staging readiness
  // (GET /api/v1/staging-candidates). Keyed by dataset_id below for
  // computeStagingDatasetStatus's lookup. This REPLACES client-side
  // eligibility derivation for the approved-and-beyond states (never
  // review.status === 'APPROVED', which cannot exist); pre-approval states
  // (Draft/In Review/Ready for Approval) still come from reviewRuns +
  // approvalQueue below, which the candidates endpoint deliberately
  // doesn't cover (it only enumerates staging-relevant reviews).
  const [stagingCandidates, setStagingCandidates] = useState<StagingCandidateResponse[]>([]);
  const [stagingCandidatesLoading, setStagingCandidatesLoading] = useState(false);
  const [stagingCandidatesError, setStagingCandidatesError] = useState<string | null>(null);

  // Master/detail redesign — each of the five workflow screens (Validation,
  // Data Quality Rules, Review & Corrections, Approval Center, Staging &
  // Publish) opens on its own full-width master list; drilling into a row
  // means navigating to that module's `/:datasetId` route. Derived directly
  // from the URL rather than stored: a module's detail view is open exactly
  // when its own screen is current AND the URL carries a datasetId — no
  // separate flag to fall out of sync with the address bar on refresh/back/
  // forward. Navigating to a module's bare path (handleNavigate) naturally
  // lands on its master list, matching the old reset-on-navigate behavior.
  const isValidationDetailOpen = currentScreen === 'validation-workspace' && !!selectedDatasetId;
  const isRulesDetailOpen = currentScreen === 'quality-rules' && !!selectedDatasetId;
  const isReviewDetailOpen = currentScreen === 'review-corrections' && !!selectedDatasetId;
  const isApprovalDetailOpen = currentScreen === 'approval-center' && !!selectedDatasetId;
  const isStagingDetailOpen = currentScreen === 'staging-publish' && !!selectedDatasetId;

  // Modals & Drawers
  const [showRuleCreatorModal, setShowRuleCreatorModal] = useState<boolean>(false);
  const [showAICopilot, setShowAICopilot] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // AI Copilot State — real POST /ai/chat. conversation_id persists for the whole
  // session once the first real reply establishes one (server creates it when
  // omitted); no "new conversation" reset control exists yet. Note: the backend's
  // chat service does NOT thread prior turns into the model's own context (each
  // call sends only the latest message — confirmed in chat_service.py) — messages
  // are genuinely persisted and grouped by conversation_id, but the assistant
  // itself has no memory of earlier turns beyond what's visible in this history.
  const [copilotInput, setCopilotInput] = useState<string>('');
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; text: string; time: string }>
  >([]);
  const [copilotConversationId, setCopilotConversationId] = useState<string | null>(null);
  const [isCopilotSending, setIsCopilotSending] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Create Rule Form — fields match RuleCreateRequest exactly (rules.manage-gated).
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDescription, setNewRuleDescription] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRuleType, setNewRuleType] = useState<RuleType>('COMPLETENESS');
  // Severity has no enum in the backend schema (plain str) — LOW/MEDIUM/HIGH/CRITICAL
  // is an assumption based on convention elsewhere in this app, not a confirmed set.
  const [newRuleSeverity, setNewRuleSeverity] = useState('MEDIUM');
  const [newRuleDefinitionText, setNewRuleDefinitionText] = useState('{}');
  const [newRuleErrorMessage, setNewRuleErrorMessage] = useState('');
  const [newRuleFormError, setNewRuleFormError] = useState<string | null>(null);

  // Create Rule Assignment Form (rule_assignments.manage-gated).
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentRuleId, setAssignmentRuleId] = useState('');
  const [assignmentDatasetId, setAssignmentDatasetId] = useState('');
  const [assignmentScope, setAssignmentScope] = useState<RuleAssignmentScope>('DATASET_LEVEL');
  const [assignmentColumnId, setAssignmentColumnId] = useState('');
  const [assignmentColumnIds, setAssignmentColumnIds] = useState<string[]>([]);
  const [assignmentDatasetColumns, setAssignmentDatasetColumns] = useState<ColumnResponse[]>([]);
  const [assignmentDatasetOptions, setAssignmentDatasetOptions] = useState<DatasetResponse[]>([]);
  const [assignmentFormError, setAssignmentFormError] = useState<string | null>(null);

  // New Rule Version Form (rules.manage-gated).
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionRuleId, setVersionRuleId] = useState('');
  const [versionDefinitionText, setVersionDefinitionText] = useState('{}');
  const [versionSeverity, setVersionSeverity] = useState('MEDIUM');
  const [versionErrorMessage, setVersionErrorMessage] = useState('');
  const [versionFormError, setVersionFormError] = useState<string | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Single reusable toast — every triggerToast('...') call site (there are
  // ~40) keeps working exactly as before (plain info-styled message, 4s);
  // `options` is additive, only used by the operation-visibility feedback
  // added for V1.0 (start/complete/fail acknowledgements with an optional
  // destination CTA). One toast at a time, matching the app's existing
  // "no notification stacking" behavior.
  const triggerToast = (message: string, options: ToastOptions = {}) => {
    const { variant = 'info', action, durationMs = action ? 7000 : 4000 } = options;
    setToast({ message, variant, action });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, durationMs);
  };

  // Populates the dataset dropdown in the Assign Rule modal when it opens.
  useEffect(() => {
    if (!showAssignmentForm) return;
    let cancelled = false;
    listDatasets({ page_size: 200 })
      .then((resp) => {
        if (!cancelled) setAssignmentDatasetOptions(resp.items);
      })
      .catch(() => {
        if (!cancelled) setAssignmentDatasetOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showAssignmentForm]);

  // --- Real-data fetches, one per read-only screen, triggered on navigation ---------

  // Data Sources: GET data-sources (+ connections/connection-types, each independently
  // permission-gated so a user missing only one still sees what they can). Extracted
  // into a standalone function (not just inline in the effect) so the real Sync Now
  // fix below can call it again after a discovery job completes, to pick up the real
  // dataset count — refetching is the only way to see it, same reasoning as
  // handleGenerateSuggestions elsewhere in this file.
  const refreshDataSources = async (): Promise<void> => {
    setDataSourcesLoading(true);
    setDataSourcesError(null);
    const canReadConnections = hasPermission('connections.read');

    try {
      const [sources, connections, connectionTypes] = await Promise.all([
        listDataSources(),
        canReadConnections ? listConnections() : Promise.resolve<ConnectionResponse[]>([]),
        canReadConnections ? listConnectionTypes() : Promise.resolve<ConnectionTypeResponse[]>([]),
      ]);

      // Real per-data-source dataset count (this task) — was hardcoded to 0 with a
      // comment claiming no endpoint existed for it. One does, just not directly:
      // dataset -> schema.connection_id -> connection.data_source_id, the same chain
      // already traced for Data Explorer's connection-status propagation. Degrades to
      // 0 (not an error for the whole screen) if metadata.read is missing or the
      // schema/dataset fetch itself fails — this is an enhancement on top of the real
      // fix below, not something that should block the screen from loading at all.
      const datasetCountByDataSourceId = new Map<string, number>();
      if (canReadConnections && hasPermission('metadata.read') && connections.length > 0) {
        try {
          const schemaLists = await Promise.all(
            connections.map((c) => apiListSchemas(c.id).catch(() => [] as SchemaResponse[]))
          );
          const dataSourceIdByConnectionId = new Map(connections.map((c) => [c.id, c.data_source_id]));
          const dataSourceIdBySchemaId = new Map<string, string>();
          schemaLists.forEach((list) =>
            list.forEach((s) => {
              const dsId = dataSourceIdByConnectionId.get(s.connection_id);
              if (dsId) dataSourceIdBySchemaId.set(s.id, dsId);
            })
          );

          const datasetsResp = await listDatasets({ page_size: 200 });
          datasetsResp.items.forEach((d) => {
            const dsId = dataSourceIdBySchemaId.get(d.schema_id);
            if (!dsId) return;
            datasetCountByDataSourceId.set(dsId, (datasetCountByDataSourceId.get(dsId) ?? 0) + 1);
          });
        } catch {
          // Leave counts at 0 — see comment above.
        }
      }

      const typeById = new Map(connectionTypes.map((t) => [t.id, t]));
      const connectionsBySource = new Map<string, ConnectionResponse[]>();
      connections.forEach((c) => {
        connectionsBySource.set(c.data_source_id, [...(connectionsBySource.get(c.data_source_id) ?? []), c]);
      });

      const mapped: DataSource[] = sources.map((s) => {
        const conns = connectionsBySource.get(s.id) ?? [];
        const primary = conns[0];
        const connTypeCode = (primary ? typeById.get(primary.connection_type_id)?.code : undefined) ?? '';
        const type: DataSource['type'] = connTypeCode.toUpperCase().includes('FILE')
          ? 'file'
          : connTypeCode.toUpperCase().includes('API')
          ? 'api'
          : 'database';

        return {
          id: s.id,
          name: s.name,
          type,
          typeLabel:
            (primary && typeById.get(primary.connection_type_id)?.display_name) ||
            (canReadConnections ? 'No connection configured' : 'Connections not visible to you'),
          // is_active is the only real status signal available from this screen's
          // scoped endpoints — connection.status values aren't documented/confirmed,
          // so this doesn't try to distinguish "syncing" from "connected". BUG FIX
          // (earlier task): was `s.is_active ? 'connected' : 'failed'`, which showed a
          // deactivated source as "Sync Failed" — misleading, since deactivation is
          // deliberate, not a technical failure.
          status: s.is_active ? 'connected' : 'inactive',
          description: s.description || s.business_domain || 'No description provided.',
          datasetsCount: datasetCountByDataSourceId.get(s.id) ?? 0,
          lastSync: formatDateTime(s.updated_at ?? s.created_at),
          icon: type === 'database' ? 'database' : type === 'api' ? 'cloud' : 'description',
          host: primary ? `${primary.host}:${primary.port}` : undefined,
          isActive: s.is_active,
          ownerTeam: s.owner_team,
          businessDomain: s.business_domain,
        };
      });
      setDataSources(mapped);
      setDataSourceConnections(connections);
      setDataSourceConnectionTypes(connectionTypes);
    } catch (err) {
      setDataSourcesError(extractErrorMessage(err));
    } finally {
      setDataSourcesLoading(false);
    }
  };

  useEffect(() => {
    if (currentScreen !== 'data-sources') return;
    if (!hasPermission('data_sources.read')) return;
    refreshDataSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Data Explorer: GET schemas (per connection) + datasets, then columns per dataset.
  useEffect(() => {
    if (currentScreen !== 'data-explorer') return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setDataExplorerLoading(true);
    setDataExplorerError(null);

    (async () => {
      const connections = await listConnections();
      const schemaLists = await Promise.all(
        connections.map((c) => apiListSchemas(c.id).catch(() => [] as SchemaResponse[]))
      );
      const allSchemas = schemaLists.flat();

      const datasetsResp = await listDatasets({ page_size: 200 });
      const allDatasets = datasetsResp.items;

      const columnLists = await Promise.all(
        allDatasets.map((d) => listDatasetColumns(d.id).catch(() => [] as ColumnResponse[]))
      );
      const allColumns = columnLists.flat();

      if (cancelled) return;

      const datasetCountBySchema = new Map<string, number>();
      allDatasets.forEach((d) => {
        datasetCountBySchema.set(d.schema_id, (datasetCountBySchema.get(d.schema_id) ?? 0) + 1);
      });

      // Status propagation (this task): dataset -> schema.connection_id ->
      // connection.is_active. Derived entirely from data already fetched above
      // (connections + allSchemas) — no extra per-dataset calls. Distinct from
      // dataset.is_active (the dataset's own discovery-driven flag, handled
      // separately and unaffected by this).
      const connectionActiveById = new Map(connections.map((c) => [c.id, c.is_active]));
      const connectionIdBySchemaId = new Map(allSchemas.map((s) => [s.id, s.connection_id]));
      const isSchemaConnectionInactive = (schemaId: string) => {
        const connectionId = connectionIdBySchemaId.get(schemaId);
        if (!connectionId) return false;
        return connectionActiveById.get(connectionId) === false;
      };
      // Lets Data Explorer be filtered to a single data source (Data Sources'
      // "View Datasets" action) — same connection -> data source chain as above.
      const dataSourceIdByConnectionId = new Map(connections.map((c) => [c.id, c.data_source_id]));

      setDeSchemas(
        allSchemas.map((s) => ({
          id: s.id,
          name: s.name,
          datasetCount: datasetCountBySchema.get(s.id) ?? 0,
          dataSourceId: dataSourceIdByConnectionId.get(s.connection_id) ?? null,
        }))
      );
      setDeDatasets(
        allDatasets.map((d) => ({
          id: d.id,
          schemaId: d.schema_id,
          name: d.name,
          columnCount: d.column_count ?? 0,
          rowCountEstimate: d.row_count_estimate ?? 0,
          lastDiscoveredAt: formatDateTime(d.discovered_at),
          isActive: d.is_active,
          connectionInactive: isSchemaConnectionInactive(d.schema_id),
        }))
      );
      setDeColumns(
        allColumns.map((c) => ({
          id: c.id,
          datasetId: c.dataset_id,
          name: c.name,
          dataType: c.normalized_data_type,
          isNullable: c.is_nullable,
          isPrimaryKey: c.is_primary_key,
          isActive: c.is_active,
        }))
      );
    })()
      .catch((err) => {
        if (!cancelled) setDataExplorerError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDataExplorerLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Dataset Overview: GET dataset by id + its columns, for whichever dataset was
  // selected (from Data Explorer's "Open Dataset" action).
  useEffect(() => {
    // Also fetched for Staging & Publish (dataset-centric redesign) — its
    // workspace header needs the same real row count/key strategy/columns.
    if (currentScreen !== 'dataset-overview' && currentScreen !== 'staging-publish') return;
    if (!selectedDatasetId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setDatasetOverviewLoading(true);
    setDatasetOverviewError(null);

    Promise.all([getDataset(selectedDatasetId), listDatasetColumns(selectedDatasetId)])
      .then(([dataset, columns]) => {
        if (cancelled) return;
        setSelectedDataset(dataset);
        setSelectedDatasetColumns(columns);
      })
      .catch((err) => {
        if (!cancelled) setDatasetOverviewError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDatasetOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedDatasetId, currentUser?.id]);

  // Dataset Overview's real quality-issues list (this task) — the top failures
  // from this dataset's most recent COMPLETED validation run, reusing the same
  // listValidationFailures already wired for Validation Run Details. Depends on
  // validationRuns (fetched by the broadened effect above) rather than its own
  // dataset-id lookup, since that's already the real, ordered (newest-first)
  // source of truth for "which run is latest."
  useEffect(() => {
    if (currentScreen !== 'dataset-overview') return;
    if (!selectedDatasetId) return;
    if (!hasPermission('metadata.read')) return;
    const latestCompleted = validationRuns.find((r) => r.status === 'COMPLETED');
    if (!latestCompleted) {
      setDatasetOverviewFailures([]);
      return;
    }

    let cancelled = false;
    setDatasetOverviewFailuresLoading(true);
    listValidationFailures(latestCompleted.id, { page_size: 5 })
      .then((resp) => {
        if (!cancelled) setDatasetOverviewFailures(resp.items);
      })
      .catch(() => {
        if (!cancelled) setDatasetOverviewFailures([]);
      })
      .finally(() => {
        if (!cancelled) setDatasetOverviewFailuresLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedDatasetId, validationRuns, currentUser?.id]);

  // Data Preview tab (this task) — first real frontend consumer of
  // GET /datasets/{id}/preview, gated on data_preview.read (confirmed via
  // app/api/v1/datasets/routes.py). Live read against the actual source
  // database, never cached/re-derived client-side.
  useEffect(() => {
    // Also fetched for Staging & Publish (dataset-centric redesign) — the
    // Preview Staging modal overlays real approved corrections onto these same
    // real source rows rather than inventing a materialized staged table.
    // Also fetched for Dataset Overview — its "Preview Table" tab now renders
    // this same data embedded instead of navigating to the standalone
    // 'dataset-preview' screen (kept around, unused, per instructions not to
    // delete routes/components).
    if (
      currentScreen !== 'dataset-preview' &&
      currentScreen !== 'staging-publish' &&
      currentScreen !== 'dataset-overview'
    )
      return;
    if (!selectedDatasetId) return;
    if (!hasPermission('data_preview.read')) return;

    let cancelled = false;
    setDatasetPreviewLoading(true);
    setDatasetPreviewError(null);
    getDatasetPreview(selectedDatasetId)
      .then((preview) => {
        if (!cancelled) setDatasetPreview(preview);
      })
      .catch((err) => {
        if (!cancelled) setDatasetPreviewError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDatasetPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedDatasetId, currentUser?.id]);

  // Data Profiling: GET profile-runs (dataset-level history) + the dataset list for
  // the selector. Not wired: the POST that starts a new profiling run (out of scope).
  useEffect(() => {
    if (currentScreen !== 'data-profiling') return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setProfilingLoading(true);
    setProfilingError(null);

    Promise.all([listDatasets({ page_size: 200 }), listProfileRuns()])
      .then(([datasetsResp, runs]) => {
        if (cancelled) return;
        setProfilingDatasets(
          datasetsResp.items.map((d) => ({
            id: d.id,
            schemaId: d.schema_id,
            name: d.name,
            columnCount: d.column_count ?? 0,
            rowCountEstimate: d.row_count_estimate ?? 0,
            lastDiscoveredAt: formatDateTime(d.discovered_at),
            isActive: d.is_active,
            // Data Profiling is out of this task's scope — connection status isn't
            // wired here (this screen doesn't fetch connections/schemas at all).
            connectionInactive: false,
          }))
        );
        setProfileRuns(runs);
      })
      .catch((err) => {
        if (!cancelled) setProfilingError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setProfilingLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Data Lineage: GET the lineage graph rooted at whichever dataset is selected.
  useEffect(() => {
    if (currentScreen !== 'data-lineage') return;
    if (!selectedDatasetId) return;
    if (!hasPermission('lineage.read')) return;

    let cancelled = false;
    setLineageLoading(true);
    setLineageError(null);

    // BUG FIX (found via live E2E testing): this sent the entity type as lowercase
    // ("dataset"), but app/modules/lineage/service.py compares it with plain equality
    // against lineage_records.parent_entity_type/child_entity_type, which are always
    // stored UPPERCASE (e.g. "DATASET", "VALIDATION_RUN" — confirmed directly in the
    // platform DB) by every one of the 9 instrumentation touch points that call
    // record_edge()/record_edges_bulk(). The mismatch meant get_edges_for_direction()
    // found zero rows and 404'd — "no lineage" — for every dataset, even ones with
    // real, correctly-recorded edges. Also lowercased entity_type on the way into
    // local state below, since DataLineageView's own ENTITY_ICON/ENTITY_SCREEN maps
    // are keyed lowercase and would otherwise silently miss every node (generic icon,
    // no click-through) even once the request itself started succeeding.
    getLineage('DATASET', selectedDatasetId, 'both')
      .then((graph) => {
        if (cancelled) return;
        setLineageNodes(
          graph.nodes.map((n) => ({
            id: `${n.entity_type}:${n.entity_id}`,
            entityType: n.entity_type.toLowerCase(),
            entityId: n.entity_id,
            // The lineage endpoint returns only entity_type/entity_id — no display
            // name is resolvable from it, so the id itself (truncated) is shown.
            label: n.entity_id.slice(0, 8),
          }))
        );
        setLineageEdges(
          graph.edges.map((e) => ({
            parentId: `${e.parent_entity_type}:${e.parent_entity_id}`,
            childId: `${e.child_entity_type}:${e.child_entity_id}`,
            relationshipType: e.relationship_type,
          }))
        );
      })
      .catch((err) => {
        if (!cancelled) setLineageError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLineageLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedDatasetId, currentUser?.id]);

  // Reports: the 5 real report endpoints only. No date-range picker exists in the UI
  // yet, so a fixed trailing-90-day window is used as a reasonable default.
  // Also powers Dashboard's quality trend/sub-metrics/"Datasets Needing Attention" —
  // same real data, same reports.read gate, so reused rather than duplicated.
  // BUG FIX: depends on currentUser?.id, not just currentScreen — Dashboard is also
  // the initial screen value, so on a fresh login (currentScreen stays 'dashboard'
  // throughout, never "changing" from anything) this would otherwise never fire at
  // all, since currentUser/hasPermission become real only after login resolves.
  useEffect(() => {
    if (currentScreen !== 'reports' && currentScreen !== 'dashboard') return;
    if (!hasPermission('reports.read')) return;

    let cancelled = false;
    setReportsLoading(true);
    setReportsError(null);

    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const range = { from: from.toISOString(), to: to.toISOString() };
    // BUG FIX: this listUsers() call (only to resolve reviewer display names below)
    // ran unconditionally behind just reports.read, with its own .catch swallowing
    // the failure — harmless for the Reports screen itself, but widening this
    // effect's trigger to also cover Dashboard (the default landing screen) meant
    // every reports.read-but-not-users.read user now got a real 403 on every single
    // login instead of only when they specifically visited Reports.
    const canReadUsers = hasPermission('users.read');

    Promise.all([
      getQualityTrendReport(range),
      getRuleEffectivenessReport(range),
      getQualityByDatasetReport(),
      getReviewPerformanceReport(range),
      getApprovalMetricsReport(range),
      canReadUsers ? listUsers().catch(() => [] as UserResponse[]) : Promise.resolve<UserResponse[]>([]),
    ])
      .then(([trend, ruleEff, byDataset, reviewPerf, approval, users]) => {
        if (cancelled) return;
        const userDisplayNameById = new Map(users.map((u) => [u.id, u.full_name || u.username || u.email]));

        setQualityTrend(
          trend.points.map((p) => ({
            date: formatDate(p.created_at),
            datasetName: null,
            // BUG FIX: quality_score is a Decimal on the backend, serialized as a
            // JSON string (e.g. "60.00") — parsed here, not just cast, since this
            // field is now used in real arithmetic (Dashboard's health-score
            // average), which previously produced "NaN%" from unparsed string
            // concatenation.
            qualityScore: Number(p.quality_score),
          }))
        );

        setRuleEffectiveness(
          ruleEff.rules.map((r) => ({
            ruleName: r.rule_name,
            ruleType: r.rule_type,
            failureCount: r.failure_count,
            // The backend has no "reviewer reject rate" for a rule — only its own
            // failure_rate (% of evaluated rows that failed it). Repurposed to show
            // that real number rather than fabricating a reject rate.
            // BUG FIX: same Decimal-as-string parsing as quality_score above.
            rejectRate: r.failure_rate !== null ? Number(r.failure_rate) : 0,
          }))
        );

        setQualityByDataset(
          byDataset.datasets.map((d) => ({
            datasetId: d.dataset_id,
            datasetName: d.dataset_name,
            // quality-by-dataset has no data-source reference — left blank rather
            // than fabricated.
            dataSourceName: '',
            // BUG FIX: same Decimal-as-string parsing as quality_score above.
            latestQualityScore: d.latest_quality_score !== null ? Number(d.latest_quality_score) : null,
            lastValidatedAt: d.latest_validated_at ? formatDateTime(d.latest_validated_at) : null,
          }))
        );

        const totalDecisions = reviewPerf.reviewers.reduce((sum, r) => sum + r.decision_count, 0);
        const weightedLatencySeconds = reviewPerf.reviewers.reduce(
          (sum, r) => sum + (r.avg_latency_seconds ?? 0) * r.decision_count,
          0
        );
        setReviewPerformance({
          avgTimeToDecisionMinutes: totalDecisions > 0 ? weightedLatencySeconds / totalDecisions / 60 : 0,
          throughputByReviewer: reviewPerf.reviewers.map((r) => ({
            name: userDisplayNameById.get(r.reviewer_id) ?? r.reviewer_id,
            count: r.decision_count,
          })),
        });

        setApprovalMetrics({
          // BUG FIX: same Decimal-as-string parsing as quality_score above.
          approvalRate: approval.approval_rate !== null ? Number(approval.approval_rate) : 0,
          avgDecisionLatencyMinutes: (approval.avg_decision_latency_seconds ?? 0) / 60,
        });
      })
      .catch((err) => {
        if (!cancelled) setReportsError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Dashboard's remaining sections (pending approvals, records monitored, active
  // sources) — each fetched and gated independently so one denied/failing section
  // doesn't blank the others (matches this task's explicit resilience requirement;
  // per-call isolation here instead of the Promise.all used elsewhere, specifically
  // because these three calls carry three DIFFERENT permissions, unlike Reports'
  // five calls which share one). Depends on currentUser?.id for the same reason as
  // the Reports/Dashboard effect above — Dashboard is the initial screen value, so
  // a fresh login never "changes" currentScreen and would otherwise never fire this.
  useEffect(() => {
    if (currentScreen !== 'dashboard') return;

    let cancelled = false;
    const canReadApprovals = hasPermission('approval.read');
    const canReadDatasets = hasPermission('metadata.read');
    const canReadDataSources = hasPermission('data_sources.read');

    if (canReadApprovals) {
      setDashboardApprovalsLoading(true);
      setDashboardApprovalsError(null);
      listApprovals({ status: 'PENDING' })
        .then((items) => {
          if (!cancelled) setDashboardPendingApprovals(items);
        })
        .catch((err) => {
          if (!cancelled) setDashboardApprovalsError(extractErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setDashboardApprovalsLoading(false);
        });
    }

    if (canReadDatasets) {
      setDashboardDatasetsLoading(true);
      setDashboardDatasetsError(null);
      listDatasets({ page_size: 200 })
        .then((resp) => {
          if (!cancelled) setDashboardDatasets(resp.items);
        })
        .catch((err) => {
          if (!cancelled) setDashboardDatasetsError(extractErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setDashboardDatasetsLoading(false);
        });
    }

    if (canReadDataSources) {
      setDashboardDataSourcesLoading(true);
      setDashboardDataSourcesError(null);
      listDataSources()
        .then((sources) => {
          if (!cancelled) setDashboardActiveSourceCount(sources.filter((s) => s.is_active).length);
        })
        .catch((err) => {
          if (!cancelled) setDashboardDataSourcesError(extractErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setDashboardDataSourcesLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // User & Role Management + Settings' own role display — both need the real user
  // list and real role names, gated on users.read (confirmed via
  // app/api/v1/users/routes.py: GET /users and GET /roles both require it).
  useEffect(() => {
    if (currentScreen !== 'user-management' && currentScreen !== 'settings') return;
    if (!hasPermission('users.read')) return;

    let cancelled = false;
    setUsersLoading(true);
    setUsersError(null);

    Promise.all([listUsers(), listRoles()])
      .then(([users, rolesList]) => {
        if (cancelled) return;
        setRoles(rolesList);
        const roleById = new Map(rolesList.map((r) => [r.id, r]));
        setPlatformUsers(users.map((u) => mapUserResponseToUser(u, roleById)));
      })
      .catch((err) => {
        if (!cancelled) setUsersError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Run History: assembled client-side from validation-runs + profile-runs. There is
  // no list-all endpoint for staging-runs, publish-runs, or jobs anywhere in this
  // backend (only get-by-id for each), so those cannot be included here.
  useEffect(() => {
    if (currentScreen !== 'run-history') return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setRunHistoryLoading(true);
    setRunHistoryError(null);

    Promise.all([listValidationRuns(), listProfileRuns(), listDatasets({ page_size: 200 })])
      .then(([validations, profiles, datasetsResp]) => {
        if (cancelled) return;
        const datasetNameById = new Map(datasetsResp.items.map((d) => [d.id, d.name]));

        const validationItems: RunHistoryItem[] = validations.map((v) => ({
          id: v.id,
          runType: 'VALIDATION',
          datasetName: datasetNameById.get(v.dataset_id) ?? v.dataset_id,
          status: v.status,
          startedAt: formatDateTime(v.started_at),
          completedAt: v.completed_at ? formatDateTime(v.completed_at) : null,
          summary: `${v.passed_rows.toLocaleString()} passed, ${v.warning_rows.toLocaleString()} warning, ${v.failed_rows.toLocaleString()} failed of ${v.total_rows.toLocaleString()} rows`,
        }));

        const profileItems: RunHistoryItem[] = profiles.map((p) => ({
          id: p.id,
          runType: 'PROFILE',
          datasetName: datasetNameById.get(p.dataset_id) ?? p.dataset_id,
          status: p.status,
          startedAt: formatDateTime(p.started_at),
          completedAt: p.completed_at ? formatDateTime(p.completed_at) : null,
          summary:
            p.row_count !== null
              ? `${p.row_count.toLocaleString()} rows profiled${p.sample_size ? ` (sample of ${p.sample_size.toLocaleString()})` : ' (full scan)'}`
              : 'Profiling in progress',
        }));

        const merged = [...validationItems, ...profileItems].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
        setRunHistory(merged);
      })
      .catch((err) => {
        if (!cancelled) setRunHistoryError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setRunHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // --- Core decision workflow fetches (this batch) ----------------------------------

  // Data Quality Rules: list rules + assignments, then each rule's versions (needed to
  // find the current version id for creating new assignments, and — this task — to
  // read a PENDING_REVIEW rule's _detected_for.column_id/column_name/dataset_id out
  // of its current version's definition, the only place that's stored). Extracted
  // into a standalone function (not just inline in the effect) so rule detection's
  // completion handler can call it again to pick up newly-created PENDING_REVIEW
  // rules, and so promote/dismiss can refresh real status without a full reload.
  const refreshRulesAndAssignments = async (): Promise<void> => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const [rulesList, assignments] = await Promise.all([listRules(), listRuleAssignments()]);
      setRules(rulesList);
      setRuleAssignments(assignments);

      const versionLists = await Promise.all(
        rulesList.map((r) => listRuleVersions(r.id).catch(() => [] as RuleVersionResponse[]))
      );
      const map: Record<string, RuleVersionResponse[]> = {};
      rulesList.forEach((r, idx) => {
        map[r.id] = versionLists[idx];
      });
      setRuleVersionsByRuleId(map);
    } catch (err) {
      setRulesError(extractErrorMessage(err));
    } finally {
      setRulesLoading(false);
    }
  };

  // Also fetched when landing on Dataset Overview (this task) — its Quality Rules
  // tab filters this exact same state down to the current dataset's assignments and
  // PENDING_REVIEW rules, rather than duplicating a parallel fetch. Also fetched on
  // Validation Workspace (this task) — handleRunValidation's zero-assignment
  // pre-check reads this same `ruleAssignments` state, and Validation Workspace is
  // reachable without ever visiting Dataset Overview first (e.g. the sidebar's
  // "Validation" item), so it must not rely on a stale/empty list from a screen
  // the user never opened.
  useEffect(() => {
    if (
      currentScreen !== 'quality-rules' &&
      currentScreen !== 'dataset-overview' &&
      currentScreen !== 'validation-workspace'
    )
      return;
    if (!hasPermission('rules.read')) return;
    refreshRulesAndAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Data Quality Rules is dataset-first (this task): real dataset names, not
  // just the RuleAssignment.dataset_id already in `ruleAssignments`, so the
  // dataset picker can show "Customers" instead of a truncated UUID.
  useEffect(() => {
    if (currentScreen !== 'quality-rules') return;
    if (!hasPermission('metadata.read')) return;
    let cancelled = false;
    listDatasets({ page_size: 200 })
      .then((resp) => {
        if (!cancelled) setQualityRulesDatasets(resp.items);
      })
      .catch(() => {
        if (!cancelled) setQualityRulesDatasets([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Validation Workspace: list validation runs for the selected dataset. Also
  // fetched when landing on Dataset Overview (this task) — the Overview tab
  // reuses this exact same state for its real quality/issue summary instead of
  // duplicating a parallel fetch.
  useEffect(() => {
    // Also fetched for Staging & Publish (dataset-centric redesign) — its
    // workspace header's "Last Validation" field uses this same real state.
    if (
      currentScreen !== 'validation-workspace' &&
      currentScreen !== 'dataset-overview' &&
      currentScreen !== 'staging-publish'
    )
      return;
    if (!selectedDatasetId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setValidationLoading(true);
    setValidationError(null);
    setValidationActionError(null);

    listValidationRuns({ dataset_id: selectedDatasetId })
      .then((runs) => {
        if (cancelled) return;
        const datasetName = selectedDataset?.name ?? selectedDatasetId;
        setValidationRuns(runs.map((r) => mapValidationRun(r, datasetName)));
      })
      .catch((err) => {
        if (!cancelled) setValidationError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setValidationLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedDatasetId, currentUser?.id]);

  // Master/detail redesign — bulk per-dataset validation history for the
  // Validation master table and Review & Corrections master's "Validation"
  // column. Runs once the shared workflow catalog's dataset list is loaded.
  useEffect(() => {
    if (currentScreen !== 'validation-workspace' && currentScreen !== 'review-corrections') return;
    if (workflowCatalogDatasets.length === 0) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setValidationSummaryLoading(true);
    Promise.all(
      workflowCatalogDatasets.map((d) =>
        listValidationRuns({ dataset_id: d.id })
          .then((runs) => [d.id, runs.map((r) => mapValidationRun(r, d.name))] as const)
          .catch(() => [d.id, [] as ValidationRun[]] as const)
      )
    )
      .then((entries) => {
        if (cancelled) return;
        const map: Record<string, ValidationRun[]> = {};
        entries.forEach(([id, runs]) => {
          map[id] = runs;
        });
        setValidationSummaryByDatasetId(map);
      })
      .finally(() => {
        if (!cancelled) setValidationSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, workflowCatalogDatasets, currentUser?.id]);

  // Validation Run Details: real aggregate counts for the selected run.
  // Self-repeats every 2s while the fetched run is still QUEUED/RUNNING (the
  // "contextual running indicator" requirement) — a user parked on this exact
  // page for a still-in-progress run must see it reach COMPLETED/FAILED live,
  // not only on a manual refresh. Stops the moment the run is terminal.
  useEffect(() => {
    if (currentScreen !== 'validation-run-details') return;
    if (!selectedValidationRunId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let firstLoad = true;

    const load = () => {
      if (firstLoad) {
        setValidationDetailLoading(true);
        setValidationDetailError(null);
        setValidationDetailActionError(null);
      }
      getValidationRun(selectedValidationRunId)
        .then(async (vr) => {
          if (cancelled) return;
          let datasetName = vr.dataset_id;
          try {
            const dataset = await getDataset(vr.dataset_id);
            datasetName = dataset.name;
          } catch {
            // keep id fallback
          }
          if (cancelled) return;
          setSelectedValidationRun(mapValidationRun(vr, datasetName));
          if (vr.status === 'QUEUED' || vr.status === 'RUNNING') {
            timer = setTimeout(load, 2000);
          }
        })
        .catch((err) => {
          if (!cancelled) setValidationDetailError(extractErrorMessage(err));
        })
        .finally(() => {
          if (!cancelled) setValidationDetailLoading(false);
          firstLoad = false;
        });
    };
    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedValidationRunId, currentUser?.id]);

  // Validation Run Details' row-level failure detail — real, paginated, same
  // metadata.read gate as the run-details fetch above (this endpoint has no
  // separate permission of its own). Resets to page 1 whenever the run or the
  // severity filter changes.
  useEffect(() => {
    if (currentScreen !== 'validation-run-details') return;
    if (!selectedValidationRunId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setValidationFailuresLoading(true);
    setValidationFailuresError(null);

    listValidationFailures(selectedValidationRunId, {
      page: validationFailuresPage,
      page_size: VALIDATION_FAILURES_PAGE_SIZE,
      severity: validationFailuresSeverity || undefined,
    })
      .then((resp) => {
        if (cancelled) return;
        setValidationFailures(resp.items);
        setValidationFailuresTotal(resp.total);
      })
      .catch((err) => {
        if (!cancelled) setValidationFailuresError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setValidationFailuresLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedValidationRunId, validationFailuresPage, validationFailuresSeverity, currentUser?.id]);

  // Validation Run Details — the rules actually evaluated for this run
  // (names/columns/origin), independent of the failure list above so
  // rules that passed with zero failures are still visible as evidence
  // rulesEvaluatedCount is real, not just a number.
  useEffect(() => {
    if (currentScreen !== 'validation-run-details') return;
    if (!selectedValidationRunId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setEvaluatedRulesLoading(true);
    setEvaluatedRulesError(null);

    listEvaluatedRules(selectedValidationRunId)
      .then((resp) => {
        if (!cancelled) setEvaluatedRules(resp.items);
      })
      .catch((err) => {
        if (!cancelled) setEvaluatedRulesError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setEvaluatedRulesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedValidationRunId, currentUser?.id]);

  // Reset failure-detail pagination/filter whenever a different run is opened.
  useEffect(() => {
    setValidationFailuresPage(1);
    setValidationFailuresSeverity('');
  }, [selectedValidationRunId]);

  // Review & Corrections: list reviews, then (N+1, dev-scale only — no bulk endpoint
  // exists for any of this) each review's validation run (for its dataset name),
  // issues, and suggestions, merged into one flat Issue[] exactly like the mock data
  // shape did, so the view's own per-run progress computation needs no changes.
  //
  // Column/rule names: every Issue.validation_failure_id is a real, NOT NULL FK
  // (app/db/models/review.py — confirmed the only Issue(...) construction site is
  // review/service.py's bulk-create from validation failures, so there is no other
  // way an Issue can exist). That means EVERY issue on this screen can, in
  // principle, be traced back to the failure that produced it. Resolved here by
  // fetching each represented review's validation run's failures ONCE (not per
  // issue — batched by unique validation_run_id) via the new GET /validation-runs/
  // {id}/failures, then matching on validation_failure_id. Gated separately on
  // metadata.read (that endpoint's actual permission, distinct from this screen's
  // own review.read) — a review.read-only user without metadata.read still sees
  // every issue, just with the old truncated-id fallback instead of real names.
  useEffect(() => {
    // Also fetched for Staging & Publish (dataset-centric redesign) — its left
    // explorer needs every dataset's review status, and its Approved Changes
    // card needs the real resolved Issue[] for whichever review a dataset maps
    // to, both already produced by this exact fetch.
    if (currentScreen !== 'review-corrections' && currentScreen !== 'staging-publish') return;
    if (!hasPermission('review.read')) return;

    let cancelled = false;
    setReviewRunsLoading(true);
    setReviewRunsError(null);
    const canResolveNames = hasPermission('metadata.read');

    (async () => {
      const [reviewsList, datasetsResp] = await Promise.all([listReviews(), listDatasets({ page_size: 200 })]);
      const datasetNameById = new Map(datasetsResp.items.map((d) => [d.id, d.name]));

      const details = await Promise.all(
        reviewsList.map(async (rr) => {
          const [vr, issuesList, suggestionsList, correctionsList] = await Promise.all([
            getValidationRun(rr.validation_run_id).catch(() => null),
            listReviewIssues(rr.id).catch(() => [] as IssueResponse[]),
            listReviewSuggestions(rr.id).catch(() => [] as CorrectionSuggestionResponse[]),
            listReviewCorrections(rr.id).catch(() => [] as CorrectionResponse[]),
          ]);
          const datasetName = vr ? datasetNameById.get(vr.dataset_id) ?? vr.dataset_id : rr.validation_run_id;
          return { rr, datasetName, datasetId: vr?.dataset_id, issuesList, suggestionsList, correctionsList };
        })
      );

      if (cancelled) return;

      // One failures fetch per UNIQUE validation_run_id represented, not per issue
      // or per review (several reviews could in principle share a run).
      const failureById = new Map<string, ValidationFailureResponse>();
      if (canResolveNames) {
        const uniqueRunIds = Array.from(new Set(details.map((d) => d.rr.validation_run_id)));
        await Promise.all(
          uniqueRunIds.map(async (runId) => {
            const items = await fetchAllValidationFailures(runId, (id, page, page_size) =>
              listValidationFailures(id, { page, page_size })
            );
            items.forEach((f) => failureById.set(f.id, f));
          })
        );
      }

      const mappedRuns: ReviewRun[] = [];
      const mappedIssues: Issue[] = [];
      details.forEach(({ rr, datasetName, datasetId, issuesList, suggestionsList, correctionsList }) => {
        const suggestionsByIssueId = new Map<string, CorrectionSuggestionResponse[]>();
        suggestionsList.forEach((s) => {
          suggestionsByIssueId.set(s.issue_id, [...(suggestionsByIssueId.get(s.issue_id) ?? []), s]);
        });
        // BUG FIX (V1.0 acceptance): finalValue used to be hardcoded null here
        // (no bulk endpoint existed to learn each issue's decided correction),
        // which silently zeroed out every dataset's resolved-issue count
        // everywhere it's used — including the Staging page's Ready to Stage
        // derivation. GET /reviews/{id}/corrections now supplies the real,
        // decided value per issue (one Correction row per issue, by design).
        const correctionByIssueId = new Map<string, CorrectionResponse>();
        correctionsList.forEach((c) => correctionByIssueId.set(c.issue_id, c));

        const mapped: Issue[] = issuesList.map((issue) => {
          const candidates = suggestionsByIssueId.get(issue.id) ?? [];
          const suggestion = candidates.find((s) => s.is_selected) ?? candidates[0];
          const failure = failureById.get(issue.validation_failure_id);
          const correction = correctionByIssueId.get(issue.id);
          return {
            id: issue.id,
            reviewRunId: issue.review_run_id,
            recordRef: issue.record_ref,
            // Real name when resolvable (metadata.read + the failure was found in
            // its run's list); truncated id as an honest fallback otherwise — e.g.
            // no metadata.read, or a row-level rule with no single column
            // (column_name is genuinely null for those, not unresolved).
            columnName: failure ? failure.column_name ?? '(row-level)' : issue.column_id ? issue.column_id.slice(0, 8) : '—',
            severity: (issue.severity as Issue['severity']) || 'MEDIUM',
            originalValue: issue.original_value ?? '',
            suggestedValue: suggestion?.suggested_value ?? null,
            suggestionSource: suggestion ? ((suggestion.source as Issue['suggestionSource']) ?? null) : null,
            suggestionCategory: suggestion ? ((suggestion.category as Issue['suggestionCategory']) ?? null) : null,
            suggestionReasoning: suggestion?.reasoning ?? null,
            // BUG FIX (Decimal-serialization sweep): confidence is a Decimal-as-
            // string on the wire — parsed here rather than passed through.
            confidence: suggestion?.confidence !== undefined ? Number(suggestion.confidence) : null,
            status: (issue.status as Issue['status']) || 'PENDING',
            finalValue: correction?.final_value ?? null,
            ruleTriggered: failure ? failure.rule_name : '—',
            suggestionId: suggestion?.id ?? null,
            suggestionStrategy: suggestion?.strategy ?? null,
            suggestionEvidence: suggestion?.evidence_detail ?? null,
          };
        });
        mappedIssues.push(...mapped);

        const resolvedCount = mapped.filter((i) => i.status !== 'PENDING').length;
        mappedRuns.push(mapReviewRun(rr, datasetName, mapped.length, resolvedCount, datasetId));
      });

      setReviewRuns(mappedRuns);
      setIssues(mappedIssues);
      // Auto-select only on Review & Corrections itself — Staging & Publish now
      // drives selectedReviewId from the explorer's dataset selection instead
      // (see handleSelectStagingDataset), so it must not be pre-empted here.
      // Prefers the URL's own `?reviewId=` (a direct/bookmarked/refreshed link to
      // a specific review) over "keep whatever was already selected" over "first
      // in the list" — this is what makes a refresh on a specific review's URL
      // land back on that same review instead of silently reverting to the first
      // one in the dataset's list.
      if (currentScreen === 'review-corrections') {
        const fromUrl = searchParams.get('reviewId');
        setSelectedReviewId((prev) => {
          if (prev && mappedRuns.some((r) => r.id === prev)) return prev;
          if (fromUrl && mappedRuns.some((r) => r.id === fromUrl)) return fromUrl;
          return mappedRuns[0]?.id ?? null;
        });
      }
    })()
      .catch((err) => {
        if (!cancelled) setReviewRunsError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setReviewRunsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Approval Center: list approvals, then resolve each one's review name, dataset name,
  // and requester display name (all real, via chained real endpoints). Also fetched
  // when landing on Dataset Overview (this task) — its Pending Approvals tab filters
  // this exact same resolved state down to the current dataset, by name (the
  // mapped ApprovalRequestItem carries no dataset id, only the resolved name).
  useEffect(() => {
    // Also fetched for Staging & Publish (dataset-centric redesign) — its
    // per-dataset status derivation needs each dataset's real approval decision.
    if (
      currentScreen !== 'approval-center' &&
      currentScreen !== 'dataset-overview' &&
      currentScreen !== 'staging-publish'
    )
      return;
    if (!hasPermission('approval.read')) return;

    let cancelled = false;
    setApprovalsLoading(true);
    setApprovalsError(null);

    (async () => {
      const [approvalsList, datasetsResp, usersList] = await Promise.all([
        listApprovals(),
        listDatasets({ page_size: 200 }),
        listUsers().catch(() => [] as UserResponse[]),
      ]);
      const datasetNameById = new Map(datasetsResp.items.map((d) => [d.id, d.name]));
      const userNameById = new Map(usersList.map((u) => [u.id, u.full_name || u.username || u.email]));

      const mapped = await Promise.all(
        approvalsList.map(async (a) => {
          const review = await getReview(a.review_run_id).catch(() => null);
          let datasetName = a.review_run_id.slice(0, 8);
          if (review) {
            const vr = await getValidationRun(review.validation_run_id).catch(() => null);
            if (vr) datasetName = datasetNameById.get(vr.dataset_id) ?? vr.dataset_id;
          }
          const requestedByName = a.requested_by ? userNameById.get(a.requested_by) ?? a.requested_by : 'Unknown';
          return mapApprovalRequest(a, review?.name || a.review_run_id.slice(0, 8), datasetName, requestedByName);
        })
      );

      if (cancelled) return;
      setApprovalQueue(mapped);
    })()
      .catch((err) => {
        if (!cancelled) setApprovalsError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setApprovalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // V1.0 acceptance fix — backend-authoritative staging readiness. Fetched
  // whenever Staging & Publish is open (refresh-safe: this is a plain GET
  // keyed off nothing but the current user's permissions, unlike reviewRuns/
  // approvalQueue above it never depends on a prior screen visit or any
  // client-side join to become correct).
  useEffect(() => {
    if (currentScreen !== 'staging-publish') return;
    if (!hasPermission('staging.read')) return;

    let cancelled = false;
    setStagingCandidatesLoading(true);
    setStagingCandidatesError(null);
    getStagingCandidates()
      .then((rows) => {
        if (!cancelled) setStagingCandidates(rows);
      })
      .catch((err) => {
        if (!cancelled) setStagingCandidatesError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setStagingCandidatesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Staging & Publish: state resets when the user switches to a genuinely
  // DIFFERENT review's workspace — stale staging/publish state from the
  // previous dataset must never leak into the next one. Deliberately does
  // NOT reset on the very first resolution of selectedReviewId (null -> a
  // real id, which happens on every fresh mount/refresh while reviewRuns is
  // still loading): the resume-from-URL effect right below this one needs to
  // populate currentStagingRun from ?stagingRunId= on that same first mount,
  // and this effect running after it in a later render would otherwise wipe
  // it back out — a real ordering hazard once refresh-safety made "land
  // directly on this page with a run already in progress" possible.
  const prevSelectedReviewIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSelectedReviewIdRef.current;
    prevSelectedReviewIdRef.current = selectedReviewId;
    if (prev === null || selectedReviewId === null || prev === selectedReviewId) return;
    setCurrentStagingRun(null);
    setCurrentPublishRun(null);
    setStagingRecords([]);
    setStagingActionError(null);
    setRevalidationByRecordId(new Map());
    setRevalidationLoadingIds(new Set());
    setRevalidationErrorByRecordId(new Map());
    setJustTriggeredStagingRunId(null);
    setStagingPollError(null);
    setIsMaterializedPreviewOpen(false);
    setMaterializedDestination(null);
    setMaterializedPreview(null);
  }, [selectedReviewId]);

  // Refresh-safe staging progress (Phase 4.12B): the active staging run's
  // identity lives in the URL (?stagingRunId=), not just in-memory state, so
  // a hard refresh mid-materialization resumes watching the SAME run instead
  // of losing it (and never creates a second one). Fetches once whenever the
  // URL names a run this component doesn't already have loaded; the polling
  // effect right below takes over from there while it's still in progress.
  const stagingRunIdFromUrl = currentScreen === 'staging-publish' ? searchParams.get('stagingRunId') : null;
  useEffect(() => {
    if (!stagingRunIdFromUrl) return;
    if (currentStagingRun?.id === stagingRunIdFromUrl) return;
    let cancelled = false;
    getStagingRun(stagingRunIdFromUrl)
      .then((run) => {
        if (!cancelled) setCurrentStagingRun(run);
      })
      .catch((err) => {
        if (!cancelled) setStagingActionError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagingRunIdFromUrl]);

  // Polls the real materialization job while it's genuinely in progress.
  // Stops on READY/FAILED/CANCELLED/LEGACY (see isTerminalMaterializationPhase),
  // on unmount, and whenever the run identity changes — never overlapping
  // requests, never polling a run this session didn't just create and that
  // the backend itself reports as unmaterialized (LEGACY; see
  // resolveMaterializationUiPhase). A poll failure sets stagingPollError
  // (transient — "couldn't refresh") without ever treating it as the run
  // itself having failed.
  useEffect(() => {
    if (!currentStagingRun) return;
    const runId = currentStagingRun.id;
    const uiPhase = resolveMaterializationUiPhase(
      currentStagingRun.materialization_phase,
      justTriggeredStagingRunId === runId
    );
    if (isTerminalMaterializationPhase(uiPhase)) return;

    let cancelled = false;
    let inFlight = false;
    const poll = () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      getStagingRun(runId)
        .then((run) => {
          if (cancelled) return;
          setCurrentStagingRun(run);
          setStagingPollError(null);
        })
        .catch((err) => {
          if (!cancelled) setStagingPollError(extractErrorMessage(err));
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const interval = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentStagingRun, justTriggeredStagingRunId]);

  // Global operation visibility for staging (V1.0): fires exactly once when a
  // run we're watching reaches READY/FAILED — reaches the user even if
  // they've navigated away from Staging entirely. Deliberately does NOT
  // duplicate Phase 4.12B's own in-page progress UI (steps, real percentage,
  // counters all stay exactly as they were); this is only the "you can leave
  // this page and still find out" complement to it. announcedStagingRunIdRef
  // guards against re-announcing the same already-terminal run on a later
  // remount (e.g. revisiting the page after the fact).
  useEffect(() => {
    if (!currentStagingRun) return;
    const uiPhase = resolveMaterializationUiPhase(
      currentStagingRun.materialization_phase,
      justTriggeredStagingRunId === currentStagingRun.id
    );
    if (uiPhase !== 'READY' && uiPhase !== 'FAILED') return;
    if (announcedStagingRunIdRef.current === currentStagingRun.id) return;
    announcedStagingRunIdRef.current = currentStagingRun.id;

    const datasetName =
      workflowCatalogDatasets.find((d) => d.id === currentStagingRun.dataset_id)?.name ?? currentStagingRun.dataset_id;
    const ctaAction = {
      label: uiPhase === 'READY' ? 'View Staged Dataset' : 'View Details',
      onClick: () => navigate(`/staging-publish/${currentStagingRun.dataset_id}?stagingRunId=${currentStagingRun.id}`),
    };
    if (uiPhase === 'READY') {
      triggerToast(`Staging completed for "${datasetName}".`, { variant: 'success', action: ctaAction });
    } else {
      triggerToast(`Staging failed for "${datasetName}".`, { variant: 'error', action: ctaAction });
    }
  }, [currentStagingRun, justTriggeredStagingRunId, workflowCatalogDatasets]);

  // Refreshes staging records whenever the current staging run or the drift_only
  // filter changes (drift_only is the backend's own query param, not a client-only
  // filter).
  useEffect(() => {
    if (!currentStagingRun) return;
    if (!hasPermission('staging.read')) return;

    let cancelled = false;
    listStagingRecords(currentStagingRun.id, { drift_only: driftOnlyFilter })
      .then((records) => {
        if (!cancelled) setStagingRecords(records);
      })
      .catch(() => {
        if (!cancelled) setStagingRecords([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStagingRun, driftOnlyFilter]);

  // Shared dataset/connection/schema catalog for all five master/detail
  // workflow screens (Validation, Data Quality Rules, Review & Corrections,
  // Approval Center, Staging & Publish) — one fetch, reused everywhere a
  // master list needs "which datasets exist, under which connection/schema",
  // rather than duplicating Data Explorer's own copy of this per screen (kept
  // separate from deSchemas/deDatasets so this screen's gating doesn't change
  // Data Explorer's).
  useEffect(() => {
    if (
      currentScreen !== 'validation-workspace' &&
      currentScreen !== 'quality-rules' &&
      currentScreen !== 'review-corrections' &&
      currentScreen !== 'approval-center' &&
      currentScreen !== 'staging-publish'
    )
      return;
    if (!hasPermission('metadata.read')) {
      setWorkflowCatalogError('You need the metadata.read permission to browse datasets.');
      return;
    }

    let cancelled = false;
    setWorkflowCatalogLoading(true);
    setWorkflowCatalogError(null);

    (async () => {
      const connections = hasPermission('connections.read') ? await listConnections() : [];
      const schemaLists = await Promise.all(
        connections.map((c) => apiListSchemas(c.id).catch(() => [] as SchemaResponse[]))
      );
      const datasetsResp = await listDatasets({ page_size: 200 });
      if (cancelled) return;
      setWorkflowCatalogConnections(connections);
      setWorkflowCatalogSchemas(schemaLists.flat());
      setWorkflowCatalogDatasets(datasetsResp.items);
    })()
      .catch((err) => {
        if (!cancelled) setWorkflowCatalogError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setWorkflowCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, currentUser?.id]);

  // Real router navigation for every existing `onNavigate(screen)` callback
  // threaded through the view components — their prop signature is untouched
  // (still just a NavScreen), only what happens underneath changed: this now
  // pushes a real URL instead of flipping in-memory state, so the address
  // bar, refresh, and browser Back/Forward all reflect it. Screens whose only
  // real route needs an id resolve it from whichever dataset is already
  // selected (from the current URL) — matching every existing caller, which
  // only ever invokes these bare when a dataset is already in scope (e.g.
  // ValidationRunDetailsView's own "back to dataset" action).
  const handleNavigate = (screen: NavScreen) => {
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (screen === 'dataset-overview' || screen === 'dataset-preview') {
      if (!selectedDatasetId) {
        navigate('/data-explorer');
        return;
      }
      navigate(screen === 'dataset-overview' ? `/datasets/${selectedDatasetId}` : `/datasets/${selectedDatasetId}/preview`);
      return;
    }
    if (screen === 'validation-run-details') {
      // No existing caller invokes this bare (always via handleSelectValidationRun,
      // which navigates directly) — falls back to the dataset's run list.
      if (selectedDatasetId) navigate(`/validation/${selectedDatasetId}`);
      return;
    }
    const path = SCREEN_TO_PATH[screen];
    if (path) navigate(path);
  };

  // Clears the "View Datasets" scoping filter whenever Data Explorer isn't the
  // active screen, so navigating away and back in via the sidebar directly always
  // starts unfiltered rather than silently keeping a stale scope.
  useEffect(() => {
    if (currentScreen !== 'data-explorer' && explorerDataSourceFilter !== null) {
      setExplorerDataSourceFilter(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  const handleViewDatasetsForSource = (dataSourceId: string, dataSourceName: string) => {
    setExplorerDataSourceFilter({ id: dataSourceId, name: dataSourceName });
    handleNavigate('data-explorer');
  };

  // BUG FIX (this task): removed the old generic "toggle rule ACTIVE/DISABLED"
  // handler that used to back a switch on every rule card, including
  // PENDING_REVIEW ones. target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
  // meant clicking it on a PENDING_REVIEW rule flipped it straight to ACTIVE —
  // bypassing promote_rule() entirely, so the rule never got the RuleAssignment
  // that promotion creates, yet looked "Active" with no dataset actually
  // evaluating it. Rule review must go through promote/dismiss (RulesService),
  // never a bare PATCH of status. Per-dataset enable/disable is still available
  // via RuleAssignment.is_enabled (onDisableAssignment).

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewRuleFormError(null);
    if (!newRuleName.trim()) return;

    let definition: Record<string, unknown>;
    try {
      definition = JSON.parse(newRuleDefinitionText || '{}');
    } catch {
      setNewRuleFormError('Definition must be valid JSON.');
      return;
    }

    const payload: RuleCreateRequest = {
      name: newRuleName.trim(),
      description: newRuleDescription.trim() || null,
      category: newRuleCategory.trim() || null,
      rule_type: newRuleType,
      definition,
      severity: newRuleSeverity,
      error_message_template: newRuleErrorMessage.trim() || null,
    };

    setIsSavingRule(true);
    try {
      const created = await apiCreateRule(payload);
      setRules((prev) => [created, ...prev]);
      setNewRuleName('');
      setNewRuleDescription('');
      setNewRuleCategory('');
      setNewRuleType('COMPLETENESS');
      setNewRuleSeverity('MEDIUM');
      setNewRuleDefinitionText('{}');
      setNewRuleErrorMessage('');
      setShowRuleCreatorModal(false);
      triggerToast(`Rule "${created.name}" created`);
    } catch (err) {
      setNewRuleFormError(extractErrorMessage(err));
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleCreateRuleAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentFormError(null);
    if (!assignmentRuleId || !assignmentDatasetId) {
      setAssignmentFormError('Choose a rule and a dataset.');
      return;
    }
    const versions = ruleVersionsByRuleId[assignmentRuleId] ?? [];
    const currentVersion = versions.find((v) => v.is_current) ?? versions[0];
    if (!currentVersion) {
      setAssignmentFormError('This rule has no version to assign yet.');
      return;
    }

    const payload: RuleAssignmentCreateRequest = {
      rule_version_id: currentVersion.id,
      dataset_id: assignmentDatasetId,
      assignment_scope: assignmentScope,
      column_id: assignmentScope === 'SINGLE_COLUMN' ? assignmentColumnId || null : null,
      column_ids: assignmentScope === 'CROSS_COLUMN' ? assignmentColumnIds : null,
    };

    setIsSavingAssignment(true);
    try {
      const created = await apiCreateRuleAssignment(payload);
      setRuleAssignments((prev) => [created, ...prev]);
      setShowAssignmentForm(false);
      setAssignmentRuleId('');
      setAssignmentDatasetId('');
      setAssignmentScope('DATASET_LEVEL');
      setAssignmentColumnId('');
      setAssignmentColumnIds([]);
      triggerToast('Rule assigned');
    } catch (err) {
      setAssignmentFormError(extractErrorMessage(err));
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDisableAssignment = async (assignmentId: string) => {
    try {
      const updated = await apiDeleteRuleAssignment(assignmentId);
      setRuleAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
      triggerToast('Assignment disabled');
    } catch (err) {
      setRulesActionError(extractErrorMessage(err));
    }
  };

  // Whole-dataset rule detection (this task) — POST /ai/suggestions/rule-detection
  // is async (202+job_id), same pattern as the other AI suggestion triggers. Real
  // LLM call for whatever the pattern-matching half wasn't confident about, so this
  // genuinely isn't instant. No safety logic added here by design: the backend
  // structurally guarantees every rule this produces lands PENDING_REVIEW with no
  // rule_assignment, so nothing it creates can affect a validation run before a
  // human explicitly promotes it — the frontend's job is only to trigger it, wait
  // for the real result, and show it honestly (including when the AI half declined
  // or was unavailable, via ai_skipped_reason).
  const handleDetectRules = async (datasetId: string) => {
    const datasetName =
      (selectedDataset?.id === datasetId ? selectedDataset.name : undefined) ??
      workflowCatalogDatasets.find((d) => d.id === datasetId)?.name ??
      qualityRulesDatasets.find((d) => d.id === datasetId)?.name ??
      datasetId;
    setIsDetectingRules(true);
    setRuleDetectionError(null);
    setRuleDetectionSummary(null);
    try {
      const { job_id } = await triggerRuleDetection({ dataset_id: datasetId });
      // Immediate acknowledgement — fires only once the backend has actually
      // accepted the job. Independent of the inline "Scanning columns…" button
      // state on Dataset Overview, so the user still learns this reached the
      // backend even before that button's own spinner is visible to them.
      triggerToast(`Rule analysis started for "${datasetName}". You can continue working.`);
      const result = await pollAIJob(job_id);
      const patternCount = typeof result.pattern_detected_count === 'number' ? result.pattern_detected_count : 0;
      const aiCount = typeof result.ai_recommended_count === 'number' ? result.ai_recommended_count : 0;
      const skippedReason = typeof result.ai_skipped_reason === 'string' ? result.ai_skipped_reason : null;

      await refreshRulesAndAssignments();

      if (patternCount === 0 && aiCount === 0) {
        setRuleDetectionSummary(
          skippedReason
            ? `No confident pattern matches found, and the AI fallback didn't produce any either (${skippedReason}).`
            : 'No confident pattern matches or AI recommendations were found for this dataset\'s columns.'
        );
        triggerToast(`Rule analysis completed for "${datasetName}" · No suggestions found`, { variant: 'success' });
      } else {
        const totalCount = patternCount + aiCount;
        setRuleDetectionSummary(
          `Found ${patternCount} pattern-detected and ${aiCount} AI-suggested rule${totalCount === 1 ? '' : 's'} — review them below.` +
            (skippedReason ? ` (Some columns skipped the AI fallback: ${skippedReason})` : '')
        );
        triggerToast(
          `Rule analysis completed for "${datasetName}" · ${totalCount} suggestion${totalCount === 1 ? '' : 's'} found`,
          {
            variant: 'success',
            action: { label: 'Review Suggestions', onClick: () => navigate(`/data-quality-rules/${datasetId}`) },
          }
        );
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      setRuleDetectionError(message);
      triggerToast(`Rule analysis failed for "${datasetName}".`, { variant: 'error' });
    } finally {
      setIsDetectingRules(false);
    }
  };

  const handlePromoteRule = async (ruleId: string) => {
    setRuleReviewActionPendingId(ruleId);
    setRuleReviewActionError(null);
    try {
      const updated = await apiPromoteRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
      triggerToast(`"${updated.name}" promoted to active`);
    } catch (err) {
      setRuleReviewActionError(extractErrorMessage(err));
    } finally {
      setRuleReviewActionPendingId(null);
    }
  };

  const handleDismissRule = async (ruleId: string) => {
    setRuleReviewActionPendingId(ruleId);
    setRuleReviewActionError(null);
    try {
      const updated = await apiDismissRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
      triggerToast(`"${updated.name}" dismissed`);
    } catch (err) {
      setRuleReviewActionError(extractErrorMessage(err));
    } finally {
      setRuleReviewActionPendingId(null);
    }
  };

  const handleCreateRuleVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setVersionFormError(null);

    let definition: Record<string, unknown>;
    try {
      definition = JSON.parse(versionDefinitionText || '{}');
    } catch {
      setVersionFormError('Definition must be valid JSON.');
      return;
    }

    setIsSavingVersion(true);
    try {
      const created = await apiCreateRuleVersion(versionRuleId, {
        definition,
        severity: versionSeverity,
        error_message_template: versionErrorMessage.trim() || null,
      });
      setRuleVersionsByRuleId((prev) => ({
        ...prev,
        [versionRuleId]: [created, ...(prev[versionRuleId] ?? []).map((v) => ({ ...v, is_current: false }))],
      }));
      setShowVersionForm(false);
      setVersionDefinitionText('{}');
      setVersionSeverity('MEDIUM');
      setVersionErrorMessage('');
      triggerToast(`Version ${created.version_number} published`);
    } catch (err) {
      setVersionFormError(extractErrorMessage(err));
    } finally {
      setIsSavingVersion(false);
    }
  };

  // database category: the data source + connection were already created for real
  // inside AddDataSourceView, so there's nothing to add locally — just navigate back;
  // the Data Sources screen's own fetch-on-navigate effect (Phase 1) picks it up.
  // api/file categories have no real backend support, so they keep the old
  // mock-only local append.
  const handleCompleteAddSource = (input?: NewDataSourceInput) => {
    if (!input) {
      navigate('/data-sources');
      triggerToast('Data source connected');
      return;
    }

    const newSource: DataSource = {
      id: `src-${Date.now()}`,
      name: input.name,
      type: input.type,
      typeLabel: input.typeLabel,
      status: 'connected',
      description: 'Connected pipeline managed via DataCraft.',
      datasetsCount: 1,
      lastSync: 'Just now',
      icon: input.type === 'database' ? 'database' : input.type === 'api' ? 'cloud' : 'description',
      host: input.host || 'connected.datacraft.internal',
      recordsSynced: '0 records (indexing)',
      isActive: true,
      ownerTeam: null,
      businessDomain: null,
    };

    setDataSources((prev) => [newSource, ...prev]);
    navigate('/data-sources');
    triggerToast(`Data source "${newSource.name}" successfully registered`);
  };

  // Self-service password change (profile dropdown). POST /auth/change-password
  // revokes every refresh token for this user on success (confirmed via
  // AuthService.change_password) — the current session's stored refresh token is
  // invalid the instant this succeeds, so a real logout is forced immediately
  // afterward rather than letting the UI keep pretending the session is live.
  const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setIsChangingPassword(true);
    setChangePasswordError(null);
    try {
      await apiChangePassword({ current_password: currentPassword, new_password: newPassword });
      apiLogout().finally(() => {
        setCurrentUser(null);
        navigate('/login');
        triggerToast('Password changed — please sign in again with your new password.');
      });
      return true;
    } catch (err) {
      setChangePasswordError(extractErrorMessage(err));
      return false;
    } finally {
      setIsChangingPassword(false);
    }
  };

  // PUT /data-sources/{id} only accepts description/owner_team/business_domain —
  // name is not editable (confirmed via DataSourceUpdateRequest in schemas.py). No
  // optimistic update: dataSources is only touched after the real response succeeds.
  const handleUpdateDataSource = async (id: string, input: DataSourceUpdateRequest): Promise<boolean> => {
    setDataSourceActionPendingId(id);
    setDataSourceActionError(null);
    try {
      const updated = await apiUpdateDataSource(id, input);
      setDataSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                description: updated.description || updated.business_domain || 'No description provided.',
                ownerTeam: updated.owner_team,
                businessDomain: updated.business_domain,
              }
            : s
        )
      );
      triggerToast(`"${updated.name}" updated`);
      return true;
    } catch (err) {
      setDataSourceActionError(extractErrorMessage(err));
      return false;
    } finally {
      setDataSourceActionPendingId(null);
    }
  };

  // DELETE /data-sources/{id} is a soft deactivate (confirmed via
  // deactivate_data_source in service.py — is_active set to false, row kept). Blocked
  // with a 409 DATA_SOURCE_HAS_ACTIVE_CONNECTIONS if the source still has active
  // connections; that specific backend message (which already states the count) is
  // surfaced as-is rather than replaced with a generic failure.
  const handleDeleteDataSource = async (id: string): Promise<boolean> => {
    setDataSourceActionPendingId(id);
    setDataSourceActionError(null);
    try {
      const deactivated = await apiDeleteDataSource(id);
      setDataSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: false, status: 'inactive' } : s))
      );
      triggerToast(`"${deactivated.name}" removed from active data sources`);
      return true;
    } catch (err) {
      setDataSourceActionError(extractErrorMessage(err));
      return false;
    } finally {
      setDataSourceActionPendingId(null);
    }
  };

  // DELETE /connections/{id} is also a soft deactivate (confirmed via
  // deactivate_connection in app/modules/connections/service.py — is_active set to
  // false, row kept), but unlike data sources it has NO active-connections-style
  // guard: no downstream dependency check at all, so this should always succeed
  // given permission. This is the action the Data Sources screen was missing —
  // without it, a data source with an active connection could never be deactivated
  // from the UI (the connections.manage-gated guard on the data source side had no
  // corresponding UI to actually clear it).
  const handleDeactivateConnection = async (id: string): Promise<boolean> => {
    setConnectionActionPendingId(id);
    setConnectionActionError(null);
    try {
      const deactivated = await apiDeleteConnection(id);
      setDataSourceConnections((prev) => prev.map((c) => (c.id === id ? deactivated : c)));
      triggerToast(`Connection "${deactivated.name}" deactivated`);
      return true;
    } catch (err) {
      setConnectionActionError(extractErrorMessage(err));
      return false;
    } finally {
      setConnectionActionPendingId(null);
    }
  };

  // POST /data-sources/{id}/reactivate — no guard (confirmed via
  // reactivate_data_source in service.py), so this should always succeed given
  // permission.
  const handleReactivateDataSource = async (id: string): Promise<boolean> => {
    setDataSourceActionPendingId(id);
    setDataSourceActionError(null);
    try {
      const reactivated = await apiReactivateDataSource(id);
      setDataSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: true, status: 'connected' } : s))
      );
      triggerToast(`"${reactivated.name}" reactivated`);
      return true;
    } catch (err) {
      setDataSourceActionError(extractErrorMessage(err));
      return false;
    } finally {
      setDataSourceActionPendingId(null);
    }
  };

  // POST /connections/{id}/reactivate — refused with a 409 (DATA_SOURCE_NOT_ACTIVE)
  // if the parent data source is itself inactive (confirmed via
  // reactivate_connection in service.py). That message already names the parent
  // and says to reactivate it first, so it's surfaced as-is rather than reworded.
  const handleReactivateConnection = async (id: string): Promise<boolean> => {
    setConnectionActionPendingId(id);
    setConnectionActionError(null);
    try {
      const reactivated = await apiReactivateConnection(id);
      setDataSourceConnections((prev) => prev.map((c) => (c.id === id ? reactivated : c)));
      triggerToast(`Connection "${reactivated.name}" reactivated`);
      return true;
    } catch (err) {
      setConnectionActionError(extractErrorMessage(err));
      return false;
    } finally {
      setConnectionActionPendingId(null);
    }
  };

  // BUG FIX (root cause of "Sync Now shows success but dataset count stays 0"):
  // handleSyncSource below used to be pure local mock — setTimeout + an
  // unconditional success toast, with zero network calls at all. It never called
  // discoverConnection() (already correctly typed in client.ts against the real
  // POST /connections/{id}/discover, confirmed against app/api/v1/connections/
  // routes.py — that function itself was fine, just never wired to this button).
  // Real fix: call it for real, poll the resulting job (discovery is async —
  // 202 + job_id, same shared Job/JobResponse model as everything else in this
  // app), and only show success / refresh the real dataset count once the job
  // has actually completed. A real, visible error otherwise (e.g. the backend's
  // own DiscoveryAlreadyRunningError 409 if a sync is already in flight).
  const pollDiscoveryJob = async (jobId: string): Promise<void> => {
    const start = Date.now();
    for (;;) {
      const job: JobResponse = await apiGetJob(jobId);
      if (job.status === 'COMPLETED') return;
      if (job.status === 'FAILED') throw new Error(job.error_message || 'Discovery failed');
      if (job.status === 'CANCELLED') throw new Error('Discovery was cancelled before it finished');
      if (Date.now() - start > 120_000) throw new Error('Timed out waiting for discovery to complete');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  };

  const handleSyncConnection = async (connectionId: string, dataSourceName: string) => {
    setSyncingConnectionId(connectionId);
    setSyncError(null);
    try {
      const job = await apiDiscoverConnection(connectionId);
      await pollDiscoveryJob(job.id);
      // Refetch first (picks up the real, now-updated dataset count), then layer
      // "Just now" on top — the backend has no "last discovered at" field on
      // Connection/DataSource (only last_tested_at, set by test_connection, a
      // different endpoint), so this is a real, session-only signal that a sync
      // genuinely just completed, not a fabricated persisted timestamp; it would
      // otherwise be immediately overwritten by refreshDataSources' own
      // formatDateTime(updated_at) if applied before the refetch.
      await refreshDataSources();
      setDataSources((prev) =>
        prev.map((s) => (s.name === dataSourceName ? { ...s, lastSync: 'Just now' } : s))
      );
      triggerToast(`Synced "${dataSourceName}" successfully`);
    } catch (err) {
      setSyncError(extractErrorMessage(err));
    } finally {
      setSyncingConnectionId(null);
    }
  };

  // Real POST /ai/chat — no more fake keyword matching or setTimeout. Sends
  // copilotConversationId if one exists yet (server creates one on the first call
  // when omitted); real loading/error state via the existing ApiError pattern.
  const handleSendCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = copilotInput.trim();
    if (!userText || isCopilotSending) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user' as const,
      text: userText,
      time: formatDateTime(new Date().toISOString()),
    };
    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput('');
    setIsCopilotSending(true);
    setCopilotError(null);

    try {
      const resp = await sendChatMessage({ conversation_id: copilotConversationId, message: userText });
      setCopilotConversationId(resp.conversation_id);
      setCopilotMessages((prev) => [
        ...prev,
        {
          id: resp.message.id,
          role: 'assistant',
          text: resp.message.content,
          time: formatDateTime(resp.message.created_at),
        },
      ]);
    } catch (err) {
      setCopilotError(extractErrorMessage(err));
    } finally {
      setIsCopilotSending(false);
    }
  };

  // Review & Corrections Actions — every one of these waits for the real response
  // before touching local state; on success the specific issue is updated from the
  // server's own CorrectionResponse (not guessed), never optimistically beforehand.
  const withIssuePending = async (issueId: string, fn: () => Promise<void>) => {
    setReviewActionPendingIds((prev) => [...prev, issueId]);
    setReviewActionError(null);
    try {
      await fn();
    } catch (err) {
      setReviewActionError(extractErrorMessage(err));
    } finally {
      setReviewActionPendingIds((prev) => prev.filter((id) => id !== issueId));
    }
  };

  const applyCorrection = (issueId: string, status: Issue['status'], finalValue: string | null) => {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status, finalValue } : i)));
  };

  const handleAcceptIssue = (issueId: string) =>
    withIssuePending(issueId, async () => {
      const issue = issues.find((i) => i.id === issueId);
      if (!issue?.suggestionId) return;
      const correction = await apiAcceptSuggestion(issue.suggestionId);
      applyCorrection(issueId, 'RESOLVED', correction.final_value);
      triggerToast('Suggestion accepted');
    });

  const handleEditIssue = (issueId: string, finalValue: string) =>
    withIssuePending(issueId, async () => {
      const issue = issues.find((i) => i.id === issueId);
      // Editing an existing suggestion's value uses the suggestion-scoped endpoint;
      // an issue with no suggestion yet has nothing to edit, so it's a direct
      // correction instead — both are real endpoints, chosen by what actually exists.
      const correction = issue?.suggestionId
        ? await apiEditSuggestion(issue.suggestionId, { final_value: finalValue })
        : await apiCorrectIssue(issueId, { final_value: finalValue });
      applyCorrection(issueId, 'RESOLVED', correction.final_value);
      triggerToast('Correction updated with custom value');
    });

  const handleRejectIssue = (issueId: string) =>
    withIssuePending(issueId, async () => {
      const issue = issues.find((i) => i.id === issueId);
      if (!issue) return;
      const correction = issue.suggestionId
        ? await apiRejectSuggestion(issue.suggestionId, {})
        : // No suggestion to reject — achieve the same "keep original value" outcome
          // via a direct correction instead of inventing a reject-with-no-suggestion call.
          await apiCorrectIssue(issueId, { final_value: issue.originalValue });
      applyCorrection(issueId, 'RESOLVED', correction.final_value);
      triggerToast('Suggestion rejected — original value kept');
    });

  const handleSkipIssue = (issueId: string) =>
    withIssuePending(issueId, async () => {
      if (!selectedReviewId) return;
      await apiBulkReviewAction(selectedReviewId, { issue_ids: [issueId], action: 'skip' });
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: 'SKIPPED', finalValue: null } : i)));
      triggerToast('Issue skipped');
    });

  // bulk-action only supports skip/reject server-side — there is no bulk-accept
  // endpoint, so "accept" is genuinely N real per-suggestion calls, not one bulk call.
  const handleBulkAccept = async (issueIds: string[]) => {
    if (issueIds.length === 0) return;
    setReviewActionPendingIds((prev) => [...prev, ...issueIds]);
    setReviewActionError(null);
    try {
      const targets = issueIds
        .map((id) => issues.find((i) => i.id === id))
        .filter((i): i is Issue => !!i && !!i.suggestionId);
      const results = await Promise.allSettled(
        targets.map((issue) => apiAcceptSuggestion(issue.suggestionId as string))
      );
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          applyCorrection(targets[idx].id, 'RESOLVED', result.value.final_value);
        }
      });
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setReviewActionError(`${failures.length} of ${targets.length} accept${targets.length === 1 ? '' : 's'} failed.`);
      } else {
        triggerToast(`${targets.length} issue${targets.length === 1 ? '' : 's'} accepted`);
      }
    } finally {
      setReviewActionPendingIds((prev) => prev.filter((id) => !issueIds.includes(id)));
    }
  };

  const handleBulkReject = async (issueIds: string[]) => {
    if (issueIds.length === 0 || !selectedReviewId) return;
    setReviewActionPendingIds((prev) => [...prev, ...issueIds]);
    setReviewActionError(null);
    try {
      await apiBulkReviewAction(selectedReviewId, { issue_ids: issueIds, action: 'reject' });
      setIssues((prev) =>
        prev.map((i) => (issueIds.includes(i.id) ? { ...i, status: 'RESOLVED', finalValue: i.originalValue } : i))
      );
      triggerToast(`${issueIds.length} issue${issueIds.length > 1 ? 's' : ''} rejected`);
    } catch (err) {
      setReviewActionError(extractErrorMessage(err));
    } finally {
      setReviewActionPendingIds((prev) => prev.filter((id) => !issueIds.includes(id)));
    }
  };

  // AI Details (Phase 4.10) — fetched on demand when a user expands a suggestion's
  // AI Details section, never for every issue up front. Cached per suggestion id
  // so re-expanding doesn't refetch; errors are cached separately (not the cache
  // map) so a retry after a failure isn't blocked by the "already have/loading it"
  // guard below.
  const handleLoadAiTrace = async (suggestionId: string) => {
    if (aiTraceBySuggestionId.has(suggestionId) || aiTraceLoadingIds.has(suggestionId)) return;
    setAiTraceLoadingIds((prev) => new Set(prev).add(suggestionId));
    setAiTraceErrorBySuggestionId((prev) => {
      if (!prev.has(suggestionId)) return prev;
      const next = new Map(prev);
      next.delete(suggestionId);
      return next;
    });
    try {
      const trace = await getSuggestionAiTrace(suggestionId);
      setAiTraceBySuggestionId((prev) => new Map(prev).set(suggestionId, trace));
    } catch (err) {
      setAiTraceErrorBySuggestionId((prev) => new Map(prev).set(suggestionId, extractErrorMessage(err)));
    } finally {
      setAiTraceLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  };

  // Generates rule-based/AI suggestions for whichever of this review's issues don't
  // have one yet, then refetches that review's issues+suggestions to pick them up
  // (no per-issue response is returned, so a refetch is the only way to see them).
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const handleGenerateSuggestions = async (reviewRunId: string) => {
    setIsGeneratingSuggestions(true);
    setReviewActionError(null);
    try {
      const result = await apiGenerateReviewSuggestions(reviewRunId);
      const [issuesList, suggestionsList, correctionsList, reviewDetail] = await Promise.all([
        listReviewIssues(reviewRunId),
        listReviewSuggestions(reviewRunId),
        listReviewCorrections(reviewRunId).catch(() => [] as CorrectionResponse[]),
        getReview(reviewRunId).catch(() => null),
      ]);
      const suggestionsByIssueId = new Map<string, CorrectionSuggestionResponse[]>();
      suggestionsList.forEach((s) => {
        suggestionsByIssueId.set(s.issue_id, [...(suggestionsByIssueId.get(s.issue_id) ?? []), s]);
      });
      // Same finalValue fix as the initial load — see that effect's comment.
      const correctionByIssueId = new Map<string, CorrectionResponse>();
      correctionsList.forEach((c) => correctionByIssueId.set(c.issue_id, c));
      // Same real column/rule name resolution as the initial load (see the
      // review-corrections effect's comment) — without this, re-fetching after
      // generating suggestions would regress this review's issues back to
      // truncated ids.
      const failureById = new Map<string, ValidationFailureResponse>();
      if (reviewDetail && hasPermission('metadata.read')) {
        const items = await fetchAllValidationFailures(reviewDetail.validation_run_id, (id, page, page_size) =>
          listValidationFailures(id, { page, page_size })
        );
        items.forEach((f) => failureById.set(f.id, f));
      }
      const refreshed: Issue[] = issuesList.map((issue) => {
        const candidates = suggestionsByIssueId.get(issue.id) ?? [];
        const suggestion = candidates.find((s) => s.is_selected) ?? candidates[0];
        const failure = failureById.get(issue.validation_failure_id);
        const correction = correctionByIssueId.get(issue.id);
        return {
          id: issue.id,
          reviewRunId: issue.review_run_id,
          recordRef: issue.record_ref,
          columnName: failure ? failure.column_name ?? '(row-level)' : issue.column_id ? issue.column_id.slice(0, 8) : '—',
          severity: (issue.severity as Issue['severity']) || 'MEDIUM',
          originalValue: issue.original_value ?? '',
          suggestedValue: suggestion?.suggested_value ?? null,
          suggestionSource: suggestion ? ((suggestion.source as Issue['suggestionSource']) ?? null) : null,
          suggestionCategory: suggestion ? ((suggestion.category as Issue['suggestionCategory']) ?? null) : null,
          suggestionReasoning: suggestion?.reasoning ?? null,
          // BUG FIX (Decimal-serialization sweep): same as above — confidence is a
          // Decimal-as-string on the wire.
          confidence: suggestion?.confidence !== undefined ? Number(suggestion.confidence) : null,
          status: (issue.status as Issue['status']) || 'PENDING',
          finalValue: correction?.final_value ?? null,
          ruleTriggered: failure ? failure.rule_name : '—',
          suggestionId: suggestion?.id ?? null,
          suggestionStrategy: suggestion?.strategy ?? null,
          suggestionEvidence: suggestion?.evidence_detail ?? null,
        };
      });
      setIssues((prev) => [...prev.filter((i) => i.reviewRunId !== reviewRunId), ...refreshed]);
      triggerToast(
        `${result.generated_count} suggestion${result.generated_count === 1 ? '' : 's'} generated` +
          (result.issues_with_no_suggestion_count > 0
            ? ` (${result.issues_with_no_suggestion_count} issue${result.issues_with_no_suggestion_count === 1 ? '' : 's'} still without one)`
            : '')
      );
    } catch (err) {
      setReviewActionError(extractErrorMessage(err));
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // AI Insights — generation handlers (this task). EXPLANATION is synchronous
  // (response IS the result); RUN_SUMMARY/PRIORITIZATION/CLUSTER are async
  // (202+job_id) — poll getJob() until COMPLETED, then fetch the real suggestion
  // via getAISuggestion(). AI corrections are the deliberate exception: they are
  // never added to aiSuggestions or displayed on this screen — per
  // suggestion_service.py, generate_corrections() inserts straight into the
  // pre-existing correction_suggestions table (source="AI"), which the already-
  // wired Review & Corrections accept/edit/reject flow (see the existing
  // suggestionSource === 'AI' badge in ReviewCorrectionsView) picks up
  // automatically via its own listReviewSuggestions() call — no separate AI
  // accept/reject UI is built here, by design.
  const mapAISuggestion = (r: AISuggestionResponse): AISuggestionItem => ({
    id: r.id,
    suggestionType: r.suggestion_type as AISuggestionItem['suggestionType'],
    sourceContextLabel: `${r.source_context_type} ${r.source_context_id.slice(0, 8)}`,
    content:
      'text' in r.content && typeof (r.content as { text?: unknown }).text === 'string'
        ? (r.content as { text: string }).text
        : JSON.stringify(r.content),
    // Same Decimal-as-string/0-1-scale pattern as Issue.confidence (see the bug-fix
    // comment on that field above) — scaled to a percentage since AIInsightsView
    // renders it as `${confidence}%` directly, matching its existing mock data shape.
    confidence: r.confidence !== null ? Math.round(Number(r.confidence) * 100) : null,
    provider: r.provider,
    model: r.model,
    status: r.status as AISuggestionItem['status'],
    createdAt: r.created_at,
  });

  const pollAIJob = async (jobId: string): Promise<Record<string, unknown>> => {
    const start = Date.now();
    for (;;) {
      const job: JobResponse = await apiGetJob(jobId);
      if (job.status === 'COMPLETED') return job.result ?? {};
      if (job.status === 'FAILED') throw new Error(job.error_message || 'AI generation failed');
      if (job.status === 'CANCELLED') throw new Error('AI generation was cancelled');
      if (Date.now() - start > 90_000) throw new Error('Timed out waiting for AI generation to complete');
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  };

  const handleGenerateExplanation = async (issueId: string) => {
    setAiGeneratingType('EXPLANATION');
    setAiInsightsError(null);
    try {
      const result = await generateExplanation({ issue_id: issueId });
      setAiSuggestions((prev) => [mapAISuggestion(result), ...prev]);
      triggerToast('AI explanation generated');
    } catch (err) {
      setAiInsightsError(extractErrorMessage(err));
    } finally {
      setAiGeneratingType(null);
    }
  };

  const handleGenerateRunSummary = async (validationRunId: string) => {
    setAiGeneratingType('RUN_SUMMARY');
    setAiInsightsError(null);
    try {
      const { job_id } = await triggerRunSummary({ validation_run_id: validationRunId });
      const result = await pollAIJob(job_id);
      const suggestion = await getAISuggestion(String(result.ai_suggestion_id));
      setAiSuggestions((prev) => [mapAISuggestion(suggestion), ...prev]);
      triggerToast('AI run summary generated');
    } catch (err) {
      setAiInsightsError(extractErrorMessage(err));
    } finally {
      setAiGeneratingType(null);
    }
  };

  const handleGeneratePrioritization = async (reviewRunId: string) => {
    setAiGeneratingType('PRIORITIZATION');
    setAiInsightsError(null);
    try {
      const { job_id } = await triggerPrioritization({ review_run_id: reviewRunId });
      const result = await pollAIJob(job_id);
      const suggestion = await getAISuggestion(String(result.ai_suggestion_id));
      setAiSuggestions((prev) => [mapAISuggestion(suggestion), ...prev]);
      triggerToast('AI prioritization generated');
    } catch (err) {
      setAiInsightsError(extractErrorMessage(err));
    } finally {
      setAiGeneratingType(null);
    }
  };

  const handleGenerateCluster = async (reviewRunId: string) => {
    setAiGeneratingType('CLUSTER');
    setAiInsightsError(null);
    try {
      const { job_id } = await triggerCluster({ review_run_id: reviewRunId });
      const result = await pollAIJob(job_id);
      const suggestion = await getAISuggestion(String(result.ai_suggestion_id));
      setAiSuggestions((prev) => [mapAISuggestion(suggestion), ...prev]);
      triggerToast('AI cluster analysis generated');
    } catch (err) {
      setAiInsightsError(extractErrorMessage(err));
    } finally {
      setAiGeneratingType(null);
    }
  };

  const handleGenerateCorrections = async (reviewRunId: string) => {
    const review = reviewRuns.find((r) => r.id === reviewRunId);
    const reviewLabel = review?.datasetName ?? review?.name ?? reviewRunId;
    setAiGeneratingType('CORRECTION');
    setAiInsightsError(null);
    try {
      const { job_id } = await triggerCorrections({ review_run_id: reviewRunId });
      triggerToast(`Generating corrections for "${reviewLabel}". You can continue working.`);
      const result = await pollAIJob(job_id);
      // Refresh this review's issues/suggestions in place (same shape as
      // handleGenerateSuggestions above) so the new AI-sourced rows are visible
      // immediately if the user is already viewing this review.
      const [issuesList, suggestionsList] = await Promise.all([
        listReviewIssues(reviewRunId),
        listReviewSuggestions(reviewRunId),
      ]);
      const suggestionsByIssueId = new Map<string, CorrectionSuggestionResponse[]>();
      suggestionsList.forEach((s) => {
        suggestionsByIssueId.set(s.issue_id, [...(suggestionsByIssueId.get(s.issue_id) ?? []), s]);
      });
      setIssues((prev) => {
        const untouched = prev.filter((i) => i.reviewRunId !== reviewRunId);
        const byId = new Map(prev.map((i) => [i.id, i]));
        const refreshed: Issue[] = issuesList.map((issue) => {
          const existing = byId.get(issue.id);
          const candidates = suggestionsByIssueId.get(issue.id) ?? [];
          const suggestion = candidates.find((s) => s.is_selected) ?? candidates[0];
          return {
            id: issue.id,
            reviewRunId: issue.review_run_id,
            recordRef: issue.record_ref,
            columnName: existing?.columnName ?? (issue.column_id ? issue.column_id.slice(0, 8) : '—'),
            severity: (issue.severity as Issue['severity']) || 'MEDIUM',
            originalValue: issue.original_value ?? '',
            suggestedValue: suggestion?.suggested_value ?? null,
            suggestionSource: suggestion ? ((suggestion.source as Issue['suggestionSource']) ?? null) : null,
            suggestionCategory: suggestion ? ((suggestion.category as Issue['suggestionCategory']) ?? null) : null,
            suggestionReasoning: suggestion?.reasoning ?? null,
            confidence: suggestion?.confidence !== undefined ? Number(suggestion.confidence) : null,
            status: (issue.status as Issue['status']) || 'PENDING',
            finalValue: existing?.finalValue ?? null,
            ruleTriggered: existing?.ruleTriggered ?? '—',
            suggestionId: suggestion?.id ?? null,
            suggestionStrategy: suggestion?.strategy ?? null,
            suggestionEvidence: suggestion?.evidence_detail ?? null,
          };
        });
        return [...untouched, ...refreshed];
      });
      const count = typeof result.count === 'number' ? result.count : 0;
      triggerToast(
        count > 0
          ? `Corrections ready for "${reviewLabel}" · ${count} suggestion${count === 1 ? '' : 's'} generated`
          : `Correction generation completed for "${reviewLabel}" · No suggestions generated`,
        {
          variant: 'success',
          ...(review?.datasetId
            ? {
                action: {
                  label: 'Review Corrections',
                  onClick: () => navigate(`/review-corrections/${review.datasetId}?reviewId=${reviewRunId}`),
                },
              }
            : {}),
        }
      );
    } catch (err) {
      setAiInsightsError(extractErrorMessage(err));
      triggerToast(`Correction generation failed for "${reviewLabel}".`, { variant: 'error' });
    } finally {
      setAiGeneratingType(null);
    }
  };

  const handleSubmitForApproval = async (reviewRunId: string) => {
    setReviewActionError(null);
    try {
      const approval = await apiSubmitApproval(reviewRunId);
      setReviewRuns((prev) => prev.map((r) => (r.id === reviewRunId ? { ...r, status: 'READY_FOR_APPROVAL' } : r)));
      const run = reviewRuns.find((r) => r.id === reviewRunId);
      setApprovalQueue((prev) => [
        mapApprovalRequest(approval, run?.name ?? reviewRunId, run?.datasetName ?? '', currentUser?.name ?? 'You'),
        ...prev,
      ]);
      triggerToast(`"${run?.name ?? reviewRunId}" submitted for approval`);
    } catch (err) {
      setReviewActionError(extractErrorMessage(err));
    }
  };

  // Approval Center Actions — approval.decide is a separate trust boundary from
  // review.edit; the UI hides these actions entirely without approval.decide (see
  // ApprovalCenterView), and the backend independently enforces the same check.
  // The Approval Center UI (unchanged from mock) has no per-issue picker — it decides
  // an approval request as a whole, so every issue currently in its review run is sent.
  //
  // BUG FIX #2 (found during E2E testing, on top of the original fix below — the
  // original fix relied ENTIRELY on this session's local `issues` state, which is
  // hardcoded to finalValue: null on every fetch (IssueResponse carries no such
  // field) — so simply revisiting Review & Corrections after deciding, or switching
  // users and going straight to Approval Center (both realistic, and both exactly
  // what this walkthrough's own steps do), left zero usable local state and made
  // decide() fail on every attempt, not just a "known limitation" edge case).
  // Fixed by ALSO fetching review suggestions fresh: decision_service.py's accept()
  // and edit() are the ONLY two paths that ever set CorrectionSuggestion.is_selected
  // = true (reject() never does), so that flag is a reliable, non-guessed signal for
  // which suggestion-backed issues are genuinely in the approval's resolved scope —
  // and it survives navigation, unlike local state. Combined (union) with the
  // original local-state signal so same-session "decide then immediately submit"
  // flows keep working for their one remaining blind spot: issues corrected
  // DIRECTLY with no suggestion at all have no signal in any existing GET response
  // (no corrections-list endpoint exists to add one, and this task doesn't add
  // endpoints) — those still depend on local state and are only genuinely
  // unrecoverable after a refresh, which the error message below states honestly.
  const decideApproval = async (
    id: string,
    comment: string,
    decide: (issueIds: string[]) => Promise<ApprovalRequestResponse>
  ) => {
    setApprovalActionPendingId(id);
    setApprovalActionError(null);
    try {
      const target = approvalQueue.find((r) => r.id === id);
      if (!target?.reviewRunId) throw new Error('Missing review run reference for this approval.');
      const localInScopeIds = issues
        .filter((i) => i.reviewRunId === target.reviewRunId && i.status === 'RESOLVED' && i.finalValue !== null)
        .map((i) => i.id);
      const suggestions = await listReviewSuggestions(target.reviewRunId);
      const suggestionInScopeIds = suggestions.filter((s) => s.is_selected).map((s) => s.issue_id);
      const inScopeIssueIds = Array.from(new Set([...localInScopeIds, ...suggestionInScopeIds]));
      if (inScopeIssueIds.length === 0) {
        throw new Error(
          'No accepted or edited issues could be identified for this review — neither from suggestion records nor from this session\'s own recent decisions. Issues corrected directly with no suggestion cannot be identified for approval after a session refresh (no corrections-list endpoint exists to reconstruct that).'
        );
      }
      const updated = await decide(inScopeIssueIds);
      setApprovalQueue((prev) =>
        prev.map((r) => (r.id === id ? mapApprovalRequest(updated, r.reviewRunName, r.datasetName, r.requestedBy) : r))
      );
      return { target, comment };
    } finally {
      setApprovalActionPendingId(null);
    }
  };

  const handleApproveRequest = async (id: string, comment: string) => {
    try {
      const { target } = await decideApproval(id, comment, (issue_ids) =>
        apiApproveApproval(id, { issue_ids, comment: comment || null })
      );
      const datasetId = target?.reviewRunId ? reviewRuns.find((r) => r.id === target.reviewRunId)?.datasetId : undefined;
      triggerToast(
        comment ? `"${target?.reviewRunName}" approved — "${comment}"` : `"${target?.reviewRunName}" approved`,
        {
          variant: 'success',
          // Proceed to Staging — only when this approval's dataset is actually
          // resolvable and the existing staging route is real, never a guess.
          ...(datasetId ? { action: { label: 'Proceed to Staging', onClick: () => navigate(`/staging-publish/${datasetId}`) } } : {}),
        }
      );
    } catch (err) {
      setApprovalActionError(extractErrorMessage(err));
    }
  };

  const handleRejectRequest = async (id: string, comment: string) => {
    try {
      const { target } = await decideApproval(id, comment, (issue_ids) =>
        apiRejectApproval(id, { issue_ids, comment: comment || null })
      );
      triggerToast(comment ? `"${target?.reviewRunName}" rejected — "${comment}"` : `"${target?.reviewRunName}" rejected`);
    } catch (err) {
      setApprovalActionError(extractErrorMessage(err));
    }
  };

  // Validation Workspace Actions
  const executeRunValidation = async () => {
    if (!selectedDatasetId) return;
    setIsTriggeringValidation(true);
    setValidationActionError(null);
    try {
      const created = await createValidationRun(selectedDatasetId, {});
      const datasetName = selectedDataset?.name ?? selectedDatasetId;
      setValidationRuns((prev) => [mapValidationRun(created, datasetName), ...prev]);
      // Immediate acknowledgement — the backend has genuinely accepted the run
      // (this fires only after createValidationRun resolves). Watching it
      // (below) is what makes the eventual completion/failure toast reach the
      // user even after they've navigated to a different screen.
      triggerToast(`Validation started for "${datasetName}". You can continue working.`);
      if (created.status !== 'COMPLETED' && created.status !== 'FAILED') {
        setWatchedValidationRun({ runId: created.id, datasetId: selectedDatasetId, datasetName });
      }
    } catch (err) {
      setValidationActionError(extractErrorMessage(err));
    } finally {
      setIsTriggeringValidation(false);
    }
  };

  // Polls the watched validation run until it reaches a terminal status, then
  // fires a completion/failure toast with a "View Results" CTA into the real
  // run — independent of whatever screen is currently open (Validation
  // Workspace already refetches this same run set on its own when the user
  // is actually looking at it; this is the navigate-away-safe complement to
  // that, not a duplicate of it).
  useEffect(() => {
    if (!watchedValidationRun) return;
    const { runId, datasetId, datasetName } = watchedValidationRun;
    let cancelled = false;
    let inFlight = false;

    const finish = (run: ValidationRunResponse) => {
      if (run.status === 'COMPLETED') {
        const issueCount = run.warning_rows + run.failed_rows;
        triggerToast(
          issueCount > 0
            ? `Validation completed for "${datasetName}" · ${issueCount.toLocaleString()} issue${issueCount === 1 ? '' : 's'} found`
            : `Validation completed for "${datasetName}" · No issues found`,
          {
            variant: 'success',
            action: { label: 'View Results', onClick: () => navigate(`/validation/${datasetId}/runs/${runId}`) },
          }
        );
      } else if (run.status === 'FAILED') {
        triggerToast(`Validation failed for "${datasetName}".`, {
          variant: 'error',
          action: { label: 'View Details', onClick: () => navigate(`/validation/${datasetId}/runs/${runId}`) },
        });
      }
      // CANCELLED (or any other terminal-looking status) intentionally gets no
      // toast — a validation run only ever reaches that via an explicit user
      // cancel elsewhere in the same session, which already has its own
      // feedback (see handleCancelValidationJob).
    };

    const poll = () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      getValidationRun(runId)
        .then((run) => {
          if (cancelled) return;
          if (run.status === 'COMPLETED' || run.status === 'FAILED' || run.status === 'CANCELLED') {
            setWatchedValidationRun(null);
            finish(run);
          }
        })
        .catch(() => {
          // A transient poll failure here must not claim the validation itself
          // failed — silently retry on the next tick (same discipline as the
          // staging poller's stagingPollError, just without a dedicated banner
          // since this watcher has no persistent UI of its own to show one in).
        })
        .finally(() => {
          inFlight = false;
        });
    };
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValidationRun]);

  // Guided pre-check (this task): "Run Validation" must not silently fire a
  // 0-rules run that comes back looking like a genuine 100% pass. If this
  // dataset has no enabled RuleAssignment, offer the guided choice instead
  // of immediately triggering — "Run Anyway" still reaches executeRunValidation
  // unchanged, so nothing is actually blocked, only defaulted away from.
  const handleRunValidation = () => {
    if (!selectedDatasetId) return;
    const hasEnabledAssignment = ruleAssignments.some(
      (a) => a.dataset_id === selectedDatasetId && a.is_enabled
    );
    if (hasEnabledAssignment) {
      void executeRunValidation();
      return;
    }
    setShowNoRulesConfirm(true);
  };

  const handleSelectValidationRun = (runId: string) => {
    if (!selectedDatasetId) return;
    navigate(`/validation/${selectedDatasetId}/runs/${runId}`);
  };

  // Mirrors the user's in-page review selection into the `?reviewId=` query
  // param so it survives a refresh/bookmark, in addition to updating the
  // local state everything else in this file already reads.
  const handleSelectReview = (reviewId: string | null) => {
    setSelectedReviewId(reviewId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (reviewId) next.set('reviewId', reviewId);
        else next.delete('reviewId');
        return next;
      },
      { replace: true }
    );
  };

  const handleCancelValidationJob = async () => {
    if (!selectedValidationRun?.jobId) return;
    setIsCancellingValidationJob(true);
    setValidationDetailActionError(null);
    try {
      await apiCancelJob(selectedValidationRun.jobId);
      const refreshed = await getValidationRun(selectedValidationRun.id);
      setSelectedValidationRun(mapValidationRun(refreshed, selectedValidationRun.datasetName));
      triggerToast('Validation run cancelled');
    } catch (err) {
      setValidationDetailActionError(extractErrorMessage(err));
    } finally {
      setIsCancellingValidationJob(false);
    }
  };

  // BUG FIX (found via live E2E testing): createReview() already existed in client.ts
  // but was never called from anywhere in the UI — a completed validation run with real
  // failures had no way to reach Review & Corrections at all, since ReviewCorrectionsView
  // only lists reviews that already exist (app/modules/review/service.py's
  // create_from_validation_run requires an explicit POST /reviews). Wired here as the
  // minimal fix: a "Start Review" action on a completed run's details page.
  const handleStartReview = async () => {
    if (!selectedValidationRun || selectedValidationRun.status !== 'COMPLETED') return;
    setIsStartingReview(true);
    setValidationDetailActionError(null);
    try {
      await createReview({ validation_run_id: selectedValidationRun.id });
      // Lands on the Review & Corrections master list (matching the pre-routing
      // behavior of handleNavigate, which always reset straight to the master
      // list) rather than this dataset's own detail page — the newly created
      // review is visible from there.
      handleNavigate('review-corrections');
      triggerToast('Review started');
    } catch (err) {
      setValidationDetailActionError(extractErrorMessage(err));
    } finally {
      setIsStartingReview(false);
    }
  };

  // Staging & Publish Actions
  // Returns the created run (or null on failure) so the new Stage Dataset
  // confirmation/progress flow can reconcile its simulated steps with the real
  // result — see StagingPublishView's runStaging.
  // Phase 4.12B: creating a run also starts watching it — the new
  // ?stagingRunId= query param is what actually opens StagingProgressView and
  // drives the polling effect above, and it's what makes a refresh resume the
  // same run instead of losing it (see that effect's own doc comment).
  // justTriggeredStagingRunId is this session's own signal that a null
  // materialization_phase on the very next poll means "queued," not "legacy."
  const handleCreateStagingRun = async (): Promise<void> => {
    if (!selectedReviewId || !selectedDatasetId) return;
    setIsStagingActionPending(true);
    setStagingActionError(null);
    try {
      const created = await apiCreateStagingRun(selectedReviewId);
      setJustTriggeredStagingRunId(created.id);
      setCurrentStagingRun(created);
      setCurrentPublishRun(null);
      setStagingPollError(null);
      navigate(`/staging-publish/${selectedDatasetId}?stagingRunId=${created.id}`);
      const datasetName = stagingSelectedDatasetWorkspace?.name ?? selectedDatasetId;
      triggerToast(`Staging started for "${datasetName}". You can continue working.`);
    } catch (err) {
      setStagingActionError(extractErrorMessage(err));
    } finally {
      setIsStagingActionPending(false);
    }
  };

  // Staging & Publish dataset-centric redesign: selecting a dataset in the left
  // explorer navigates to that dataset's own staging URL; the effect right below
  // resolves whichever review run real data has already linked to it (via
  // ReviewRun.datasetId, itself resolved from the review's real validation run)
  // and drives selectedReviewId from that — reusing every existing staging/
  // publish effect and handler unchanged, rather than adding a second,
  // dataset-keyed staging state path. Runs on mount/param-change (not just on
  // click) so a direct URL visit or refresh of /staging-publish/:datasetId
  // rehydrates selectedReviewId exactly the same way a click would have.
  const handleSelectStagingDataset = (datasetId: string) => {
    navigate(`/staging-publish/${datasetId}`);
  };

  useEffect(() => {
    if (currentScreen !== 'staging-publish' || !selectedDatasetId) return;
    // BUG FIX (master/detail redesign audit): this used to take
    // reviewRuns.find(r => r.datasetId === datasetId) — the FIRST matching
    // review run in array order, not the one whose corrections are actually
    // approved. A dataset with an old approved review superseded by a newer
    // draft re-review (or simply returned in a different order by the
    // backend) could silently bind staging to the wrong review. Staging
    // eligibility must come from the dataset's real approved/partially-
    // approved review, never "whichever review happened to match first" —
    // see getStagingEligibleReview's own doc comment for the exact rule.
    const eligibleReview = getStagingEligibleReview(reviewRuns, approvalQueue, selectedDatasetId);
    setSelectedReviewId(eligibleReview?.id ?? null);
  }, [currentScreen, selectedDatasetId, reviewRuns, approvalQueue]);

  // Always allowed to trigger — the backend itself creates the publish_run at PENDING
  // regardless of drift, and only the async job refuses to proceed past PENDING until
  // drift is acknowledged. The UI reflects that pending-on-drift state below rather
  // than pretending publishing completed.
  const handlePublish = async () => {
    if (!currentStagingRun) return;
    setIsStagingActionPending(true);
    setStagingActionError(null);
    try {
      const trigger = await apiTriggerPublish(currentStagingRun.id, {
        target_type: 'FILE_EXPORT',
        // BUG FIX (found via live E2E testing): this used to send a fake "s3://..."
        // URI, but the real FILE_EXPORT writer (app/modules/publishing/file_export.py's
        // resolve_target_path) treats target_reference as a plain path RELATIVE to
        // PUBLISH_FILE_EXPORT_DIRECTORY on local disk — it explicitly rejects absolute
        // paths, and a "scheme://" prefix isn't a relative path either (on Windows it
        // parses as a malformed drive reference and the write fails outright with
        // OSError: WinError 123; the backend's own tests use plain names like
        // "out.jsonl"). Also corrected the extension: write_row_snapshots always
        // writes JSONL (one JSON object per line), never CSV.
        target_reference: `${currentStagingRun.dataset_id}/attempt-${currentStagingRun.attempt_number}.jsonl`,
      });
      const publishRun = await getPublishRun(trigger.publish_run_id);
      setCurrentPublishRun(publishRun);
      triggerToast(
        currentStagingRun.has_source_drift
          ? 'Publish created — blocked pending drift acknowledgment'
          : 'Publishing to file export target...'
      );
    } catch (err) {
      setStagingActionError(extractErrorMessage(err));
    } finally {
      setIsStagingActionPending(false);
    }
  };

  const handleAcknowledgeDrift = async () => {
    if (!currentPublishRun) return;
    setIsStagingActionPending(true);
    setStagingActionError(null);
    try {
      const updated = await apiAcknowledgeDrift(currentPublishRun.id, {});
      setCurrentPublishRun(updated);
      triggerToast('Drift acknowledged — publish will continue');
    } catch (err) {
      setStagingActionError(extractErrorMessage(err));
    } finally {
      setIsStagingActionPending(false);
    }
  };

  // Staged revalidation (Phase 4.10) — fetched on demand when a user expands a
  // staging record's row, never for every listed record up front (no bulk
  // endpoint; avoids an N+1 burst on initial page load for a large run).
  // Cached per staging record id; errors cached separately so a retry after a
  // failure isn't blocked by the "already have/loading it" guard below.
  const handleLoadRevalidation = async (stagingRecordId: string) => {
    if (revalidationByRecordId.has(stagingRecordId) || revalidationLoadingIds.has(stagingRecordId)) return;
    setRevalidationLoadingIds((prev) => new Set(prev).add(stagingRecordId));
    setRevalidationErrorByRecordId((prev) => {
      if (!prev.has(stagingRecordId)) return prev;
      const next = new Map(prev);
      next.delete(stagingRecordId);
      return next;
    });
    try {
      const reports = await getStagingRecordRevalidation(stagingRecordId);
      setRevalidationByRecordId((prev) => new Map(prev).set(stagingRecordId, reports));
    } catch (err) {
      setRevalidationErrorByRecordId((prev) => new Map(prev).set(stagingRecordId, extractErrorMessage(err)));
    } finally {
      setRevalidationLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(stagingRecordId);
        return next;
      });
    }
  };

  // Closing the progress view just drops ?stagingRunId= — the run itself
  // keeps going server-side regardless, and the workspace's own "Attempt #N"
  // panel (and its "View Staged Dataset" action once READY) stays available
  // without it.
  const handleCloseStagingProgress = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('stagingRunId');
        return next;
      },
      { replace: true }
    );
  };

  const handleRetryStagingPoll = () => {
    if (!currentStagingRun) return;
    setStagingPollError(null);
    getStagingRun(currentStagingRun.id)
      .then(setCurrentStagingRun)
      .catch((err) => setStagingPollError(extractErrorMessage(err)));
  };

  // "View Staged Dataset" (Phase 4.12B) — the real materialized preview.
  // Fetches destination once per run (not re-fetched on every filter/page
  // change) and the first ALL/page-1 preview; onMaterializedPreviewFilterChange/
  // onMaterializedPreviewOffsetChange below drive further backend-authoritative
  // fetches. Never called for a LEGACY run — the "View Staged Dataset" action
  // that reaches this only ever renders once materializationPhase is READY.
  const fetchMaterializedPreview = (stagingRunId: string, filter: RowFilter, offset: number) => {
    setMaterializedPreviewLoading(true);
    setMaterializedPreviewError(null);
    getStagingPreview(stagingRunId, { filter, limit: MATERIALIZED_PREVIEW_PAGE_SIZE, offset })
      .then(setMaterializedPreview)
      .catch((err) => setMaterializedPreviewError(extractErrorMessage(err)))
      .finally(() => setMaterializedPreviewLoading(false));
  };

  const handleOpenMaterializedPreview = () => {
    if (!currentStagingRun) return;
    setIsMaterializedPreviewOpen(true);
    setMaterializedPreviewFilter('ALL');
    setMaterializedPreviewOffset(0);
    setMaterializedDestinationLoading(true);
    setMaterializedDestinationError(null);
    getStagingDestination(currentStagingRun.id)
      .then(setMaterializedDestination)
      .catch((err) => setMaterializedDestinationError(extractErrorMessage(err)))
      .finally(() => setMaterializedDestinationLoading(false));
    fetchMaterializedPreview(currentStagingRun.id, 'ALL', 0);
  };

  const handleMaterializedPreviewFilterChange = (filter: RowFilter) => {
    if (!currentStagingRun) return;
    setMaterializedPreviewFilter(filter);
    setMaterializedPreviewOffset(0);
    fetchMaterializedPreview(currentStagingRun.id, filter, 0);
  };

  const handleMaterializedPreviewOffsetChange = (offset: number) => {
    if (!currentStagingRun) return;
    setMaterializedPreviewOffset(offset);
    fetchMaterializedPreview(currentStagingRun.id, materializedPreviewFilter, offset);
  };

  const handleRetryMaterializedPreview = () => {
    if (!currentStagingRun) return;
    fetchMaterializedPreview(currentStagingRun.id, materializedPreviewFilter, materializedPreviewOffset);
  };

  // User Management Actions — real ApiError handling throughout, no optimistic
  // updates before the real response (same discipline as Phase 2). Gated on
  // users.manage at the render site (app/api/v1/users/routes.py: POST/PUT/reset-
  // password all require it — confirmed by grep, not assumed to match users.read).
  const handleCreateUser = async (input: { name: string; email: string; roleId: string | null }) => {
    setIsCreatingUser(true);
    setCreateUserError(null);
    try {
      // password is required by the schema but immediately discarded below — the
      // real value the admin can hand to the new user comes from resetUserPassword's
      // generated temporary_password, not from anything set here.
      const created = await apiCreateUser({
        email: input.email.trim(),
        full_name: input.name.trim(),
        password: crypto.randomUUID(),
        role_ids: input.roleId ? [input.roleId] : [],
      });
      const { temporary_password } = await apiResetUserPassword(created.id, {});
      const roleById = new Map(roles.map((r) => [r.id, r]));
      setPlatformUsers((prev) => [...prev, mapUserResponseToUser(created, roleById)]);
      setCreatedUserCredential({ email: created.email, temporaryPassword: temporary_password });
      triggerToast(`User "${created.full_name || created.email}" created`);
      return true;
    } catch (err) {
      setCreateUserError(extractErrorMessage(err));
      return false;
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleEditUser = async (id: string, updates: { name: string; roleId: string | null }) => {
    setUserActionPendingId(id);
    setUserActionError(null);
    try {
      const updated = await apiUpdateUser(id, {
        full_name: updates.name.trim(),
        role_ids: updates.roleId ? [updates.roleId] : [],
      });
      const roleById = new Map(roles.map((r) => [r.id, r]));
      const mapped = mapUserResponseToUser(updated, roleById);
      setPlatformUsers((prev) => prev.map((u) => (u.id === id ? mapped : u)));
      if (currentUser?.id === id) setCurrentUser(mapped.roleNames.length ? { ...currentUser, name: mapped.name, roleNames: mapped.roleNames } : { ...currentUser, name: mapped.name });
      triggerToast('User updated');
      return true;
    } catch (err) {
      setUserActionError(extractErrorMessage(err));
      return false;
    } finally {
      setUserActionPendingId(null);
    }
  };

  const handleDeactivateUser = async (id: string) => {
    setUserActionPendingId(id);
    setUserActionError(null);
    try {
      // Soft delete only — app/api/v1/users/routes.py has no DELETE endpoint at all;
      // UsersService.update_user just flips the status string.
      const updated = await apiUpdateUser(id, { status: 'INACTIVE' });
      const roleById = new Map(roles.map((r) => [r.id, r]));
      setPlatformUsers((prev) => prev.map((u) => (u.id === id ? mapUserResponseToUser(updated, roleById) : u)));
      triggerToast('User deactivated');
    } catch (err) {
      setUserActionError(extractErrorMessage(err));
    } finally {
      setUserActionPendingId(null);
    }
  };

  const handleResetPassword = async (id: string) => {
    setUserActionPendingId(id);
    setUserActionError(null);
    try {
      const target = platformUsers.find((u) => u.id === id);
      const { temporary_password } = await apiResetUserPassword(id, {});
      setCreatedUserCredential({ email: target?.email ?? id, temporaryPassword: temporary_password });
      triggerToast(`Password reset for ${target?.email ?? 'user'}`);
    } catch (err) {
      setUserActionError(extractErrorMessage(err));
    } finally {
      setUserActionPendingId(null);
    }
  };

  // Settings Actions
  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...updates }));
    triggerToast('Settings updated');
  };

  // Real persistence requires users.manage (PUT /users/{id} — there is no
  // self-service profile-update endpoint), and only full_name is settable this way;
  // UserUpdateRequest has no email field at all, so email is left read-only rather
  // than silently accepted and dropped. Gated at the render site.
  const handleUpdateProfile = async (updates: { name: string }) => {
    if (!currentUser) return;
    setUserActionPendingId(currentUser.id);
    setUserActionError(null);
    try {
      const updated = await apiUpdateUser(currentUser.id, { full_name: updates.name.trim() });
      const roleById = new Map(roles.map((r) => [r.id, r]));
      const mapped = mapUserResponseToUser(updated, roleById);
      setCurrentUser({ ...currentUser, name: mapped.name, roleNames: mapped.roleNames.length ? mapped.roleNames : currentUser.roleNames });
      setPlatformUsers((prev) => prev.map((u) => (u.id === currentUser.id ? mapped : u)));
      triggerToast('Profile updated');
    } catch (err) {
      setUserActionError(extractErrorMessage(err));
    } finally {
      setUserActionPendingId(null);
    }
  };

  // --- Staging & Publish dataset-centric redesign: derived view-model --------
  // Everything below is computed from real state already fetched above (the
  // broadened effects) plus the isolated helpers in
  // src/data/datasetStagingWorkflow.ts. Nothing here is persisted anywhere —
  // it only shapes StagingPublishView's props. Kept together, right before
  // render, since it fans out across state owned by several older screens.

  const schemaConnectionId = useMemo(() => {
    const map = new Map<string, string>();
    workflowCatalogSchemas.forEach((s) => map.set(s.id, s.connection_id));
    return map;
  }, [workflowCatalogSchemas]);

  // Real, strictly-approved corrections (RESOLVED with a final value) — never
  // SKIPPED issues, which resolved a decision but produced no correction.
  // Shared by every dataset's staging status/approved-changes derivation below.
  const resolvedIssuesByReviewId = useMemo(() => {
    const map = new Map<string, Issue[]>();
    issues.forEach((i) => {
      if (i.status !== 'RESOLVED' || i.finalValue == null) return;
      map.set(i.reviewRunId, [...(map.get(i.reviewRunId) ?? []), i]);
    });
    return map;
  }, [issues]);

  // --- Master/detail redesign: per-module master row derivations ------------
  // All four (Validation, Rules, Review, Approval) share the same real
  // dataset/connection/schema catalog fetched above; Staging's own row
  // derivation follows right after this block since it also needs
  // computeStagingDatasetStatus, defined next.

  const validationMasterRows: ValidationMasterRow[] = useMemo(
    () =>
      workflowCatalogDatasets.map((d) => {
        const connection = workflowCatalogConnections.find((c) => c.id === schemaConnectionId.get(d.schema_id));
        const schema = workflowCatalogSchemas.find((s) => s.id === d.schema_id);
        const runs = validationSummaryByDatasetId[d.id] ?? [];
        const latest = runs[0] ?? null;
        let status: ValidationMasterStatus = 'NOT_VALIDATED';
        if (latest) {
          if (latest.status === 'COMPLETED') status = 'COMPLETED';
          else if (latest.status === 'FAILED') status = 'FAILED';
          else if (latest.status === 'RUNNING') status = 'RUNNING';
          else if (latest.status === 'QUEUED' || latest.status === 'CREATED') status = 'QUEUED';
        }
        return {
          datasetId: d.id,
          datasetName: d.name,
          connectionName: connection?.name ?? 'Unknown connection',
          schemaName: schema?.name ?? 'unknown_schema',
          lastValidationLabel: latest ? (latest.completedAt !== 'Not completed' ? latest.completedAt : latest.startedAt) : null,
          qualityScorePct: latest?.qualityScore ?? null,
          noApplicableRules: !!latest?.noApplicableRules,
          failedRows: latest?.failedRows ?? 0,
          rulesEvaluatedCount: latest?.rulesEvaluatedCount ?? 0,
          status,
          lastRunAt: latest?.startedAt ?? null,
        };
      }),
    [workflowCatalogDatasets, workflowCatalogSchemas, workflowCatalogConnections, schemaConnectionId, validationSummaryByDatasetId]
  );

  const rulesMasterRows: RulesMasterRow[] = useMemo(
    () =>
      workflowCatalogDatasets.map((d) => {
        const connection = workflowCatalogConnections.find((c) => c.id === schemaConnectionId.get(d.schema_id));
        const schema = workflowCatalogSchemas.find((s) => s.id === d.schema_id);
        const assignments = ruleAssignments.filter((a) => a.dataset_id === d.id);
        const activeAssignments = assignments.filter((a) => a.is_enabled);
        const pending = getPendingReviewRulesForDataset(rules, ruleVersionsByRuleId, d.id);
        const lastUpdatedRaw = assignments.reduce<string | null>((latest, a) => {
          const t = a.updated_at ?? a.assigned_at;
          if (!latest) return t;
          return Date.parse(t) > Date.parse(latest) ? t : latest;
        }, null);
        let status: RulesMasterStatus;
        if (assignments.length === 0 && pending.length === 0) status = 'NO_RULES';
        else if (activeAssignments.length === 0 && pending.length > 0) status = 'PENDING_REVIEW';
        else if (activeAssignments.length === 0) status = 'NEEDS_RULES';
        else status = 'CONFIGURED';
        return {
          datasetId: d.id,
          datasetName: d.name,
          connectionName: connection?.name ?? 'Unknown connection',
          schemaName: schema?.name ?? 'unknown_schema',
          appliedRulesCount: assignments.length,
          activeRulesCount: activeAssignments.length,
          pendingCount: pending.length,
          lastUpdatedLabel: lastUpdatedRaw ? formatDateTime(lastUpdatedRaw) : null,
          status,
        };
      }),
    [workflowCatalogDatasets, workflowCatalogSchemas, workflowCatalogConnections, schemaConnectionId, ruleAssignments, rules, ruleVersionsByRuleId]
  );

  const reviewMasterRows: ReviewMasterRow[] = useMemo(
    () =>
      workflowCatalogDatasets.map((d) => {
        const connection = workflowCatalogConnections.find((c) => c.id === schemaConnectionId.get(d.schema_id));
        const schema = workflowCatalogSchemas.find((s) => s.id === d.schema_id);
        const review = getCurrentReviewForDataset(reviewRuns, d.id);
        const latestValidation = (validationSummaryByDatasetId[d.id] ?? []).find((r) => r.status === 'COMPLETED') ?? null;
        const base = {
          datasetId: d.id,
          datasetName: d.name,
          connectionName: connection?.name ?? 'Unknown connection',
          schemaName: schema?.name ?? 'unknown_schema',
          qualityScorePct: latestValidation?.qualityScore ?? null,
        };
        if (!review) {
          return {
            ...base,
            reviewRunId: null,
            issuesCount: 0,
            resolvedCount: 0,
            remainingCount: 0,
            suggestionsReadyCount: 0,
            status: 'NO_REVIEW' as ReviewMasterStatus,
            updatedLabel: null,
          };
        }
        const suggestionsReadyCount = issues.filter(
          (i) => i.reviewRunId === review.id && i.status === 'PENDING' && !!i.suggestedValue
        ).length;
        return {
          ...base,
          reviewRunId: review.id,
          issuesCount: review.totalIssues,
          resolvedCount: review.resolvedIssues,
          remainingCount: review.totalIssues - review.resolvedIssues,
          suggestionsReadyCount,
          status: review.status as ReviewMasterStatus,
          updatedLabel: review.updatedAt ?? review.createdAt,
        };
      }),
    [workflowCatalogDatasets, workflowCatalogSchemas, workflowCatalogConnections, schemaConnectionId, reviewRuns, issues, validationSummaryByDatasetId]
  );

  const approvalMasterRows: ApprovalMasterRow[] = useMemo(
    () =>
      workflowCatalogDatasets
        .map((d) => {
          const connection = workflowCatalogConnections.find((c) => c.id === schemaConnectionId.get(d.schema_id));
          const schema = workflowCatalogSchemas.find((s) => s.id === d.schema_id);
          const relevant = getRelevantApprovalForDataset(reviewRuns, approvalQueue, d.id);
          const currentReview = getCurrentReviewForDataset(reviewRuns, d.id);
          const reviewReadyNotSubmitted = !relevant && currentReview?.status === 'READY_FOR_APPROVAL';
          return {
            datasetId: d.id,
            datasetName: d.name,
            connectionName: connection?.name ?? 'Unknown connection',
            schemaName: schema?.name ?? 'unknown_schema',
            approvalRequestId: relevant?.id ?? null,
            changesCount: relevant?.affectedIssueCount ?? 0,
            recordsAffected: relevant?.affectedRecordCount ?? 0,
            submittedLabel: relevant?.requestedAt ?? null,
            status: (relevant?.status ?? 'NOT_SUBMITTED') as ApprovalMasterStatus,
            updatedLabel: relevant?.updatedAt ?? null,
            reviewReadyNotSubmitted: !!reviewReadyNotSubmitted,
          };
        })
        .filter((r) => r.approvalRequestId !== null || r.reviewReadyNotSubmitted),
    [workflowCatalogDatasets, workflowCatalogSchemas, workflowCatalogConnections, schemaConnectionId, reviewRuns, approvalQueue]
  );

  // V1.0 acceptance fix — maps a backend StagingCandidateResponse.readiness
  // straight onto the existing DatasetStagingStatus enum. Backend-computed
  // via StagingService.check_staging_eligibility (the exact rules
  // POST /reviews/{id}/staging itself enforces), never re-derived here.
  const STAGING_READINESS_TO_STATUS: Record<StagingCandidateResponse['readiness'], DatasetStagingStatus> = {
    READY_TO_STAGE: 'READY_TO_STAGE',
    BUILDING: 'STAGING',
    STAGED: 'STAGED',
    FAILED: 'FAILED',
    NOT_READY: 'NO_APPROVED_CHANGES',
  };

  // Staging readiness for an approved-or-beyond dataset now comes from the
  // backend-authoritative /staging-candidates list (see the fetch effect
  // above), never a client-side re-derivation of "is this approved" —
  // review.status can never equal 'APPROVED' (approval truth lives only on
  // ApprovalRequest), and only the backend actually knows every real
  // trigger() precondition (scope size limits, BUILDING conflicts, dataset
  // resolvability). A dataset with no candidate entry has never had an
  // APPROVED request and no staging run — those pre-approval statuses
  // (Draft/In Review/Ready for Approval) are outside the candidates
  // endpoint's scope by design and still come from reviewRuns/approvalQueue.
  const computeStagingDatasetStatus = (datasetId: string): DatasetStagingStatus => {
    const candidate = stagingCandidates.find((c) => c.dataset_id === datasetId);
    if (candidate) {
      // Live, this-session polling for the dataset currently open in the
      // workspace is more granular (exact materialization phase) than the
      // candidates snapshot fetched once on page load — prefer it while a
      // staging run is actually in flight right now.
      if (datasetId === selectedDatasetId && currentStagingRun) {
        return deriveDatasetStagingStatus({
          reviewStatus: undefined,
          resolvedIssues: candidate.affected_record_count,
          approvalStatus: candidate.approval_status as ApprovalRequestItem['status'],
          stagingRunStatus: currentStagingRun.status,
          publishRunStatus: currentPublishRun?.status ?? null,
          materializationPhase: currentStagingRun.materialization_phase ?? null,
        });
      }
      return STAGING_READINESS_TO_STATUS[candidate.readiness];
    }
    const currentReview = getCurrentReviewForDataset(reviewRuns, datasetId);
    const approval = currentReview ? getApprovalForReview(approvalQueue, currentReview.id) : null;
    return deriveDatasetStagingStatus({
      reviewStatus: currentReview?.status,
      resolvedIssues: 0,
      approvalStatus: approval?.status,
      stagingRunStatus: null,
      publishRunStatus: null,
    });
  };

  const stagingMasterRows: StagingMasterRow[] = useMemo(
    () =>
      workflowCatalogDatasets.map((d) => {
        const connId = schemaConnectionId.get(d.schema_id);
        const schema = workflowCatalogSchemas.find((s) => s.id === d.schema_id);
        const connection = workflowCatalogConnections.find((c) => c.id === connId);
        const candidate = stagingCandidates.find((c) => c.dataset_id === d.id);
        const eligibleReview = getStagingEligibleReview(reviewRuns, approvalQueue, d.id);
        const approvedIssues = eligibleReview ? resolvedIssuesByReviewId.get(eligibleReview.id) ?? [] : [];
        return {
          datasetId: d.id,
          datasetName: d.name,
          connectionName: connection?.name ?? 'Unknown connection',
          schemaName: schema?.name ?? 'unknown_schema',
          // Backend-authoritative counts when a candidate exists (real
          // ApprovalRequest.affected_issue_count/affected_record_count);
          // client-derived fallback only for a not-yet-approved dataset.
          approvedChangesCount: candidate?.affected_issue_count ?? approvedIssues.length,
          rowsAffected: candidate?.affected_record_count ?? new Set(approvedIssues.map((i) => i.recordRef)).size,
          status: computeStagingDatasetStatus(d.id),
          lastStagedLabel:
            d.id === selectedDatasetId && currentStagingRun
              ? formatDateTime(currentStagingRun.completed_at ?? currentStagingRun.created_at)
              : null,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      workflowCatalogDatasets,
      workflowCatalogSchemas,
      workflowCatalogConnections,
      schemaConnectionId,
      reviewRuns,
      approvalQueue,
      resolvedIssuesByReviewId,
      stagingCandidates,
      selectedDatasetId,
      currentStagingRun,
    ]
  );

  const stagingWorkspaceDatasetRecord: DatasetResponse | null = useMemo(() => {
    if (!selectedDatasetId) return null;
    if (selectedDataset && selectedDataset.id === selectedDatasetId) return selectedDataset;
    return workflowCatalogDatasets.find((d) => d.id === selectedDatasetId) ?? null;
  }, [selectedDatasetId, selectedDataset, workflowCatalogDatasets]);

  // For DISPLAY (status labels, "N of M resolved" messaging) — falls back to
  // the dataset's current in-progress review so pre-approval empty states
  // still show real numbers.
  const stagingSelectedReview = selectedDatasetId
    ? getStagingEligibleReview(reviewRuns, approvalQueue, selectedDatasetId) ??
      getCurrentReviewForDataset(reviewRuns, selectedDatasetId)
    : null;
  const stagingSelectedApproval = stagingSelectedReview ? getApprovalForReview(approvalQueue, stagingSelectedReview.id) : null;

  // For the actual "Approved Changes" staged-for-real content — deliberately
  // NOT the same fallback as above. A review that's merely in progress (its
  // issues individually marked RESOLVED but never submitted/approved) must
  // never be presented as "approved for staging"; only a genuinely
  // approved/partially-approved review's corrections qualify.
  const stagingEligibleReview = selectedDatasetId
    ? getStagingEligibleReview(reviewRuns, approvalQueue, selectedDatasetId)
    : null;
  const stagingApprovedIssues = stagingEligibleReview ? resolvedIssuesByReviewId.get(stagingEligibleReview.id) ?? [] : [];

  const stagingApprovedChanges = useMemo(
    () =>
      stagingApprovedIssues.map((i) => ({
        recordRef: i.recordRef,
        columnName: i.columnName,
        originalValue: i.originalValue,
        stagedValue: i.finalValue as string,
      })),
    [stagingApprovedIssues]
  );

  const stagingSelectedDatasetWorkspace = useMemo(() => {
    if (!stagingWorkspaceDatasetRecord || !selectedDatasetId) return null;
    const schema = workflowCatalogSchemas.find((s) => s.id === stagingWorkspaceDatasetRecord.schema_id);
    const connection = workflowCatalogConnections.find((c) => c.id === schema?.connection_id);
    const latestCompletedValidation = validationRuns.find((v) => v.status === 'COMPLETED');
    return {
      id: stagingWorkspaceDatasetRecord.id,
      name: stagingWorkspaceDatasetRecord.name,
      connectionName: connection?.name ?? 'Unknown connection',
      schemaName: schema?.name ?? 'unknown_schema',
      keyStrategy: stagingWorkspaceDatasetRecord.key_strategy || null,
      sourceRowCount: stagingWorkspaceDatasetRecord.row_count_estimate,
      lastValidationLabel: latestCompletedValidation ? `Completed ${latestCompletedValidation.completedAt}` : null,
      approvalStatusLabel: stagingSelectedApproval
        ? humanizeEnum(stagingSelectedApproval.status)
        : stagingSelectedReview
        ? humanizeEnum(stagingSelectedReview.status)
        : null,
      resolvedIssueCount: stagingSelectedReview?.resolvedIssues ?? 0,
      totalIssueCount: stagingSelectedReview?.totalIssues ?? 0,
      status: computeStagingDatasetStatus(selectedDatasetId),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stagingWorkspaceDatasetRecord,
    selectedDatasetId,
    workflowCatalogSchemas,
    workflowCatalogConnections,
    validationRuns,
    stagingSelectedApproval,
    stagingSelectedReview,
    currentStagingRun,
    currentPublishRun,
  ]);

  const stagingPreviewColumns: PreviewColumn[] = useMemo(() => {
    if (selectedDatasetColumns.length > 0 && selectedDataset?.id === selectedDatasetId) {
      return selectedDatasetColumns
        .slice()
        .sort((a, b) => a.ordinal_position - b.ordinal_position)
        .map((c) => ({ name: c.name, isPrimaryKey: c.is_primary_key }));
    }
    if (datasetPreview && datasetPreview.dataset_id === selectedDatasetId) {
      return datasetPreview.columns.map((name) => ({ name }));
    }
    return [];
  }, [selectedDatasetColumns, selectedDataset, selectedDatasetId, datasetPreview]);

  // The real backend only returns AFFECTED staging records, never a
  // materialized full staged table (see this file's own comments on
  // StagingRunResponse/StagingRecordResponse). This overlays real approved
  // corrections onto real live source rows (GET /datasets/{id}/preview) where
  // they can be matched by record_ref — an honest, best-effort reconstruction
  // of "what staging will look like," not a claim that the backend already
  // materializes it. See findMatchingPreviewRow's own doc comment for the
  // matching approach and its limits.
  const stagingPreviewData = useMemo(() => {
    const changesByRecordRef = new Map<string, typeof stagingApprovedChanges>();
    stagingApprovedChanges.forEach((c) => {
      changesByRecordRef.set(c.recordRef, [...(changesByRecordRef.get(c.recordRef) ?? []), c]);
    });

    const hasLivePreview = !!datasetPreview && datasetPreview.dataset_id === selectedDatasetId;
    const previewSourceRows = hasLivePreview ? datasetPreview!.rows : [];
    const matchedRecordRefs = new Set<string>();

    const rows: PreviewRow[] = previewSourceRows.map((sourceRow, idx) => {
      let matchedChanges: typeof stagingApprovedChanges | undefined;
      let matchedRef: string | undefined;
      for (const [ref, changes] of changesByRecordRef) {
        if (findMatchingPreviewRow(ref, [sourceRow])) {
          matchedChanges = changes;
          matchedRef = ref;
          break;
        }
      }
      const cells: PreviewRow['cells'] = {};
      stagingPreviewColumns.forEach((col) => {
        const changed = matchedChanges?.find((c) => c.columnName === col.name);
        cells[col.name] = {
          value: changed ? changed.stagedValue : sourceRow[col.name],
          isChanged: !!changed,
          originalValue: changed ? changed.originalValue : undefined,
        };
      });
      if (matchedRef) matchedRecordRefs.add(matchedRef);
      return { key: matchedRef ?? `row-${idx}`, isChanged: !!matchedChanges, cells };
    });

    // Approved changes whose record_ref couldn't be matched to a live preview
    // row (unfamiliar ref format, or preview unavailable) still get their own
    // row — only the corrected fields are known for these; ChangePreviewTable
    // honestly renders every other column as "not shown" for them.
    Array.from(changesByRecordRef.entries())
      .filter(([ref]) => !matchedRecordRefs.has(ref))
      .forEach(([ref, changes]) => {
        const cells: PreviewRow['cells'] = {};
        changes.forEach((c) => {
          cells[c.columnName] = { value: c.stagedValue, isChanged: true, originalValue: c.originalValue };
        });
        rows.push({ key: ref, isChanged: true, cells });
      });

    const limitationNote = !hasLivePreview
      ? 'Live source preview is unavailable (requires the data_preview.read permission) — only rows with approved corrections are shown below.'
      : datasetPreview!.capped_to_max
      ? `This preview is capped to ${datasetPreview!.row_count.toLocaleString()} of the dataset's real rows — the full table isn't materialized until staging runs server-side (Phase 4.12).`
      : null;

    return { rows, limitationNote };
  }, [datasetPreview, selectedDatasetId, stagingApprovedChanges, stagingPreviewColumns]);

  const stagingTableStructureColumns: TableStructureColumn[] = useMemo(() => {
    if (selectedDatasetColumns.length > 0 && selectedDataset?.id === selectedDatasetId) {
      return selectedDatasetColumns
        .slice()
        .sort((a, b) => a.ordinal_position - b.ordinal_position)
        .map((c) => ({ name: c.name, dataType: c.normalized_data_type, isPrimaryKey: c.is_primary_key }));
    }
    return stagingPreviewColumns.map((c) => ({ name: c.name, dataType: 'unknown', isPrimaryKey: c.isPrimaryKey }));
  }, [selectedDatasetColumns, selectedDataset, selectedDatasetId, stagingPreviewColumns]);

  // Phase 4.12B — real materialization state for the currently-open
  // workspace's staging run, derived fresh every render from currentStagingRun
  // (kept live by the resume/polling effects above) and this session's own
  // justTriggeredStagingRunId signal. materializationUiPhase is null only
  // when there's no staging run open at all (nothing to show progress for).
  const materializationUiPhase: MaterializationUiPhase | null = currentStagingRun
    ? resolveMaterializationUiPhase(currentStagingRun.materialization_phase, justTriggeredStagingRunId === currentStagingRun.id)
    : null;
  const realStagingDestination = currentStagingRun ? stagingDestinationFromRun(currentStagingRun) : null;
  const isStagingProgressOpen = !!stagingRunIdFromUrl && currentStagingRun?.id === stagingRunIdFromUrl;

  const materializedPreviewColumns: PreviewColumn[] = useMemo(
    () => (materializedPreview ? materializedPreview.columns.map((name) => ({ name })) : []),
    [materializedPreview]
  );
  const materializedPreviewRows: PreviewRow[] = useMemo(() => {
    if (!materializedPreview) return [];
    return materializedPreview.rows.map((row, idx) => {
      const correctedByColumn = new Map(row.corrected_fields.map((f) => [f.column_name, f]));
      const cells: PreviewRow['cells'] = {};
      Object.entries(row.values).forEach(([col, value]) => {
        const corrected = correctedByColumn.get(col);
        cells[col] = { value, isChanged: !!corrected, originalValue: corrected?.original_value ?? undefined };
      });
      return { key: row.record_ref ?? `row-${idx}`, isChanged: row.is_changed, cells };
    });
  }, [materializedPreview]);

  if (authStatus === 'checking') {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-surface font-sans text-on-surface">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-outline">Restoring your session…</p>
        </div>
      </main>
    );
  }

  // Not logged in (or explicitly signed out): show LoginView. The URL itself is
  // left untouched while this renders — a deep link/bookmark/refresh of e.g.
  // /review-corrections/abc that hits this gate keeps that exact URL, so once
  // login succeeds the very next render just shows whatever page the address
  // bar already says, with no extra redirect needed. Only the two "no specific
  // destination was intended" entry points (bare "/login", or "/" before its
  // own redirect effect above fires) get sent to /dashboard explicitly.
  if (!currentUser || currentScreen === 'login') {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (location.pathname === '/login' || location.pathname === '/') {
            navigate('/dashboard', { replace: true });
          }
          triggerToast(`Welcome back, ${user.name}`);
        }}
      />
    );
  }

  if (currentScreen === 'add-data-source') {
    return (
      <AddDataSourceView
        onBack={() => navigate('/data-sources')}
        onComplete={handleCompleteAddSource}
      />
    );
  }

  // V1.0 global operation visibility — derived from state this file already
  // owns (never a second, duplicate copy of backend job state): a validation
  // run this session is watching, AI rule detection, AI correction
  // generation, or a non-terminal staging materialization.
  const isStagingMaterializing =
    !!currentStagingRun &&
    !isTerminalMaterializationPhase(
      resolveMaterializationUiPhase(currentStagingRun.materialization_phase, justTriggeredStagingRunId === currentStagingRun.id)
    );
  const activeOperationsCount = [
    watchedValidationRun !== null,
    isDetectingRules,
    aiGeneratingType === 'CORRECTION',
    isStagingMaterializing,
  ].filter(Boolean).length;

  return (
    <div className="flex h-screen bg-surface font-sans text-on-surface antialiased overflow-hidden selection:bg-surface-container-high selection:text-primary">
      {/* Sidebar Navigation */}
      <SideNavBar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top App Bar */}
        <TopAppBar
          currentUser={currentUser}
          onLogout={() => {
            apiLogout().finally(() => {
              setCurrentUser(null);
              navigate('/login');
            });
          }}
          onOpenProfile={() => navigate('/settings')}
          canSeeOwnRole={hasPermission('users.read')}
          onChangePassword={handleChangePassword}
          isChangingPassword={isChangingPassword}
          changePasswordError={changePasswordError}
          currentScreen={currentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenAIAssistant={() => setShowAICopilot(true)}
          activeOperationsCount={activeOperationsCount}
          onOpenRunningOperations={() => handleNavigate('run-history')}
        />

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto bg-surface">
          {currentScreen === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onOpenNewDataset={() => handleNavigate('add-data-source')}
              onOpenDataset={(datasetId) => navigate(`/datasets/${datasetId}`)}
              canReadReports={hasPermission('reports.read')}
              reportsLoading={reportsLoading}
              reportsError={reportsError}
              qualityTrend={qualityTrend}
              ruleEffectiveness={ruleEffectiveness}
              qualityByDataset={qualityByDataset}
              canReadApprovals={hasPermission('approval.read')}
              approvalsLoading={dashboardApprovalsLoading}
              approvalsError={dashboardApprovalsError}
              pendingApprovals={dashboardPendingApprovals}
              canReadDatasets={hasPermission('metadata.read')}
              datasetsLoading={dashboardDatasetsLoading}
              datasetsError={dashboardDatasetsError}
              datasets={dashboardDatasets}
              canReadDataSources={hasPermission('data_sources.read')}
              dataSourcesLoading={dashboardDataSourcesLoading}
              dataSourcesError={dashboardDataSourcesError}
              activeSourceCount={dashboardActiveSourceCount}
            />
          )}

          {currentScreen === 'data-sources' &&
            renderGated(
              hasPermission('data_sources.read'),
              'You need the data_sources.read permission to view data sources.',
              dataSourcesLoading,
              'Loading data sources…',
              dataSourcesError,
              <DataSourcesView
                dataSources={dataSources}
                onOpenAddSource={() => handleNavigate('add-data-source')}
                onSyncSource={handleSyncConnection}
                syncingConnectionId={syncingConnectionId}
                syncError={syncError}
                canManage={hasPermission('data_sources.manage')}
                actionPendingId={dataSourceActionPendingId}
                actionError={dataSourceActionError}
                onUpdateSource={handleUpdateDataSource}
                onDeleteSource={handleDeleteDataSource}
                connections={dataSourceConnections}
                connectionTypes={dataSourceConnectionTypes}
                canManageConnections={hasPermission('connections.manage')}
                connectionActionPendingId={connectionActionPendingId}
                connectionActionError={connectionActionError}
                onDeactivateConnection={handleDeactivateConnection}
                onReactivateSource={handleReactivateDataSource}
                onReactivateConnection={handleReactivateConnection}
                onViewDatasets={handleViewDatasetsForSource}
              />
            )}

          {currentScreen === 'dataset-overview' &&
            (!selectedDatasetId ? (
              <ScreenPrompt message="Select a dataset from Data Explorer to view its overview." />
            ) : (
              renderGated(
                hasPermission('metadata.read'),
                'You need the metadata.read permission to view dataset details.',
                datasetOverviewLoading,
                'Loading dataset…',
                datasetOverviewError,
                selectedDataset && (
                  <DatasetOverviewView
                    onNavigate={handleNavigate}
                    dataset={selectedDataset}
                    columns={selectedDatasetColumns}
                    connectionInactive={
                      deDatasets.find((d) => d.id === selectedDatasetId)?.connectionInactive ?? false
                    }
                    validationRuns={validationRuns}
                    latestFailures={datasetOverviewFailures}
                    onRunValidation={handleRunValidation}
                    canTriggerValidation={hasPermission('validation.run')}
                    isTriggeringValidation={isTriggeringValidation}
                    validationActionError={validationActionError}
                    canViewRules={hasPermission('rules.read')}
                    rulesLoading={rulesLoading}
                    rules={rules}
                    ruleVersionsByRuleId={ruleVersionsByRuleId}
                    ruleAssignments={ruleAssignments.filter((a) => a.dataset_id === selectedDatasetId)}
                    canSuggestRules={hasPermission('ai.suggest')}
                    onDetectRules={() => selectedDatasetId && handleDetectRules(selectedDatasetId)}
                    isDetectingRules={isDetectingRules}
                    ruleDetectionError={ruleDetectionError}
                    ruleDetectionSummary={ruleDetectionSummary}
                    canManageRuleReview={hasPermission('rules.manage')}
                    onPromoteRule={handlePromoteRule}
                    onDismissRule={handleDismissRule}
                    ruleReviewActionPendingId={ruleReviewActionPendingId}
                    ruleReviewActionError={ruleReviewActionError}
                    canViewApprovals={hasPermission('approval.read')}
                    approvals={approvalQueue.filter((a) => a.datasetName === selectedDataset?.name)}
                    canViewPreview={hasPermission('data_preview.read')}
                    preview={datasetPreview}
                    previewLoading={datasetPreviewLoading}
                    previewError={datasetPreviewError}
                  />
                )
              )
            ))}

          {currentScreen === 'dataset-preview' && (
            <DatasetPreviewView
              onNavigate={handleNavigate}
              datasetName={selectedDataset?.name}
              connectionInactive={
                deDatasets.find((d) => d.id === selectedDatasetId)?.connectionInactive ?? false
              }
              canViewPreview={hasPermission('data_preview.read')}
              preview={datasetPreview}
              previewLoading={datasetPreviewLoading}
              previewError={datasetPreviewError}
            />
          )}

          {currentScreen === 'data-explorer' &&
            renderGated(
              hasPermission('metadata.read'),
              'You need the metadata.read permission to view discovered schemas and datasets.',
              dataExplorerLoading,
              'Loading discovered schemas and datasets…',
              dataExplorerError,
              <DataExplorerView
                onNavigate={handleNavigate}
                schemas={deSchemas}
                datasets={deDatasets}
                columns={deColumns}
                onOpenDataset={(datasetId) => navigate(`/datasets/${datasetId}`)}
                dataSourceFilter={explorerDataSourceFilter}
                onClearDataSourceFilter={() => setExplorerDataSourceFilter(null)}
              />
            )}

          {currentScreen === 'data-profiling' &&
            renderGated(
              hasPermission('metadata.read'),
              'You need the metadata.read permission to view profiling history.',
              profilingLoading,
              'Loading profiling history…',
              profilingError,
              <DataProfilingView
                onNavigate={handleNavigate}
                datasets={profilingDatasets}
                profileRuns={profileRuns}
              />
            )}

          {currentScreen === 'validation-workspace' &&
            (!isValidationDetailOpen ? (
              renderGated(
                hasPermission('metadata.read'),
                'You need the metadata.read permission to view validation status.',
                workflowCatalogLoading || validationSummaryLoading,
                'Loading validation status…',
                workflowCatalogError,
                <ValidationMasterView
                  rows={validationMasterRows}
                  loading={workflowCatalogLoading || validationSummaryLoading}
                  error={workflowCatalogError}
                  onOpenDataset={(datasetId) => navigate(`/validation/${datasetId}`)}
                />
              )
            ) : (
              renderGated(
                hasPermission('metadata.read'),
                'You need the metadata.read permission to view validation runs.',
                validationLoading,
                'Loading validation runs…',
                validationError,
                <>
                  <WorkflowBreadcrumb
                    moduleLabel="Validation"
                    itemLabel={selectedDataset?.name ?? selectedDatasetId ?? ''}
                    onBack={() => navigate('/validation')}
                  />
                  <ValidationWorkspaceView
                    onNavigate={handleNavigate}
                    datasetName={selectedDataset?.name ?? selectedDatasetId ?? ''}
                    validationRuns={validationRuns}
                    onRunValidation={handleRunValidation}
                    onSelectRun={handleSelectValidationRun}
                    canTriggerValidation={hasPermission('validation.run')}
                    isTriggering={isTriggeringValidation}
                    actionError={validationActionError}
                  />
                </>
              )
            ))}

          {currentScreen === 'validation-run-details' &&
            renderGated(
              hasPermission('metadata.read'),
              'You need the metadata.read permission to view this validation run.',
              validationDetailLoading,
              'Loading validation run…',
              validationDetailError,
              <ValidationRunDetailsView
                onNavigate={handleNavigate}
                run={selectedValidationRun ?? undefined}
                canCancel={hasPermission('discovery.run')}
                isCancelling={isCancellingValidationJob}
                onCancel={handleCancelValidationJob}
                canStartReview={hasPermission('review.edit')}
                isStartingReview={isStartingReview}
                onStartReview={handleStartReview}
                actionError={validationDetailActionError}
                failures={validationFailures}
                failuresTotal={validationFailuresTotal}
                failuresPage={validationFailuresPage}
                failuresPageSize={VALIDATION_FAILURES_PAGE_SIZE}
                onFailuresPageChange={setValidationFailuresPage}
                failuresSeverity={validationFailuresSeverity}
                onFailuresSeverityChange={setValidationFailuresSeverity}
                failuresLoading={validationFailuresLoading}
                failuresError={validationFailuresError}
                evaluatedRules={evaluatedRules}
                evaluatedRulesLoading={evaluatedRulesLoading}
                evaluatedRulesError={evaluatedRulesError}
              />
            )}

          {currentScreen === 'quality-rules' &&
            (!isRulesDetailOpen ? (
              renderGated(
                hasPermission('rules.read'),
                'You need the rules.read permission to view quality rules.',
                workflowCatalogLoading || rulesLoading,
                'Loading rule assignments…',
                workflowCatalogError,
                <QualityRulesMasterView
                  rows={rulesMasterRows}
                  loading={workflowCatalogLoading || rulesLoading}
                  error={workflowCatalogError}
                  onOpenDataset={(datasetId) => navigate(`/data-quality-rules/${datasetId}`)}
                />
              )
            ) : (
              renderGated(
                hasPermission('rules.read'),
                'You need the rules.read permission to view quality rules.',
                rulesLoading,
                'Loading rules…',
                rulesError,
                <>
                  <WorkflowBreadcrumb
                    moduleLabel="Data Quality Rules"
                    itemLabel={
                      qualityRulesDatasets.find((d) => d.id === selectedDatasetId)?.name ?? selectedDatasetId ?? ''
                    }
                    onBack={() => navigate('/data-quality-rules')}
                  />
                  <QualityRulesView
                    onNavigate={handleNavigate}
                    onOpenRuleCreator={() => setShowRuleCreatorModal(true)}
                    datasets={qualityRulesDatasets}
                    rules={rules}
                    ruleAssignments={ruleAssignments}
                    ruleVersionIdsByRuleId={Object.fromEntries(
                      Object.entries(ruleVersionsByRuleId).map(([ruleId, versions]) => [ruleId, versions.map((v) => v.id)])
                    )}
                    canManageRules={hasPermission('rules.manage')}
                    canManageAssignments={hasPermission('rule_assignments.manage')}
                    onDisableAssignment={handleDisableAssignment}
                    onOpenAssignmentForm={(ruleId, datasetId) => {
                      setAssignmentRuleId(ruleId);
                      if (datasetId) {
                        setAssignmentDatasetId(datasetId);
                        listDatasetColumns(datasetId)
                          .then(setAssignmentDatasetColumns)
                          .catch(() => setAssignmentDatasetColumns([]));
                      }
                      setShowAssignmentForm(true);
                    }}
                    onOpenVersionForm={(ruleId) => {
                      setVersionRuleId(ruleId);
                      setShowVersionForm(true);
                    }}
                    onOpenDatasetOverview={(datasetId) => navigate(`/datasets/${datasetId}`)}
                    actionError={rulesActionError}
                    focusDatasetId={selectedDatasetId ?? undefined}
                  />
                </>
              )
            ))}

          {currentScreen === 'review-corrections' &&
            (!isReviewDetailOpen ? (
              renderGated(
                hasPermission('review.read'),
                'You need the review.read permission to view reviews.',
                workflowCatalogLoading || reviewRunsLoading || validationSummaryLoading,
                'Loading reviews…',
                workflowCatalogError,
                <ReviewCorrectionsMasterView
                  rows={reviewMasterRows}
                  loading={workflowCatalogLoading || reviewRunsLoading || validationSummaryLoading}
                  error={workflowCatalogError}
                  onOpenDataset={(datasetId) => {
                    const review = getCurrentReviewForDataset(reviewRuns, datasetId);
                    navigate(`/review-corrections/${datasetId}${review ? `?reviewId=${review.id}` : ''}`);
                  }}
                />
              )
            ) : (
              renderGated(
                hasPermission('review.read'),
                'You need the review.read permission to view reviews.',
                reviewRunsLoading,
                'Loading reviews…',
                reviewRunsError,
                <>
                  <WorkflowBreadcrumb
                    moduleLabel="Review & Corrections"
                    itemLabel={selectedDataset?.name ?? selectedDatasetId ?? ''}
                    onBack={() => navigate('/review-corrections')}
                  />
                  <ReviewCorrectionsView
                    onNavigate={handleNavigate}
                    reviewRuns={getReviewsForDataset(reviewRuns, selectedDatasetId ?? '')}
                    selectedReviewId={selectedReviewId}
                    onSelectReview={handleSelectReview}
                    issues={issues}
                    canEdit={hasPermission('review.edit')}
                    actionError={reviewActionError}
                    pendingIssueIds={reviewActionPendingIds}
                    onGenerateSuggestions={handleGenerateSuggestions}
                    isGeneratingSuggestions={isGeneratingSuggestions}
                    canUseAISuggestions={hasPermission('ai.suggest')}
                    onGenerateAISuggestions={handleGenerateCorrections}
                    isGeneratingAISuggestions={aiGeneratingType === 'CORRECTION'}
                    aiSuggestionsError={aiInsightsError}
                    onAcceptIssue={handleAcceptIssue}
                    onEditIssue={handleEditIssue}
                    onRejectIssue={handleRejectIssue}
                    onSkipIssue={handleSkipIssue}
                    onBulkAccept={handleBulkAccept}
                    onBulkReject={handleBulkReject}
                    onSubmitForApproval={handleSubmitForApproval}
                    selectedReviewApprovalStatus={
                      (selectedReviewId
                        ? getApprovalForReview(approvalQueue, selectedReviewId)?.status
                        : null) ?? null
                    }
                    canViewStaging={hasPermission('staging.read')}
                    aiTraceBySuggestionId={aiTraceBySuggestionId}
                    aiTraceLoadingIds={aiTraceLoadingIds}
                    aiTraceErrorBySuggestionId={aiTraceErrorBySuggestionId}
                    onLoadAiTrace={handleLoadAiTrace}
                  />
                </>
              )
            ))}

          {currentScreen === 'approval-center' &&
            (!isApprovalDetailOpen ? (
              renderGated(
                hasPermission('approval.read'),
                'You need the approval.read permission to view the approval center.',
                workflowCatalogLoading || approvalsLoading,
                'Loading approval requests…',
                workflowCatalogError,
                <ApprovalCenterMasterView
                  rows={approvalMasterRows}
                  loading={workflowCatalogLoading || approvalsLoading}
                  error={workflowCatalogError}
                  onOpenApproval={(datasetId) => navigate(`/approval-center/${datasetId}`)}
                />
              )
            ) : (
              renderGated(
                hasPermission('approval.read'),
                'You need the approval.read permission to view the approval center.',
                approvalsLoading,
                'Loading approval requests…',
                approvalsError,
                (() => {
                  const request = selectedDatasetId
                    ? getRelevantApprovalForDataset(reviewRuns, approvalQueue, selectedDatasetId)
                    : null;
                  return (
                    <>
                      <WorkflowBreadcrumb
                        moduleLabel="Approval Center"
                        itemLabel={selectedDataset?.name ?? selectedDatasetId ?? ''}
                        onBack={() => navigate('/approval-center')}
                      />
                      {!request ? (
                        <ScreenPrompt message="This dataset has no approval request to review anymore." />
                      ) : (
                        <ApprovalCenterView
                          request={request}
                          canDecide={hasPermission('approval.decide')}
                          isPending={approvalActionPendingId === request.id}
                          actionError={approvalActionError}
                          onApprove={handleApproveRequest}
                          onReject={handleRejectRequest}
                        />
                      )}
                    </>
                  );
                })()
              )
            ))}

          {currentScreen === 'staging-publish' &&
            (!isStagingDetailOpen ? (
              renderGated(
                hasPermission('staging.read'),
                'You need the staging.read permission to view staging & publish.',
                workflowCatalogLoading,
                'Loading staging readiness…',
                workflowCatalogError,
                <StagingMasterView
                  rows={stagingMasterRows}
                  loading={workflowCatalogLoading}
                  error={workflowCatalogError}
                  onOpenDataset={handleSelectStagingDataset}
                />
              )
            ) : (
              renderGated(
                hasPermission('staging.read'),
                'You need the staging.read permission to view staging & publish.',
                false,
                'Loading staging run…',
                null,
                <>
                  <WorkflowBreadcrumb
                    moduleLabel="Staging & Publish"
                    itemLabel={stagingSelectedDatasetWorkspace?.name ?? selectedDatasetId ?? ''}
                    onBack={() => navigate('/staging-publish')}
                  />
                  <StagingPublishView
                    onNavigate={handleNavigate}
                    selectedDataset={stagingSelectedDatasetWorkspace}
                    approvedChanges={stagingApprovedChanges}
                    previewColumns={stagingPreviewColumns}
                    previewRows={stagingPreviewData.rows}
                    previewLimitationNote={stagingPreviewData.limitationNote}
                    tableStructureColumns={stagingTableStructureColumns}
                    stagingDestination={PENDING_STAGING_DESTINATION}
                    stagingRun={currentStagingRun}
                    stagingRecords={stagingRecords}
                    driftOnly={driftOnlyFilter}
                    onToggleDriftOnly={setDriftOnlyFilter}
                    publishRun={currentPublishRun}
                    canCreateStaging={hasPermission('staging.create')}
                    canPublish={hasPermission('publish.execute')}
                    isActionPending={isStagingActionPending}
                    actionError={stagingActionError}
                    onCreateStagingRun={handleCreateStagingRun}
                    onPublish={handlePublish}
                    onAcknowledgeDrift={handleAcknowledgeDrift}
                    revalidationByRecordId={revalidationByRecordId}
                    revalidationLoadingIds={revalidationLoadingIds}
                    revalidationErrorByRecordId={revalidationErrorByRecordId}
                    onLoadRevalidation={handleLoadRevalidation}
                    materializationPhase={materializationUiPhase}
                    progressPercentage={currentStagingRun?.progress_percentage ?? null}
                    copiedRowCount={currentStagingRun?.copied_row_count ?? null}
                    materializationSourceRowCount={currentStagingRun?.source_row_count ?? null}
                    materializedRowCount={currentStagingRun?.materialized_row_count ?? null}
                    materializationError={currentStagingRun?.materialization_error ?? null}
                    realDestinationLabel={realStagingDestination?.fullReference ?? null}
                    isProgressOpen={isStagingProgressOpen}
                    onCloseProgress={handleCloseStagingProgress}
                    pollError={stagingPollError}
                    onRetryPoll={handleRetryStagingPoll}
                    isMaterializedPreviewOpen={isMaterializedPreviewOpen}
                    onOpenMaterializedPreview={handleOpenMaterializedPreview}
                    onCloseMaterializedPreview={() => setIsMaterializedPreviewOpen(false)}
                    materializedDestination={materializedDestination}
                    materializedDestinationLoading={materializedDestinationLoading}
                    materializedDestinationError={materializedDestinationError}
                    materializedPreviewColumns={materializedPreviewColumns}
                    materializedPreviewRows={materializedPreviewRows}
                    materializedPreviewTotalRows={materializedPreview?.total_rows ?? 0}
                    materializedPreviewLimit={MATERIALIZED_PREVIEW_PAGE_SIZE}
                    materializedPreviewOffset={materializedPreviewOffset}
                    materializedPreviewLoading={materializedPreviewLoading}
                    materializedPreviewError={materializedPreviewError}
                    onRetryMaterializedPreview={handleRetryMaterializedPreview}
                    materializedPreviewFilter={materializedPreviewFilter}
                    onMaterializedPreviewFilterChange={handleMaterializedPreviewFilterChange}
                    onMaterializedPreviewOffsetChange={handleMaterializedPreviewOffsetChange}
                  />
                </>
              )
            ))}

          {currentScreen === 'data-lineage' &&
            (!selectedDatasetId ? (
              <ScreenPrompt message="Select a dataset from Data Explorer to trace its lineage." />
            ) : (
              renderGated(
                hasPermission('lineage.read'),
                'You need the lineage.read permission to view lineage.',
                lineageLoading,
                'Tracing lineage…',
                lineageError,
                <DataLineageView onNavigate={handleNavigate} nodes={lineageNodes} edges={lineageEdges} />
              )
            ))}

          {currentScreen === 'run-history' &&
            renderGated(
              hasPermission('metadata.read'),
              'You need the metadata.read permission to view run history.',
              runHistoryLoading,
              'Loading run history…',
              runHistoryError,
              <RunHistoryView onNavigate={handleNavigate} runHistory={runHistory} />
            )}

          {currentScreen === 'reports' &&
            renderGated(
              hasPermission('reports.read'),
              'You need the reports.read permission to view reports.',
              reportsLoading,
              'Loading reports…',
              reportsError,
              <ReportsView
                onNavigate={handleNavigate}
                qualityTrend={qualityTrend}
                ruleEffectiveness={ruleEffectiveness}
                qualityByDataset={qualityByDataset}
                reviewPerformance={reviewPerformance}
                approvalMetrics={approvalMetrics}
              />
            )}

          {currentScreen === 'insights' &&
            renderGated(
              hasPermission('ai.suggest'),
              'You need the ai.suggest permission to view AI Insights.',
              false,
              '',
              null,
              <AIInsightsView
                onNavigate={handleNavigate}
                suggestions={aiSuggestions}
                validationRuns={validationRuns}
                reviewRuns={reviewRuns}
                issues={issues}
                generatingType={aiGeneratingType}
                error={aiInsightsError}
                onGenerateExplanation={handleGenerateExplanation}
                onGenerateRunSummary={handleGenerateRunSummary}
                onGeneratePrioritization={handleGeneratePrioritization}
                onGenerateCluster={handleGenerateCluster}
                onGenerateCorrections={handleGenerateCorrections}
              />
            )}

          {currentScreen === 'user-management' &&
            renderGated(
              hasPermission('users.read'),
              'You need the users.read permission to view users.',
              usersLoading,
              'Loading users…',
              usersError,
              <UserManagementView
                onNavigate={handleNavigate}
                users={platformUsers}
                roles={roles}
                canManageUsers={hasPermission('users.manage')}
                actionPendingId={userActionPendingId}
                actionError={userActionError}
                isCreating={isCreatingUser}
                createError={createUserError}
                createdCredential={createdUserCredential}
                onDismissCredential={() => setCreatedUserCredential(null)}
                onCreateUser={handleCreateUser}
                onEditUser={handleEditUser}
                onDeactivateUser={handleDeactivateUser}
                onResetPassword={handleResetPassword}
              />
            )}

          {currentScreen === 'settings' && currentUser && (
            <SettingsView
              onNavigate={handleNavigate}
              settings={appSettings}
              onUpdateSettings={handleUpdateSettings}
              currentUser={currentUser}
              canReadRoles={hasPermission('users.read')}
              rolesLoading={usersLoading}
              rolesError={usersError}
              currentUserRoleNames={platformUsers.find((u) => u.id === currentUser.id)?.roleNames ?? []}
              canUpdateProfile={hasPermission('users.manage')}
              isSavingProfile={userActionPendingId === currentUser.id}
              profileError={userActionError}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {currentScreen === 'not-found' && (
            <div className="p-10 max-w-xl mx-auto text-center space-y-4">
              <h2 className="text-lg font-semibold text-on-surface">Page not found</h2>
              <p className="text-sm text-on-surface-variant">
                The page you're looking for doesn't exist or may have moved.
              </p>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Create Rule Modal — real fields matching RuleCreateRequest exactly */}
      {showRuleCreatorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">rule</span>
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">Create Rule</h3>
                  <p className="text-xs text-outline">Deploys a new rule with its first version.</p>
                </div>
              </div>
              <button
                onClick={() => setShowRuleCreatorModal(false)}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              {newRuleFormError && (
                <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{newRuleFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Valid US Phone Number Format"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Rule Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['COMPLETENESS', 'UNIQUENESS', 'DUPLICATE', 'RANGE', 'PATTERN', 'CROSS_COLUMN'] as const).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewRuleType(type)}
                        className={`p-2 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                          newRuleType === type
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {type}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Category (optional)
                  </label>
                  <input
                    type="text"
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value)}
                    placeholder="e.g. formatting"
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Severity
                  </label>
                  <Select
                    value={newRuleSeverity}
                    onChange={setNewRuleSeverity}
                    options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
                    aria-label="Severity"
                    fullWidth
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={newRuleDescription}
                  onChange={(e) => setNewRuleDescription(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md p-3 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Definition (raw JSON — no fixed shape is enforced by the backend)
                </label>
                <textarea
                  rows={4}
                  value={newRuleDefinitionText}
                  onChange={(e) => setNewRuleDefinitionText(e.target.value)}
                  className="w-full font-mono bg-surface-container-low border border-outline-variant rounded-md p-3 text-xs text-tertiary focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Error Message Template (optional)
                </label>
                <input
                  type="text"
                  value={newRuleErrorMessage}
                  onChange={(e) => setNewRuleErrorMessage(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRuleCreatorModal(false)}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {isSavingRule ? 'Creating…' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guided "no applicable rules" choice — shown instead of immediately
          triggering validation when the selected dataset has zero enabled
          RuleAssignments, so the user is never surprised by a silent 0-rules
          "100% Passed" result. */}
      {showNoRulesConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-surface-container pb-4">
              <div className="w-10 h-10 rounded-md bg-secondary-fixed/40 text-on-secondary-fixed flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className="font-editorial text-lg font-bold text-on-surface">No rules assigned yet</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  "{selectedDataset?.name ?? selectedDatasetId}" has no enabled rules. Running validation
                  now would evaluate 0 rules — every row would trivially "pass" without anything actually
                  being checked.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowNoRulesConfirm(false);
                  if (selectedDatasetId) void handleDetectRules(selectedDatasetId);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md border border-outline-variant hover:bg-surface-container-low transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Analyze &amp; Suggest Rules</p>
                  <p className="text-[11px] text-outline">Run AI/pattern detection on this dataset's schema and data.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowNoRulesConfirm(false);
                  if (!selectedDatasetId) return;
                  setAssignmentDatasetId(selectedDatasetId);
                  try {
                    setAssignmentDatasetColumns(await listDatasetColumns(selectedDatasetId));
                  } catch {
                    setAssignmentDatasetColumns([]);
                  }
                  setShowAssignmentForm(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md border border-outline-variant hover:bg-surface-container-low transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-primary">playlist_add_check</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Assign Existing Rules</p>
                  <p className="text-[11px] text-outline">Attach an already-defined rule to this dataset.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNoRulesConfirm(false);
                  void executeRunValidation();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-md border border-outline-variant hover:bg-surface-container-low transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-outline">play_circle</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Run Anyway</p>
                  <p className="text-[11px] text-outline">Validate with 0 rules — the result will clearly show that.</p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNoRulesConfirm(false)}
                className="px-4 py-2 rounded-md text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Rule to Dataset Modal (rule_assignments.manage-gated) */}
      {showAssignmentForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <h3 className="font-editorial text-xl font-bold text-on-surface">Assign Rule to Dataset</h3>
              <button
                onClick={() => setShowAssignmentForm(false)}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRuleAssignment} className="space-y-4">
              {assignmentFormError && (
                <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{assignmentFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">Rule</label>
                <Select
                  value={assignmentRuleId}
                  onChange={setAssignmentRuleId}
                  options={rules.map((r) => ({ value: r.id, label: r.name }))}
                  placeholder="Select a rule…"
                  aria-label="Rule"
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Dataset
                </label>
                <Select
                  value={assignmentDatasetId}
                  onChange={async (v) => {
                    setAssignmentDatasetId(v);
                    setAssignmentColumnId('');
                    setAssignmentColumnIds([]);
                    if (v) {
                      try {
                        setAssignmentDatasetColumns(await listDatasetColumns(v));
                      } catch {
                        setAssignmentDatasetColumns([]);
                      }
                    }
                  }}
                  options={assignmentDatasetOptions.map((d) => ({ value: d.id, label: d.name }))}
                  placeholder="Select a dataset…"
                  aria-label="Dataset"
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SINGLE_COLUMN', 'DATASET_LEVEL', 'CROSS_COLUMN'] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => setAssignmentScope(scope)}
                      className={`p-2 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                        assignmentScope === scope
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {scope.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {assignmentScope === 'SINGLE_COLUMN' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Column
                  </label>
                  <Select
                    value={assignmentColumnId}
                    onChange={setAssignmentColumnId}
                    options={assignmentDatasetColumns.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="Select a column…"
                    aria-label="Column"
                    fullWidth
                  />
                </div>
              )}

              {assignmentScope === 'CROSS_COLUMN' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Columns (select at least 2)
                  </label>
                  {/* Intentionally left as a native multi-select: it depends on
                      real OS/browser multi-select behavior (ctrl/shift-click,
                      the `size` attribute rendering it as an open list box)
                      that the standardized single-select Select component
                      above doesn't attempt to replicate. */}
                  <select
                    multiple
                    value={assignmentColumnIds}
                    onChange={(e) =>
                      setAssignmentColumnIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                    size={Math.min(6, Math.max(3, assignmentDatasetColumns.length))}
                  >
                    {assignmentDatasetColumns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignmentForm(false)}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {isSavingAssignment ? 'Assigning…' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Rule Version Modal (rules.manage-gated) */}
      {showVersionForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <h3 className="font-editorial text-xl font-bold text-on-surface">Publish New Version</h3>
              <button
                onClick={() => setShowVersionForm(false)}
                className="p-1 text-outline hover:text-on-surface rounded transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRuleVersion} className="space-y-4">
              {versionFormError && (
                <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 px-3.5 py-2.5 text-xs text-error">
                  <span className="material-symbols-outlined text-base shrink-0">error</span>
                  <span>{versionFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Definition (raw JSON)
                </label>
                <textarea
                  rows={4}
                  value={versionDefinitionText}
                  onChange={(e) => setVersionDefinitionText(e.target.value)}
                  className="w-full font-mono bg-surface-container-low border border-outline-variant rounded-md p-3 text-xs text-tertiary focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Severity
                </label>
                <Select
                  value={versionSeverity}
                  onChange={setVersionSeverity}
                  options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => ({ value: s, label: s }))}
                  aria-label="Severity"
                  fullWidth
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Error Message Template (optional)
                </label>
                <input
                  type="text"
                  value={versionErrorMessage}
                  onChange={(e) => setVersionErrorMessage(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowVersionForm(false)}
                  className="px-4 py-2.5 rounded-md border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVersion}
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient disabled:opacity-50"
                >
                  {isSavingVersion ? 'Publishing…' : 'Publish Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Copilot Drawer */}
      {showAICopilot && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-outline-variant shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="p-4 border-b border-surface-container flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">smart_toy</span>
              </div>
              <div>
                <h3 className="font-editorial text-base font-bold text-on-surface">
                  DataCraft AI Copilot
                </h3>
                <p className="text-[10px] text-primary font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  AI-generated — informational only, not applied automatically
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAICopilot(false)}
              className="p-1 text-outline hover:text-on-surface rounded cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {!hasPermission('ai.chat') ? (
            <div className="flex-1 flex items-center justify-center p-6 bg-surface">
              <div className="text-center max-w-xs">
                <span className="material-symbols-outlined text-3xl text-outline">lock</span>
                <p className="mt-2 text-xs font-semibold text-on-surface">
                  AI Copilot unavailable
                </p>
                <p className="mt-1 text-[11px] text-outline leading-relaxed">
                  Your account doesn't have the "ai.chat" permission needed to use the AI Copilot. Ask an administrator to grant it if you need access.
                </p>
              </div>
            </div>
          ) : (
          <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface">
            {copilotMessages.length === 0 && !isCopilotSending && (
              <div className="h-full flex items-center justify-center text-center px-4">
                <p className="text-xs text-outline leading-relaxed">
                  Ask the AI Copilot about rules, datasets, or validation results. Responses are AI-generated suggestions — always verify before acting on them.
                </p>
              </div>
            )}
            {copilotMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-3.5 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-br-xs'
                      : 'bg-white border border-outline-variant text-on-surface shadow-xs rounded-bl-xs'
                  }`}
                >
                  {m.role !== 'user' && (
                    <p className="text-[9px] font-bold uppercase tracking-wide text-primary mb-1">
                      AI-generated
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[10px] text-outline mt-1 px-1">
                  {m.time}
                </span>
              </div>
            ))}
            {isCopilotSending && (
              <div className="flex flex-col items-start">
                <div className="p-3.5 rounded-lg max-w-[85%] text-xs leading-relaxed bg-white border border-outline-variant text-on-surface shadow-xs rounded-bl-xs">
                  <span className="inline-flex items-center gap-1 text-outline">
                    <span className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-outline animate-pulse [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {copilotError && (
            <div className="px-4 py-2 bg-error-container border-t border-outline-variant">
              <p className="text-[11px] text-on-error-container">{copilotError}</p>
            </div>
          )}

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-white border-t border-surface-container flex gap-1.5 overflow-x-auto">
            {['Check email errors', 'Suggest regex rule', 'Summarize anomalies'].map((q) => (
              <button
                key={q}
                onClick={() => setCopilotInput(q)}
                className="px-2.5 py-1 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded-full text-[10px] font-semibold text-on-surface whitespace-nowrap transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendCopilot} className="p-3 border-t border-outline-variant bg-white flex gap-2">
            <input
              type="text"
              value={copilotInput}
              onChange={(e) => setCopilotInput(e.target.value)}
              placeholder="Ask Copilot about rules, datasets..."
              disabled={isCopilotSending}
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isCopilotSending || !copilotInput.trim()}
              className="p-2 bg-primary hover:bg-primary-container text-white rounded-md transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </form>
          </>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role={toast.variant === 'error' ? 'alert' : 'status'}
          aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${TOAST_STYLES[toast.variant]}`}
        >
          <span className="material-symbols-outlined text-base shrink-0">{TOAST_ICON[toast.variant]}</span>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action!.onClick();
                setToast(null);
              }}
              className="ml-1 shrink-0 underline underline-offset-2 hover:no-underline cursor-pointer font-bold"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
