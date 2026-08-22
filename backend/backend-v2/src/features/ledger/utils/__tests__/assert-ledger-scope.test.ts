import { assertLedgerScope } from "../authorize-ledger";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

/**
 * Regression coverage for a review finding on w1/m19: verbs with no
 * `authorizeLedger` seam of their own (Plaid, receipt parsing/insertion) were
 * reconstructing a full-trust `trustedIdentity(userId)` and losing the real
 * OAuth grant's `ledgerScope` in the process — an OAuth token pinned to ledger
 * A could reach ledger B through those verbs whenever the underlying user
 * happened to be a collaborator on B. `assertLedgerScope` is the fix: call it
 * with the REAL identity at every boundary where a caller-supplied `ledgerId`
 * is read, before any service call happens.
 */
describe("assertLedgerScope", () => {
  function scopedTo(ledgerId: string): Identity {
    return {
      userId: "user-1",
      method: "oauth",
      ledgerScope: ledgerId,
      scopes: new Set(["ledger.read", "ledger.write"]),
      capabilityExempt: false,
    };
  }

  it("allows a request for the ledger the grant is pinned to", () => {
    expect(() => assertLedgerScope(scopedTo("alice/main"), "alice/main")).not.toThrow();
  });

  it("rejects a request for a different ledger than the grant is pinned to", () => {
    expect(() => assertLedgerScope(scopedTo("alice/main"), "alice/other")).toThrow(
      ForbiddenError,
    );
  });

  it("allows any ledger for an unpinned identity (session, or an unpinned OAuth grant)", () => {
    const unpinned: Identity = {
      userId: "user-1",
      method: "session",
      scopes: new Set(),
      capabilityExempt: true,
    };
    expect(() => assertLedgerScope(unpinned, "alice/main")).not.toThrow();
    expect(() => assertLedgerScope(unpinned, "bob/other")).not.toThrow();
  });

  it("allows any ledger when there is no identity at all", () => {
    expect(() => assertLedgerScope(undefined, "alice/main")).not.toThrow();
  });
});
