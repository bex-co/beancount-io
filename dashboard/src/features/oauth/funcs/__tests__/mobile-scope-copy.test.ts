import { describe, expect, it } from "vitest";
import { describeMobileScopes } from "../mobile-scope-copy";

describe("describeMobileScopes", () => {
  it("shows exactly the requested permissions in request order", () => {
    expect(describeMobileScopes("openid ledger.read offline_access")).toEqual([
      "Identify the account you approve",
      "Read your ledgers",
      "Stay signed in securely until you revoke access",
    ]);
  });

  it("does not duplicate scopes", () => {
    expect(describeMobileScopes("ledger.read ledger.read")).toEqual([
      "Read your ledgers",
    ]);
  });
});
