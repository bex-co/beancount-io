import {
  BadUserInputError,
  ConflictError,
  DomainError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  PremiumRequiredError,
  RateLimitedError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
  UnauthenticatedError,
} from "@/shared/errors";
import { FavaApiError } from "./api-client";

const LEDGER_NAME_ALREADY_EXISTS = "LEDGER_NAME_ALREADY_EXISTS";
const DIRECTIVE_LIMIT_EXCEEDED = "DIRECTIVE_LIMIT_EXCEEDED";
const RESOURCE_LIMIT_MESSAGE =
  /^(.*?) limit reached\. Maximum: (\d+), Current: (\d+)\./i;

function upstreamMessage(error: FavaApiError, fallback: string): string {
  return error.body?.error || error.message || fallback;
}

function resourceLimitFromError(
  error: FavaApiError,
): ResourceLimitReachedError | undefined {
  const details = error.body?.details;
  if (
    error.body?.code?.toUpperCase() === DIRECTIVE_LIMIT_EXCEEDED &&
    typeof details?.limit === "number" &&
    typeof details?.current === "number"
  ) {
    return new ResourceLimitReachedError(
      "directives",
      details.limit,
      details.current,
      error.body.error || undefined,
    );
  }

  if (error.status !== 403) return undefined;
  const message = upstreamMessage(error, "");
  const match = RESOURCE_LIMIT_MESSAGE.exec(message);
  if (!match) return undefined;

  const limit = Number(match[2]);
  const current = Number(match[3]);
  if (!Number.isSafeInteger(limit) || !Number.isSafeInteger(current)) {
    return undefined;
  }

  return new ResourceLimitReachedError(match[1], limit, current, message);
}

/**
 * Translate a non-2xx response from the ledger service into the backend's
 * transport-agnostic error vocabulary. The ledger service's legacy error
 * envelope exposes HTTP status plus prose for most failures, so status is the
 * fallback; known machine codes and stable legacy shapes take precedence.
 */
export function favaApiErrorToDomainError(
  error: FavaApiError,
  operation: string,
): DomainError {
  const code = error.body?.code?.toUpperCase();
  const message = upstreamMessage(error, `Failed to ${operation}`);

  if (
    code === LEDGER_NAME_ALREADY_EXISTS ||
    (error.status === 400 &&
      /ledger with the name .* already exists/i.test(message))
  ) {
    return new ConflictError("Ledger", "Name already exists", {
      reasonCode: LEDGER_NAME_ALREADY_EXISTS,
      field: "name",
    });
  }

  const resourceLimit = resourceLimitFromError(error);
  if (resourceLimit) return resourceLimit;

  switch (error.status) {
    case 400:
    case 422:
      return new BadUserInputError(message);
    case 401:
      return new UnauthenticatedError();
    case 402:
      return new PremiumRequiredError();
    case 403:
      return new ForbiddenError(message, "Ledger API");
    case 404:
      return new NotFoundError("Ledger resource");
    case 409:
      return new ConflictError("Ledger resource", message);
    case 429:
      return new RateLimitedError();
    case 502:
    case 503:
    case 504:
      return new ServiceUnavailableError("Ledger API");
    default:
      return error.status === undefined || error.status >= 500
        ? new ServiceUnavailableError("Ledger API")
        : new InternalServerError(`Failed to ${operation}`, error);
  }
}
