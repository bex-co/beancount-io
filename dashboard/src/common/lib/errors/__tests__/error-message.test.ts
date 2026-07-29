import { describe, it, expect } from "vitest";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { getErrorMessageKey } from "../error-message";

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
  ])("maps GraphQL extensions.code %s to %s", (code, expectedKey) => {
    expect(getErrorMessageKey(graphQLError(code))).toBe(expectedKey);
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
