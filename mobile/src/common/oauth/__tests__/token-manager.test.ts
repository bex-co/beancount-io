import type { OAuthSession, Session } from "../session-record";
import {
  OAuthRefreshError,
  OAuthTokenManager,
  revokeOAuthSession,
} from "../token-manager";

const serverUrl = "https://books.example.test/";

function oauth(overrides: Partial<OAuthSession> = {}): OAuthSession {
  return {
    kind: "oauth",
    serverUrl,
    issuer: "https://books.example.test",
    resource: "https://books.example.test/v1",
    tokenEndpoint: "https://books.example.test/api-gateway/oauth/token",
    revocationEndpoint: "https://books.example.test/api-gateway/oauth/revoke",
    clientId: "beancount-mobile",
    userId: "user-1",
    scopes: ["ledger.read"],
    tokenType: "Bearer",
    accessToken: "access-old",
    accessTokenExpiresAt: 1_000,
    refreshToken: "refresh-old",
    ...overrides,
  };
}

function jsonResponse(ok: boolean, body: object): Response {
  return { ok, json: async () => body } as Response;
}

async function captureFailure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

describe("OAuthTokenManager", () => {
  it("shares one refresh and releases callers after rotated credentials persist", async () => {
    let current: Session | null = oauth();
    let fetches = 0;
    const events: string[] = [];
    const manager = new OAuthTokenManager({
      getSession: () => current,
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (async () => {
        fetches += 1;
        return jsonResponse(true, {
          access_token: "access-new",
          refresh_token: "refresh-new",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "ledger.read",
        });
      }) as typeof fetch,
      persistSession: async (session) => {
        await Promise.resolve();
        current = session;
        events.push("persisted");
      },
      onTerminalFailure: async () => {
        events.push("terminal");
      },
    });

    const [first, second] = await Promise.all([
      manager.getAccessToken(),
      manager.getAccessToken(),
    ]);
    events.push("released");
    expect([first, second]).toEqual(["access-new", "access-new"]);
    expect(fetches).toBe(1);
    expect(events).toEqual(["persisted", "released"]);
    expect((current as OAuthSession).refreshToken).toBe("refresh-new");
  });

  it("keeps the session on offline and server failures", async () => {
    const session = oauth();
    let terminalCalls = 0;
    const manager = new OAuthTokenManager({
      getSession: () => session,
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (async () => {
        throw new Error("offline");
      }) as typeof fetch,
      persistSession: async () => {
        throw new Error("must not persist");
      },
      onTerminalFailure: async () => {
        terminalCalls += 1;
      },
    });
    const error = await captureFailure(manager.getAccessToken());
    expect(error instanceof OAuthRefreshError).toBe(true);
    expect((error as OAuthRefreshError).terminal).toBe(false);
    expect(terminalCalls).toBe(0);
  });

  it("clears exactly once for concurrent invalid_grant callers", async () => {
    const session = oauth();
    let terminalCalls = 0;
    const manager = new OAuthTokenManager({
      getSession: () => session,
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (async () =>
        jsonResponse(false, { error: "invalid_grant" })) as typeof fetch,
      persistSession: async () => {},
      onTerminalFailure: async () => {
        terminalCalls += 1;
      },
    });
    await Promise.all([
      captureFailure(manager.getAccessToken()),
      captureFailure(manager.getAccessToken()),
    ]);
    expect(terminalCalls).toBe(1);
  });

  it("never sends a credential to another selected server or resource", async () => {
    let fetches = 0;
    const manager = new OAuthTokenManager({
      getSession: () => oauth({ resource: "https://attacker.example/v1" }),
      getServerUrl: () => serverUrl,
      fetcher: (async () => {
        fetches += 1;
        return jsonResponse(true, {});
      }) as typeof fetch,
      persistSession: async () => {},
      onTerminalFailure: async () => {},
    });
    expect(await manager.getAccessToken()).toBe(undefined);
    expect(fetches).toBe(0);
  });

  it("never sends a credential to a token or revocation endpoint off issuer", async () => {
    let fetches = 0;
    const unsafe = oauth({
      tokenEndpoint: "https://attacker.example/token",
      revocationEndpoint: "https://attacker.example/revoke",
    });
    const fetcher = (async () => {
      fetches += 1;
      return jsonResponse(true, {});
    }) as typeof fetch;
    const manager = new OAuthTokenManager({
      getSession: () => unsafe,
      getServerUrl: () => serverUrl,
      fetcher,
      persistSession: async () => {},
      onTerminalFailure: async () => {},
    });

    expect(await manager.getAccessToken()).toBe(undefined);
    expect(
      await captureFailure(revokeOAuthSession(unsafe, fetcher)),
    ).toBeTruthy();
    expect(fetches).toBe(0);
  });

  it("treats durable rotation failure as transient and does not release a token", async () => {
    const manager = new OAuthTokenManager({
      getSession: () => oauth(),
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (async () =>
        jsonResponse(true, {
          access_token: "access-new",
          refresh_token: "refresh-new",
          token_type: "Bearer",
          expires_in: 3600,
        })) as typeof fetch,
      persistSession: async () => {
        throw new Error("secure store unavailable");
      },
      onTerminalFailure: async () => {},
    });

    const error = await captureFailure(manager.getAccessToken());
    expect(error instanceof OAuthRefreshError).toBe(true);
    expect((error as OAuthRefreshError).terminal).toBe(false);
  });

  it("rejects scope drift and non-finite expiries without persisting", async () => {
    for (const responseBody of [
      {
        access_token: "access-expanded",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "ledger.read ledger.write",
      },
      {
        access_token: "access-unbounded",
        token_type: "Bearer",
        expires_in: Number.POSITIVE_INFINITY,
        scope: "ledger.read",
      },
    ]) {
      let persists = 0;
      const manager = new OAuthTokenManager({
        getSession: () => oauth(),
        getServerUrl: () => serverUrl,
        now: () => 10_000,
        fetcher: (async () => jsonResponse(true, responseBody)) as typeof fetch,
        persistSession: async () => {
          persists += 1;
        },
        onTerminalFailure: async () => {},
      });

      const error = await captureFailure(manager.getAccessToken());
      expect(error instanceof OAuthRefreshError).toBe(true);
      expect((error as OAuthRefreshError).terminal).toBe(false);
      expect(persists).toBe(0);
    }
  });

  it("returns a valid token without refreshing", async () => {
    const manager = new OAuthTokenManager({
      getSession: () => oauth({ accessTokenExpiresAt: 100_000 }),
      getServerUrl: () => serverUrl,
      now: () => 1_000,
      persistSession: async () => {},
      onTerminalFailure: async () => {},
    });
    expect(await manager.getAccessToken()).toBe("access-old");
  });

  it("cannot persist an old refresh after logout starts", async () => {
    let current: Session | null = oauth();
    let releaseResponse!: (response: Response) => void;
    let persists = 0;
    const manager = new OAuthTokenManager({
      getSession: () => current,
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (() =>
        new Promise<Response>((resolve) => {
          releaseResponse = resolve;
        })) as typeof fetch,
      persistSession: async (session) => {
        persists += 1;
        current = session;
      },
      onTerminalFailure: async () => {},
    });

    const refresh = manager.getAccessToken();
    const cancellation = manager.cancelPendingRefreshes();
    current = null;
    releaseResponse(
      jsonResponse(true, {
        access_token: "access-too-late",
        refresh_token: "refresh-too-late",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    );

    const error = await captureFailure(refresh);
    await cancellation;
    expect(error instanceof OAuthRefreshError).toBe(true);
    expect(persists).toBe(0);
    expect(current).toBe(null);
  });

  it("does not let a new account join an old account's refresh", async () => {
    let current: Session | null = oauth();
    let releaseOld!: (response: Response) => void;
    let fetches = 0;
    const manager = new OAuthTokenManager({
      getSession: () => current,
      getServerUrl: () => serverUrl,
      now: () => 10_000,
      fetcher: (() => {
        fetches += 1;
        if (fetches === 1) {
          return new Promise<Response>((resolve) => {
            releaseOld = resolve;
          });
        }
        return Promise.resolve(
          jsonResponse(true, {
            access_token: "access-user-2",
            refresh_token: "refresh-user-2-rotated",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        );
      }) as typeof fetch,
      persistSession: async (session) => {
        current = session;
      },
      onTerminalFailure: async () => {},
    });

    const oldRefresh = manager.getAccessToken();
    current = oauth({
      userId: "user-2",
      accessToken: "access-user-2-old",
      refreshToken: "refresh-user-2",
    });
    expect(await manager.getAccessToken()).toBe("access-user-2");
    releaseOld(
      jsonResponse(true, {
        access_token: "access-user-1-too-late",
        refresh_token: "refresh-user-1-too-late",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    );

    const error = await captureFailure(oldRefresh);
    expect(error instanceof OAuthRefreshError).toBe(true);
    expect(fetches).toBe(2);
    expect((current as OAuthSession).userId).toBe("user-2");
    expect((current as OAuthSession).refreshToken).toBe(
      "refresh-user-2-rotated",
    );
  });
});
