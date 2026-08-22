/**
 * Centralized, transport-agnostic error exports.
 *
 * Throw these {@link DomainError} subclasses from any layer (services, operations,
 * shared infra, resolvers, REST handlers). The transport adapters translate them:
 * - GraphQL: `src/server/graphql/format-error.ts` → `extensions.code` = category
 * - REST: `src/server/rest/error-middleware.ts` → HTTP status + `{ error: { code } }`
 *
 * USAGE:
 * ```typescript
 * import { NotFoundError } from "@/shared/errors";
 *
 * throw new NotFoundError("Ledger", ledgerId);
 * ```
 *
 * Benefits of direct imports:
 * - Better type safety and autocomplete
 * - Clearer code with explicit error types
 * - Easier to trace error usage across codebase
 * - Smaller bundle size (tree-shaking friendly)
 */

// ============================================================================
// ERROR CATEGORY (canonical codes) + HTTP STATUS MAPPING
// ============================================================================
export { ErrorCategory, CATEGORY_HTTP_STATUS } from "./error-category";

// ============================================================================
// DOMAIN ERROR CLASSES
// ============================================================================
export {
  DomainError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  BadUserInputError,
  ValidationError,
  ConflictError,
  RateLimitedError,
  InternalServerError,
  ServiceUnavailableError,
  ResourceLimitReachedError,
  OperationNotAllowedError,
  PremiumRequiredError,
} from "./domain-errors";
