import type { OAuthSession } from "../session-record";
import { initializeSignedInAccount } from "../signed-in-account";

const session: OAuthSession = {
  kind: "oauth",
  serverUrl: "https://books.example.test/",
  issuer: "https://books.example.test",
  resource: "https://books.example.test/v1",
  tokenEndpoint: "https://books.example.test/oauth/token",
  revocationEndpoint: "https://books.example.test/oauth/revoke",
  clientId: "beancount-mobile",
  userId: "user-1",
  scopes: ["ledger.read"],
  tokenType: "Bearer",
  accessToken: "opaque-access",
  accessTokenExpiresAt: 10_000,
  refreshToken: "opaque-refresh",
};

function dependencies(
  events: string[],
  ledgerIds: string[],
  selected: { value: string | null },
) {
  return {
    identify: (userId: string) => events.push(`identify:${userId}`),
    track: (event: "logged_in" | "signed_up") => events.push(`track:${event}`),
    listLedgerIds: async () => ledgerIds,
    getSelectedLedger: () => selected.value,
    setSelectedLedger: (ledgerId: string | null) => {
      selected.value = ledgerId;
      events.push(`ledger:${ledgerId ?? "none"}`);
    },
    navigateToApp: () => events.push("navigate"),
    reportLedgerLoadFailure: () => events.push("ledger-error"),
  };
}

describe("initializeSignedInAccount", () => {
  it("identifies, tracks, selects a valid default ledger, then navigates", async () => {
    const events: string[] = [];
    const selected = { value: "old/ledger" as string | null };

    await initializeSignedInAccount(
      session,
      "sign_up",
      dependencies(events, ["ada/books", "ada/work"], selected),
    );

    expect(selected.value).toBe("ada/books");
    expect(events).toEqual([
      "identify:user-1",
      "track:signed_up",
      "ledger:ada/books",
      "navigate",
    ]);
  });

  it("keeps a valid selected ledger", async () => {
    const events: string[] = [];
    const selected = { value: "ada/work" as string | null };

    await initializeSignedInAccount(
      session,
      "sign_in",
      dependencies(events, ["ada/books", "ada/work"], selected),
    );

    expect(selected.value).toBe("ada/work");
    expect(events).toEqual(["identify:user-1", "track:logged_in", "navigate"]);
  });

  it("still navigates when the post-login ledger query is offline", async () => {
    const events: string[] = [];
    const selected = { value: null as string | null };
    const deps = dependencies(events, [], selected);
    deps.listLedgerIds = async () => {
      throw new Error("offline");
    };

    await initializeSignedInAccount(session, "sign_in", deps);

    expect(events).toEqual([
      "identify:user-1",
      "track:logged_in",
      "ledger-error",
      "navigate",
    ]);
  });
});
