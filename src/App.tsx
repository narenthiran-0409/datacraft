import React, { useEffect, useState } from 'react';
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
} from './types';
import {
  bootstrapSession,
  logout as apiLogout,
  mapMeResponseToUser,
  onSessionExpired,
  ApiError,
  listDataSources,
  listConnections,
  listConnectionTypes,
  ConnectionResponse,
  ConnectionTypeResponse,
  listSchemas as apiListSchemas,
  SchemaResponse,
  listDatasets,
  getDataset,
  listDatasetColumns,
  DatasetResponse,
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
  // Rules
  listRules,
  createRule as apiCreateRule,
  updateRule as apiUpdateRule,
  listRuleVersions,
  createRuleVersion as apiCreateRuleVersion,
  listRuleAssignments,
  createRuleAssignment as apiCreateRuleAssignment,
  deleteRuleAssignment as apiDeleteRuleAssignment,
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
  // Jobs
  cancelJob as apiCancelJob,
  // Review
  createReview,
  listReviews,
  getReview,
  listReviewIssues,
  listReviewSuggestions,
  generateReviewSuggestions as apiGenerateReviewSuggestions,
  bulkReviewAction as apiBulkReviewAction,
  acceptSuggestion as apiAcceptSuggestion,
  editSuggestion as apiEditSuggestion,
  rejectSuggestion as apiRejectSuggestion,
  correctIssue as apiCorrectIssue,
  ReviewRunResponse,
  IssueResponse,
  CorrectionSuggestionResponse,
  // Approval
  listApprovals,
  submitApproval as apiSubmitApproval,
  approveApproval as apiApproveApproval,
  rejectApproval as apiRejectApproval,
  ApprovalRequestResponse,
  // Staging
  createStagingRun as apiCreateStagingRun,
  listStagingRecords,
  StagingRunResponse,
  StagingRecordResponse,
  // Publishing
  triggerPublish as apiTriggerPublish,
  acknowledgeDrift as apiAcknowledgeDrift,
  getPublishRun,
  PublishRunResponse,
} from './api/client';
import { usePermissions } from './hooks/usePermissions';
import { INITIAL_APP_SETTINGS, INITIAL_AI_SUGGESTIONS } from './data/mockData';
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
import { DataLineageView } from './components/views/DataLineageView';
import { RunHistoryView } from './components/views/RunHistoryView';
import { ReportsView } from './components/views/ReportsView';
import { AIInsightsView } from './components/views/AIInsightsView';
import { UserManagementView } from './components/views/UserManagementView';
import { SettingsView } from './components/views/SettingsView';

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
    qualityScore: vr.quality_score,
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
  resolvedIssues: number
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
  };
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
  const [currentScreen, setCurrentScreen] = useState<NavScreen>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      setCurrentScreen('login');
      triggerToast('Your session expired. Please sign in again.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Permission checks for the real-data screens below — codes match each backend
  // route's own require_permission(), confirmed by grepping every routes.py directly.
  const { hasPermission } = usePermissions(currentUser);

  // App State
  const [aiSuggestions] = useState<AISuggestionItem[]>(INITIAL_AI_SUGGESTIONS);
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

  // --- Real-data screens (this batch) -----------------------------------------

  // Data Sources
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataSourcesLoading, setDataSourcesLoading] = useState(false);
  const [dataSourcesError, setDataSourcesError] = useState<string | null>(null);

  // Data Explorer — separate from the mock schemas/explorerDatasets/explorerColumns
  // above (those stay mock for Validation Workspace's sake).
  const [deSchemas, setDeSchemas] = useState<SchemaNode[]>([]);
  const [deDatasets, setDeDatasets] = useState<ExplorerDataset[]>([]);
  const [deColumns, setDeColumns] = useState<ExplorerColumn[]>([]);
  const [dataExplorerLoading, setDataExplorerLoading] = useState(false);
  const [dataExplorerError, setDataExplorerError] = useState<string | null>(null);

  // Dataset Overview — selection comes from Data Explorer's "Open Dataset" action.
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<DatasetResponse | null>(null);
  const [selectedDatasetColumns, setSelectedDatasetColumns] = useState<ColumnResponse[]>([]);
  const [datasetOverviewLoading, setDatasetOverviewLoading] = useState(false);
  const [datasetOverviewError, setDatasetOverviewError] = useState<string | null>(null);

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
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Validation Workspace — uses selectedDatasetId (shared with Data Explorer/Lineage).
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationActionError, setValidationActionError] = useState<string | null>(null);
  const [isTriggeringValidation, setIsTriggeringValidation] = useState(false);

  // Validation Run Details
  const [selectedValidationRunId, setSelectedValidationRunId] = useState<string | null>(null);
  const [selectedValidationRun, setSelectedValidationRun] = useState<ValidationRun | null>(null);
  const [validationDetailLoading, setValidationDetailLoading] = useState(false);
  const [validationDetailError, setValidationDetailError] = useState<string | null>(null);
  const [validationDetailActionError, setValidationDetailActionError] = useState<string | null>(null);
  const [isCancellingValidationJob, setIsCancellingValidationJob] = useState(false);
  const [isStartingReview, setIsStartingReview] = useState(false);

  // Review & Corrections
  const [reviewRuns, setReviewRuns] = useState<ReviewRun[]>([]);
  const [reviewRunsLoading, setReviewRunsLoading] = useState(false);
  const [reviewRunsError, setReviewRunsError] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [reviewActionPendingIds, setReviewActionPendingIds] = useState<string[]>([]);

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
  const [stagingLoading, setStagingLoading] = useState(false);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [stagingActionError, setStagingActionError] = useState<string | null>(null);
  const [isStagingActionPending, setIsStagingActionPending] = useState(false);

  // Modals & Drawers
  const [showRuleCreatorModal, setShowRuleCreatorModal] = useState<boolean>(false);
  const [showAICopilot, setShowAICopilot] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Copilot State
  const [copilotInput, setCopilotInput] = useState<string>('');
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; text: string; time: string }>
  >([
    {
      id: 'm1',
      role: 'assistant',
      text: 'Hello Alex. I am your DataCraft intelligence assistant. I can inspect your schemas, generate SQL quality constraints, or explain anomaly patterns in Customer Data.',
      time: 'Just now',
    },
  ]);

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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
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
  // permission-gated so a user missing only one still sees what they can).
  useEffect(() => {
    if (currentScreen !== 'data-sources') return;
    if (!hasPermission('data_sources.read')) return;

    let cancelled = false;
    setDataSourcesLoading(true);
    setDataSourcesError(null);
    const canReadConnections = hasPermission('connections.read');

    Promise.all([
      listDataSources(),
      canReadConnections ? listConnections() : Promise.resolve<ConnectionResponse[]>([]),
      canReadConnections ? listConnectionTypes() : Promise.resolve<ConnectionTypeResponse[]>([]),
    ])
      .then(([sources, connections, connectionTypes]) => {
        if (cancelled) return;
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
            // so this doesn't try to distinguish "syncing" from "connected".
            status: s.is_active ? 'connected' : 'failed',
            description: s.description || s.business_domain || 'No description provided.',
            datasetsCount: 0, // no per-source dataset count endpoint in this screen's scope
            lastSync: formatDateTime(s.updated_at ?? s.created_at),
            icon: type === 'database' ? 'database' : type === 'api' ? 'cloud' : 'description',
            host: primary ? `${primary.host}:${primary.port}` : undefined,
          };
        });
        setDataSources(mapped);
      })
      .catch((err) => {
        if (!cancelled) setDataSourcesError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDataSourcesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

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

      setDeSchemas(
        allSchemas.map((s) => ({ id: s.id, name: s.name, datasetCount: datasetCountBySchema.get(s.id) ?? 0 }))
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
  }, [currentScreen]);

  // Dataset Overview: GET dataset by id + its columns, for whichever dataset was
  // selected (from Data Explorer's "Open Dataset" action).
  useEffect(() => {
    if (currentScreen !== 'dataset-overview') return;
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
  }, [currentScreen, selectedDatasetId]);

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
  }, [currentScreen]);

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
  }, [currentScreen, selectedDatasetId]);

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
  }, [currentScreen]);

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
  }, [currentScreen]);

  // --- Core decision workflow fetches (this batch) ----------------------------------

  // Data Quality Rules: list rules + assignments, then each rule's versions (needed to
  // find the current version id for creating new assignments).
  useEffect(() => {
    if (currentScreen !== 'quality-rules') return;
    if (!hasPermission('rules.read')) return;

    let cancelled = false;
    setRulesLoading(true);
    setRulesError(null);

    (async () => {
      const [rulesList, assignments] = await Promise.all([listRules(), listRuleAssignments()]);
      if (cancelled) return;
      setRules(rulesList);
      setRuleAssignments(assignments);

      const versionLists = await Promise.all(
        rulesList.map((r) => listRuleVersions(r.id).catch(() => [] as RuleVersionResponse[]))
      );
      if (cancelled) return;
      const map: Record<string, RuleVersionResponse[]> = {};
      rulesList.forEach((r, idx) => {
        map[r.id] = versionLists[idx];
      });
      setRuleVersionsByRuleId(map);
    })()
      .catch((err) => {
        if (!cancelled) setRulesError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen]);

  // Validation Workspace: list validation runs for the selected dataset.
  useEffect(() => {
    if (currentScreen !== 'validation-workspace') return;
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
  }, [currentScreen, selectedDatasetId]);

  // Validation Run Details: real aggregate counts for the selected run.
  useEffect(() => {
    if (currentScreen !== 'validation-run-details') return;
    if (!selectedValidationRunId) return;
    if (!hasPermission('metadata.read')) return;

    let cancelled = false;
    setValidationDetailLoading(true);
    setValidationDetailError(null);
    setValidationDetailActionError(null);

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
      })
      .catch((err) => {
        if (!cancelled) setValidationDetailError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setValidationDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, selectedValidationRunId]);

  // Review & Corrections: list reviews, then (N+1, dev-scale only — no bulk endpoint
  // exists for any of this) each review's validation run (for its dataset name),
  // issues, and suggestions, merged into one flat Issue[] exactly like the mock data
  // shape did, so the view's own per-run progress computation needs no changes.
  useEffect(() => {
    if (currentScreen !== 'review-corrections') return;
    if (!hasPermission('review.read')) return;

    let cancelled = false;
    setReviewRunsLoading(true);
    setReviewRunsError(null);

    (async () => {
      const [reviewsList, datasetsResp] = await Promise.all([listReviews(), listDatasets({ page_size: 200 })]);
      const datasetNameById = new Map(datasetsResp.items.map((d) => [d.id, d.name]));

      const details = await Promise.all(
        reviewsList.map(async (rr) => {
          const [vr, issuesList, suggestionsList] = await Promise.all([
            getValidationRun(rr.validation_run_id).catch(() => null),
            listReviewIssues(rr.id).catch(() => [] as IssueResponse[]),
            listReviewSuggestions(rr.id).catch(() => [] as CorrectionSuggestionResponse[]),
          ]);
          const datasetName = vr ? datasetNameById.get(vr.dataset_id) ?? vr.dataset_id : rr.validation_run_id;
          return { rr, datasetName, issuesList, suggestionsList };
        })
      );

      if (cancelled) return;

      const mappedRuns: ReviewRun[] = [];
      const mappedIssues: Issue[] = [];
      details.forEach(({ rr, datasetName, issuesList, suggestionsList }) => {
        const suggestionsByIssueId = new Map<string, CorrectionSuggestionResponse[]>();
        suggestionsList.forEach((s) => {
          suggestionsByIssueId.set(s.issue_id, [...(suggestionsByIssueId.get(s.issue_id) ?? []), s]);
        });

        const mapped: Issue[] = issuesList.map((issue) => {
          const candidates = suggestionsByIssueId.get(issue.id) ?? [];
          const suggestion = candidates.find((s) => s.is_selected) ?? candidates[0];
          return {
            id: issue.id,
            reviewRunId: issue.review_run_id,
            recordRef: issue.record_ref,
            // No name-resolution endpoint for column_id from this domain — shown as a
            // truncated id rather than fabricating a name.
            columnName: issue.column_id ? issue.column_id.slice(0, 8) : '—',
            severity: (issue.severity as Issue['severity']) || 'MEDIUM',
            originalValue: issue.original_value ?? '',
            suggestedValue: suggestion?.suggested_value ?? null,
            suggestionSource: suggestion ? ((suggestion.source as Issue['suggestionSource']) ?? null) : null,
            confidence: suggestion?.confidence ?? null,
            status: (issue.status as Issue['status']) || 'PENDING',
            finalValue: null,
            // No row-level failure-detail / rule-join endpoint exists to know which
            // rule triggered a given issue — shown as unavailable rather than guessed.
            ruleTriggered: '—',
            suggestionId: suggestion?.id ?? null,
          };
        });
        mappedIssues.push(...mapped);

        const resolvedCount = mapped.filter((i) => i.status !== 'PENDING').length;
        mappedRuns.push(mapReviewRun(rr, datasetName, mapped.length, resolvedCount));
      });

      setReviewRuns(mappedRuns);
      setIssues(mappedIssues);
      setSelectedReviewId((prev) => prev ?? mappedRuns[0]?.id ?? null);
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
  }, [currentScreen]);

  // Approval Center: list approvals, then resolve each one's review name, dataset name,
  // and requester display name (all real, via chained real endpoints).
  useEffect(() => {
    if (currentScreen !== 'approval-center') return;
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
  }, [currentScreen]);

  // Staging & Publish: there is no list/lookup-by-review endpoint for staging or
  // publish runs (only get-by-id, and only once you already know the id) — so an
  // existing staging run from an earlier session cannot be rediscovered here. State
  // resets when the selected review changes and is populated only by this session's
  // own create/publish actions, which is an honest reflection of that real gap.
  useEffect(() => {
    setCurrentStagingRun(null);
    setCurrentPublishRun(null);
    setStagingRecords([]);
    setStagingError(null);
    setStagingActionError(null);
  }, [selectedReviewId]);

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

  const handleNavigate = (screen: NavScreen) => {
    setCurrentScreen(screen);
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggles a rule between ACTIVE/DISABLED via the real PATCH endpoint (rules.manage).
  // DISABLED (not "INACTIVE") is what the DB's ck_rules_status check constraint
  // actually accepts (verified directly against migration 0009 — status is
  // ACTIVE | DISABLED | PENDING_REVIEW, plain str with no Pydantic enum, so an
  // invalid value only surfaces as a raw 500 from the DB constraint, not a 422).
  // Waits for the real response before updating local state — no optimistic flip.
  const handleToggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const nextStatus = target.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const updated = await apiUpdateRule(id, { status: nextStatus });
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
      triggerToast(nextStatus === 'ACTIVE' ? `Rule "${updated.name}" activated` : `Rule "${updated.name}" paused`);
    } catch (err) {
      setRulesActionError(extractErrorMessage(err));
    }
  };

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

  const handleSyncSource = (id: string) => {
    const target = dataSources.find((s) => s.id === id);
    setDataSources((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: 'connected', lastSync: 'Just now' } : s
      )
    );
    triggerToast(`Synced "${target?.name}" successfully`);
  };

  // database category: the data source + connection were already created for real
  // inside AddDataSourceView, so there's nothing to add locally — just navigate back;
  // the Data Sources screen's own fetch-on-navigate effect (Phase 1) picks it up.
  // api/file categories have no real backend support, so they keep the old
  // mock-only local append.
  const handleCompleteAddSource = (input?: NewDataSourceInput) => {
    if (!input) {
      setCurrentScreen('data-sources');
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
    };

    setDataSources((prev) => [newSource, ...prev]);
    setCurrentScreen('data-sources');
    triggerToast(`Data source "${newSource.name}" successfully registered`);
  };

  const handleSendCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;

    const userText = copilotInput.trim();
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user' as const,
      text: userText,
      time: 'Just now',
    };

    setCopilotMessages((prev) => [...prev, userMsg]);
    setCopilotInput('');

    setTimeout(() => {
      let reply = `I've analyzed the schema for your query: "${userText}". All active constraints in 'Customer Data' are validating at 98.4% completeness. Would you like me to draft an automated remediation rule?`;
      if (userText.toLowerCase().includes('email')) {
        reply = `Email constraint check: Found 14 malformed records in 'users_master' partition with double '@' or missing TLDs. Suggested fix: Standardize via regex rule 'Valid Email Format'.`;
      } else if (userText.toLowerCase().includes('sql') || userText.toLowerCase().includes('rule')) {
        reply = `Here is a recommended SQL assertion for your pipeline:\n\nSELECT COUNT(*) FROM users_master WHERE email NOT LIKE '%@%.%' HAVING COUNT(*) = 0;`;
      }

      setCopilotMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: reply,
          time: 'Just now',
        },
      ]);
    }, 600);
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

  // Generates rule-based/AI suggestions for whichever of this review's issues don't
  // have one yet, then refetches that review's issues+suggestions to pick them up
  // (no per-issue response is returned, so a refetch is the only way to see them).
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const handleGenerateSuggestions = async (reviewRunId: string) => {
    setIsGeneratingSuggestions(true);
    setReviewActionError(null);
    try {
      const result = await apiGenerateReviewSuggestions(reviewRunId);
      const [issuesList, suggestionsList] = await Promise.all([
        listReviewIssues(reviewRunId),
        listReviewSuggestions(reviewRunId),
      ]);
      const suggestionsByIssueId = new Map<string, CorrectionSuggestionResponse[]>();
      suggestionsList.forEach((s) => {
        suggestionsByIssueId.set(s.issue_id, [...(suggestionsByIssueId.get(s.issue_id) ?? []), s]);
      });
      const refreshed: Issue[] = issuesList.map((issue) => {
        const candidates = suggestionsByIssueId.get(issue.id) ?? [];
        const suggestion = candidates.find((s) => s.is_selected) ?? candidates[0];
        return {
          id: issue.id,
          reviewRunId: issue.review_run_id,
          recordRef: issue.record_ref,
          columnName: issue.column_id ? issue.column_id.slice(0, 8) : '—',
          severity: (issue.severity as Issue['severity']) || 'MEDIUM',
          originalValue: issue.original_value ?? '',
          suggestedValue: suggestion?.suggested_value ?? null,
          suggestionSource: suggestion ? ((suggestion.source as Issue['suggestionSource']) ?? null) : null,
          confidence: suggestion?.confidence ?? null,
          status: (issue.status as Issue['status']) || 'PENDING',
          finalValue: null,
          ruleTriggered: '—',
          suggestionId: suggestion?.id ?? null,
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
      triggerToast(comment ? `"${target?.reviewRunName}" approved — "${comment}"` : `"${target?.reviewRunName}" approved`);
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
  const handleRunValidation = async () => {
    if (!selectedDatasetId) return;
    setIsTriggeringValidation(true);
    setValidationActionError(null);
    try {
      const created = await createValidationRun(selectedDatasetId, {});
      const datasetName = selectedDataset?.name ?? selectedDatasetId;
      setValidationRuns((prev) => [mapValidationRun(created, datasetName), ...prev]);
      triggerToast(`Validation run queued for "${datasetName}"`);
    } catch (err) {
      setValidationActionError(extractErrorMessage(err));
    } finally {
      setIsTriggeringValidation(false);
    }
  };

  const handleSelectValidationRun = (runId: string) => {
    setSelectedValidationRunId(runId);
    handleNavigate('validation-run-details');
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
      const created = await createReview({ validation_run_id: selectedValidationRun.id });
      setSelectedReviewId(created.id);
      handleNavigate('review-corrections');
      triggerToast('Review started');
    } catch (err) {
      setValidationDetailActionError(extractErrorMessage(err));
    } finally {
      setIsStartingReview(false);
    }
  };

  // Staging & Publish Actions
  const handleCreateStagingRun = async () => {
    if (!selectedReviewId) return;
    setIsStagingActionPending(true);
    setStagingActionError(null);
    try {
      const created = await apiCreateStagingRun(selectedReviewId);
      setCurrentStagingRun(created);
      setCurrentPublishRun(null);
      triggerToast('Staging run created');
    } catch (err) {
      setStagingActionError(extractErrorMessage(err));
    } finally {
      setIsStagingActionPending(false);
    }
  };

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

  // Not logged in (or explicitly signed out): show LoginView
  if (!currentUser || currentScreen === 'login') {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentScreen('dashboard');
          triggerToast(`Welcome back, ${user.name}`);
        }}
      />
    );
  }

  if (currentScreen === 'add-data-source') {
    return (
      <AddDataSourceView
        onBack={() => setCurrentScreen('data-sources')}
        onComplete={handleCompleteAddSource}
      />
    );
  }

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
          onSwitchUser={(u) => {
            setCurrentUser(u);
            triggerToast(`Switched user profile to ${u.name}`);
          }}
          onLogout={() => {
            apiLogout().finally(() => {
              setCurrentUser(null);
              setCurrentScreen('login');
            });
          }}
          currentScreen={currentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          onOpenAIAssistant={() => setShowAICopilot(true)}
        />

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto bg-surface">
          {currentScreen === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              onNavigate={handleNavigate}
              onOpenNewDataset={() => handleNavigate('add-data-source')}
              onOpenDataset={(datasetId) => {
                setSelectedDatasetId(datasetId);
                handleNavigate('dataset-overview');
              }}
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
                onNavigate={handleNavigate}
                onOpenAddSource={() => handleNavigate('add-data-source')}
                onSyncSource={handleSyncSource}
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
                  />
                )
              )
            ))}

          {currentScreen === 'dataset-preview' && (
            <DatasetPreviewView onNavigate={handleNavigate} />
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
                onOpenDataset={(datasetId) => {
                  setSelectedDatasetId(datasetId);
                  handleNavigate('dataset-overview');
                }}
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
            (!selectedDatasetId ? (
              <ScreenPrompt message="Select a dataset from Data Explorer to run or view its validations." />
            ) : (
              renderGated(
                hasPermission('metadata.read'),
                'You need the metadata.read permission to view validation runs.',
                validationLoading,
                'Loading validation runs…',
                validationError,
                <ValidationWorkspaceView
                  onNavigate={handleNavigate}
                  datasetName={selectedDataset?.name ?? selectedDatasetId}
                  validationRuns={validationRuns}
                  onRunValidation={handleRunValidation}
                  onSelectRun={handleSelectValidationRun}
                  canTriggerValidation={hasPermission('validation.run')}
                  isTriggering={isTriggeringValidation}
                  actionError={validationActionError}
                />
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
              />
            )}

          {currentScreen === 'quality-rules' &&
            renderGated(
              hasPermission('rules.read'),
              'You need the rules.read permission to view quality rules.',
              rulesLoading,
              'Loading rules…',
              rulesError,
              <QualityRulesView
                onNavigate={handleNavigate}
                onOpenRuleCreator={() => setShowRuleCreatorModal(true)}
                rules={rules}
                ruleAssignments={ruleAssignments}
                ruleVersionIdsByRuleId={Object.fromEntries(
                  Object.entries(ruleVersionsByRuleId).map(([ruleId, versions]) => [ruleId, versions.map((v) => v.id)])
                )}
                canManageRules={hasPermission('rules.manage')}
                canManageAssignments={hasPermission('rule_assignments.manage')}
                onToggleRule={handleToggleRule}
                onDisableAssignment={handleDisableAssignment}
                onOpenAssignmentForm={(ruleId) => {
                  setAssignmentRuleId(ruleId);
                  setShowAssignmentForm(true);
                }}
                onOpenVersionForm={(ruleId) => {
                  setVersionRuleId(ruleId);
                  setShowVersionForm(true);
                }}
                actionError={rulesActionError}
              />
            )}

          {currentScreen === 'review-corrections' &&
            renderGated(
              hasPermission('review.read'),
              'You need the review.read permission to view reviews.',
              reviewRunsLoading,
              'Loading reviews…',
              reviewRunsError,
              <ReviewCorrectionsView
                onNavigate={handleNavigate}
                reviewRuns={reviewRuns}
                selectedReviewId={selectedReviewId}
                onSelectReview={setSelectedReviewId}
                issues={issues}
                canEdit={hasPermission('review.edit')}
                actionError={reviewActionError}
                pendingIssueIds={reviewActionPendingIds}
                onGenerateSuggestions={handleGenerateSuggestions}
                isGeneratingSuggestions={isGeneratingSuggestions}
                onAcceptIssue={handleAcceptIssue}
                onEditIssue={handleEditIssue}
                onRejectIssue={handleRejectIssue}
                onSkipIssue={handleSkipIssue}
                onBulkAccept={handleBulkAccept}
                onBulkReject={handleBulkReject}
                onSubmitForApproval={handleSubmitForApproval}
              />
            )}

          {currentScreen === 'approval-center' &&
            renderGated(
              hasPermission('approval.read'),
              'You need the approval.read permission to view the approval center.',
              approvalsLoading,
              'Loading approval requests…',
              approvalsError,
              <ApprovalCenterView
                onNavigate={handleNavigate}
                approvalQueue={approvalQueue}
                canDecide={hasPermission('approval.decide')}
                pendingId={approvalActionPendingId}
                actionError={approvalActionError}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                onSelect={(id) => {
                  const item = approvalQueue.find((a) => a.id === id);
                  if (item?.reviewRunId) setSelectedReviewId(item.reviewRunId);
                }}
              />
            )}

          {currentScreen === 'staging-publish' &&
            (!selectedReviewId ? (
              <ScreenPrompt message="Select a review from Review & Corrections or Approval Center to stage and publish it." />
            ) : (
              renderGated(
                hasPermission('staging.read'),
                'You need the staging.read permission to view staging & publish.',
                stagingLoading,
                'Loading staging run…',
                stagingError,
                <StagingPublishView
                  onNavigate={handleNavigate}
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
                />
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

          {currentScreen === 'insights' && (
            <AIInsightsView onNavigate={handleNavigate} suggestions={aiSuggestions} />
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
                  <select
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
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
                <select
                  value={assignmentRuleId}
                  onChange={(e) => setAssignmentRuleId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                >
                  <option value="">Select a rule…</option>
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Dataset
                </label>
                <select
                  value={assignmentDatasetId}
                  onChange={async (e) => {
                    setAssignmentDatasetId(e.target.value);
                    setAssignmentColumnId('');
                    setAssignmentColumnIds([]);
                    if (e.target.value) {
                      try {
                        setAssignmentDatasetColumns(await listDatasetColumns(e.target.value));
                      } catch {
                        setAssignmentDatasetColumns([]);
                      }
                    }
                  }}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                >
                  <option value="">Select a dataset…</option>
                  {assignmentDatasetOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
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
                  <select
                    value={assignmentColumnId}
                    onChange={(e) => setAssignmentColumnId(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                  >
                    <option value="">Select a column…</option>
                    {assignmentDatasetColumns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {assignmentScope === 'CROSS_COLUMN' && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Columns (select at least 2)
                  </label>
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
                <select
                  value={versionSeverity}
                  onChange={(e) => setVersionSeverity(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface focus:outline-none focus:bg-white focus:border-primary"
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
                  Active Context: Customer Data
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

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-surface">
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
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[10px] text-outline mt-1 px-1">
                  {m.time}
                </span>
              </div>
            ))}
          </div>

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
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
            />
            <button
              type="submit"
              className="p-2 bg-primary hover:bg-primary-container text-white rounded-md transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-lg shadow-xl border border-primary-container text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-base text-on-primary-container">
            info
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
