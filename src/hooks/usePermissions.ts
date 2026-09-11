import { useMemo } from 'react';
import { User } from '../types';

/**
 * Every permission code seeded by the backend (dataquality-platform), gathered from
 * alembic/versions/0006 through 0017 — new modules keep adding a handful each, so this
 * list spans 12 migrations, not just one or two. Re-grep the backend's migrations if a
 * future backend change might have added more before trusting this list again.
 */
export const PERMISSION_CODES = [
  // 0006_seed_roles_and_permissions
  'users.read',
  'users.manage',
  'connections.read',
  'connections.manage',
  'data_sources.read',
  'data_sources.manage',
  'audit.read',
  // 0007_phase3_discovery_foundation
  'discovery.run',
  'metadata.read',
  'metadata.manage',
  // 0008_phase4_profiling_foundation
  'profiling.run',
  // 0009_phase5_validation_base
  'validation.run',
  // 0010_phase6_review_corrections
  'review.read',
  'review.edit',
  // 0011_phase7_approval
  'approval.read',
  'approval.decide',
  // 0012_phase8_staging_foundation
  'staging.read',
  'staging.create',
  // 0013_phase9_publish_foundation
  'publish.read',
  'publish.execute',
  // 0014_phase10_lineage_foundation
  'lineage.read',
  // 0015_phase11_reports_rbac
  'reports.read',
  // 0016_phase12_ai_foundation
  'ai.chat',
  'ai.suggest',
  // 0017_phase5_rules_rbac_fix
  'rules.read',
  'rules.manage',
  'rule_assignments.manage',
  // 0018_data_preview_permission — seeded well before this task, but never
  // referenced anywhere client-side until Data Preview's real endpoint was
  // finally wired up here.
  'data_preview.read',
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export interface PermissionChecks {
  /** The raw permission codes this check set was built from. */
  permissions: string[];
  hasPermission: (code: PermissionCode) => boolean;
  hasAnyPermission: (codes: PermissionCode[]) => boolean;
  hasAllPermissions: (codes: PermissionCode[]) => boolean;
}

/**
 * Pure, React-free permission checker. Split out from the hook below so the check
 * logic itself can be exercised directly (e.g. from a plain script) without needing
 * a component render.
 */
export function createPermissionChecks(permissions: string[] | null | undefined): PermissionChecks {
  const permissionSet = new Set(permissions ?? []);
  return {
    permissions: permissions ?? [],
    hasPermission: (code) => permissionSet.has(code),
    hasAnyPermission: (codes) => codes.some((code) => permissionSet.has(code)),
    hasAllPermissions: (codes) => codes.every((code) => permissionSet.has(code)),
  };
}

/**
 * Reads permissions off the given user (pass the app's `currentUser`) and exposes
 * hasPermission / hasAnyPermission / hasAllPermissions checks against them.
 *
 * `currentUser.permissions` is the sole source of truth per the backend's /auth/me
 * contract — do not derive permissions from `platformRole` anywhere.
 */
export function usePermissions(user: Pick<User, 'permissions'> | null | undefined): PermissionChecks {
  return useMemo(() => createPermissionChecks(user?.permissions), [user?.permissions]);
}
