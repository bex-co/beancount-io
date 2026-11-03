import { EntryWriteMaybeSavedError } from "@/common/lib/entry-write/entry-write";
import { useCallback, useEffect, useRef } from "react";
import { storeCopy } from "@/common/lib/subscription/store-copy";
import {
  CombinedGraphQLErrors,
  ServerError,
  ServerParseError,
} from "@apollo/client/errors";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Maps backend error categories (surfaced as `extensions.code` on GraphQL
 * errors — see backend-cluster/backend-v2/src/shared/errors/) to localized
 * message keys. Raw server `error.message` strings are never shown to users;
 * they are internals meant for logs.
 */
const ERROR_CODE_TO_KEY: Record<string, string> = {
  UNAUTHENTICATED: "common.errors.unauthenticated",
  FORBIDDEN: "common.errors.forbidden",
  NOT_FOUND: "common.errors.notFound",
  BAD_USER_INPUT: "common.errors.badUserInput",
  VALIDATION_FAILED: "common.errors.validationFailed",
  CONFLICT: "common.errors.conflict",
  RATE_LIMITED: "common.errors.rateLimited",
  INTERNAL_SERVER_ERROR: "common.errors.internal",
  SERVICE_UNAVAILABLE: "common.errors.serviceUnavailable",
  OPERATION_NOT_ALLOWED: "common.errors.operationNotAllowed",
  PREMIUM_REQUIRED: "common.errors.premiumRequired",
  UNBALANCED: "common.errors.unbalanced",
};

const GENERIC_ERROR_KEY = "common.errors.generic";

/**
 * A limit's words by whose plan set it (ADR 001 D13). The owner's limit reads
 * true for either reader, because the refusal cannot say who asked; a limit no
 * plan sets carries no owner, and upgrading will not lift it.
 */
const LIMIT_KEYS: Readonly<Record<string, string>> = {
  REQUESTER: "common.errors.resourceLimitReached",
  LEDGER_OWNER: "common.errors.ownerLimitReached",
};
const limitKey = (owner: unknown) =>
  (typeof owner === "string" && LIMIT_KEYS[owner]) ||
  "common.errors.limitReached";

/**
 * Resolve any thrown value (ApolloError, fetch failure, plain Error, …) to
 * the i18n key of a human-readable, localized message.
 *
 * Pass the result to `t()`: `t(getErrorMessageKey(error))`, or use
 * {@link useErrorMessage} / the `error` prop on `ReportErrorState`.
 */
/**
 * The ledger's own filter diagnostics (`directive-filter.ts`), forwarded as
 * BAD_USER_INPUT. They name which header filter failed, which the generic
 * "information provided is invalid" did not (w0/020). Only the category is
 * used; the server text itself is never shown.
 */
const TIME_FILTER_ERROR = /^Failed to parse date:/;
const ADVANCED_FILTER_ERROR =
  /^(?:Illegal character|Trailing tokens|Unexpected end of filter|Unexpected token|Expected .+, got|Expected : or comparison|Filter pattern exceeds)/;

/**
 * The catalog key for `error`. `fallbackKey` replaces the generic "something
 * went wrong" for an error the app has no words for, so an action can keep its
 * own failure text.
 */
export function getErrorMessageKey(
  error: unknown,
  fallbackKey: string = GENERIC_ERROR_KEY,
): string {
  // requireAuth's outage throw (w3/646), recognized by name so it survives
  // SSR error serialization; it carries the probe failure's own key.
  if (error instanceof Error && error.name === "AuthUnavailableError") {
    const key = (error as { messageKey?: unknown }).messageKey;
    return typeof key === "string" && key.startsWith("common.errors.")
      ? key
      : "common.errors.serviceUnavailable";
  }

  // A retry-safe write still in progress after every retry (w3/m61).
  if (error instanceof EntryWriteMaybeSavedError) {
    return "common.errors.entryMaybeSaved";
  }

  if (CombinedGraphQLErrors.is(error)) {
    for (const gqlError of error.errors) {
      if (gqlError.extensions?.code !== "BAD_USER_INPUT") continue;
      if (TIME_FILTER_ERROR.test(gqlError.message)) {
        return "common.errors.invalidTimeFilter";
      }
      if (ADVANCED_FILTER_ERROR.test(gqlError.message)) {
        return "common.errors.invalidFilterExpression";
      }
    }
    for (const gqlError of error.errors) {
      const code = gqlError.extensions?.code;
      if (code === "RESOURCE_LIMIT_REACHED") {
        return limitKey(gqlError.extensions?.limitOwner);
      }
      if (code === "BILLED_BY_STORE") {
        return storeCopy(gqlError.extensions?.provider).refusal;
      }
      if (typeof code === "string" && code in ERROR_CODE_TO_KEY) {
        return ERROR_CODE_TO_KEY[code];
      }
    }
    return fallbackKey;
  }

  // Non-2xx / unparseable responses from the API gateway.
  if (ServerError.is(error) || ServerParseError.is(error)) {
    return "common.errors.serviceUnavailable";
  }

  // fetch() rejects with a TypeError when the network request itself fails
  // (offline, DNS, CORS) — before any server response exists. Only the known
  // per-browser fetch-failure messages are treated as network errors; any
  // other TypeError is almost certainly a programming bug and must not be
  // reported to the user as a connectivity problem.
  if (error instanceof TypeError && isFetchFailureMessage(error.message)) {
    return "common.errors.network";
  }

  return fallbackKey;
}

/** Whether a refusal is a limit the ledger owner's plan sets. */
export function isOwnerLimitError(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (gqlError) =>
        gqlError.extensions?.code === "RESOURCE_LIMIT_REACHED" &&
        gqlError.extensions?.limitOwner === "LEDGER_OWNER",
    )
  );
}

/** Whether a store bills the plan a Stripe action just tried to change. */
export function isBilledByStoreError(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (gqlError) => gqlError.extensions?.code === "BILLED_BY_STORE",
    )
  );
}

/**
 * The residual an UNBALANCED refusal names (`"1 USD"`, `"0.003 EUR, 1 JPY"`),
 * so an entry form can say how far off the postings are; `null` for any
 * other error.
 */
export function getUnbalancedResidual(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const gqlError of error.errors) {
    const { code, residual } = gqlError.extensions ?? {};
    if (
      code === "UNBALANCED" &&
      typeof residual === "string" &&
      residual !== "" &&
      residual !== "unknown"
    ) {
      return residual;
    }
  }
  return null;
}

/**
 * What a would-break refusal names: a write that would add bean-check errors
 * is refused as VALIDATION_FAILED, each new error named in
 * `extensions.newLedgerErrors` (w0/m2). That text is the ledger's own
 * diagnostic — account names and file:line — so, like the UNBALANCED
 * residual, it is shown; `null` for any other error.
 */
export function getNewLedgerErrorDetail(error: unknown): string | null {
  if (!CombinedGraphQLErrors.is(error)) return null;
  for (const gqlError of error.errors) {
    const { code, newLedgerErrors } = gqlError.extensions ?? {};
    if (code === "VALIDATION_FAILED" && typeof newLedgerErrors === "string") {
      const detail = newLedgerErrors.trim();
      if (detail) return detail;
    }
  }
  return null;
}

const FETCH_FAILURE_MESSAGES = [
  "failed to fetch", // Chromium
  "networkerror when attempting to fetch resource", // Firefox
  "load failed", // Safari
];

function isFetchFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return FETCH_FAILURE_MESSAGES.some((pattern) => normalized.includes(pattern));
}

/**
 * Hook returning a stable formatter that resolves any error to a localized,
 * user-safe message string. Intended for imperative contexts (toasts,
 * mutation callbacks):
 *
 * ```tsx
 * const formatError = useErrorMessage();
 * mutate().catch((error) => toast.error(formatError(error)));
 * ```
 *
 * The returned function keeps a stable identity across renders (it reads the
 * latest `t` through a ref), so it is safe in effect/callback dependency
 * arrays without re-triggering them.
 */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslations();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  });
  return useCallback((error: unknown) => {
    const detail = getNewLedgerErrorDetail(error);
    return detail
      ? tRef.current("common.errors.wouldBreakLedger", { detail })
      : tRef.current(getErrorMessageKey(error));
  }, []);
}
