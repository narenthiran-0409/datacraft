export type NavScreen =
  | 'dashboard'
  | 'data-sources'
  | 'add-data-source'
  | 'dataset-overview'
  | 'dataset-preview'
  | 'data-explorer'
  | 'data-profiling'
  | 'validation-workspace'
  | 'validation-run-details'
  | 'quality-rules'
  | 'review-corrections'
  | 'approval-center'
  | 'staging-publish'
  | 'data-lineage'
  | 'run-history'
  | 'reports'
  | 'insights'
  | 'user-management'
  | 'settings'
  | 'login';

export type PlatformRole = 'administrator' | 'analyst' | 'reviewer' | 'approver' | 'publisher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  avatarUrl: string;
  platformRole: PlatformRole;
  // Additive: required to render account status in User Management.
  accountStatus: 'active' | 'invited' | 'disabled';
  // Source of truth for what the user can do, from the backend's /auth/me
  // response. platformRole above is now display-only until permission-gated
  // UI (W2) replaces it.
  permissions: string[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file';
  typeLabel: string;
  status: 'connected' | 'failed' | 'syncing';
  description: string;
  datasetsCount: number;
  lastSync: string;
  icon: string;
  iconBgColor?: string;
  iconTextColor?: string;
  host?: string;
  recordsSynced?: string;
}

export interface QualityMetric {
  name: string;
  percentage: number;
  icon: string;
  status: 'healthy' | 'warning' | 'critical';
  details?: string;
}

export interface DatasetIssue {
  id: string;
  title: string;
  description: string;
  affectedCount: number;
  column: string;
  severity: 'high' | 'medium' | 'low';
  icon: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  timestamp: string;
  author: string;
  type: 'system' | 'user' | 'approval';
  isComplete?: boolean;
}

export interface QualityRule {
  id: string;
  name: string;
  category: 'formatting' | 'uniqueness' | 'completeness' | 'consistency';
  description: string;
  status: 'active' | 'inactive';
  appliedDatasetsCount: number;
  icon: string;
  ruleCode?: string;
  confidenceThreshold?: number;
}

export interface DataRow {
  id: string;
  customerName: string;
  email: string;
  hasEmailError?: boolean;
  emailErrorMessage?: string;
  joinDate: string;
  status: 'Active' | 'Pending' | 'Suspended';
  location: string;
  revenue?: string;
  phone?: string;
}

export interface ReviewRun {
  id: string;
  name: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'READY_FOR_APPROVAL' | 'ARCHIVED';
  datasetName: string;
  validationRunLabel: string;
  totalIssues: number;
  resolvedIssues: number;
  createdAt: string;
}

export interface Issue {
  id: string;
  reviewRunId: string;
  recordRef: string;
  columnName: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  originalValue: string;
  suggestedValue: string | null;
  suggestionSource: 'RULE_BASED' | 'AI' | null;
  confidence: number | null;
  status: 'PENDING' | 'RESOLVED' | 'SKIPPED';
  finalValue: string | null;
  ruleTriggered: string;
  // Additive (optional so existing mock data stays valid): the backend's accept/edit/
  // reject actions operate on a suggestion id, not the issue id — null/undefined when
  // no suggestion exists yet for this issue.
  suggestionId?: string | null;
}

export interface ApprovalRequestItem {
  id: string;
  reviewRunName: string;
  datasetName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED';
  affectedIssueCount: number;
  affectedRecordCount: number;
  // Additive (optional so existing mock data stays valid): needed to fetch this
  // approval's issue set fresh when approving/rejecting.
  reviewRunId?: string;
  requestedBy: string;
  requestedAt: string;
  decidedCount: number;
  remainingCount: number;
}

export interface SchemaNode {
  id: string;
  name: string;
  datasetCount: number;
}

export interface ExplorerDataset {
  id: string;
  schemaId: string;
  name: string;
  columnCount: number;
  rowCountEstimate: number;
  lastDiscoveredAt: string;
  isActive: boolean;
}

export interface ExplorerColumn {
  id: string;
  datasetId: string;
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isActive: boolean;
}

export interface ColumnProfile {
  columnId: string;
  columnName: string;
  nullPercentage: number;
  distinctPercentage: number;
  minValue: string | number | null;
  maxValue: string | number | null;
  meanValue: number | null;
  medianValue: string | number | null;
  modeValue: string | number | null;
  minLength: number | null;
  maxLength: number | null;
  avgLength: number | null;
  topValues: { value: string; count: number }[] | null;
  exactStats: boolean;
}

export interface ValidationRun {
  id: string;
  datasetName: string;
  status: 'CREATED' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  totalRows: number;
  passedRows: number;
  warningRows: number;
  failedRows: number;
  qualityScore: number | null;
  startedAt: string;
  completedAt: string;
  durationMs: number | null;
  // Additive (optional so existing mock data stays valid): needed to wire the real
  // generic job-cancel endpoint.
  jobId?: string | null;
}

export interface StagingRun {
  id: string;
  attemptNumber: number;
  isCurrent: boolean;
  status: 'NOT_STARTED' | 'BUILDING' | 'READY' | 'FAILED';
  recordCount: number;
  fieldCount: number;
  hasSourceDrift: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface PublishRun {
  id: string;
  stagingRunAttempt: number;
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  targetType: 'FILE_EXPORT';
  targetReference: string;
  publishedRecordCount: number | null;
  driftAcknowledged: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export interface LineageNode {
  id: string;
  entityType: string;
  entityId: string;
  label: string;
}

export interface LineageEdge {
  parentId: string;
  childId: string;
  relationshipType: string;
}

export interface RunHistoryItem {
  id: string;
  runType: 'PROFILE' | 'VALIDATION' | 'STAGING' | 'PUBLISH';
  datasetName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  summary: string;
}

export interface QualityTrendPoint {
  date: string;
  datasetName: string | null;
  qualityScore: number;
}

export interface RuleEffectivenessRow {
  ruleName: string;
  ruleType: string;
  failureCount: number;
  rejectRate: number;
}

export interface QualityByDatasetRow {
  datasetName: string;
  dataSourceName: string;
  latestQualityScore: number | null;
  lastValidatedAt: string | null;
}

export interface ReviewPerformanceSummary {
  avgTimeToDecisionMinutes: number;
  throughputByReviewer: { name: string; count: number }[];
}

export interface ApprovalMetricsSummary {
  approvalRate: number;
  avgDecisionLatencyMinutes: number;
}

export interface AISuggestionItem {
  id: string;
  suggestionType: 'EXPLANATION' | 'RUN_SUMMARY' | 'PRIORITIZATION' | 'CLUSTER';
  sourceContextLabel: string;
  content: string;
  confidence: number | null;
  provider: string;
  model: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
}

export interface AppSettings {
  aiEnabled: boolean;
  defaultAiProvider: string;
  validationDefaultSampleSize: number;
  stagingMaxSyncRecords: number;
}
