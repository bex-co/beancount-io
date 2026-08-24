import type { OAuthSession, Session } from "./session-record";
import {
  apiResourceForServer,
  issuerForServer,
  oauthEndpointWithinIssuer,
} from "./discovery";
import { accessTokenExpiry, parseOAuthTokenResponse } from "./token-response";

const REFRESH_SKEW_MS = 60_000;

export class OAuthRefreshError extends Error {
  constructor(readonly terminal: boolean) {
    super(terminal ? "OAuth grant is no longer valid" : "OAuth refresh failed");
  }
}

type TokenManagerDeps = {
  getSession: () => Session | null;
  getServerUrl: () => string;
  persistSession: (session: Session) => Promise<void>;
  onTerminalFailure: () => Promise<void>;
  fetcher?: typeof fetch;
  now?: () => number;
};

function isTerminalOAuthError(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const error = (value as { error?: unknown }).error;
  return (
    error === "invalid_grant" ||
    error === "invalid_client" ||
    error === "unauthorized_client"
  );
}

function sessionMatchesServer(
  session: OAuthSession,
  serverUrl: string,
): boolean {
  try {
    return (
      session.serverUrl === serverUrl &&
      session.resource === apiResourceForServer(serverUrl) &&
      session.issuer === issuerForServer(serverUrl) &&
      oauthEndpointWithinIssuer(session.tokenEndpoint, session.issuer) ===
        session.tokenEndpoint &&
      oauthEndpointWithinIssuer(session.revocationEndpoint, session.issuer) ===
        session.revocationEndpoint
    );
  } catch {
    return false;
  }
}

function refreshKey(session: OAuthSession): string {
  return [
    session.serverUrl,
    session.issuer,
    session.resource,
    session.clientId,
    session.userId,
    session.refreshToken,
  ].join("\u0000");
}

/** One token lifecycle authority shared by every Apollo operation. */
export class OAuthTokenManager {
  private refreshGeneration = 0;
  private readonly refreshes = new Map<
    string,
    { controller: AbortController; promise: Promise<string> }
  >();

  constructor(private readonly deps: TokenManagerDeps) {}

  async getAccessToken(forceRefresh = false): Promise<string | undefined> {
    const session = this.deps.getSession();
    if (!session || session.serverUrl !== this.deps.getServerUrl()) {
      return undefined;
    }
    if (session.kind === "legacy") return session.authToken;
    if (!sessionMatchesServer(session, this.deps.getServerUrl())) {
      return undefined;
    }

    const now = (this.deps.now ?? Date.now)();
    if (!forceRefresh && session.accessTokenExpiresAt - now > REFRESH_SKEW_MS) {
      return session.accessToken;
    }
    const key = refreshKey(session);
    const existing = this.refreshes.get(key);
    if (existing) return existing.promise;

    const controller = new AbortController();
    const generation = this.refreshGeneration;
    const promise = this.refresh(
      session,
      key,
      generation,
      controller.signal,
    ).finally(() => {
      if (this.refreshes.get(key)?.promise === promise) {
        this.refreshes.delete(key);
      }
    });
    this.refreshes.set(key, { controller, promise });
    return promise;
  }

  /**
   * Stop refresh work before logout or a server/account transition. Waiting for
   * settlement ensures a SecureStore write already in progress cannot complete
   * after the caller clears local state.
   */
  async cancelPendingRefreshes(): Promise<void> {
    this.invalidatePendingRefreshes();
    await Promise.allSettled(
      [...this.refreshes.values()].map(({ promise }) => promise),
    );
  }

  /** Used by a refresh's own terminal-failure callback to avoid self-waiting. */
  invalidatePendingRefreshes(): void {
    this.refreshGeneration += 1;
    for (const { controller } of this.refreshes.values()) controller.abort();
  }

  private isCurrentRefresh(
    session: OAuthSession,
    key: string,
    generation: number,
  ): boolean {
    const current = this.deps.getSession();
    return (
      generation === this.refreshGeneration &&
      this.deps.getServerUrl() === session.serverUrl &&
      current?.kind === "oauth" &&
      refreshKey(current) === key
    );
  }

  private async refresh(
    session: OAuthSession,
    key: string,
    generation: number,
    signal: AbortSignal,
  ): Promise<string> {
    const fetcher = this.deps.fetcher ?? fetch;
    let response: Response;
    try {
      response = await fetcher(session.tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        signal,
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
          client_id: session.clientId,
          resource: session.resource,
        }).toString(),
      });
    } catch {
      throw new OAuthRefreshError(false);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new OAuthRefreshError(false);
    }
    if (!response.ok) {
      const terminal = isTerminalOAuthError(body);
      if (terminal) await this.deps.onTerminalFailure();
      throw new OAuthRefreshError(terminal);
    }
    let token;
    try {
      token = parseOAuthTokenResponse(body, {
        expectedScopes: session.scopes,
        requireRefreshToken: false,
      });
    } catch {
      throw new OAuthRefreshError(false);
    }

    const now = (this.deps.now ?? Date.now)();
    let replacement: OAuthSession;
    try {
      replacement = {
        ...session,
        accessToken: token.accessToken,
        accessTokenExpiresAt: accessTokenExpiry(now, token.expiresIn),
        refreshToken: token.refreshToken ?? session.refreshToken,
        scopes: token.scopes,
      };
    } catch {
      throw new OAuthRefreshError(false);
    }
    if (!this.isCurrentRefresh(session, key, generation)) {
      throw new OAuthRefreshError(false);
    }
    try {
      // The rotated refresh credential is durable before any waiter proceeds.
      await this.deps.persistSession(replacement);
    } catch {
      throw new OAuthRefreshError(false);
    }
    if (
      !this.isCurrentRefresh(replacement, refreshKey(replacement), generation)
    ) {
      throw new OAuthRefreshError(false);
    }
    return replacement.accessToken;
  }
}

export async function revokeOAuthSession(
  session: OAuthSession,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  if (!sessionMatchesServer(session, session.serverUrl)) {
    throw new Error("OAuth session does not match its selected server");
  }
  await fetcher(session.revocationEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      token: session.refreshToken,
      token_type_hint: "refresh_token",
      client_id: session.clientId,
    }).toString(),
  });
}
