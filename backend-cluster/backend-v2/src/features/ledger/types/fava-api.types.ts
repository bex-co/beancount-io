/**
 * Fava API Response Types
 *
 * These types are manually created to match the actual Beancount-Ledger API responses.
 * They supplement the auto-generated types in src/server/service/fava/Api.ts
 * which may be incomplete due to OpenAPI schema generation limitations.
 *
 * Source of truth: beancount-ledger-v2/src/foundation/ledger-api-types/index.ts
 */

import type { OperationClass } from "@/server/api/identity";

/**
 * Permission object returned by the Beancount-Ledger API
 * Matches: beancount-ledger-v2/src/foundation/ledger-api-types/index.ts::PermissionPublic
 */
export interface FavaPermission {
  /** Admin permission - can modify repository settings */
  admin: boolean | null;
  /** Pull permission - can read/clone repository */
  pull: boolean | null;
  /** Push permission - can write to repository */
  push: boolean | null;
}

/**
 * Complete Ledger object with permissions
 * Matches: beancount-ledger-v2/src/foundation/ledger-api-types/index.ts::LedgerPublic
 */
export interface FavaLedgerPublic {
  /** Ledger ID (numeric, from Gitea repository ID) */
  id: number;
  /** Ledger name */
  name: string;
  /** Ledger description */
  description: string | null;
  /** Full name (owner/repo format) */
  full_name: string;
  /** Whether the ledger is empty */
  empty: boolean;
  /** Whether the ledger is private */
  private: boolean;
  /** Ledger size in bytes */
  size: number;
  /** Created timestamp (ISO 8601) */
  created_at: string;
  /** Updated timestamp (ISO 8601) */
  updated_at: string;
  /** User permissions for this ledger (may be null) */
  permissions: FavaPermission | null;
}

/**
 * Success response wrapper
 * Matches: beancount-ledger-v2/src/server/envelope.ts::SuccessEnvelope
 */
export interface FavaSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 * Matches: beancount-ledger-v2/src/server/envelope.ts::ErrorEnvelope
 */
export interface FavaErrorResponse {
  success: false;
  error: string;
}

/**
 * Generic API response (success or error)
 */
export type FavaApiResponse<T> = FavaSuccessResponse<T> | FavaErrorResponse;

/**
 * Type guard to check if response is successful
 */
export function isFavaSuccessResponse<T>(
  response: FavaApiResponse<T>,
): response is FavaSuccessResponse<T> {
  return response.success === true;
}

/**
 * Helper to convert FavaPermission to GraphQL Permission type
 * Used by resolvers to transform API responses
 *
 * @param permission - The permission object from Fava API (may be null/undefined)
 * @param capabilities - The caller's effective operation capabilities, when
 * known: the answer is the credential's authority (w23/137), the repo rights
 * intersected with what the credential may do (pull/read, push/write,
 * admin/admin). Without it the repo rights pass through for callers with no
 * credential to intersect (system paths) — metadata surfaces always pass it.
 * @returns GraphQL-compatible permission object with boolean fields, or undefined
 */
export function mapFavaPermission(
  permission: FavaPermission | null | undefined,
  capabilities?: ReadonlySet<OperationClass>,
): { admin: boolean; pull: boolean; push: boolean } | undefined {
  if (!permission) {
    return undefined;
  }

  const repo = {
    admin: permission.admin ?? false,
    pull: permission.pull ?? false,
    push: permission.push ?? false,
  };
  if (capabilities === undefined) return repo;
  return {
    admin: repo.admin && capabilities.has("admin"),
    pull: repo.pull && capabilities.has("read"),
    push: repo.push && capabilities.has("write"),
  };
}
