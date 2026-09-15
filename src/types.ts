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
  | 'login'
  // Real URL routing: shown when the current URL doesn't match any known
  // route (see src/routing.ts) — deliberately distinct from any real screen
  // so unknown URLs never silently render as Dashboard.
  | 'not-found';

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
  // Additive (Staging & Publish dataset-centric redesign): the dataset this review
  // run belongs to, resolved from its validation run's real dataset_id. Optional so
  // existing mock data stays valid; lets a dataset-first screen (the new Staging &
  // Publish explorer) find "the review for this dataset" without a dedicated
  // reviews-by-dataset endpoint (none exists).
  datasetId?: string;
  // Additive (master/detail redesign): the real, unformatted ISO created_at —
  // needed to deterministically pick "the latest review for this dataset" when
  // more than one exists (see src/data/workflowResolution.ts). `createdAt`
  // above is pre-formatted for display and must never be used for sorting.
  createdAtRaw?: string;
  // Additive (master/detail redesign): real updated_at, formatted for display
  // in the Review & Corrections master's "Updated" column — reflects the most
  // recent activity on the run, unlike createdAt (when it was first started).
  updatedAt?: string;
}

// Phase 4.10 — the shape of CorrectionSuggestionResponse.evidence_detail
// (app/modules/ai/suggestion_service.py's _advanced_evidence_summary), a
// flat, aggregate-only dict — never raw source rows or other columns'
// values. Every field optional/nullable since it's only ever populated
// for AI suggestions where advanced inference actually ran; read
// defensively and hide whatever isn't present rather than inventing it.
export interface SuggestionEvidenceDetail {
  available?: boolean;
  ambiguous?: boolean | null;
  strategies_attempted?: string[] | null;
  strategies_agreeing?: string[] | null;
  recommended_candidate?: string | null;
  recommended_strategy?: string | null;
  confidence?: number | null;
  supporting_count?: number | null;
  contradicting_count?: number | null;
  reason?: string | null;
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
  // Additive (optional so existing mock data stays valid): the confidence
  // tier behind suggestedValue — see CorrectionSuggestionResponse.category.
  // Absent/null for an issue with no suggestion yet.
  suggestionCategory?: 'DETERMINISTIC' | 'AI_HIGH_CONFIDENCE' | 'NEEDS_REVIEW' | 'CANNOT_INFER' | null;
  // Additive (optional): why this suggestion (or lack of one) was made —
  // most important for NEEDS_REVIEW/CANNOT_INFER, where there's no value
  // to show and this is the only signal explaining the gap.
  suggestionReasoning?: string | null;
  confidence: number | null;
  status: 'PENDING' | 'RESOLVED' | 'SKIPPED';
  finalValue: string | null;
  ruleTriggered: string;
  // Additive (optional so existing mock data stays valid): the backend's accept/edit/
  // reject actions operate on a suggestion id, not the issue id — null/undefined when
  // no suggestion exists yet for this issue.
  suggestionId?: string | null;
  // Phase 4.10 (optional, additive): CorrectionSuggestionResponse.strategy —
  // the specific evidence strategy that produced suggestedValue (e.g.
  // "STRING_TEMPLATE"). Null for RULE_BASED suggestions and for AI
  // suggestions where advanced inference didn't run.
  suggestionStrategy?: string | null;
  // Phase 4.10 (optional, additive): CorrectionSuggestionResponse.evidence_detail.
  suggestionEvidence?: SuggestionEvidenceDetail | null;
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
  // Additive (master/detail redesign): the real, unformatted ISO requested_at —
  // for deterministic sorting (see src/data/workflowResolution.ts). `requestedAt`
  // above is pre-formatted for display and must never be used for sorting.
  requestedAtRaw?: string;
  // Additive (master/detail redesign): real decided_at (falling back to
  // updated_at, then requested_at) for the Approval Center master's "Updated"
  // column — never fabricated when the request hasn't been decided yet.
  updatedAt?: string;
}

export interface SchemaNode {
  id: string;
  name: string;
  datasetCount: number;
  // Additive (this task): derived client-side from schema.connection_id ->
  // connection.data_source_id, so Data Explorer can be filtered down to a single
  // data source's schemas (used by Data Sources' "View Datasets" action). Null
  // when the owning connection couldn't be resolved (e.g. connections.read missing).
  dataSourceId: string | null;
}

export interface ExplorerDataset {
  id: string;
  schemaId: string;
  name: string;
  columnCount: number;
  rowCountEstimate: number;
  lastDiscoveredAt: string;
  isActive: boolean;
  // Additive (this task): derived client-side from schema.connection_id ->
  // connection.is_active, distinct from isActive above (which is the dataset's
  // own discovery-driven flag, unrelated to connection management). Visual only —
  // never used to block/disable any action.
  connectionInactive: boolean;
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
  // Additive: distinguishes "0 rules evaluated, trivially 100%" from
  // "N rules evaluated, genuinely all passed" — see ValidationRunResponse
  // in api/client.ts for why this exists. Optional so existing mock data
  // stays valid; treated as 0/false when absent.
  rulesEvaluatedCount?: number;
  noApplicableRules?: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number | null;
  // Additive (optional so existing mock data stays valid): needed to wire the real
  // generic job-cancel endpoint.
  jobId?: string | null;
}

// Staging & Publish dataset-centric redesign (UI phase, no new backend fields):
// a dataset-level workflow status derived client-side from whatever real signals
// are available for it (its review run's status, its approval decision, and — only
// for the currently-open dataset, since there is no list-staging-runs-by-dataset
// endpoint — its staging/publish run status). See
// src/data/datasetStagingWorkflow.ts's deriveDatasetStagingStatus for exactly how
// each value is inferred, and its own comments for where a value is a real signal
// vs. an honest "we can't tell yet" default.
export type DatasetStagingStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'READY_TO_STAGE'
  | 'STAGING'
  | 'STAGED'
  | 'FAILED'
  // Phase 4.12B — a materialization job was cooperatively cancelled
  // (materialization_phase = 'CANCELLED'); distinct from FAILED.
  | 'CANCELLED'
  | 'NO_APPROVED_CHANGES';

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
