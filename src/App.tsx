import React, { useEffect, useState } from 'react';
import {
  NavScreen,
  User,
  DataSource,
  QualityRule,
  ReviewRun,
  Issue,
  ApprovalRequestItem,
  SchemaNode,
  ExplorerDataset,
  ExplorerColumn,
  ValidationRun,
  StagingRun,
  PublishRun,
  LineageNode,
  LineageEdge,
  RunHistoryItem,
  QualityTrendPoint,
  RuleEffectivenessRow,
  QualityByDatasetRow,
  ReviewPerformanceSummary,
  ApprovalMetricsSummary,
  AISuggestionItem,
  PlatformRole,
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
} from './api/client';
import { usePermissions } from './hooks/usePermissions';
import {
  TEAM_MEMBERS,
  INITIAL_APP_SETTINGS,
  INITIAL_QUALITY_RULES,
  INITIAL_REVIEW_RUNS,
  INITIAL_ISSUES,
  INITIAL_APPROVAL_QUEUE,
  INITIAL_SCHEMAS,
  INITIAL_EXPLORER_DATASETS,
  INITIAL_EXPLORER_COLUMNS,
  INITIAL_VALIDATION_RUNS,
  INITIAL_STAGING_RUNS,
  INITIAL_PUBLISH_RUNS,
  INITIAL_AI_SUGGESTIONS,
} from './data/mockData';
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
  return err instanceof ApiError ? err.message : 'Something went wrong loading this screen.';
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
  const [qualityRules, setQualityRules] = useState<QualityRule[]>(INITIAL_QUALITY_RULES);
  const [reviewRuns, setReviewRuns] = useState<ReviewRun[]>(INITIAL_REVIEW_RUNS);
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequestItem[]>(INITIAL_APPROVAL_QUEUE);
  // schemas/explorerDatasets/explorerColumns stay mock-backed: handleRunValidation
  // (Validation Workspace, out of scope for this task) still reads explorerDatasets.
  const [schemas] = useState<SchemaNode[]>(INITIAL_SCHEMAS);
  const [explorerDatasets] = useState<ExplorerDataset[]>(INITIAL_EXPLORER_DATASETS);
  const [explorerColumns] = useState<ExplorerColumn[]>(INITIAL_EXPLORER_COLUMNS);
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>(INITIAL_VALIDATION_RUNS);
  const [selectedValidationRunId, setSelectedValidationRunId] = useState<string | null>(null);
  const [stagingRuns] = useState<StagingRun[]>(INITIAL_STAGING_RUNS);
  const [publishRuns, setPublishRuns] = useState<PublishRun[]>(INITIAL_PUBLISH_RUNS);
  const [aiSuggestions] = useState<AISuggestionItem[]>(INITIAL_AI_SUGGESTIONS);
  const [platformUsers, setPlatformUsers] = useState<User[]>(TEAM_MEMBERS);
  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_APP_SETTINGS);

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

  // Run History — validation-runs + profile-runs only. staging-runs, publish-runs, and
  // jobs have no list-all endpoint anywhere in this backend (only get-by-id), so they
  // cannot be included without inventing an endpoint that doesn't exist.
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>([]);
  const [runHistoryLoading, setRunHistoryLoading] = useState(false);
  const [runHistoryError, setRunHistoryError] = useState<string | null>(null);

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

  // Add Rule Form
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'formatting' | 'uniqueness' | 'completeness' | 'consistency'>('formatting');
  const [newRulePrompt, setNewRulePrompt] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

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

    getLineage('dataset', selectedDatasetId, 'both')
      .then((graph) => {
        if (cancelled) return;
        setLineageNodes(
          graph.nodes.map((n) => ({
            id: `${n.entity_type}:${n.entity_id}`,
            entityType: n.entity_type,
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
  useEffect(() => {
    if (currentScreen !== 'reports') return;
    if (!hasPermission('reports.read')) return;

    let cancelled = false;
    setReportsLoading(true);
    setReportsError(null);

    const to = new Date();
    const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const range = { from: from.toISOString(), to: to.toISOString() };

    Promise.all([
      getQualityTrendReport(range),
      getRuleEffectivenessReport(range),
      getQualityByDatasetReport(),
      getReviewPerformanceReport(range),
      getApprovalMetricsReport(range),
      listUsers().catch(() => [] as UserResponse[]),
    ])
      .then(([trend, ruleEff, byDataset, reviewPerf, approval, users]) => {
        if (cancelled) return;
        const userDisplayNameById = new Map(users.map((u) => [u.id, u.full_name || u.username || u.email]));

        setQualityTrend(
          trend.points.map((p) => ({
            date: formatDate(p.created_at),
            datasetName: null,
            qualityScore: p.quality_score,
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
            rejectRate: r.failure_rate ?? 0,
          }))
        );

        setQualityByDataset(
          byDataset.datasets.map((d) => ({
            datasetName: d.dataset_name,
            // quality-by-dataset has no data-source reference — left blank rather
            // than fabricated.
            dataSourceName: '',
            latestQualityScore: d.latest_quality_score,
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
          approvalRate: approval.approval_rate ?? 0,
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

  const handleNavigate = (screen: NavScreen) => {
    setCurrentScreen(screen);
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleRule = (id: string) => {
    setQualityRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' }
          : r
      )
    );
    const target = qualityRules.find((r) => r.id === id);
    triggerToast(
      target?.status === 'active'
        ? `Rule "${target.name}" paused`
        : `Rule "${target?.name}" activated`
    );
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

  const handleCompleteAddSource = (input: NewDataSourceInput) => {
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

  const handleGenerateRuleSQL = () => {
    if (!newRulePrompt.trim()) return;
    setGeneratedSQL(
      `-- AI Generated constraint for "${newRulePrompt}"\nREGEX_MATCH(column_val, r'^[A-Za-z0-9_-]{3,20}$') AND column_val IS NOT NULL`
    );
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: QualityRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      category: newRuleCategory,
      description: newRulePrompt || 'Custom validation constraint generated via AI assistant.',
      status: 'active',
      appliedDatasetsCount: 1,
      icon: 'rule',
      ruleCode: generatedSQL || `VALUE IS NOT NULL`,
      confidenceThreshold: 99,
    };

    setQualityRules([newRule, ...qualityRules]);
    setNewRuleName('');
    setNewRulePrompt('');
    setGeneratedSQL('');
    setShowRuleCreatorModal(false);
    triggerToast(`Rule "${newRule.name}" created and deployed`);
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

  // Review & Corrections Actions
  const handleAcceptIssue = (issueId: string) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId && i.status === 'PENDING'
          ? { ...i, status: 'RESOLVED', finalValue: i.suggestedValue ?? i.originalValue }
          : i
      )
    );
    triggerToast('Suggestion accepted');
  };

  const handleEditIssue = (issueId: string, finalValue: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: 'RESOLVED', finalValue } : i))
    );
    triggerToast('Correction updated with custom value');
  };

  const handleRejectIssue = (issueId: string) => {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status: 'RESOLVED', finalValue: i.originalValue } : i
      )
    );
    triggerToast('Suggestion rejected — original value kept');
  };

  const handleSkipIssue = (issueId: string) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: 'SKIPPED' } : i))
    );
    triggerToast('Issue skipped');
  };

  const handleBulkAccept = (issueIds: string[]) => {
    if (issueIds.length === 0) return;
    setIssues((prev) =>
      prev.map((i) =>
        issueIds.includes(i.id) && i.status === 'PENDING'
          ? { ...i, status: 'RESOLVED', finalValue: i.suggestedValue ?? i.originalValue }
          : i
      )
    );
    triggerToast(`${issueIds.length} issue${issueIds.length > 1 ? 's' : ''} accepted`);
  };

  const handleBulkReject = (issueIds: string[]) => {
    if (issueIds.length === 0) return;
    setIssues((prev) =>
      prev.map((i) =>
        issueIds.includes(i.id) && i.status === 'PENDING'
          ? { ...i, status: 'RESOLVED', finalValue: i.originalValue }
          : i
      )
    );
    triggerToast(`${issueIds.length} issue${issueIds.length > 1 ? 's' : ''} rejected`);
  };

  const handleSubmitForApproval = (reviewRunId: string) => {
    const run = reviewRuns.find((r) => r.id === reviewRunId);
    if (!run) return;

    const runIssues = issues.filter((i) => i.reviewRunId === reviewRunId);
    const stillPending = runIssues.some((i) => i.status === 'PENDING');
    if (stillPending) return;

    const resolvedCount = runIssues.filter((i) => i.status === 'RESOLVED').length;

    setReviewRuns((prev) =>
      prev.map((r) =>
        r.id === reviewRunId
          ? { ...r, status: 'READY_FOR_APPROVAL', resolvedIssues: resolvedCount }
          : r
      )
    );

    setApprovalQueue((prev) => [
      {
        id: `aq-${Date.now()}`,
        reviewRunName: run.validationRunLabel,
        datasetName: run.datasetName,
        status: 'PENDING',
        affectedIssueCount: runIssues.length,
        affectedRecordCount: runIssues.length,
        requestedBy: currentUser?.name ?? 'Unknown',
        requestedAt: 'Just now',
        decidedCount: 0,
        remainingCount: runIssues.length,
      },
      ...prev,
    ]);

    triggerToast(`"${run.name}" submitted for approval`);
  };

  // Approval Center Actions
  const handleApproveRequest = (id: string, comment: string) => {
    const target = approvalQueue.find((r) => r.id === id);
    setApprovalQueue((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'APPROVED', decidedCount: r.affectedIssueCount, remainingCount: 0 }
          : r
      )
    );
    triggerToast(
      comment
        ? `"${target?.reviewRunName}" approved — "${comment}"`
        : `"${target?.reviewRunName}" approved`
    );
  };

  const handleRejectRequest = (id: string, comment: string) => {
    const target = approvalQueue.find((r) => r.id === id);
    setApprovalQueue((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'REJECTED', decidedCount: r.affectedIssueCount, remainingCount: 0 }
          : r
      )
    );
    triggerToast(
      comment
        ? `"${target?.reviewRunName}" rejected — "${comment}"`
        : `"${target?.reviewRunName}" rejected`
    );
  };

  // Validation Workspace Actions
  const handleRunValidation = (datasetName: string) => {
    // "Customer Data" (the app's demo dataset context) maps to the
    // discovered users_master table.
    const matchingDataset = explorerDatasets.find((d) => d.name === 'users_master');

    const newRun: ValidationRun = {
      id: `vr-${Date.now()}`,
      datasetName,
      status: 'QUEUED',
      totalRows: matchingDataset?.rowCountEstimate ?? 0,
      passedRows: 0,
      warningRows: 0,
      failedRows: 0,
      qualityScore: null,
      startedAt: 'Not started',
      completedAt: 'Not started',
      durationMs: null,
    };

    setValidationRuns((prev) => [newRun, ...prev]);
    triggerToast(`Validation run queued for "${datasetName}"`);
  };

  const handleSelectValidationRun = (runId: string) => {
    setSelectedValidationRunId(runId);
    handleNavigate('validation-run-details');
  };

  // Staging & Publish Actions
  const handlePublish = () => {
    const current = stagingRuns.find((s) => s.isCurrent);
    if (!current || current.status !== 'READY') return;

    const newPublish: PublishRun = {
      id: `pb-${Date.now()}`,
      stagingRunAttempt: current.attemptNumber,
      status: 'PUBLISHING',
      targetType: 'FILE_EXPORT',
      targetReference: `s3://datacraft-exports/customer_data/attempt-${current.attemptNumber}.csv`,
      publishedRecordCount: null,
      driftAcknowledged: current.hasSourceDrift,
      errorMessage: null,
      createdAt: 'Just now',
    };

    setPublishRuns((prev) => [newPublish, ...prev]);
    triggerToast('Publishing to file export target...');

    setTimeout(() => {
      setPublishRuns((prev) =>
        prev.map((p) =>
          p.id === newPublish.id
            ? { ...p, status: 'PUBLISHED', publishedRecordCount: current.recordCount }
            : p
        )
      );
      triggerToast(`Published ${current.recordCount.toLocaleString()} records successfully`);
    }, 1500);
  };

  // User Management Actions
  const handleCreateUser = (input: { name: string; email: string; company: string; platformRole: PlatformRole }) => {
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim(),
      role: 'Team Member',
      company: input.company.trim() || currentUser?.company || 'DataCraft',
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name.trim())}`,
      platformRole: input.platformRole,
      accountStatus: 'invited',
      permissions: [],
    };
    setPlatformUsers((prev) => [...prev, newUser]);
    triggerToast(`Invited "${newUser.name}" as ${newUser.platformRole}`);
  };

  const handleEditUser = (id: string, updates: { name: string; email: string; company: string; platformRole: PlatformRole }) => {
    setPlatformUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, name: updates.name.trim(), email: updates.email.trim(), company: updates.company.trim() || u.company, platformRole: updates.platformRole }
          : u
      )
    );
    triggerToast('User updated');
  };

  const handleResetPassword = (id: string) => {
    const target = platformUsers.find((u) => u.id === id);
    triggerToast(`Password reset link sent to ${target?.email}`);
  };

  // Settings Actions
  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...updates }));
    triggerToast('Settings updated');
  };

  const handleUpdateProfile = (updates: { name: string; email: string }) => {
    if (!currentUser) return;
    const userId = currentUser.id;
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
    setPlatformUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    triggerToast('Profile updated');
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

          {currentScreen === 'validation-workspace' && (
            <ValidationWorkspaceView
              onNavigate={handleNavigate}
              validationRuns={validationRuns}
              onRunValidation={handleRunValidation}
              onSelectRun={handleSelectValidationRun}
            />
          )}

          {currentScreen === 'validation-run-details' && (
            <ValidationRunDetailsView
              onNavigate={handleNavigate}
              run={validationRuns.find((r) => r.id === selectedValidationRunId)}
            />
          )}

          {currentScreen === 'quality-rules' && (
            <QualityRulesView
              onNavigate={handleNavigate}
              onOpenRuleCreator={() => setShowRuleCreatorModal(true)}
              rules={qualityRules}
              onToggleRule={handleToggleRule}
            />
          )}

          {currentScreen === 'review-corrections' && (
            <ReviewCorrectionsView
              onNavigate={handleNavigate}
              reviewRuns={reviewRuns}
              issues={issues}
              onAcceptIssue={handleAcceptIssue}
              onEditIssue={handleEditIssue}
              onRejectIssue={handleRejectIssue}
              onSkipIssue={handleSkipIssue}
              onBulkAccept={handleBulkAccept}
              onBulkReject={handleBulkReject}
              onSubmitForApproval={handleSubmitForApproval}
            />
          )}

          {currentScreen === 'approval-center' && (
            <ApprovalCenterView
              onNavigate={handleNavigate}
              approvalQueue={approvalQueue}
              onApprove={handleApproveRequest}
              onReject={handleRejectRequest}
            />
          )}

          {currentScreen === 'staging-publish' && (
            <StagingPublishView
              onNavigate={handleNavigate}
              stagingRuns={stagingRuns}
              publishRuns={publishRuns}
              onPublish={handlePublish}
            />
          )}

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

          {currentScreen === 'user-management' && (
            <UserManagementView
              onNavigate={handleNavigate}
              users={platformUsers}
              onCreateUser={handleCreateUser}
              onEditUser={handleEditUser}
              onResetPassword={handleResetPassword}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsView
              onNavigate={handleNavigate}
              settings={appSettings}
              onUpdateSettings={handleUpdateSettings}
              currentUser={currentUser}
              onUpdateProfile={handleUpdateProfile}
            />
          )}
        </main>
      </div>

      {/* Guided Rule Creator Modal */}
      {showRuleCreatorModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-surface-container-high text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface">
                    Guided Rule Creator
                  </h3>
                  <p className="text-xs text-outline">
                    Synthesize custom SQL & regex constraints with AI guidance.
                  </p>
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
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g. Valid US Phone Number Standardizer"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2.5 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['formatting', 'uniqueness', 'completeness', 'consistency'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewRuleCategory(cat)}
                      className={`p-2.5 rounded-md border text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                        newRuleCategory === cat
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                  Describe Validation Constraint in Plain English
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRulePrompt}
                    onChange={(e) => setNewRulePrompt(e.target.value)}
                    placeholder="e.g. Ensure customer tax ID starts with TX- followed by 6 numbers"
                    className="flex-1 bg-surface-container-low border border-outline-variant rounded-md px-3.5 py-2 text-xs text-on-surface placeholder-outline focus:outline-none focus:bg-white focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRuleSQL}
                    className="bg-surface-container-high hover:bg-outline-variant text-primary px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Generate SQL
                  </button>
                </div>
              </div>

              {generatedSQL && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1 uppercase tracking-wider">
                    Generated Rule Code (SQL & Regex)
                  </label>
                  <textarea
                    rows={3}
                    value={generatedSQL}
                    onChange={(e) => setGeneratedSQL(e.target.value)}
                    className="w-full font-mono bg-surface-container-low border border-outline-variant rounded-md p-3 text-xs text-tertiary focus:outline-none focus:bg-white focus:border-primary"
                  />
                </div>
              )}

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
                  className="px-5 py-2.5 rounded-md bg-primary hover:bg-primary-container text-white text-xs font-semibold transition-colors cursor-pointer shadow-ambient"
                >
                  Deploy Rule
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
