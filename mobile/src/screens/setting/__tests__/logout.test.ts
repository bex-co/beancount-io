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
    markSignedOut: async () => {
      events.push("mark-signed-out");
    },
  };
}

describe("performLogout", () => {
  it("revokes OAuth refresh access before clearing local account data", async () => {
    const events: string[] = [];
    await performLogout(oauthSession, dependencies(events));
    // w21/153: the next sign-in asks which account, marked after the wipe so
    // the wipe cannot erase it.
    expect(events).toEqual([
      "cancel-refreshes",
      "revoke-oauth",
      "clear-local",
      "mark-signed-out",
    ]);
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
      "mark-signed-out",
    ]);
  });

  // w21/352: revocation on a network that never answers held the sign-out for
  // the OS request timeout, with the account still on the device.
  it("goes on without a revocation that never answers", async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    deps.revokeTimeoutMs = 10;
    deps.revokeOAuth = () => new Promise<void>(() => undefined);

    await performLogout(oauthSession, deps);
    expect(events).toEqual([
      "cancel-refreshes",
      "clear-local",
      "mark-signed-out",
    ]);
  });

  it("does not wait out the timeout when revocation answers", async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    deps.revokeTimeoutMs = 60_000;
    const started = Date.now();
    await performLogout(oauthSession, deps);
    expect(Date.now() - started < 1000).toBe(true);
    expect(events[1]).toBe("revoke-oauth");
  });

  it("allows about five seconds by default", () => {
    const { REVOKE_TIMEOUT_MS } = require("../logout-action");
    expect(REVOKE_TIMEOUT_MS).toBe(5000);
  });
});

describe("the Settings log out button", () => {
  it("ignores repeat taps and shows a busy state", () => {
    const fs = require("fs");
    const path = require("path");
    const src = fs
      .readFileSync(path.join(__dirname, "../main-content.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      src.includes(
        "if(loggingOutRef.current)return;loggingOutRef.current=true;setLoggingOut(true);",
      ),
    ).toBe(true);
    expect(src.includes("busy={loggingOut}")).toBe(true);
    const button = fs
      .readFileSync(path.join(__dirname, "../list-item.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(button.includes("onPress={onPress}disabled={busy}")).toBe(true);
  });
});

// w21/967: a failing step of the wipe left the user signed in on a revoked token.
describe("performLogout when the local wipe fails", () => {
  it("still marks the sign-out and does not reject", async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    deps.clearLocalState = async () => {
      events.push("clear-local");
      throw new Error("Keychain locked");
    };
    await performLogout(oauthSession, deps);
    expect(events).toEqual([
      "cancel-refreshes",
      "revoke-oauth",
      "clear-local",
      "mark-signed-out",
    ]);
  });

  it("clears the session even when the pending authorization will not delete, and the handler still routes", () => {
    const fs = require("fs");
    const path = require("path");
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    const actions = read("common", "server-url-actions.ts");
    expect(
      actions.includes(
        "awaitclearPendingAuthorization().catch(()=>undefined);ledgerVar(null);",
      ),
    ).toBe(true);
    const content = read("screens", "setting", "main-content.tsx");
    expect(content.includes("try{awaitactionLogout(session);}catch{")).toBe(
      true,
    );
    expect(
      content.includes(
        'setLoggingOut(false);}router.replace("/auth/welcome");',
      ),
    ).toBe(true);
  });
});
