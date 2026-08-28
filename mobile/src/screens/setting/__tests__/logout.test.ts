import type { OAuthSession } from "@/common/oauth/session-record";
import { performLogout, type LogoutDependencies } from "../logout-action";

const oauthSession: OAuthSession = {
  kind: "oauth",
  serverUrl: "https://books.example.test/",
  issuer: "https://books.example.test",
  resource: "https://books.example.test/v1",
  tokenEndpoint: "https://books.example.test/api-gateway/oauth/token",
  revocationEndpoint: "https://books.example.test/api-gateway/oauth/revoke",
  clientId: "beancount-mobile",
  userId: "user-1",
  scopes: ["ledger.read"],
  tokenType: "Bearer",
  accessToken: "opaque-access",
  accessTokenExpiresAt: 123_456,
  refreshToken: "opaque-refresh",
};

function dependencies(events: string[]): LogoutDependencies {
  return {
    cancelRefreshes: async () => {
      events.push("cancel-refreshes");
    },
    revokeOAuth: async () => {
      events.push("revoke-oauth");
    },
    revokeLegacy: async (token) => {
      events.push(`revoke-legacy:${token}`);
    },
    clearLocalState: async () => {
      events.push("clear-local");
    },
  };
}

describe("performLogout", () => {
  it("revokes OAuth refresh access before clearing local account data", async () => {
    const events: string[] = [];
    await performLogout(oauthSession, dependencies(events));
    expect(events).toEqual(["cancel-refreshes", "revoke-oauth", "clear-local"]);
  });

  it("preserves the legacy server logout path", async () => {
    const events: string[] = [];
    await performLogout(
      { kind: "legacy", userId: "user-1", authToken: "legacy-token" },
      dependencies(events),
    );
    expect(events[0]).toBe("cancel-refreshes");
    expect(events[1]).toBe("revoke-legacy:legacy-token");
    expect(events[2]).toBe("clear-local");
  });

  it("still clears local state when revocation is offline", async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    deps.revokeOAuth = async () => {
      events.push("revoke-failed");
      throw new Error("offline");
    };

    await performLogout(oauthSession, deps);
    expect(events).toEqual([
      "cancel-refreshes",
      "revoke-failed",
      "clear-local",
    ]);
  });
});
