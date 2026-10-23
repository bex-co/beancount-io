import {
  BadUserInputError,
  ConflictError,
  DomainError,
  ForbiddenError,
  InternalServerError,
  NewLedgerErrorsError,
  NotFoundError,
  PremiumRequiredError,
  RateLimitedError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
  UnbalancedTransactionError,
  UnauthenticatedError,
} from "@/shared/errors";
import { FavaApiError } from "./api-client";

const LEDGER_NAME_ALREADY_EXISTS = "LEDGER_NAME_ALREADY_EXISTS";
const LEDGER_NAME_RESERVED = "LEDGER_NAME_RESERVED";
const DIRECTIVE_LIMIT_EXCEEDED = "DIRECTIVE_LIMIT_EXCEEDED";
const UNBALANCED = "UNBALANCED";
/**
 * The ledger service refused structured entries that would add bean-check
 * errors (w0/m2), the structured twin of the text-append refusal.
 */
const NEW_LEDGER_ERRORS = "NEW_LEDGER_ERRORS";
const RESOURCE_LIMIT_MESSAGE =
  /^(.*?) limit reached\. Maximum: (\d+), Current: (\d+)\./i;

/**
 * What a ledger-service 404 says is missing (w23/047). It names the thing —
 * `Entry with ID 'h' not found` — and dropping that for a bare "Ledger resource
 * not found" told an agent holding a stale entry hash that its ledger was gone.
 * Gitea's generic wording names nothing and keeps the old message.
 */
function notFoundFromUpstream(message: string): NotFoundError {
  const named = /^(.+?) with ID '(.*)' not found$/s.exec(message);
  if (named) {
    const [, resource, id] = named;
    return new NotFoundError(
      resource,
      id,
      resource === "Entry"
        ? "Entry hashes change when an entry is edited or an identical twin is deleted; read fresh ones with `listLedgerEntries`."
        : undefined,
    );
  }
  const informative =
    message.trim() !== "" &&
    !/^(not found|the target couldn't be found\.?)$/i.test(message.trim());
  const notFound = new NotFoundError("Ledger resource");
  if (informative) notFound.message = message;
  return notFound;
}

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
      // Without one, MCP falls back to the CONFLICT category's hint, which is
      // about re-reading an entry's hash — nothing to do with a name (w5/042).
      hint: "Choose a different ledger name. Your existing ledgers are listed by `listLedgers`.",
    });
  }

  // A renamed ledger's former name: no ledger has it, so the existing-name
  // conflict and its "listed by listLedgers" hint would be false (w23/061).
  if (code === LEDGER_NAME_RESERVED) {
    return new ConflictError("Ledger", message, {
      reasonCode: LEDGER_NAME_RESERVED,
      field: "name",
      hint: "Choose a different ledger name. A renamed ledger's old name keeps redirecting to it, so the name stays taken; `listLedgers` lists that ledger under its new name.",
    });
  }

  const resourceLimit = resourceLimitFromError(error);
  if (resourceLimit) return resourceLimit;

  if (code === NEW_LEDGER_ERRORS) {
    const details = error.body?.details;
    const named =
      (typeof details?.detail === "string" && details.detail) || message;
    const count = typeof details?.count === "number" ? details.count : 1;
    // The ledger names the write: "add" for structured entries, "update" or
    // "delete" for source-slice writes (w21/m1). Anything else — an older
    // ledger service sends none — reads as the structured add it used to be.
    const action = details?.action;
    return new NewLedgerErrorsError(
      action === "update" || action === "delete" ? action : "entries",
      count,
      named,
    );
  }

  if (code === UNBALANCED) {
    const details = error.body?.details;
    const residual =
      (typeof details?.residual === "string" && details.residual) || message;
    const entry =
      typeof details?.entry === "number" ? details.entry : undefined;
    return new UnbalancedTransactionError(message, residual, entry);
  }

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
      return notFoundFromUpstream(error.body?.error || "");
    case 409:
      return new ConflictError("Ledger resource", message);
    // The ledger service refused the body: a batch inside this API's own caps
    // can outgrow it re-encoded. As a 5xx it read as "dependency down, retry"
    // to a caller that only had to split it (w23/074).
    case 413:
      return new BadUserInputError(
        "the change is too large to validate in one request; split it into smaller batches",
      );
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
