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
  ColumnProfile,
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
import { bootstrapSession, logout as apiLogout, mapMeResponseToUser, onSessionExpired } from './api/client';
import {
  TEAM_MEMBERS,
  INITIAL_APP_SETTINGS,
  INITIAL_DATA_SOURCES,
  INITIAL_QUALITY_RULES,
  INITIAL_REVIEW_RUNS,
  INITIAL_ISSUES,
  INITIAL_APPROVAL_QUEUE,
  INITIAL_SCHEMAS,
  INITIAL_EXPLORER_DATASETS,
  INITIAL_EXPLORER_COLUMNS,
  INITIAL_COLUMN_PROFILES,
  INITIAL_VALIDATION_RUNS,
  INITIAL_STAGING_RUNS,
  INITIAL_PUBLISH_RUNS,
  INITIAL_LINEAGE_NODES,
  INITIAL_LINEAGE_EDGES,
  INITIAL_RUN_HISTORY,
  INITIAL_QUALITY_TREND,
  INITIAL_RULE_EFFECTIVENESS,
  INITIAL_QUALITY_BY_DATASET,
  INITIAL_REVIEW_PERFORMANCE,
  INITIAL_APPROVAL_METRICS,
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

  // App State
  const [dataSources, setDataSources] = useState<DataSource[]>(INITIAL_DATA_SOURCES);
  const [qualityRules, setQualityRules] = useState<QualityRule[]>(INITIAL_QUALITY_RULES);
  const [reviewRuns, setReviewRuns] = useState<ReviewRun[]>(INITIAL_REVIEW_RUNS);
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequestItem[]>(INITIAL_APPROVAL_QUEUE);
  const [schemas] = useState<SchemaNode[]>(INITIAL_SCHEMAS);
  const [explorerDatasets] = useState<ExplorerDataset[]>(INITIAL_EXPLORER_DATASETS);
  const [explorerColumns] = useState<ExplorerColumn[]>(INITIAL_EXPLORER_COLUMNS);
  const [columnProfiles] = useState<ColumnProfile[]>(INITIAL_COLUMN_PROFILES);
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>(INITIAL_VALIDATION_RUNS);
  const [selectedValidationRunId, setSelectedValidationRunId] = useState<string | null>(null);
  const [stagingRuns] = useState<StagingRun[]>(INITIAL_STAGING_RUNS);
  const [publishRuns, setPublishRuns] = useState<PublishRun[]>(INITIAL_PUBLISH_RUNS);
  const [lineageNodes] = useState<LineageNode[]>(INITIAL_LINEAGE_NODES);
  const [lineageEdges] = useState<LineageEdge[]>(INITIAL_LINEAGE_EDGES);
  const [runHistory] = useState<RunHistoryItem[]>(INITIAL_RUN_HISTORY);
  const [qualityTrend] = useState<QualityTrendPoint[]>(INITIAL_QUALITY_TREND);
  const [ruleEffectiveness] = useState<RuleEffectivenessRow[]>(INITIAL_RULE_EFFECTIVENESS);
  const [qualityByDataset] = useState<QualityByDatasetRow[]>(INITIAL_QUALITY_BY_DATASET);
  const [reviewPerformance] = useState<ReviewPerformanceSummary>(INITIAL_REVIEW_PERFORMANCE);
  const [approvalMetrics] = useState<ApprovalMetricsSummary>(INITIAL_APPROVAL_METRICS);
  const [aiSuggestions] = useState<AISuggestionItem[]>(INITIAL_AI_SUGGESTIONS);
  const [platformUsers, setPlatformUsers] = useState<User[]>(TEAM_MEMBERS);
  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_APP_SETTINGS);

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

          {currentScreen === 'data-sources' && (
            <DataSourcesView
              dataSources={dataSources}
              onNavigate={handleNavigate}
              onOpenAddSource={() => handleNavigate('add-data-source')}
              onSyncSource={handleSyncSource}
            />
          )}

          {currentScreen === 'dataset-overview' && (
            <DatasetOverviewView onNavigate={handleNavigate} />
          )}

          {currentScreen === 'dataset-preview' && (
            <DatasetPreviewView onNavigate={handleNavigate} />
          )}

          {currentScreen === 'data-explorer' && (
            <DataExplorerView
              onNavigate={handleNavigate}
              schemas={schemas}
              datasets={explorerDatasets}
              columns={explorerColumns}
            />
          )}

          {currentScreen === 'data-profiling' && (
            <DataProfilingView
              onNavigate={handleNavigate}
              datasets={explorerDatasets}
              columns={explorerColumns}
              columnProfiles={columnProfiles}
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

          {currentScreen === 'data-lineage' && (
            <DataLineageView
              onNavigate={handleNavigate}
              nodes={lineageNodes}
              edges={lineageEdges}
            />
          )}

          {currentScreen === 'run-history' && (
            <RunHistoryView onNavigate={handleNavigate} runHistory={runHistory} />
          )}

          {currentScreen === 'reports' && (
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
