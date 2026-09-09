import { User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const REFRESH_TOKEN_STORAGE_KEY = 'datacraft.refresh_token';
const SESSION_EXPIRED_EVENT = 'datacraft:session-expired';

export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MeResponse {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  status: string;
  permissions: string[];
}

// Kept in memory only (never localStorage) to reduce the access token's XSS exposure surface.
let accessToken: string | null = null;

function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private browsing, etc) — session just won't survive a reload.
  }
}

function setSession(tokens: TokenResponse): void {
  accessToken = tokens.access_token;
  setStoredRefreshToken(tokens.refresh_token);
}

function clearSession(): void {
  accessToken = null;
  setStoredRefreshToken(null);
}

function emitSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(handler: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Attach the Authorization header and participate in 401 refresh-retry. Default true. */
  auth?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const envelope = data as ErrorEnvelope;
    throw new ApiError(
      res.status,
      envelope.error?.code ?? 'UNKNOWN_ERROR',
      envelope.error?.message ?? 'Request failed',
      envelope.error?.details ?? {}
    );
  }

  return data as T;
}

// Concurrent 401s share one in-flight refresh instead of each firing their own.
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) return false;
      try {
        const tokens = await rawRequest<TokenResponse>('/auth/refresh', {
          method: 'POST',
          body: { refresh_token: storedRefreshToken },
          auth: false,
        });
        setSession(tokens);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Every authenticated call in the app should go through this — it retries exactly once on a 401. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && options.auth !== false) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return await rawRequest<T>(path, options);
      }
      clearSession();
      emitSessionExpired();
    }
    throw err;
  }
}

export async function login(email: string, password: string): Promise<void> {
  const tokens = await rawRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  setSession(tokens);
}

export function fetchCurrentUser(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      await rawRequest<void>('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken } });
    }
  } catch (err) {
    // Access token had expired — refresh once, then retry logout with the newly-rotated
    // refresh token (the old one captured above is invalid the moment refresh succeeds).
    if (err instanceof ApiError && err.status === 401) {
      const refreshed = await refreshSession();
      const latestRefreshToken = getStoredRefreshToken();
      if (refreshed && latestRefreshToken) {
        await rawRequest<void>('/auth/logout', {
          method: 'POST',
          body: { refresh_token: latestRefreshToken },
        }).catch(() => {});
      }
    }
  } finally {
    // A network failure here must not trap the user in a logged-in-looking state.
    clearSession();
  }
}

/** Attempts to re-establish a session from a stored refresh token. Called once on app startup. */
export async function bootstrapSession(): Promise<MeResponse | null> {
  if (!getStoredRefreshToken()) return null;

  const refreshed = await refreshSession();
  if (!refreshed) {
    clearSession();
    return null;
  }

  try {
    return await fetchCurrentUser();
  } catch {
    clearSession();
    return null;
  }
}

export function mapMeResponseToUser(me: MeResponse): User {
  const name = me.full_name || me.username || me.email;
  return {
    id: me.id,
    name,
    email: me.email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    // BUG FIX: role/company/platformRole used to be hardcoded here ('Platform User',
    // 'DataCraft', 'administrator') regardless of the real logged-in user — every real
    // login displayed as Administrator. /auth/me carries no role_ids at all (only
    // permissions, the real source of truth for access control), so real role names
    // can't be resolved from this response alone; left empty here and resolved
    // separately (Settings/User Management) via listRoles() + the user's own
    // role_ids, gated on users.read, for viewers who have it.
    roleNames: [],
    // BUG FIX: this compared against 'DISABLED', a status value the backend never
    // uses — ck_users_status only allows ACTIVE | INACTIVE | LOCKED (confirmed in
    // alembic/versions/0002_create_identity_tables.py). A genuinely INACTIVE or
    // LOCKED user fell through to 'invited', which is wrong.
    accountStatus: me.status === 'ACTIVE' ? 'active' : me.status === 'INACTIVE' || me.status === 'LOCKED' ? 'disabled' : 'invited',
    permissions: me.permissions,
  };
}

// ============================================================================
// Typed domain clients
//
// Field names below mirror the backend's Pydantic schemas verbatim (snake_case,
// as they appear on the wire) rather than being reshaped to a frontend
// convention — that mapping is the job of whatever screen consumes a given
// call, not this layer. Every field typed as `string` here corresponds to a
// backend Pydantic field typed as plain `str` (not a `Literal`/enum) — the
// backend source does not constrain these at the schema layer, so this client
// doesn't fabricate a union type for them either. Where the backend genuinely
// declares a `Literal[...]`, or a request field's allowed values are enforced
// server-side even without a Pydantic Literal (documented in the route's own
// docstring), the TS type below is the matching literal union.
// ============================================================================

function buildQuery<T extends object>(params: T): string {
  const search = new URLSearchParams();
  const entries = Object.entries(params) as [string, string | number | boolean | undefined | null][];
  for (const [key, value] of entries) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// --- Data Sources ----------------------------------------------------------

export interface DataSourceResponse {
  id: string;
  name: string;
  description: string | null;
  owner_team: string | null;
  business_domain: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DataSourceCreateRequest {
  name: string;
  description?: string | null;
  owner_team?: string | null;
  business_domain?: string | null;
}

export interface DataSourceUpdateRequest {
  description?: string | null;
  owner_team?: string | null;
  business_domain?: string | null;
}

export function listDataSources(): Promise<DataSourceResponse[]> {
  return apiRequest('/data-sources');
}

export function createDataSource(input: DataSourceCreateRequest): Promise<DataSourceResponse> {
  return apiRequest('/data-sources', { method: 'POST', body: input });
}

export function getDataSource(dataSourceId: string): Promise<DataSourceResponse> {
  return apiRequest(`/data-sources/${dataSourceId}`);
}

export function updateDataSource(dataSourceId: string, input: DataSourceUpdateRequest): Promise<DataSourceResponse> {
  return apiRequest(`/data-sources/${dataSourceId}`, { method: 'PUT', body: input });
}

/** Deactivates the data source (soft delete) — returns the updated resource, not 204. */
export function deleteDataSource(dataSourceId: string): Promise<DataSourceResponse> {
  return apiRequest(`/data-sources/${dataSourceId}`, { method: 'DELETE' });
}

// --- Connections -------------------------------------------------------------

export interface ConnectionTypeResponse {
  id: string;
  code: string;
  display_name: string;
  is_active: boolean;
}

export interface ConnectionResponse {
  id: string;
  data_source_id: string;
  connection_type_id: string;
  name: string;
  environment: string;
  host: string;
  port: number;
  database_name: string | null;
  service_name: string | null;
  username: string;
  config: Record<string, unknown>;
  status: string;
  last_tested_at: string | null;
  last_test_latency_ms: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CredentialInput {
  username: string;
  password: string;
}

export interface ConnectionCreateRequest {
  data_source_id: string;
  connection_type_id: string;
  name: string;
  environment?: string;
  host: string;
  port: number;
  database_name?: string | null;
  service_name?: string | null;
  username: string;
  credential: CredentialInput;
  config?: Record<string, unknown>;
}

export interface ConnectionUpdateRequest {
  name?: string | null;
  environment?: string | null;
  host?: string | null;
  port?: number | null;
  database_name?: string | null;
  service_name?: string | null;
  username?: string | null;
  credential?: CredentialInput | null;
  config?: Record<string, unknown> | null;
}

export function listConnectionTypes(): Promise<ConnectionTypeResponse[]> {
  return apiRequest('/connection-types');
}

export function listConnections(): Promise<ConnectionResponse[]> {
  return apiRequest('/connections');
}

export function createConnection(input: ConnectionCreateRequest): Promise<ConnectionResponse> {
  return apiRequest('/connections', { method: 'POST', body: input });
}

export function getConnection(connectionId: string): Promise<ConnectionResponse> {
  return apiRequest(`/connections/${connectionId}`);
}

export function updateConnection(connectionId: string, input: ConnectionUpdateRequest): Promise<ConnectionResponse> {
  return apiRequest(`/connections/${connectionId}`, { method: 'PUT', body: input });
}

/** Deactivates the connection (soft delete) — returns the updated resource, not 204. */
export function deleteConnection(connectionId: string): Promise<ConnectionResponse> {
  return apiRequest(`/connections/${connectionId}`, { method: 'DELETE' });
}

export function testConnection(connectionId: string): Promise<ConnectionResponse> {
  return apiRequest(`/connections/${connectionId}/test`, { method: 'POST' });
}

/** Kicks off async schema/dataset discovery for this connection; returns the tracking job. */
export function discoverConnection(connectionId: string): Promise<JobResponse> {
  return apiRequest(`/connections/${connectionId}/discover`, { method: 'POST' });
}

// --- Datasets ----------------------------------------------------------------

export interface SchemaResponse {
  id: string;
  connection_id: string;
  name: string;
  is_active: boolean;
  discovered_at: string;
  created_at: string;
  updated_at: string | null;
}

export interface DatasetResponse {
  id: string;
  schema_id: string;
  name: string;
  object_type: string;
  key_strategy: string;
  row_count_estimate: number | null;
  column_count: number | null;
  // BUG FIX (Decimal-serialization sweep): Dataset.last_quality_score is a backend
  // Numeric(5,2), serialized as a JSON string (e.g. "60.00"), not a number — was
  // typed `number` here. No live arithmetic bug found on this field today (only
  // template-literal display and one Math.round() call, which JS coerces
  // correctly), but left mistyped it's a trap for the next consumer. Number()
  // wherever this is used numerically.
  last_quality_score: string | null;
  is_active: boolean;
  discovered_at: string;
  created_at: string;
  updated_at: string | null;
}

export interface DatasetListResponse {
  items: DatasetResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface ColumnResponse {
  id: string;
  dataset_id: string;
  name: string;
  ordinal_position: number;
  native_data_type: string | null;
  normalized_data_type: string;
  max_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: boolean;
  is_primary_key: boolean;
  is_active: boolean;
  discovered_at: string;
}

export interface KeyColumnInput {
  column_id: string;
  ordinal: number;
}

export interface KeyColumnsRequest {
  columns: KeyColumnInput[];
}

export interface DatasetPatchRequest {
  is_active: boolean;
}

export interface ListDatasetsQuery {
  schema_id?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

/** Every schema discovered under the given connection. `connection_id` is required by the backend. */
export function listSchemas(connectionId: string): Promise<SchemaResponse[]> {
  return apiRequest(`/schemas${buildQuery({ connection_id: connectionId })}`);
}

export function listDatasets(query: ListDatasetsQuery = {}): Promise<DatasetListResponse> {
  return apiRequest(`/datasets${buildQuery(query)}`);
}

export function getDataset(datasetId: string): Promise<DatasetResponse> {
  return apiRequest(`/datasets/${datasetId}`);
}

export function listDatasetColumns(datasetId: string): Promise<ColumnResponse[]> {
  return apiRequest(`/datasets/${datasetId}/columns`);
}

export function updateDatasetKeyColumns(datasetId: string, input: KeyColumnsRequest): Promise<DatasetResponse> {
  return apiRequest(`/datasets/${datasetId}/key-columns`, { method: 'PUT', body: input });
}

export function patchDataset(datasetId: string, input: DatasetPatchRequest): Promise<DatasetResponse> {
  return apiRequest(`/datasets/${datasetId}`, { method: 'PATCH', body: input });
}

// --- Profiling -----------------------------------------------------------

export interface ProfileRunResponse {
  id: string;
  dataset_id: string;
  job_id: string | null;
  status: string;
  sample_size: number | null;
  row_count: number | null;
  // BUG FIX (Decimal-serialization sweep): all three are backend Numeric(5,2)
  // columns, serialized as JSON strings — were typed `number`. No live bug found
  // (template-literal display only; quality_score is also always null in this
  // phase per the backend's own docstring), but mistyped nonetheless. Number()
  // wherever used numerically.
  quality_score: string | null;
  null_percentage: string | null;
  duplicate_percentage: string | null;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProfileRunCreateRequest {
  sample_size?: number | null;
  full_scan?: boolean;
  include_top_values?: boolean;
}

export interface ListProfileRunsQuery {
  dataset_id?: string;
  status?: string;
}

export function createProfileRun(datasetId: string, input: ProfileRunCreateRequest = {}): Promise<ProfileRunResponse> {
  return apiRequest(`/datasets/${datasetId}/profile`, { method: 'POST', body: input });
}

/** Latest completed profile run for this dataset; 404s if none exists yet. */
export function getLatestDatasetProfile(datasetId: string): Promise<ProfileRunResponse> {
  return apiRequest(`/datasets/${datasetId}/profile`);
}

export function listProfileRuns(query: ListProfileRunsQuery = {}): Promise<ProfileRunResponse[]> {
  return apiRequest(`/profile-runs${buildQuery(query)}`);
}

export function getProfileRun(profileRunId: string): Promise<ProfileRunResponse> {
  return apiRequest(`/profile-runs/${profileRunId}`);
}

// --- Validation ----------------------------------------------------------

export interface ValidationRunResponse {
  id: string;
  dataset_id: string;
  template_id: string | null;
  job_id: string | null;
  status: string;
  sample_size: number | null;
  total_rows: number;
  passed_rows: number;
  warning_rows: number;
  failed_rows: number;
  // BUG FIX (Decimal-serialization sweep): ValidationRun.quality_score is a
  // backend Numeric(5,2), serialized as a JSON string — was typed `number`. No
  // live bug found (template-literal display only, everywhere it's consumed
  // today), but mapValidationRun() passed this through unconverted, unlike its
  // siblings in the Reports effect that already got the Number() treatment —
  // fixed there too. Number() wherever used numerically.
  quality_score: string | null;
  error_message: string | null;
  triggered_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface ValidationRunCreateRequest {
  template_id?: string | null;
}

export interface ListValidationRunsQuery {
  dataset_id?: string;
  status?: string;
}

export function createValidationRun(datasetId: string, input: ValidationRunCreateRequest = {}): Promise<ValidationRunResponse> {
  return apiRequest(`/datasets/${datasetId}/validate`, { method: 'POST', body: input });
}

/** Latest completed validation run for this dataset; 404s if none exists yet. */
export function getLatestDatasetValidation(datasetId: string): Promise<ValidationRunResponse> {
  return apiRequest(`/datasets/${datasetId}/validation`);
}

export function listValidationRuns(query: ListValidationRunsQuery = {}): Promise<ValidationRunResponse[]> {
  return apiRequest(`/validation-runs${buildQuery(query)}`);
}

export function getValidationRun(validationRunId: string): Promise<ValidationRunResponse> {
  return apiRequest(`/validation-runs/${validationRunId}`);
}

// --- Jobs ------------------------------------------------------------------

export interface JobResponse {
  id: string;
  job_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  progress_percentage: number | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export function getJob(jobId: string): Promise<JobResponse> {
  return apiRequest(`/jobs/${jobId}`);
}

export function cancelJob(jobId: string): Promise<JobResponse> {
  return apiRequest(`/jobs/${jobId}/cancel`, { method: 'POST' });
}

// --- Rules -------------------------------------------------------------------

/** Enforced server-side (not a Pydantic Literal) — see app/api/v1/rules routes docstring. */
export type RuleType = 'COMPLETENESS' | 'UNIQUENESS' | 'DUPLICATE' | 'RANGE' | 'PATTERN' | 'CROSS_COLUMN';

/** Enforced server-side (not a Pydantic Literal) — see app/api/v1/rules routes docstring. */
export type RuleAssignmentScope = 'SINGLE_COLUMN' | 'DATASET_LEVEL' | 'CROSS_COLUMN';

export interface RuleResponse {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  rule_type: string;
  origin: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RuleCreateRequest {
  name: string;
  description?: string | null;
  category?: string | null;
  rule_type: RuleType;
  origin?: string;
  definition: Record<string, unknown>;
  severity?: string;
  error_message_template?: string | null;
}

export interface RuleUpdateRequest {
  description?: string | null;
  category?: string | null;
  status?: string | null;
}

export interface RuleVersionResponse {
  id: string;
  rule_id: string;
  version_number: number;
  definition: Record<string, unknown>;
  severity: string;
  error_message_template: string | null;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
}

export interface RuleVersionCreateRequest {
  definition: Record<string, unknown>;
  severity?: string;
  error_message_template?: string | null;
}

export interface RuleAssignmentResponse {
  id: string;
  rule_version_id: string;
  dataset_id: string;
  assignment_scope: string;
  column_id: string | null;
  cross_column_key: string | null;
  template_id: string | null;
  is_enabled: boolean;
  paused_at: string | null;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string | null;
}

export interface RuleAssignmentCreateRequest {
  rule_version_id: string;
  dataset_id: string;
  assignment_scope: RuleAssignmentScope;
  column_id?: string | null;
  column_ids?: string[] | null;
  template_id?: string | null;
}

export interface ListRulesQuery {
  status?: string;
  rule_type?: string;
}

export interface ListRuleAssignmentsQuery {
  dataset_id?: string;
  is_enabled?: boolean;
}

export function createRule(input: RuleCreateRequest): Promise<RuleResponse> {
  return apiRequest('/rules', { method: 'POST', body: input });
}

export function listRules(query: ListRulesQuery = {}): Promise<RuleResponse[]> {
  return apiRequest(`/rules${buildQuery(query)}`);
}

export function getRule(ruleId: string): Promise<RuleResponse> {
  return apiRequest(`/rules/${ruleId}`);
}

export function updateRule(ruleId: string, input: RuleUpdateRequest): Promise<RuleResponse> {
  return apiRequest(`/rules/${ruleId}`, { method: 'PATCH', body: input });
}

export function createRuleVersion(ruleId: string, input: RuleVersionCreateRequest): Promise<RuleVersionResponse> {
  return apiRequest(`/rules/${ruleId}/versions`, { method: 'POST', body: input });
}

export function listRuleVersions(ruleId: string): Promise<RuleVersionResponse[]> {
  return apiRequest(`/rules/${ruleId}/versions`);
}

export function createRuleAssignment(input: RuleAssignmentCreateRequest): Promise<RuleAssignmentResponse> {
  return apiRequest('/rule-assignments', { method: 'POST', body: input });
}

export function listRuleAssignments(query: ListRuleAssignmentsQuery = {}): Promise<RuleAssignmentResponse[]> {
  return apiRequest(`/rule-assignments${buildQuery(query)}`);
}

/** Soft-disables the assignment (is_enabled=false, paused_at set) — never a physical delete. */
export function deleteRuleAssignment(assignmentId: string): Promise<RuleAssignmentResponse> {
  return apiRequest(`/rule-assignments/${assignmentId}`, { method: 'DELETE' });
}

// --- Review ------------------------------------------------------------------

export interface ReviewRunResponse {
  id: string;
  validation_run_id: string;
  name: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  archived_at: string | null;
}

export interface ReviewRunCreateRequest {
  validation_run_id: string;
  name?: string | null;
}

export interface IssueResponse {
  id: string;
  review_run_id: string;
  validation_failure_id: string;
  column_id: string | null;
  record_ref: string;
  row_index: number;
  original_value: string | null;
  severity: string;
  status: string;
  assigned_reviewer_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CorrectionSuggestionResponse {
  id: string;
  issue_id: string;
  source: string;
  ai_suggestion_id: string | null;
  suggested_value: string;
  // BUG FIX (Decimal-serialization sweep): CorrectionSuggestion.confidence is a
  // backend Decimal (unconstrained precision), serialized as a JSON string — was
  // typed `number`. No live bug found (the one arithmetic use, `confidence * 100`
  // in ReviewCorrectionsView, happens to work because `*` forces numeric
  // coercion, unlike `+`), but mistyped nonetheless. Number() wherever used
  // numerically — fixed at the mapping boundary in App.tsx.
  confidence: string;
  fix_type: string;
  reasoning: string | null;
  is_selected: boolean;
  selected_by: string | null;
  selected_at: string | null;
  created_at: string;
}

export interface GenerateSuggestionsResponse {
  generated_count: number;
  issues_with_no_suggestion_count: number;
}

/** action is a true backend Pydantic Literal — only these two values are accepted. */
export interface BulkActionRequest {
  issue_ids: string[];
  action: 'skip' | 'reject';
}

export interface BulkActionResponse {
  action: string;
  issue_count: number;
}

export interface CorrectionResponse {
  id: string;
  issue_id: string;
  correction_suggestion_id: string | null;
  final_value: string | null;
  value_source: string | null;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface EditSuggestionRequest {
  final_value: string;
}

export interface RejectSuggestionRequest {
  reason?: string | null;
}

export interface CorrectIssueRequest {
  final_value: string;
}

export interface ListReviewsQuery {
  validation_run_id?: string;
  status?: string;
}

export function listReviews(query: ListReviewsQuery = {}): Promise<ReviewRunResponse[]> {
  return apiRequest(`/reviews${buildQuery(query)}`);
}

export function createReview(input: ReviewRunCreateRequest): Promise<ReviewRunResponse> {
  return apiRequest('/reviews', { method: 'POST', body: input });
}

export function getReview(reviewId: string): Promise<ReviewRunResponse> {
  return apiRequest(`/reviews/${reviewId}`);
}

export function listReviewIssues(reviewId: string, query: { status?: string } = {}): Promise<IssueResponse[]> {
  return apiRequest(`/reviews/${reviewId}/issues${buildQuery(query)}`);
}

export function listReviewSuggestions(reviewId: string): Promise<CorrectionSuggestionResponse[]> {
  return apiRequest(`/reviews/${reviewId}/suggestions`);
}

export function generateReviewSuggestions(reviewId: string): Promise<GenerateSuggestionsResponse> {
  return apiRequest(`/reviews/${reviewId}/generate-suggestions`, { method: 'POST' });
}

export function bulkReviewAction(reviewId: string, input: BulkActionRequest): Promise<BulkActionResponse> {
  return apiRequest(`/reviews/${reviewId}/bulk-action`, { method: 'POST', body: input });
}

export function archiveReview(reviewId: string): Promise<ReviewRunResponse> {
  return apiRequest(`/reviews/${reviewId}/archive`, { method: 'POST' });
}

export function restoreReview(reviewId: string): Promise<ReviewRunResponse> {
  return apiRequest(`/reviews/${reviewId}/restore`, { method: 'POST' });
}

export function getIssue(issueId: string): Promise<IssueResponse> {
  return apiRequest(`/issues/${issueId}`);
}

export function acceptSuggestion(suggestionId: string): Promise<CorrectionResponse> {
  return apiRequest(`/suggestions/${suggestionId}/accept`, { method: 'POST' });
}

export function editSuggestion(suggestionId: string, input: EditSuggestionRequest): Promise<CorrectionResponse> {
  return apiRequest(`/suggestions/${suggestionId}/edit`, { method: 'POST', body: input });
}

export function rejectSuggestion(suggestionId: string, input: RejectSuggestionRequest = {}): Promise<CorrectionResponse> {
  return apiRequest(`/suggestions/${suggestionId}/reject`, { method: 'POST', body: input });
}

export function correctIssue(issueId: string, input: CorrectIssueRequest): Promise<CorrectionResponse> {
  return apiRequest(`/issues/${issueId}/correct`, { method: 'POST', body: input });
}

// --- Approval ------------------------------------------------------------

export interface ApprovalRequestResponse {
  id: string;
  review_run_id: string;
  status: string;
  affected_issue_count: number;
  affected_record_count: number;
  requested_by: string | null;
  requested_at: string;
  decided_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ApprovalRequestDetailResponse extends ApprovalRequestResponse {
  decided_count: number;
  remaining_count: number;
}

export interface ApprovalDecisionRequest {
  issue_ids: string[];
  comment?: string | null;
}

export interface ListApprovalsQuery {
  status?: string;
  review_run_id?: string;
}

export function listApprovals(query: ListApprovalsQuery = {}): Promise<ApprovalRequestResponse[]> {
  return apiRequest(`/approvals${buildQuery(query)}`);
}

/** Scope is always every currently-resolved issue in the review run — there's no issue_ids param. */
export function submitApproval(reviewId: string): Promise<ApprovalRequestResponse> {
  return apiRequest(`/reviews/${reviewId}/submit-approval`, { method: 'POST' });
}

export function getApproval(approvalId: string): Promise<ApprovalRequestDetailResponse> {
  return apiRequest(`/approvals/${approvalId}`);
}

export function approveApproval(approvalId: string, input: ApprovalDecisionRequest): Promise<ApprovalRequestResponse> {
  return apiRequest(`/approvals/${approvalId}/approve`, { method: 'POST', body: input });
}

export function rejectApproval(approvalId: string, input: ApprovalDecisionRequest): Promise<ApprovalRequestResponse> {
  return apiRequest(`/approvals/${approvalId}/reject`, { method: 'POST', body: input });
}

// --- Staging -----------------------------------------------------------------

export interface StagingRunResponse {
  id: string;
  review_run_id: string;
  dataset_id: string;
  job_id: string | null;
  attempt_number: number;
  is_current: boolean;
  status: string;
  record_count: number;
  field_count: number;
  has_source_drift: boolean;
  error_message: string | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface StagingRecordResponse {
  id: string;
  staging_run_id: string;
  record_ref: string;
  row_snapshot: Record<string, unknown>;
  corrected_fields: unknown[];
  source_row_hash_at_validation: string;
  source_row_hash_at_staging: string | null;
  source_drift_status: string;
  source_drift_fields: unknown[] | null;
  created_at: string;
}

export function createStagingRun(reviewId: string): Promise<StagingRunResponse> {
  return apiRequest(`/reviews/${reviewId}/staging`, { method: 'POST' });
}

export function getStagingRun(stagingRunId: string): Promise<StagingRunResponse> {
  return apiRequest(`/staging-runs/${stagingRunId}`);
}

export function listStagingRecords(
  stagingRunId: string,
  query: { drift_only?: boolean } = {}
): Promise<StagingRecordResponse[]> {
  return apiRequest(`/staging-runs/${stagingRunId}/records${buildQuery(query)}`);
}

// --- Publishing ----------------------------------------------------------

export interface PublishRunResponse {
  id: string;
  staging_run_id: string;
  job_id: string | null;
  status: string;
  target_type: string;
  target_reference: string | null;
  published_record_count: number | null;
  drift_acknowledged: boolean;
  drift_acknowledged_by: string | null;
  drift_acknowledged_at: string | null;
  error_message: string | null;
  published_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PublishTriggerResponse {
  job_id: string;
  publish_run_id: string;
}

export interface PublishTriggerRequest {
  /** Only "FILE_EXPORT" is supported in this phase (enforced service-side, not a Pydantic Literal). */
  target_type: 'FILE_EXPORT';
  target_reference: string;
  overwrite?: boolean;
}

export interface DriftAcknowledgeRequest {
  comment?: string | null;
}

export function triggerPublish(stagingRunId: string, input: PublishTriggerRequest): Promise<PublishTriggerResponse> {
  return apiRequest(`/staging-runs/${stagingRunId}/publish`, { method: 'POST', body: input });
}

export function acknowledgeDrift(publishRunId: string, input: DriftAcknowledgeRequest = {}): Promise<PublishRunResponse> {
  return apiRequest(`/publish-runs/${publishRunId}/drift-acknowledge`, { method: 'POST', body: input });
}

export function getPublishRun(publishRunId: string): Promise<PublishRunResponse> {
  return apiRequest(`/publish-runs/${publishRunId}`);
}

// --- Lineage -------------------------------------------------------------

export interface LineageNode {
  entity_type: string;
  entity_id: string;
}

export interface LineageEdge {
  parent_entity_type: string;
  parent_entity_id: string;
  child_entity_type: string;
  child_entity_id: string;
  relationship_type: string;
}

export interface LineageGraphResponse {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export type LineageDirection = 'up' | 'down' | 'both';

export function getLineage(
  entityType: string,
  entityId: string,
  direction: LineageDirection = 'both'
): Promise<LineageGraphResponse> {
  return apiRequest(`/lineage/${entityType}/${entityId}${buildQuery({ direction })}`);
}

// --- Reports -----------------------------------------------------------------
// All 5 endpoints require reports.read. `from`/`to` are ISO datetime strings.

export interface QualityTrendPoint {
  validation_run_id: string;
  dataset_id: string;
  created_at: string;
  // BUG FIX: this said `number`, but app/modules/reports/schemas.py declares this
  // Decimal, which FastAPI/Pydantic serializes to JSON as a STRING (to preserve
  // precision) — not a number. Display-only consumers (template-literal
  // interpolation) never noticed; the first real arithmetic on this field (Dashboard
  // averaging/summing) surfaced it as "NaN%", since `+`/`*` on a string operand
  // does string concatenation or coerces unpredictably rather than adding.
  quality_score: string;
}

export interface QualityTrendResponse {
  points: QualityTrendPoint[];
}

export interface RuleEffectivenessRow {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  failure_count: number;
  // BUG FIX: same Decimal-as-string issue as quality_score above.
  failure_rate: string | null;
  severity_breakdown: Record<string, number>;
}

export interface RuleEffectivenessResponse {
  rules: RuleEffectivenessRow[];
}

export interface DatasetQualityRow {
  dataset_id: string;
  dataset_name: string;
  // BUG FIX: same Decimal-as-string issue as quality_score above.
  latest_quality_score: string | null;
  latest_validation_run_id: string | null;
  latest_validated_at: string | null;
}

export interface QualityByDatasetResponse {
  datasets: DatasetQualityRow[];
}

export interface ReviewerPerformanceRow {
  reviewer_id: string;
  decision_count: number;
  avg_latency_seconds: number | null;
}

export interface ReviewPerformanceResponse {
  reviewers: ReviewerPerformanceRow[];
}

export interface ApprovalMetricsResponse {
  total_requests: number;
  approved_count: number;
  rejected_count: number;
  partially_approved_count: number;
  pending_count: number;
  // BUG FIX: same Decimal-as-string issue as quality_score above.
  approval_rate: string | null;
  avg_decision_latency_seconds: number | null;
}

export function getQualityTrendReport(params: {
  from: string;
  to: string;
  dataset_id?: string;
}): Promise<QualityTrendResponse> {
  return apiRequest(`/reports/quality-trend${buildQuery(params)}`);
}

export function getRuleEffectivenessReport(params: {
  from: string;
  to: string;
  dataset_id?: string;
}): Promise<RuleEffectivenessResponse> {
  return apiRequest(`/reports/rule-effectiveness${buildQuery(params)}`);
}

export function getQualityByDatasetReport(params: { data_source_id?: string } = {}): Promise<QualityByDatasetResponse> {
  return apiRequest(`/reports/quality-by-dataset${buildQuery(params)}`);
}

export function getReviewPerformanceReport(params: { from: string; to: string }): Promise<ReviewPerformanceResponse> {
  return apiRequest(`/reports/review-performance${buildQuery(params)}`);
}

export function getApprovalMetricsReport(params: { from: string; to: string }): Promise<ApprovalMetricsResponse> {
  return apiRequest(`/reports/approval-metrics${buildQuery(params)}`);
}

// --- Users ---------------------------------------------------------------

export interface UserResponse {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  status: string;
  require_password_reset: boolean;
  last_login_at: string | null;
  role_ids: string[];
  created_at: string;
  updated_at: string | null;
}

export interface UserCreateRequest {
  email: string;
  username?: string | null;
  full_name?: string | null;
  password: string;
  role_ids?: string[];
}

export interface UserUpdateRequest {
  full_name?: string | null;
  username?: string | null;
  status?: string | null;
  role_ids?: string[] | null;
}

export interface ResetPasswordRequest {
  new_password?: string | null;
}

export interface ResetPasswordResponse {
  temporary_password: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
}

export function listUsers(): Promise<UserResponse[]> {
  return apiRequest('/users');
}

export function createUser(input: UserCreateRequest): Promise<UserResponse> {
  return apiRequest('/users', { method: 'POST', body: input });
}

export function getUser(userId: string): Promise<UserResponse> {
  return apiRequest(`/users/${userId}`);
}

export function updateUser(userId: string, input: UserUpdateRequest): Promise<UserResponse> {
  return apiRequest(`/users/${userId}`, { method: 'PUT', body: input });
}

export function resetUserPassword(userId: string, input: ResetPasswordRequest = {}): Promise<ResetPasswordResponse> {
  return apiRequest(`/users/${userId}/reset-password`, { method: 'POST', body: input });
}

export function listRoles(): Promise<RoleResponse[]> {
  return apiRequest('/roles');
}

// --- AI --------------------------------------------------------------------
// Types only, per this batch's scope — no request functions are exported for this
// domain yet, and nothing calls these types. Do not wire any screen to AI endpoints
// until a later, explicitly-scoped batch says to.

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatRequest {
  conversation_id?: string | null;
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: ChatMessageResponse;
}

export interface ConversationDetailResponse {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  messages: ChatMessageResponse[];
}

export interface ExplanationRequest {
  issue_id: string;
}

export interface RunSummaryRequest {
  validation_run_id: string;
}

export interface PrioritizationRequest {
  review_run_id: string;
}

export interface ClusterRequest {
  review_run_id: string;
}

export interface CorrectionSuggestionRequest {
  review_run_id: string;
}

export interface AISuggestionTriggerResponse {
  job_id: string;
}

export interface AISuggestionResponse {
  id: string;
  suggestion_type: string;
  source_context_type: string;
  source_context_id: string;
  content: Record<string, unknown>;
  confidence: number | null;
  provider: string;
  model: string;
  prompt_version_id: string;
  conversation_id: string | null;
  requested_by: string | null;
  status: string;
  created_at: string;
}
