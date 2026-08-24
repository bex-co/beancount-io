import type { OAuthSession } from "../session-record";
import type { PendingOAuthAuthorization } from "../authorization-result";
import { createAuthorizationCompleter } from "../authorization-completer";

const issuer = "https://books.example.test";
const callback =
  "io.beancount.ios:/oauth/callback?code=opaque-code&state=expected-state&iss=https%3A%2F%2Fbooks.example.test";
const pending: PendingOAuthAuthorization = {
  flow: "sign_in",
  serverUrl: `${issuer}/`,
  resource: `${issuer}/v1`,
  issuer,
  authorizationEndpoint: `${issuer}/api-gateway/oauth/auth`,
  tokenEndpoint: `${issuer}/api-gateway/oauth/token`,
  revocationEndpoint: `${issuer}/api-gateway/oauth/revoke`,
  clientId: "beancount-mobile",
  scopes: [
    "openid",
    "offline_access",
    "ledger.read",
    "ledger.write",
    "ledger.admin",
  ],
  redirectUri: "io.beancount.ios:/oauth/callback",
  state: "expected-state",
  codeVerifier: "secret-verifier",
  createdAt: Date.now(),
};
const session: OAuthSession = {
  kind: "oauth",
  serverUrl: `${issuer}/`,
  issuer,
  resource: `${issuer}/v1`,
  tokenEndpoint: `${issuer}/api-gateway/oauth/token`,
  revocationEndpoint: `${issuer}/api-gateway/oauth/revoke`,
  clientId: "beancount-mobile",
  userId: "user-1",
  scopes: [...pending.scopes],
  tokenType: "Bearer",
  accessToken: "opaque-access",
  accessTokenExpiresAt: Date.now() + 3_600_000,
  refreshToken: "opaque-refresh",
};

async function captureFailure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

describe("OAuth authorization completion", () => {
  it("deduplicates warm and cold handling and consumes the verifier before exchange", async () => {
    const events: string[] = [];
    let releaseExchange!: () => void;
    const complete = createAuthorizationCompleter({
      loadPending: async () => {
        events.push("load");
        return pending;
      },
      clearPending: async () => {
        events.push("clear");
      },
      exchange: async (_pending, code) => {
        events.push(`exchange:${code}`);
        await new Promise<void>((resolve) => {
          releaseExchange = resolve;
        });
        return session;
      },
      persist: async () => {
        events.push("persist");
      },
      afterPersist: async () => {
        events.push("after-persist");
      },
    });

    const warm = complete(callback);
    const cold = complete(callback);
    await Promise.resolve();
    await Promise.resolve();
    releaseExchange();

    const [warmSession, coldSession] = await Promise.all([warm, cold]);
    expect(warmSession).toBe(session);
    expect(coldSession).toBe(session);
    expect(events).toEqual([
      "load",
      "clear",
      "exchange:opaque-code",
      "persist",
      "after-persist",
    ]);
  });

  it("does not let a mismatched deep link consume the legitimate request", async () => {
    let clears = 0;
    const complete = createAuthorizationCompleter({
      loadPending: async () => pending,
      clearPending: async () => {
        clears += 1;
      },
      exchange: async () => session,
      persist: async () => {},
      afterPersist: async () => {},
    });

    const error = (await captureFailure(
      complete(callback.replace("expected-state", "attacker-state")),
    )) as { code?: string };
    expect(error.code).toBe("invalid_response");
    expect(clears).toBe(0);
  });

  it("clears a validated cancellation without creating a session", async () => {
    let clears = 0;
    let exchanges = 0;
    const complete = createAuthorizationCompleter({
      loadPending: async () => pending,
      clearPending: async () => {
        clears += 1;
      },
      exchange: async () => {
        exchanges += 1;
        return session;
      },
      persist: async () => {},
      afterPersist: async () => {},
    });

    const error = (await captureFailure(
      complete(callback.replace("code=opaque-code", "error=access_denied")),
    )) as { code?: string; cancelled?: boolean };
    expect(error.code).toBe("access_denied");
    expect(error.cancelled).toBe(true);
    expect(clears).toBe(1);
    expect(exchanges).toBe(0);
  });
});
