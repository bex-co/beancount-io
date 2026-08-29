import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import { shouldRedirectForUnauthenticatedError } from "../auth-error-link";

function graphQLError(code: string): CombinedGraphQLErrors {
  return new CombinedGraphQLErrors({
    errors: [{ message: "request failed", extensions: { code } }],
  });
}

describe("shouldRedirectForUnauthenticatedError", () => {
  it.each(["GetCurrentUser", "IsAuthenticated"])(
    "keeps the nullable identity probe %s on public pages",
    (operationName) => {
      expect(
        shouldRedirectForUnauthenticatedError(
          graphQLError("UNAUTHENTICATED"),
          operationName,
        ),
      ).toBe(false);
    },
  );

  it("still redirects protected operations after a session expires", () => {
    expect(
      shouldRedirectForUnauthenticatedError(
        graphQLError("UNAUTHENTICATED"),
        "GetLedgerSettings",
      ),
    ).toBe(true);
  });

  it("keeps expected authentication-flow failures on their current page", () => {
    expect(
      shouldRedirectForUnauthenticatedError(
        graphQLError("UNAUTHENTICATED"),
        "SignIn",
      ),
    ).toBe(false);
  });

  it("ignores errors that are not authentication failures", () => {
    expect(
      shouldRedirectForUnauthenticatedError(
        graphQLError("FORBIDDEN"),
        "GetLedgerSettings",
      ),
    ).toBe(false);
  });
});
