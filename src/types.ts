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

// RESOLVED (Phase 3): the backend has no free-text `role` and no single
// `platform_role` column at all — role is many-to-many via `user_roles`
// (a user can have 0, 1, or many roles), and role NAMES come from the real
// `roles` table. Its 5 seeded names (alembic/versions/0006_seed_roles_and_
// permissions.py: ROLE_NAMES) happen to match this app's previous 5-value
// PlatformRole enum exactly, but the cardinality doesn't — a user is not
// guaranteed to have exactly one. `role` (free text) and `platformRole`
// (fabricated single-enum, hardcoded to 'administrator' for every real
// login) are both removed in favor of `roleNames: string[]`, populated from
// real role_ids resolved against a real GET /roles call.
export type PlatformRole = 'administrator' | 'analyst' | 'reviewer' | 'approver' | 'publisher';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  // Real role name(s) from the backend's roles table, resolved via the
  // user's role_ids — empty if the user has no role assigned, or if the
  // viewer lacks users.read (in which case this is left empty and callers
  // must check a separate canReadRoles flag before treating [] as "no
  // roles" rather than "not visible to you").
  roleNames: string[];
  // Additive: required to render account status in User Management.
  accountStatus: 'active' | 'invited' | 'disabled';
  // Source of truth for what the user can do, from the backend's /auth/me
  // response.
  permissions: string[];
}

export interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file';
  typeLabel: string;
  // 'inactive' added for real backend wiring (this task) — is_active=false, distinct
  // from 'failed' (a sync problem), which this screen has no real signal for yet.
  status: 'connected' | 'failed' | 'syncing' | 'inactive';
  description: string;
  datasetsCount: number;
  lastSync: string;
  icon: string;
  iconBgColor?: string;
  iconTextColor?: string;
  host?: string;
  recordsSynced?: string;
  // Additive (this task): the only fields the backend's PUT /data-sources/{id} actually
  // accepts (name is not editable), plus the real is_active flag for edit/delete gating.
  isActive: boolean;
  ownerTeam: string | null;
  businessDomain: string | null;
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
  // Additive: the raw report response has dataset_id, but it was previously
  // discarded in the mapping — needed so Dashboard's "Datasets Needing
  // Attention" cards can navigate to the specific dataset, not just display it.
  datasetId: string;
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
