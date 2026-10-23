import { isLedgerGone } from "../graphql-error-codes";

// w21/054: a ledger deleted on the web left every Home card on "Failed to
// load · Try again"; the guard now says it is gone.
describe("isLedgerGone", () => {
  it("is true for a NOT_FOUND answer", () => {
    expect(
      isLedgerGone({ graphQLErrors: [{ extensions: { code: "NOT_FOUND" } }] }),
    ).toBe(true);
  });

  // w21/859: the repository is there; only its main.bean is missing, and Files
  // is how it is repaired.
  it("is false for a ledger whose entry point is missing", () => {
    expect(
      isLedgerGone({
        graphQLErrors: [
          {
            message:
              "Ledger entry point with ID 'alice/books:main.bean' not found",
            extensions: { code: "NOT_FOUND" },
          },
        ],
      }),
    ).toBe(false);
    // A missing ledger, or a message without the entry point, still is gone.
    expect(
      isLedgerGone({
        graphQLErrors: [
          {
            message: "Ledger 'alice/books' not found",
            extensions: { code: "NOT_FOUND" },
          },
        ],
      }),
    ).toBe(true);
  });

  it("is false for a network or other failure", () => {
    expect(isLedgerGone(new Error("Network request failed"))).toBe(false);
    expect(
      isLedgerGone({
        graphQLErrors: [{ extensions: { code: "SERVICE_UNAVAILABLE" } }],
      }),
    ).toBe(false);
    expect(isLedgerGone(undefined)).toBe(false);
  });

  it("is what LedgerGuard renders its unavailable state on", () => {
    const guard = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "components",
        "ledger-guard",
        "ledger-guard.tsx",
      ),
      "utf8",
    ) as string;
    expect(
      guard.includes(
        "const gone = Boolean(ledgerId) && isLedgerGone(readContext.error);",
      ),
    ).toBe(true);
    expect(guard.includes('t("ledgerGoneTitle")')).toBe(true);
    expect(guard.includes("directory?.refresh()")).toBe(true);
  });
});
