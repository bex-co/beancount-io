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
 * A transaction whose postings leave a non-zero residual outside the ledger's
 * tolerance (w2/m26). Carries the machine-readable `UNBALANCED` code plus the
 * residual detail in the envelope, so API clients can refuse without parsing
 * prose. Pass `allowInvalid` to record the imbalance deliberately. `entry` is
 * the batch index on structured adds; single-entry edits and deletes have no
 * batch, so they omit it (w23/087).
 */
export class UnbalancedTransactionError extends DomainError {
  constructor(
    message: string,
    details: { residual: string; entry?: number },
  ) {
    super(ErrorCategory.BAD_USER_INPUT, message, {
      code: "UNBALANCED",
      details,
    });
  }
}

/**
 * A ledger name that is a renamed ledger's former name. The host keeps the
 * old name as a redirect, so a lookup by it answers the renamed ledger: the
 * name is not a ledger, but it stays reserved while links to it redirect
 * (w23/061). `LEDGER_NAME_RESERVED` with `details.redirects_to` lets a client
 * word the refusal without claiming a ledger by that name exists.
 */
export class LedgerNameReservedError extends DomainError {
  constructor(name: string, redirectsTo: string) {
    super(
      ErrorCategory.BAD_USER_INPUT,
      `'${name}' is the former name of ${redirectsTo}: links to it redirect there, so the name stays reserved. Choose a different name.`,
      {
        code: "LEDGER_NAME_RESERVED",
        details: { name, redirects_to: redirectsTo },
      },
    );
  }
}

/** Which write a {@link NewLedgerErrorsError} refused. */
export type LedgerWriteAction = "add" | "update" | "delete";

const LEDGER_WRITE_SUBJECT: Record<LedgerWriteAction, string> = {
  add: "adding these entries",
  update: "this edit",
  delete: "this deletion",
};

/**
 * A structured write whose entries would leave the ledger with bean-check
 * errors it did not have — a second `open` for an account already open, a
 * balance against an account never opened (w0/m2). Carries the
 * `NEW_LEDGER_ERRORS` code, the count and each new error as `message (file:line)`
 * so clients can refuse without parsing prose. `allowInvalid` records the
 * entries deliberately, as the text-append route already allows. Source-slice
 * edits and deletes refuse the same way (w21/m1); `details.action` says which
 * write it was so a client can word the refusal.
 */
export class NewLedgerErrorsError extends DomainError {
  constructor(
    newErrors: readonly {
      message: string;
      source?: { filename: string; lineno: number } | null;
    }[],
    action: LedgerWriteAction = "add",
  ) {
    // A parse error can repeat the same message at the same place several
    // times; naming it once says the same thing (w21/369).
    const named = [
      ...new Set(
        newErrors.map((error) =>
          error.source
            ? `${error.message} (${error.source.filename}:${error.source.lineno})`
            : error.message,
        ),
      ),
    ];
    const detail = named.join("; ");
    const noun = named.length === 1 ? "error" : "errors";
    super(
      ErrorCategory.BAD_USER_INPUT,
      `${LEDGER_WRITE_SUBJECT[action]} would introduce ${named.length} new bean-check ${noun}: ${detail}`,
      {
        code: "NEW_LEDGER_ERRORS",
        details: { count: named.length, detail, action },
      },
    );
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
  constructor(resource: string, reason: string) {
    super(ErrorCategory.CONFLICT, `${resource} conflict: ${reason}`, {
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
  constructor(resource: string, limit: number, current: number) {
    super(
      ErrorCategory.RESOURCE_LIMIT_REACHED,
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
