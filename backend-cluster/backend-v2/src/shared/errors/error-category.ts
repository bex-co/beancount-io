/**
 * Transport-agnostic error categories.
 *
 * A single category is the canonical, machine-readable error code emitted by
 * every transport: it is surfaced as `extensions.code` in GraphQL responses and
 * as `error.code` in REST response bodies. Transport adapters map a category to
 * the appropriate wire representation (HTTP status, GraphQL extensions) — the
 * category itself carries no transport coupling.
 */
export enum ErrorCategory {
  /** Authentication required but not provided or invalid */
  UNAUTHENTICATED = "UNAUTHENTICATED",

  /** Authenticated but insufficient permissions */
  FORBIDDEN = "FORBIDDEN",

  /** Requested resource does not exist */
  NOT_FOUND = "NOT_FOUND",

  /** Client provided invalid input data */
  BAD_USER_INPUT = "BAD_USER_INPUT",

  /** Input validation failed against business rules or schema */
  VALIDATION_FAILED = "VALIDATION_FAILED",

  /** Operation conflicts with current resource state */
  CONFLICT = "CONFLICT",

  /** Client exceeded rate limit */
  RATE_LIMITED = "RATE_LIMITED",

  /** Unexpected internal server error */
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",

  /** Required external service is unavailable */
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  /** User reached subscription tier resource limit */
  RESOURCE_LIMIT_REACHED = "RESOURCE_LIMIT_REACHED",

  /** Operation not allowed due to business rules */
  OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED",

  /** Premium subscription required to access this feature */
  PREMIUM_REQUIRED = "PREMIUM_REQUIRED",
}

/**
 * Canonical HTTP status code for each error category.
 *
 * Used by the REST transport adapter to translate a thrown {@link DomainError}
 * into an HTTP response status. GraphQL ignores this (it always returns 200 with
 * the category in `extensions.code`).
 */
export const CATEGORY_HTTP_STATUS: Record<ErrorCategory, number> = {
  [ErrorCategory.UNAUTHENTICATED]: 401,
  [ErrorCategory.FORBIDDEN]: 403,
  [ErrorCategory.NOT_FOUND]: 404,
  [ErrorCategory.BAD_USER_INPUT]: 400,
  [ErrorCategory.VALIDATION_FAILED]: 400,
  [ErrorCategory.CONFLICT]: 409,
  [ErrorCategory.RATE_LIMITED]: 429,
  [ErrorCategory.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCategory.SERVICE_UNAVAILABLE]: 503,
  [ErrorCategory.RESOURCE_LIMIT_REACHED]: 403,
  [ErrorCategory.OPERATION_NOT_ALLOWED]: 403,
  [ErrorCategory.PREMIUM_REQUIRED]: 402,
};
