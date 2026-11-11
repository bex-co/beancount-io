import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import { describe, expect, it } from "vitest";
import enBql from "../../locales/en";
import { getQueryErrorFeedback, isRetryableQueryError } from "../query-error";

function graphQLError(message: string, code: string) {
  return new CombinedGraphQLErrors({
    errors: [{ message, extensions: { code } }],
  });
}

const UNKNOWN_COLUMN_MESSAGE =
  "Invalid BQL query: Query execution error: column 'nonexistent_column' not found";

describe("getQueryErrorFeedback", () => {
  it("names the column from the engine's unknown-column diagnostic", () => {
    expect(
      getQueryErrorFeedback(
        graphQLError(UNKNOWN_COLUMN_MESSAGE, "BAD_USER_INPUT"),
      ),
    ).toEqual({
      key: "bql.errors.unknownColumn",
      params: { column: "nonexistent_column" },
    });
  });

  it("has an English message that shows the column", () => {
    expect(enBql["bql.errors.unknownColumn"].message).toContain("{column}");
  });

  it("names the unexpected token and its 1-based position for a syntax error", () => {
    expect(
      getQueryErrorFeedback(
        graphQLError(
          "Invalid BQL query: syntax error at position 16: unexpected token 'FROM'",
          "BAD_USER_INPUT",
        ),
      ),
    ).toEqual({
      key: "bql.errors.syntaxError",
      params: { token: "FROM", position: "17" },
    });
    expect(
      getQueryErrorFeedback(
        graphQLError(
          "Invalid BQL query: syntax error at position 0: unexpected token 'SELEC'",
          "BAD_USER_INPUT",
        ),
      ),
    ).toEqual({
      key: "bql.errors.syntaxError",
      params: { token: "SELEC", position: "1" },
    });
  });

  it("has an English syntax message that shows the token and position", () => {
    const message = enBql["bql.errors.syntaxError"].message;
    expect(message).toContain("{token}");
    expect(message).toContain("{position}");
  });

  it("keeps generic feedback for other bad-input diagnostics", () => {
    for (const message of [
      "Invalid BQL query: syntax error at 'FROM'",
      'Invalid BQL query: Query execution error: no function matches "<b>x</b>"',
      "Invalid BQL query: Query execution error: invalid arguments for function LENGTH: expected one argument(s), got 2",
      "Invalid BQL query: syntax error at position 3: unexpected token '<img src=x>'",
      "Invalid BQL query: syntax error at position 3: unexpected token 'a'b'",
    ]) {
      expect(
        getQueryErrorFeedback(graphQLError(message, "BAD_USER_INPUT")),
      ).toEqual({ key: "common.errors.badUserInput" });
    }
  });

  // The engine already explains these mistakes newcomers make; the page
  // showed only "information provided is invalid" (w2/111). These are the
  // recorded production messages.
  it.each([
    [
      'Invalid BQL query: Bare column "position" is not grouped and not aggregated: this query engine would silently report each group\'s first-row value. Add "position" to GROUP BY or wrap it in an aggregate',
      {
        key: "bql.errors.ungroupedColumn",
        params: {
          column: "position",
          groupBy: "GROUP BY",
          sum: "sum()",
          first: "first()",
        },
      },
    ],
    [
      'Invalid BQL query: Query execution error: no function matches "NOSUCHFN"',
      { key: "bql.errors.unknownFunction", params: { name: "nosuchfn" } },
    ],
    [
      "Invalid BQL query: Query execution error: evaluation error: table '#nosuchtable' does not exist. Available system tables: #accounts, #balances, #commodities",
      {
        key: "bql.errors.unknownTable",
        params: {
          table: "#nosuchtable",
          accounts: "#accounts",
          prices: "#prices",
        },
      },
    ],
    [
      "Invalid BQL query: Query execution error: invalid arguments for function LENGTH: expected 1 argument(s), got 2",
      {
        key: "bql.errors.argumentCount",
        params: { name: "length", count: 1, got: "2" },
      },
    ],
    [
      "Invalid BQL query: Query execution error: type error: EMPTY expects an inventory",
      { key: "bql.errors.typeError" },
    ],
    [
      "Invalid BQL query: Query execution error: type error: cannot compare values",
      { key: "bql.errors.typeError" },
    ],
  ])("explains %s", (message, feedback) => {
    expect(
      getQueryErrorFeedback(graphQLError(message, "BAD_USER_INPUT")),
    ).toEqual(feedback);
  });

  it("states argument counts as plural messages with a numeric count", () => {
    expect(enBql["bql.errors.argumentCount_one"].message).toContain("{count}");
    expect(enBql["bql.errors.argumentCount_other"].message).toContain(
      "{count}",
    );
  });

  it("offers a retry only when running the query again could succeed", () => {
    expect(
      isRetryableQueryError(
        graphQLError(UNKNOWN_COLUMN_MESSAGE, "BAD_USER_INPUT"),
      ),
    ).toBe(false);
    expect(
      isRetryableQueryError(graphQLError("boom", "INTERNAL_SERVER_ERROR")),
    ).toBe(true);
    expect(isRetryableQueryError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("ignores the diagnostic shape outside BAD_USER_INPUT", () => {
    expect(
      getQueryErrorFeedback(
        graphQLError(UNKNOWN_COLUMN_MESSAGE, "INTERNAL_SERVER_ERROR"),
      ),
    ).toEqual({ key: "common.errors.internal" });
    expect(
      getQueryErrorFeedback(
        graphQLError(UNKNOWN_COLUMN_MESSAGE, "SERVICE_UNAVAILABLE"),
      ),
    ).toEqual({ key: "common.errors.serviceUnavailable" });
  });

  it("never interpolates an HTML-like or non-identifier column", () => {
    for (const column of ["<img src=x onerror=alert(1)>", "a b", "x'y", ""]) {
      expect(
        getQueryErrorFeedback(
          graphQLError(`column '${column}' not found`, "BAD_USER_INPUT"),
        ),
      ).toEqual({ key: "common.errors.badUserInput" });
    }
  });

  it("falls back for non-GraphQL failures", () => {
    expect(getQueryErrorFeedback(new Error(UNKNOWN_COLUMN_MESSAGE))).toEqual({
      key: "common.errors.generic",
    });
    expect(
      getQueryErrorFeedback(
        new ServerError("bad gateway", {
          response: new Response(null, { status: 502 }),
          bodyText: "",
        }),
      ),
    ).toEqual({ key: "common.errors.serviceUnavailable" });
  });

  describe("current parser form (w4/971)", () => {
    const found = (position: number) =>
      graphQLError(
        `Invalid BQL query: syntax error at position ${position}: found ')' expected one of: identifier, '*'`,
        "BAD_USER_INPUT",
      );

    it.each([
      ["ASCII", "SELECT 'ab' AS label FROM )", 26],
      ["Japanese", "SELECT '日本' AS label FROM )", 30],
    ])(
      "names the token at its 1-based character for %s text, from a UTF-8 byte offset",
      (_, query, bytes) => {
        expect(getQueryErrorFeedback(found(bytes), query)).toEqual({
          key: "bql.errors.syntaxError",
          params: { token: ")", position: "27" },
        });
      },
    );

    it("keeps generic feedback when the offset does not land on that token", () => {
      const generic = getQueryErrorFeedback(
        found(26),
        "SELECT '日本' AS label FROM )",
      );
      expect(generic.key).not.toBe("bql.errors.syntaxError");
      expect(getQueryErrorFeedback(found(30), "SELECT 1")).toEqual(generic);
      expect(getQueryErrorFeedback(found(26)).key).toBe(generic.key);
    });

    it("never shows the expected-token list", () => {
      const feedback = getQueryErrorFeedback(
        found(26),
        "SELECT 'ab' AS label FROM )",
      );
      expect(JSON.stringify(feedback)).not.toContain("expected");
    });
  });
});
