import { ErrorCategory } from "./error-category";

/**
 * Base class for all application errors.
 *
 * Transport-agnostic: it extends the plain `Error` and imports nothing from the
 * GraphQL or HTTP layers. Business logic (services, operations, shared infra)
 * throws these from any layer; the per-transport adapters
 * (`server/graphql/format-error.ts`, `server/rest/error-middleware.ts`) translate
 * a {@link ErrorCategory} into the appropriate wire format.
 *
 * @example
 * class NotFoundError extends DomainError {
 *   constructor(resource: string, id?: string) {
 *     super(ErrorCategory.NOT_FOUND, `${resource} not found`, { resource, id });
 *   }
 * }
 */
export abstract class DomainError extends Error {
  /**
   * @param category - Semantic, transport-agnostic error category (the canonical code)
   * @param message - Human-readable error message
   * @param metadata - Additional error context for debugging and client handling
   * @param httpStatusHint - Escape hatch for genuine status passthrough (e.g. the
   *   git proxy forwarding an upstream status). Consumed by the REST adapter only;
   *   when omitted the adapter derives the status from `category`.
   */
  constructor(
    public readonly category: ErrorCategory,
    message: string,
    public readonly metadata?: Record<string, unknown>,
    public readonly httpStatusHint?: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a request requires authentication but none was provided or the
 * provided credentials are invalid.
 *
 * Category: UNAUTHENTICATED (HTTP 401)
 *
 * @example
 * throw new UnauthenticatedError();
 * throw new UnauthenticatedError("Invalid JWT token");
 */
export class UnauthenticatedError extends DomainError {
  constructor(message = "Authentication required") {
    super(ErrorCategory.UNAUTHENTICATED, message);
  }
}

/**
 * Thrown when an authenticated user attempts to access a resource they don't have
 * permission for.
 *
 * Category: FORBIDDEN (HTTP 403)
 *
 * @example
 * throw new ForbiddenError();
 * throw new ForbiddenError("Only ledger owner can delete", "ledger");
 */
export class ForbiddenError extends DomainError {
  constructor(message = "Access denied", resource?: string) {
    super(
      ErrorCategory.FORBIDDEN,
      message,
      resource ? { resource } : undefined,
    );
  }
}

/**
 * Thrown when a requested resource does not exist.
 *
 * Category: NOT_FOUND (HTTP 404)
 *
 * @example
 * throw new NotFoundError("Ledger");
 * throw new NotFoundError("Ledger", "abc123");
 */
export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(ErrorCategory.NOT_FOUND, message, { resource, id });
  }
}

/**
 * Thrown when the client provides invalid input data.
 *
 * Category: BAD_USER_INPUT (HTTP 400)
 *
 * @example
 * throw new BadUserInputError("Invalid email format");
 * throw new BadUserInputError("Name cannot be empty", "name");
 */
export class BadUserInputError extends DomainError {
  constructor(message: string, field?: string) {
    super(ErrorCategory.BAD_USER_INPUT, message, field ? { field } : undefined);
  }
}

/**
 * Thrown when input validation fails based on business rules or schema constraints.
 *
 * Category: VALIDATION_FAILED (HTTP 400)
 *
 * @example
 * throw new ValidationError("email", "Must be a valid email address");
 */
export class ValidationError extends DomainError {
  constructor(field: string, reason: string) {
    super(
      ErrorCategory.VALIDATION_FAILED,
      `Validation failed for ${field}: ${reason}`,
      {
        field,
        reason,
      },
    );
  }
}

/**
 * Thrown when an operation conflicts with the current state of the resource.
 *
 * Category: CONFLICT (HTTP 409)
 *
 * @example
 * throw new ConflictError("User", "Email already exists");
 */
export class ConflictError extends DomainError {
  constructor(
    resource: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ) {
    super(ErrorCategory.CONFLICT, `${resource} conflict: ${reason}`, {
      ...metadata,
      resource,
      reason,
    });
  }
}

/**
 * Thrown when a client exceeds the rate limit for a particular operation.
 *
 * Category: RATE_LIMITED (HTTP 429)
 *
 * @example
 * throw new RateLimitedError(60);
 * throw new RateLimitedError(120, "Too many login attempts");
 * throw new RateLimitedError(undefined, "Monthly quota reached", { tier });
 */
export class RateLimitedError extends DomainError {
  constructor(
    retryAfter?: number,
    message = "Too many requests. Please try again later.",
    metadata?: Record<string, unknown>,
  ) {
    super(ErrorCategory.RATE_LIMITED, message, {
      ...(retryAfter !== undefined && { retryAfter }),
      ...metadata,
    });
  }
}

/**
 * Thrown when an unexpected internal server error occurs.
 *
 * Category: INTERNAL_SERVER_ERROR (HTTP 500)
 *
 * @example
 * throw new InternalServerError();
 * throw new InternalServerError("Database connection failed");
 */
export class InternalServerError extends DomainError {
  constructor(
    message = "Internal server error",
    originalError?: Error,
    httpStatusHint?: number,
  ) {
    super(
      ErrorCategory.INTERNAL_SERVER_ERROR,
      message,
      originalError ? { originalMessage: originalError.message } : undefined,
      httpStatusHint,
    );
  }
}

/**
 * Thrown when a required external service is temporarily unavailable.
 *
 * Category: SERVICE_UNAVAILABLE (HTTP 503)
 *
 * @example
 * throw new ServiceUnavailableError("Database");
 * throw new ServiceUnavailableError("Ledger API", 30);
 */
export class ServiceUnavailableError extends DomainError {
  constructor(service: string, retryAfter?: number) {
    super(
      ErrorCategory.SERVICE_UNAVAILABLE,
      `${service} is temporarily unavailable`,
      retryAfter ? { service, retryAfter } : { service },
    );
  }
}

/**
 * Thrown when a user reaches their subscription tier's resource limits.
 *
 * Category: RESOURCE_LIMIT_REACHED (HTTP 403)
 *
 * @example
 * throw new ResourceLimitReachedError("Ledger", 5, 5);
 */
export class ResourceLimitReachedError extends DomainError {
  constructor(
    resource: string,
    limit: number,
    current: number,
    /**
     * Replaces the generic sentence when the service that refused already said
     * something better. The directive limit does: its message names deleting
     * entries as the way back under, which is what the git proxy's refusal
     * sends people here to do (ADR 0005 / w1/m17 t007). Rebuilding the text
     * from the numbers would drop that and leave upgrading as the only visible
     * option.
     */
    message?: string,
  ) {
    super(
      ErrorCategory.RESOURCE_LIMIT_REACHED,
      message ??
        `${resource} limit reached. Maximum: ${limit}, Current: ${current}. Upgrade to Premium or a higher plan to continue.`,
      { resource, limit, current },
    );
  }
}

/**
 * Thrown when an operation is not allowed due to business rules or current state.
 *
 * Category: OPERATION_NOT_ALLOWED (HTTP 403)
 *
 * @example
 * throw new OperationNotAllowedError("delete", "Cannot delete default ledger");
 */
export class OperationNotAllowedError extends DomainError {
  constructor(operation: string, reason: string) {
    super(
      ErrorCategory.OPERATION_NOT_ALLOWED,
      `Operation '${operation}' not allowed: ${reason}`,
      { operation, reason },
    );
  }
}

/**
 * Thrown when a feature requires a premium subscription but user is on free tier.
 *
 * Category: PREMIUM_REQUIRED (HTTP 402)
 *
 * @example
 * throw new PremiumRequiredError();
 * throw new PremiumRequiredError("AI categorization");
 */
export class PremiumRequiredError extends DomainError {
  constructor(feature?: string, customMessage?: string) {
    const message =
      customMessage ||
      (feature
        ? `Premium subscription required to access ${feature}`
        : "Premium subscription required");
    super(
      ErrorCategory.PREMIUM_REQUIRED,
      message,
      feature ? { feature } : undefined,
    );
  }
}
