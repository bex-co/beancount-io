import fs from "fs";
import path from "path";

/**
 * w21/071: an auth-error sign-out ran only the session and cache teardown, so
 * the next account on the device resumed the previous one's Create Ledger
 * draft and kept its Recent accounts and merchant overrides. Checked on the
 * source: the link needs expo-router, which the unit runner cannot load.
 */
const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");

describe("the auth-error sign-out", () => {
  const source = read("error-handling.ts");

  it("runs the same cleanup as Log out", () => {
    expect(
      source.includes(
        ".then(({ clearServerScopedState }) => clearServerScopedState())",
      ),
    ).toBe(true);
    expect(source.includes("teardownSessionCaches(")).toBe(false);
  });

  it("still routes to Welcome once per burst of errors", () => {
    expect(source.includes("if (!teardownInFlight) {")).toBe(true);
    expect(source.includes('router.replace("/auth/welcome");')).toBe(true);
  });

  it("clears the draft, usage, overrides and selected ledger in that cleanup", () => {
    const cleanup = read("..", "server-url-actions.ts");
    for (const step of [
      "ledgerVar(null);",
      "accountUsageVar({});",
      "merchantRecurringOverridesVar({});",
      // w21/115: Transactions' filters, which outlived the session.
      "resetTransactionFilters();",
      "clearCreateLedgerDraft(),",
      "await clearPendingAuthorization().catch(() => undefined);",
    ]) {
      expect(cleanup.includes(step)).toBe(true);
    }
  });
});

// w21/119: an involuntary sign-out left Welcome silent about why.
describe("the session-ended reason", () => {
  it("is set by both auth teardowns, not by Log out", () => {
    expect(
      read("error-handling.ts").includes('signOutReasonVar("sessionEnded");'),
    ).toBe(true);
    expect(
      read("..", "oauth", "oauth-token-manager.ts").includes(
        'signOutReasonVar("sessionEnded");',
      ),
    ).toBe(true);
    expect(
      read("..", "server-url-actions.ts").includes("signOutReasonVar"),
    ).toBe(false);
  });
});
