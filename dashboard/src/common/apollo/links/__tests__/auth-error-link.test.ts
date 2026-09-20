import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import {
  buildUnauthenticatedLoginHref,
  shouldRedirectForUnauthenticatedError,
  locationAsNext,
} from "../auth-error-link";

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

  it("still redirects protected operations after authentication fails", () => {
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

describe("buildUnauthenticatedLoginHref", () => {
  it("sends guests to login without claiming the session expired", () => {
    expect(
      buildUnauthenticatedLoginHref(
        "/ledger/open_ledger/budgeting-envelopes/commits",
      ),
    ).toBe(
      "/auth/login?next=%2Fledger%2Fopen_ledger%2Fbudgeting-envelopes%2Fcommits",
    );
  });

  it("preserves Ask search so login return keeps question and mode", () => {
    const next =
      "/ledger/open_ledger/example/ask?mode=sandbox&q=qa-20260908-login-context+%2B+%E9%9B%B6+%26+savings&lang=en";
    expect(buildUnauthenticatedLoginHref(next)).toBe(
      `/auth/login?next=${encodeURIComponent(next)}`,
    );
  });
});

describe("locationAsNext", () => {
  const at = (pathname: string, search = "", hash = "") =>
    locationAsNext({ pathname, search, hash });

  it("keeps the query a reader had applied", () => {
    expect(at("/ledger/alice/books/journal", "?time=2016")).toBe(
      "/ledger/alice/books/journal?time=2016",
    );
  });

  it("keeps the fragment, with its delimiter intact", () => {
    // A native Location still carries the "#", unlike the router's parsed
    // hash — reassembling those by hand is what glues a fragment onto a query.
    expect(at("/ledger/alice/books/journal", "?time=2016", "#entry-7")).toBe(
      "/ledger/alice/books/journal?time=2016#entry-7",
    );
  });

  it("keeps a fragment that arrives without a query", () => {
    expect(at("/ledger/alice/books/journal", "", "#entry-7")).toBe(
      "/ledger/alice/books/journal#entry-7",
    );
  });

  it("returns a bare path unchanged", () => {
    expect(at("/settings/api-keys")).toBe("/settings/api-keys");
  });

  it("falls back to the root rather than repairing something hostile", () => {
    expect(at("//evil.example/path")).toBe("/");
    expect(at("/%2509/evil.example")).toBe("/");
  });
});
