import { useCallback, useEffect, useRef } from "react";
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
  RESOURCE_LIMIT_REACHED: "common.errors.resourceLimitReached",
  OPERATION_NOT_ALLOWED: "common.errors.operationNotAllowed",
  PREMIUM_REQUIRED: "common.errors.premiumRequired",
};

const GENERIC_ERROR_KEY = "common.errors.generic";

/**
 * Resolve any thrown value (ApolloError, fetch failure, plain Error, …) to
 * the i18n key of a human-readable, localized message.
 *
 * Pass the result to `t()`: `t(getErrorMessageKey(error))`, or use
 * {@link useErrorMessage} / the `error` prop on `ReportErrorState`.
 */
export function getErrorMessageKey(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    for (const gqlError of error.errors) {
      const code = gqlError.extensions?.code;
      if (typeof code === "string" && code in ERROR_CODE_TO_KEY) {
        return ERROR_CODE_TO_KEY[code];
      }
    }
    return GENERIC_ERROR_KEY;
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

  return GENERIC_ERROR_KEY;
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
  return useCallback(
    (error: unknown) => tRef.current(getErrorMessageKey(error)),
    [],
  );
}
