import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import {
  getErrorMessageKey,
  getNewLedgerErrorDetail,
  getUnbalancedResidual,
  isBilledByStoreError,
  useErrorMessage,
} from "../error-message";

function graphQLError(code?: string): CombinedGraphQLErrors {
  return new CombinedGraphQLErrors({
    errors: [
      {
        message: "raw internal server message",
        ...(code ? { extensions: { code } } : {}),
      },
    ],
  });
}

describe("getErrorMessageKey", () => {
  it.each([
    ["UNAUTHENTICATED", "common.errors.unauthenticated"],
    ["FORBIDDEN", "common.errors.forbidden"],
    ["NOT_FOUND", "common.errors.notFound"],
    ["BAD_USER_INPUT", "common.errors.badUserInput"],
    ["VALIDATION_FAILED", "common.errors.validationFailed"],
    ["CONFLICT", "common.errors.conflict"],
    ["RATE_LIMITED", "common.errors.rateLimited"],
    ["INTERNAL_SERVER_ERROR", "common.errors.internal"],
    ["SERVICE_UNAVAILABLE", "common.errors.serviceUnavailable"],
    ["RESOURCE_LIMIT_REACHED", "common.errors.resourceLimitReached"],
    ["OPERATION_NOT_ALLOWED", "common.errors.operationNotAllowed"],
    ["PREMIUM_REQUIRED", "common.errors.premiumRequired"],
    ["UNBALANCED", "common.errors.unbalanced"],
  ])("maps GraphQL extensions.code %s to %s", (code, expectedKey) => {
    expect(getErrorMessageKey(graphQLError(code))).toBe(expectedKey);
  });

  it.each([
    ["APP_STORE", "common.errors.billedByAppStore"],
    ["GOOGLE_PLAY", "common.errors.billedByGooglePlay"],
  ])("names the store a %s refusal points to", (provider, key) => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: "raw internal server message",
          extensions: { code: "BILLED_BY_STORE", provider },
        },
      ],
    });

    expect(getErrorMessageKey(error)).toBe(key);
    expect(isBilledByStoreError(error)).toBe(true);
  });

  it("does not read another refusal as a store's", () => {
    expect(isBilledByStoreError(graphQLError("FORBIDDEN"))).toBe(false);
  });

  it("falls back to the generic key for unknown GraphQL error codes", () => {
    expect(getErrorMessageKey(graphQLError("SOME_NEW_CODE"))).toBe(
      "common.errors.generic",
    );
  });

  it("falls back to the generic key when a GraphQL error has no code", () => {
    expect(getErrorMessageKey(graphQLError())).toBe("common.errors.generic");
  });

  it("uses the first recognized code among multiple GraphQL errors", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        { message: "no code here" },
        { message: "forbidden", extensions: { code: "FORBIDDEN" } },
      ],
    });
    expect(getErrorMessageKey(error)).toBe("common.errors.forbidden");
  });

  it("maps server (non-2xx) responses to the service-unavailable key", () => {
    const error = new ServerError("Bad Gateway", {
      response: new Response(null, { status: 502 }),
      bodyText: "",
    });
    expect(getErrorMessageKey(error)).toBe("common.errors.serviceUnavailable");
  });

  it.each([
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "Load failed",
  ])("maps the fetch-failure TypeError %j to the network key", (message) => {
    expect(getErrorMessageKey(new TypeError(message))).toBe(
      "common.errors.network",
    );
  });

  it("maps programming-bug TypeErrors to the generic key, not network", () => {
    expect(
      getErrorMessageKey(
        new TypeError("Cannot read properties of undefined (reading 'foo')"),
      ),
    ).toBe("common.errors.generic");
    expect(getErrorMessageKey(new TypeError("x is not a function"))).toBe(
      "common.errors.generic",
    );
  });

  it("maps plain errors, strings, and undefined to the generic key", () => {
    expect(getErrorMessageKey(new Error("boom"))).toBe("common.errors.generic");
    expect(getErrorMessageKey("boom")).toBe("common.errors.generic");
    expect(getErrorMessageKey(undefined)).toBe("common.errors.generic");
  });
});

describe("header filter diagnostics (w0/020)", () => {
  const badInput = (message: string, code = "BAD_USER_INPUT") =>
    new CombinedGraphQLErrors({ errors: [{ message, extensions: { code } }] });

  it("names the Time filter when the period cannot be parsed", () => {
    expect(
      getErrorMessageKey(badInput("Failed to parse date: last mnth")),
    ).toBe("common.errors.invalidTimeFilter");
  });

  it("names the filter expression for its parser errors", () => {
    for (const message of [
      'Illegal character """',
      "Trailing tokens",
      "Unexpected end of filter",
      "Unexpected token RPAREN",
      "Expected STRING, got EOF",
    ]) {
      expect(getErrorMessageKey(badInput(message)), message).toBe(
        "common.errors.invalidFilterExpression",
      );
    }
  });

  it("keeps the generic bad-input message for other diagnostics and codes", () => {
    expect(getErrorMessageKey(badInput("Ledger option missing"))).toBe(
      "common.errors.badUserInput",
    );
    expect(
      getErrorMessageKey(
        badInput("Failed to parse date: x", "INTERNAL_SERVER_ERROR"),
      ),
    ).toBe("common.errors.internal");
  });
});

describe("getUnbalancedResidual", () => {
  const refusal = (extensions: Record<string, unknown>) =>
    new CombinedGraphQLErrors({
      errors: [{ message: "entry 0: does not balance", extensions }],
    });

  it("returns the residual an UNBALANCED refusal names", () => {
    expect(
      getUnbalancedResidual(
        refusal({ code: "UNBALANCED", residual: "0.003 EUR, 1 JPY" }),
      ),
    ).toBe("0.003 EUR, 1 JPY");
  });

  it.each([
    ["another code", { code: "VALIDATION_FAILED", residual: "1 USD" }],
    ["no residual", { code: "UNBALANCED" }],
    ["an unparsed residual", { code: "UNBALANCED", residual: "unknown" }],
  ])("returns null for %s", (_case, extensions) => {
    expect(getUnbalancedResidual(refusal(extensions))).toBeNull();
  });

  it("returns null for errors that are not GraphQL refusals", () => {
    expect(getUnbalancedResidual(new Error("UNBALANCED"))).toBeNull();
  });
});

// A write that would add bean-check errors is refused as VALIDATION_FAILED,
// each new error named in `extensions.newLedgerErrors` (w0/m2). The forms say
// what the write would break instead of "Validation failed".
describe("would-break refusals", () => {
  const refusal = (extensions: Record<string, unknown>) =>
    new CombinedGraphQLErrors({
      errors: [{ message: "Validation failed for entries", extensions }],
    });
  const DUPLICATE_OPEN =
    "Duplicate open directive for Assets:Cash (main.bean:74)";
  const wouldBreak = (named: string, field = "entries") =>
    refusal({ code: "VALIDATION_FAILED", field, newLedgerErrors: named });

  it("names the errors a refused write would add, on either write path", () => {
    expect(getNewLedgerErrorDetail(wouldBreak(DUPLICATE_OPEN))).toBe(
      DUPLICATE_OPEN,
    );
    expect(
      getNewLedgerErrorDetail(
        wouldBreak("A (main.bean:1); B (main.bean:2)", "text"),
      ),
    ).toBe("A (main.bean:1); B (main.bean:2)");
  });

  it.each([
    ["no named errors", { code: "VALIDATION_FAILED", field: "username" }],
    ["another code", { code: "BAD_USER_INPUT", newLedgerErrors: "X" }],
    ["blank named errors", { code: "VALIDATION_FAILED", newLedgerErrors: " " }],
  ])("returns null for %s", (_case, extensions) => {
    expect(getNewLedgerErrorDetail(refusal(extensions))).toBeNull();
  });

  it("returns null for errors that are not GraphQL refusals", () => {
    expect(getNewLedgerErrorDetail(new Error(DUPLICATE_OPEN))).toBeNull();
  });

  it("formats the refusal with what it would break", () => {
    const { result } = renderHook(() => useErrorMessage());
    expect(result.current(wouldBreak(DUPLICATE_OPEN))).toBe(
      `This would add an error to your ledger: ${DUPLICATE_OPEN}`,
    );
    expect(
      result.current(refusal({ code: "VALIDATION_FAILED", field: "entries" })),
    ).toBe("Validation failed. Please review your input and try again.");
  });
});
