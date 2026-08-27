import { describe, expect, it } from "vitest";
import { describeMobileScopes } from "../mobile-scope-copy";

const messages: Record<string, string> = {
  "auth.oauthMobileScopeIdentity": "Identify the account you approve",
  "auth.oauthMobileScopeOfflineAccess":
    "Stay signed in securely until you revoke access",
  "auth.oauthMobileScopeRead": "Read your ledgers",
};
const t = (key: string) => messages[key] ?? key;

describe("describeMobileScopes", () => {
  it("shows exactly the requested permissions in request order", () => {
    expect(
      describeMobileScopes("openid ledger.read offline_access", t),
    ).toEqual([
      "Identify the account you approve",
      "Read your ledgers",
      "Stay signed in securely until you revoke access",
    ]);
  });

  it("does not duplicate scopes", () => {
    expect(describeMobileScopes("ledger.read ledger.read", t)).toEqual([
      "Read your ledgers",
    ]);
  });
});
