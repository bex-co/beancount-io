import * as http from "node:http";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import type { AppConfig } from "@/config/config";
import { decodeJwt } from "jose";
import { getJwks } from "@/config/jwks";
import { resolveOidcIdentity } from "@/features/oauth/utils/oidc-verify";
import type { Identity } from "@/server/api/identity";
import { gqlOpId, requireScopeClass } from "@/server/api/op-class";
import {
  DISCOURSE_CLIENT_ID,
  DISCOURSE_REDIRECT_URI,
  MOBILE_CLIENT_ID,
  MOBILE_REDIRECT_URIS,
  OAUTH_CONFIG,
  buildStaticOAuthClients,
  oauthLifetimes,
  shouldRotateRefreshToken,
} from "../../data/config";
import {
  CIMD_DRAFT,
  oauthWellKnownPath,
  selectOAuthResource,
  setOidcRoutes,
} from "../oidc-route";
import { MemoryAdapter } from "../../data/memory-adapter";

// Mock logger to avoid winston-loki dependency issues (same pattern as
// git-proxy-handler.test.ts).
jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
    warn: jest.fn(),
  },
}));

// Isolate this from real ledger-access logic — this suite tests OIDC routing/claims,
// not ledger permission checks (covered elsewhere). Any ledgerId succeeds.
jest.mock("@/features/ledger/utils/ledger-access-check", () => ({
  assertLedgerAccess: jest.fn().mockResolvedValue({
    permission: "admin",
    ledgerOwnerId: "user_test123",
    ledgerRepoId: 1,
  }),
}));

const PORT = 47592; // fixed — issuer must be known before the Provider is constructed
const DAY_SECONDS = 24 * 60 * 60;
const ISSUER = `http://127.0.0.1:${PORT}`;
const DISCOURSE_CLIENT_SECRET = "test-client-secret-value";
// The URIs these hosts register in one DCR request (ADR 019 host table).
const VSCODE_REDIRECTS = [
  "https://insiders.vscode.dev/redirect",
  "https://vscode.dev/redirect",
  "http://127.0.0.1/",
  "http://127.0.0.1:33418/",
];
const CURSOR_REDIRECTS = [
  "http://localhost:8787/callback",
  "cursor://anysphere.cursor-mcp/oauth/callback",
  "https://www.cursor.com/agents/mcp/oauth/callback",
];
const TEST_TOKEN = "test-bearer-token";
// A token-shaped credential: scoped, ledger-pinned, and NOT capability-exempt —
// the shape an API key or a third-party OAuth grant resolves to. It authenticates
// as the same user as TEST_TOKEN, which is the whole point: consent has to turn
// on *how* the caller proved themselves, not on who they are.
const TEST_SCOPED_TOKEN = "test-scoped-api-key";
const TEST_USER = {
  id: "user_test123",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  ledger_username: "ada",
  avatarUrl: "https://example.com/avatar.png",
  isBlocked: false,
};

describe("OAuth well-known URL derivation", () => {
  it("preserves issuer and resource path prefixes", () => {
    expect(
      oauthWellKnownPath(
        "oauth-authorization-server",
        "https://books.example.test/beancount",
      ),
    ).toBe("/.well-known/oauth-authorization-server/beancount");
    expect(
      oauthWellKnownPath(
        "oauth-protected-resource",
        "https://books.example.test/beancount/v1",
      ),
    ).toBe("/.well-known/oauth-protected-resource/beancount/v1");
  });
});

describe("OAuth resource selection", () => {
  it("selects the configured audience from a multi-resource grant", () => {
    expect(
      selectOAuthResource("https://books.example.test/api-gateway/mcp", [
        "https://books.example.test/v1",
        "https://books.example.test/api-gateway/mcp",
      ]),
    ).toBe("https://books.example.test/api-gateway/mcp");
  });

  it("leaves an identity-only client without a resource", () => {
    expect(selectOAuthResource(undefined)).toBe("");
  });

  it("rejects a grant that lacks the client's configured audience", () => {
    expect(() =>
      selectOAuthResource("https://books.example.test/api-gateway/mcp", [
        "https://books.example.test/v1",
      ]),
    ).toThrow("invalid_target");
  });
});

describe("OAuth static clients", () => {
  // Dynamic clients default to native (ADR 019 D3), so each static client
  // states its type rather than inheriting the default.
  it("states each static client's application_type", () => {
    const clients = buildStaticOAuthClients({
      apiScopes: ["ledger.read"],
      discourseClientSecret: "secret",
    });
    const byId = Object.fromEntries(clients.map((c) => [c.client_id, c]));
    expect(
      byId[OAUTH_CONFIG.clients.discourse.clientId]?.application_type,
    ).toBe("web");
    expect(byId[OAUTH_CONFIG.clients.mobile.clientId]?.application_type).toBe(
      "native",
    );
  });
});

describe("OAuth CIMD draft", () => {
  // oidc-provider ships CIMD as experimental. When an upgrade moves the draft,
  // the provider refuses to start; this names what to re-review (ADR 019 D6)
  // instead of failing every OAuth test at construction.
  it("acknowledges the CIMD draft the installed oidc-provider implements", () => {
    const features = fs.readFileSync(
      require.resolve("oidc-provider/lib/helpers/features.js"),
      "utf8",
    );
    const installed = features.match(
      /clientIdMetadataDocument:\s*\{[^}]*version:\s*'([^']+)'/,
    )?.[1];
    expect({ reviewed: CIMD_DRAFT, installed }).toEqual({
      reviewed: CIMD_DRAFT,
      installed: CIMD_DRAFT,
    });
  });
});

describe("OAuth token lifetimes", () => {
  const lifetimes = oauthLifetimes();

  it("gives the native app a year-long idle window and third-party hosts 45 days", () => {
    expect(lifetimes.refreshToken(MOBILE_CLIENT_ID)).toBe(365 * DAY_SECONDS);
    expect(lifetimes.refreshToken("some-mcp-client")).toBe(45 * DAY_SECONDS);
    expect(
      lifetimes.refreshToken(
        "https://claude.ai/oauth/claude-code-client-metadata",
      ),
    ).toBe(45 * DAY_SECONDS);
  });

  it("keeps every grant alive longer than the refresh token it backs", () => {
    // `validateGrant` runs before the refresh token is consumed, so a grant
    // that expires first fails the refresh with invalid_grant even while the
    // token itself is still valid. The grant must never be the binding cap.
    for (const clientId of [MOBILE_CLIENT_ID, "some-mcp-client"]) {
      expect(lifetimes.grant(clientId)).toBeGreaterThan(
        lifetimes.refreshToken(clientId),
      );
    }
    expect(lifetimes.grant("some-mcp-client")).toBe(46 * DAY_SECONDS);
  });

  it("leaves the identity client on the provider defaults", () => {
    expect(lifetimes.refreshToken(DISCOURSE_CLIENT_ID)).toBe(
      OAUTH_CONFIG.ttl.defaultRefreshTokenSeconds,
    );
    expect(lifetimes.grant(DISCOURSE_CLIENT_ID)).toBe(
      OAUTH_CONFIG.ttl.defaultGrantSeconds,
    );
  });

  it("caps a re-saved third-party grant at one year after authorization", () => {
    const now = 1_000 * DAY_SECONDS;
    const ceiling = OAUTH_CONFIG.thirdParty.grantCeilingSeconds;
    // Fresh grant (no issue time yet): the full term.
    expect(lifetimes.grant("some-mcp-client", undefined, now)).toBe(
      46 * DAY_SECONDS,
    );
    // Early in the year: still the full term.
    expect(
      lifetimes.grant("some-mcp-client", now - 30 * DAY_SECONDS, now),
    ).toBe(46 * DAY_SECONDS);
    // Ten days from the ceiling: only what is left.
    expect(
      lifetimes.grant("some-mcp-client", now - ceiling + 10 * DAY_SECONDS, now),
    ).toBe(10 * DAY_SECONDS);
    // Past it: nothing left to extend.
    expect(
      lifetimes.grant("some-mcp-client", now - ceiling - 1, now),
    ).toBeLessThanOrEqual(0);
    // The native app has no ceiling.
    expect(lifetimes.grant(MOBILE_CLIENT_ID, now - 2 * ceiling, now)).toBe(
      OAUTH_CONFIG.clients.mobile.grantTtlSeconds,
    );
  });

  it("uses the values declared by the centralized client catalog", () => {
    expect(lifetimes.refreshToken(MOBILE_CLIENT_ID)).toBe(
      OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds,
    );
    expect(lifetimes.grant(MOBILE_CLIENT_ID)).toBe(
      OAUTH_CONFIG.clients.mobile.grantTtlSeconds,
    );
    expect(lifetimes.refreshToken("some-mcp-client")).toBe(
      OAUTH_CONFIG.thirdParty.refreshTokenTtlSeconds,
    );
    expect(lifetimes.grant("some-mcp-client")).toBe(
      OAUTH_CONFIG.thirdParty.grantTtlSeconds,
    );
  });
});

describe("OAuth refresh-token rotation", () => {
  const fresh = {
    totalLifetime: () => 0,
    isSenderConstrained: () => false,
    ttlPercentagePassed: () => 0,
  };
  const ancient = { ...fresh, totalLifetime: () => 400 * DAY_SECONDS };

  it("rotates the native credential however old the chain is", () => {
    // Rotation is the only thing that slides the idle window forward — stop
    // rotating and a phone in daily use still dies at a fixed age.
    expect(
      shouldRotateRefreshToken(
        { clientId: MOBILE_CLIENT_ID, clientAuthMethod: "none" },
        ancient,
      ),
    ).toBe(true);
  });

  it("rotates a public client's token at any chain age (ADR 019 D5)", () => {
    // The MCP spec requires rotation for public clients; oidc-provider's
    // default stops once a chain is a year old.
    const publicClient = { clientId: "mcp-public", clientAuthMethod: "none" };
    expect(shouldRotateRefreshToken(publicClient, fresh)).toBe(true);
    expect(shouldRotateRefreshToken(publicClient, ancient)).toBe(true);
  });

  it("does not rotate a sender-constrained public token", () => {
    // Binding the token to a key is the accepted alternative to rotation.
    const publicClient = { clientId: "mcp-public", clientAuthMethod: "none" };
    expect(
      shouldRotateRefreshToken(publicClient, {
        ...fresh,
        isSenderConstrained: () => true,
      }),
    ).toBe(false);
  });

  it("leaves confidential clients on oidc-provider's default policy", () => {
    const confidential = {
      clientId: "mcp-confidential",
      clientAuthMethod: "client_secret_basic",
    };
    expect(shouldRotateRefreshToken(confidential, fresh)).toBe(false);
    expect(
      shouldRotateRefreshToken(confidential, {
        ...fresh,
        ttlPercentagePassed: () => 70,
      }),
    ).toBe(true);
    expect(
      shouldRotateRefreshToken(confidential, {
        ...ancient,
        ttlPercentagePassed: () => 70,
      }),
    ).toBe(false);
  });
});

// ── Minimal cookie jar — carries Set-Cookie values across the manual
// authorize → interaction-login → resume → token redirect chain, since
// fetch() does not manage cookies across requests the way a browser does.
class CookieJar {
  private jar = new Map<string, string>();

  absorb(res: Response): void {
    const setCookies =
      "getSetCookie" in res.headers
        ? (
            res.headers as unknown as { getSetCookie: () => string[] }
          ).getSetCookie()
        : [];
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const idx = pair.indexOf("=");
      if (idx === -1) continue;
      this.jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }

  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

function pkce() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

describe("oidc-route: unified MCP + identity provider", () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = new Koa();
    // Mirrors server/start-server.ts's guard: oidc-provider's core routes parse
    // their own body from the raw stream; only /interaction/* needs koa-bodyparser
    // (our own handlers read ctx.request.body there). Skipping this would let
    // bodyParser consume the /token endpoint's request stream before oidc-provider
    // gets to read it.
    const koaBodyParser = bodyParser();
    app.use(async (ctx, next) => {
      const isOidcCore =
        ctx.path.startsWith("/api-gateway/oauth/") &&
        !ctx.path.startsWith("/api-gateway/oauth/interaction/");
      if (isOidcCore) return next();
      return koaBodyParser(
        ctx as unknown as Parameters<typeof koaBodyParser>[0],
        next,
      );
    });
    app.use(async (ctx, next) => {
      if (ctx.headers.authorization === `Bearer ${TEST_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "session",
          scopes: new Set(),
        };
      } else if (ctx.headers.authorization === `Bearer ${TEST_SCOPED_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "apikey",
          scopes: new Set(["ledger.read"]),
          ledgerScope: "ada/personal",
          tokenId: "akey_test",
        };
      }
      await next();
    });
    const router = new Router();

    const models = {
      user: {
        getById: jest.fn(async (_db: unknown, id: string) =>
          id === TEST_USER.id ? TEST_USER : null,
        ),
      },
      jwt: {
        verify: jest.fn(async (_db: unknown, token: string) =>
          token === TEST_TOKEN ? TEST_USER.id : null,
        ),
      },
    };

    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: ISSUER,
        interactionUrl: ISSUER,
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClientSecret: DISCOURSE_CLIENT_SECRET,
      },
    } as unknown as AppConfig;

    setOidcRoutes(
      router,
      {
        database: { db: {} as never, models: models as never },
        clients: {} as never,
      },
      config,
    );
    // A stand-in for the GraphQL gateway that keeps the one thing production
    // enforces on this call: the op-class gate. The native app resolves who
    // signed in with `Query.userProfile` right after the exchange, and a table
    // that files that query as session-only breaks every native sign-in while
    // a hand-rolled scope check here would still pass.
    router.post("/api-gateway/", async (ctx) => {
      const authorization = ctx.headers.authorization ?? "";
      const oidc = await resolveOidcIdentity(
        authorization.replace(/^Bearer\s+/i, ""),
        config,
      );
      if (!oidc) {
        ctx.status = 401;
        ctx.body = { errors: [{ message: "unauthenticated" }] };
        return;
      }
      const identity: Identity = {
        userId: oidc.userId,
        method: "oauth",
        scopes: new Set(oidc.scopes),
        ledgerScope: oidc.ledgerId,
        tokenId: oidc.tokenId,
      };
      try {
        requireScopeClass(identity, gqlOpId("Query.userProfile"), "enforce");
      } catch (error: unknown) {
        ctx.status = 200;
        ctx.body = {
          errors: [{ message: (error as Error).message }],
          data: { userProfile: null },
        };
        return;
      }
      ctx.body = {
        data: { userProfile: { id: identity.userId } },
      };
    });
    app.use(router.routes());
    app.use(router.allowedMethods());

    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function driveAuthorizationCode(opts: {
    clientId: string;
    clientAuth: string; // "Basic ..." header value, or "" for none required
    scope: string;
    redirectUri: string;
    loginBody?: Record<string, string>;
    prompt?: string;
    resource?: string;
  }): Promise<{ code: string; verifier: string }> {
    const jar = new CookieJar();
    const { codeVerifier, codeChallenge } = pkce();
    const state = crypto.randomBytes(8).toString("hex");

    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", opts.clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", opts.scope);
    authUrl.searchParams.set("redirect_uri", opts.redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);
    // Per RFC — offline_access is silently dropped unless prompt=consent is present.
    if (opts.prompt) authUrl.searchParams.set("prompt", opts.prompt);
    if (opts.resource) authUrl.searchParams.set("resource", opts.resource);

    const authRes = await fetch(authUrl, { redirect: "manual" });
    expect(authRes.status).toBe(303);
    jar.absorb(authRes);
    const consentUrl = new URL(authRes.headers.get("location")!);
    const uid = consentUrl.searchParams.get("uid")!;
    expect(uid).toBeTruthy();
    if (opts.clientId !== DISCOURSE_CLIENT_ID) {
      expect(consentUrl.searchParams.get("scope")).toBe(
        opts.prompt === "consent"
          ? opts.scope
          : opts.scope
              .split(" ")
              .filter((scope) => scope !== "offline_access")
              .join(" "),
      );
    }

    const loginRes = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/${uid}/login`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
          cookie: jar.header(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          ...(opts.clientId === MOBILE_CLIENT_ID ? { scope: opts.scope } : {}),
          ...opts.loginBody,
        }),
        redirect: "manual",
      },
    );
    if (loginRes.status >= 400) {
      const body = (await loginRes.json().catch(() => ({}))) as {
        error?: string;
      };
      throw Object.assign(
        new Error(`login failed: ${body.error ?? "unknown"}`),
        {
          status: loginRes.status,
          body,
        },
      );
    }
    jar.absorb(loginRes);
    const resumeLocation = loginRes.headers.get("location")!;

    const resumeRes = await fetch(new URL(resumeLocation, ISSUER), {
      headers: { cookie: jar.header() },
      redirect: "manual",
    });
    expect(resumeRes.status).toBe(303);
    const finalLocation = new URL(resumeRes.headers.get("location")!);
    const callback =
      finalLocation.origin === "null"
        ? `${finalLocation.protocol}${finalLocation.pathname}`
        : finalLocation.origin + finalLocation.pathname;
    expect(callback).toBe(opts.redirectUri);
    const code = finalLocation.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(finalLocation.searchParams.get("state")).toBe(state);
    expect(finalLocation.searchParams.get("iss")).toBe(ISSUER);

    return { code: code!, verifier: codeVerifier };
  }

  async function exchangeToken(opts: {
    code: string;
    verifier: string;
    clientId: string;
    clientSecret?: string;
    redirectUri: string;
    resource?: string;
  }): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
    };
    if (opts.clientSecret) {
      headers.authorization = `Basic ${Buffer.from(
        `${opts.clientId}:${opts.clientSecret}`,
      ).toString("base64")}`;
    }
    const tokenRes = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: opts.code,
        code_verifier: opts.verifier,
        redirect_uri: opts.redirectUri,
        ...(opts.resource ? { resource: opts.resource } : {}),
        ...(opts.clientSecret ? {} : { client_id: opts.clientId }),
      }),
    });
    return tokenRes.json() as Promise<Record<string, unknown>>;
  }

  // ── Identity flow (Discourse) ─────────────────────────────────────────────

  it("identity flow: full PKCE exchange returns real profile+email claims", async () => {
    const { code, verifier } = await driveAuthorizationCode({
      clientId: DISCOURSE_CLIENT_ID,
      clientAuth: "",
      scope: "openid email profile",
      redirectUri: DISCOURSE_REDIRECT_URI,
    });

    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: DISCOURSE_CLIENT_ID,
      clientSecret: DISCOURSE_CLIENT_SECRET,
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    expect(tokenBody.access_token).toBeTruthy();
    expect(tokenBody.id_token).toBeTruthy();

    const userinfoRes = await fetch(`${ISSUER}/api-gateway/oauth/me`, {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });
    const claims = (await userinfoRes.json()) as Record<string, unknown>;
    expect(claims.sub).toBe(TEST_USER.id);
    expect(claims.email).toBe(TEST_USER.email);
    expect(claims.email_verified).toBe(true);
    expect(claims.preferred_username).toBe(TEST_USER.ledger_username);
    expect(claims.name).toBe("Ada Lovelace");
    expect(claims.picture).toBe(TEST_USER.avatarUrl);
    // No ledger — identity grants never carry a ledger_id.
    expect(claims.ledger_id).toBeUndefined();
  });

  it("identity flow: scope-gated claims (openid only → no email/profile)", async () => {
    const { code, verifier } = await driveAuthorizationCode({
      clientId: DISCOURSE_CLIENT_ID,
      clientAuth: "",
      scope: "openid",
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: DISCOURSE_CLIENT_ID,
      clientSecret: DISCOURSE_CLIENT_SECRET,
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    const userinfoRes = await fetch(`${ISSUER}/api-gateway/oauth/me`, {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });
    const claims = (await userinfoRes.json()) as Record<string, unknown>;
    expect(claims.sub).toBe(TEST_USER.id);
    expect(claims.email).toBeUndefined();
    expect(claims.preferred_username).toBeUndefined();
  });

  it("identity flow: never issues a refresh token, even asking for offline_access", async () => {
    const { code, verifier } = await driveAuthorizationCode({
      clientId: DISCOURSE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access",
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: DISCOURSE_CLIENT_ID,
      clientSecret: DISCOURSE_CLIENT_SECRET,
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    expect(tokenBody.access_token).toBeTruthy();
    expect(tokenBody.refresh_token).toBeUndefined();
  });

  it("identity flow: rejects an authorization request without PKCE code_challenge", async () => {
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", DISCOURSE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("redirect_uri", DISCOURSE_REDIRECT_URI);
    authUrl.searchParams.set("state", "abc");

    const res = await fetch(authUrl, { redirect: "manual" });
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("error")).toBe("invalid_request");
  });

  it("identity flow: rejects a token exchange with the wrong code_verifier", async () => {
    const { code } = await driveAuthorizationCode({
      clientId: DISCOURSE_CLIENT_ID,
      clientAuth: "",
      scope: "openid",
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    const body = await exchangeToken({
      code,
      verifier: "wrong-verifier-that-does-not-match-the-challenge",
      clientId: DISCOURSE_CLIENT_ID,
      clientSecret: DISCOURSE_CLIENT_SECRET,
      redirectUri: DISCOURSE_REDIRECT_URI,
    });
    expect(body.error).toBe("invalid_grant");
  });

  it("identity flow: rejects an unknown client_id", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", "some-other-unregistered-client");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("redirect_uri", DISCOURSE_REDIRECT_URI);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "abc");

    const res = await fetch(authUrl, { redirect: "manual" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("invalid_client");
  });

  it("identity flow: rejects a redirect_uri the discourse client didn't register", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", DISCOURSE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set(
      "redirect_uri",
      "https://attacker.example.test/callback",
    );
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "abc");

    const res = await fetch(authUrl, { redirect: "manual" });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain("redirect_uri");
  });

  it("identity flow: rejects an interaction-login POST for an unknown uid", async () => {
    const res = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/does-not-exist/login`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${TEST_TOKEN}` },
      },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeTruthy();
  });

  it("identity flow: interactions.url routes to the identity consent page", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", DISCOURSE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid");
    authUrl.searchParams.set("redirect_uri", DISCOURSE_REDIRECT_URI);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "abc");

    const res = await fetch(authUrl, { redirect: "manual" });
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/oauth/identity-consent");
  });

  // ── Native mobile flow (static public client) ─────────────────────────────

  it("mobile flow: completes code+PKCE without a client secret and mints an unpinned API token", async () => {
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });

    expect(tokenBody.access_token).toEqual(expect.any(String));
    expect(tokenBody.refresh_token).toEqual(expect.any(String));
    const claims = decodeJwt(tokenBody.access_token as string);
    expect(claims.aud).toBe(resource);
    expect(claims.sub).toBe(TEST_USER.id);
    expect(claims.client_id).toBe(MOBILE_CLIENT_ID);
    expect(claims.ledger_id).toBeUndefined();

    const profileResponse = await fetch(`${ISSUER}/api-gateway/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tokenBody.access_token}`,
      },
      body: JSON.stringify({
        query: "query OAuthCurrentUser { userProfile { id } }",
      }),
    });
    expect(await profileResponse.json()).toEqual({
      data: { userProfile: { id: TEST_USER.id } },
    });
  });

  it("mobile flow: without prompt=consent there is no refresh token to renew from", async () => {
    // Why the native client always sends prompt=consent. OIDC Core §11 makes
    // offline_access conditional on an explicit consent prompt, and
    // oidc-provider enforces that by dropping the scope rather than failing —
    // so the omission is invisible until the access token expires an hour
    // later and the app has nothing to refresh with. Pinned here because the
    // parameter looks redundant from the mobile side and reads like something
    // safe to remove.
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    // The provider strips offline_access from the interaction before the
    // consent page ever sees it, so the page posts back the narrowed set —
    // which is why this failure is silent rather than an error.
    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      loginBody: { scope: "openid ledger.read ledger.write ledger.admin" },
      redirectUri,
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });

    expect(tokenBody.access_token).toEqual(expect.any(String));
    expect(tokenBody.refresh_token).toBeUndefined();
  });

  it("mobile flow: routes to account-wide consent and rejects an unregistered callback", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", MOBILE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid ledger.read");
    authUrl.searchParams.set("redirect_uri", MOBILE_REDIRECT_URIS[1]);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "mobile-state");
    authUrl.searchParams.set("resource", `${ISSUER}/v1`);

    const consent = await fetch(authUrl, { redirect: "manual" });
    const consentUrl = new URL(consent.headers.get("location")!);
    expect(consentUrl.pathname).toBe("/oauth/mobile-consent");
    expect(consentUrl.searchParams.get("scope")).toBe("openid ledger.read");

    authUrl.searchParams.set(
      "redirect_uri",
      "io.beancount.attacker:/oauth/callback",
    );
    const rejected = await fetch(authUrl, { redirect: "manual" });
    expect(rejected.status).toBe(400);
    expect(await rejected.text()).toContain("redirect_uri");
  });

  /** A well-formed mobile authorization request; override what a test is about, "" drops a param. */
  function mobileAuthUrl(overrides: Record<string, string> = {}): URL {
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    const params: Record<string, string> = {
      client_id: MOBILE_CLIENT_ID,
      response_type: "code",
      scope: "openid ledger.read",
      redirect_uri: MOBILE_REDIRECT_URIS[0],
      code_challenge: pkce().codeChallenge,
      code_challenge_method: "S256",
      state: "mobile-state",
      resource: `${ISSUER}/v1`,
      ...overrides,
    };
    for (const [key, value] of Object.entries(params)) {
      if (value) authUrl.searchParams.set(key, value);
    }
    return authUrl;
  }

  async function interactionUrlFor(authUrl: URL): Promise<URL> {
    const res = await fetch(authUrl, { redirect: "manual" });
    return new URL(res.headers.get("location")!);
  }

  it("mobile flow: forwards screen_hint=signup to the interaction page and ignores other values", async () => {
    const signIn = await interactionUrlFor(mobileAuthUrl());
    expect(signIn.pathname).toBe("/oauth/mobile-consent");
    expect(signIn.searchParams.has("screen_hint")).toBe(false);

    const signUp = await interactionUrlFor(
      mobileAuthUrl({ screen_hint: "signup" }),
    );
    expect(signUp.pathname).toBe("/oauth/mobile-consent");
    expect(signUp.searchParams.get("screen_hint")).toBe("signup");
    expect(signUp.searchParams.get("scope")).toBe("openid ledger.read");

    // A hint this server does not know is a newer app talking to an older
    // server: the user still gets the login form, never an error.
    const unknown = await interactionUrlFor(
      mobileAuthUrl({ screen_hint: "login" }),
    );
    expect(unknown.pathname).toBe("/oauth/mobile-consent");
    expect(unknown.searchParams.has("screen_hint")).toBe(false);
  });

  it("mobile flow: the sign-up hint never reaches another client's interaction page", async () => {
    const consentUrl = await interactionUrlFor(
      mobileAuthUrl({
        client_id: DISCOURSE_CLIENT_ID,
        scope: "openid",
        redirect_uri: DISCOURSE_REDIRECT_URI,
        resource: "",
        screen_hint: "signup",
      }),
    );
    expect(consentUrl.pathname).toBe("/oauth/identity-consent");
    expect(consentUrl.searchParams.has("screen_hint")).toBe(false);
  });

  it("mobile flow: rejects the MCP endpoint as a resource and ledger pinning", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", MOBILE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid ledger.read");
    authUrl.searchParams.set("redirect_uri", MOBILE_REDIRECT_URIS[0]);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "mobile-state");
    authUrl.searchParams.set("resource", `${ISSUER}/api-gateway/mcp`);

    const wrongResource = await fetch(authUrl, { redirect: "manual" });
    const resourceError = new URL(wrongResource.headers.get("location")!);
    expect(resourceError.searchParams.get("error")).toBe("invalid_target");

    await expect(
      driveAuthorizationCode({
        clientId: MOBILE_CLIENT_ID,
        clientAuth: "",
        scope: "openid ledger.read",
        redirectUri: MOBILE_REDIRECT_URIS[0],
        loginBody: { ledgerId: "ada/personal" },
        resource: `${ISSUER}/v1`,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("mobile flow: rejects consent copy that does not match the interaction scopes", async () => {
    await expect(
      driveAuthorizationCode({
        clientId: MOBILE_CLIENT_ID,
        clientAuth: "",
        scope: "openid ledger.read ledger.write",
        redirectUri: MOBILE_REDIRECT_URIS[0],
        loginBody: { scope: "openid ledger.read" },
        resource: `${ISSUER}/v1`,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("mobile flow: cancellation returns the standard access_denied response", async () => {
    const jar = new CookieJar();
    const { codeChallenge } = pkce();
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", MOBILE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid ledger.read");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "cancel-state");
    authUrl.searchParams.set("resource", `${ISSUER}/v1`);

    const authRes = await fetch(authUrl, { redirect: "manual" });
    jar.absorb(authRes);
    const uid = new URL(authRes.headers.get("location")!).searchParams.get(
      "uid",
    )!;
    const decision = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/${uid}/login`,
      {
        method: "POST",
        headers: {
          cookie: jar.header(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ decision: "cancel" }),
        redirect: "manual",
      },
    );
    jar.absorb(decision);
    const resumed = await fetch(
      new URL(decision.headers.get("location")!, ISSUER),
      { headers: { cookie: jar.header() }, redirect: "manual" },
    );
    const callback = new URL(resumed.headers.get("location")!);
    expect(callback.searchParams.get("error")).toBe("access_denied");
    expect(callback.searchParams.get("state")).toBe("cancel-state");
    expect(callback.searchParams.get("iss")).toBe(ISSUER);
  });

  it("mobile flow: rotates refresh credentials and revocation prevents another refresh", async () => {
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read",
      redirectUri,
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });
    const firstRefreshToken = tokenBody.refresh_token as string;

    const refreshRes = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: firstRefreshToken,
        client_id: MOBILE_CLIENT_ID,
        resource,
      }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshed = (await refreshRes.json()) as Record<string, unknown>;
    expect(refreshed.refresh_token).toEqual(expect.any(String));
    expect(refreshed.refresh_token).not.toBe(firstRefreshToken);

    const revokeRes = await fetch(`${ISSUER}/api-gateway/oauth/revoke`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: refreshed.refresh_token as string,
        token_type_hint: "refresh_token",
        client_id: MOBILE_CLIENT_ID,
      }),
    });
    expect(revokeRes.status).toBe(200);

    const afterRevoke = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshed.refresh_token as string,
        client_id: MOBILE_CLIENT_ID,
        resource,
      }),
    });
    expect(afterRevoke.status).toBe(400);
    expect((await afterRevoke.json()) as object).toMatchObject({
      error: "invalid_grant",
    });
  });

  it("mobile flow: refreshing slides the grant, so use — not age — keeps a session alive", async () => {
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const grants = new MemoryAdapter("Grant");
    const refreshTokens = new MemoryAdapter("RefreshToken");

    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read",
      redirectUri,
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });

    const issued = await refreshTokens.find(tokenBody.refresh_token as string);
    const grantId = issued?.grantId as string;
    expect(grantId).toEqual(expect.any(String));

    // The grant a fresh sign-in writes must already cover the whole idle
    // window. Before this was per-client it was a flat 14 days, which capped
    // the session well before the refresh token it backs ever expired.
    const now = () => Math.floor(Date.now() / 1000);
    const atSignIn = await grants.find(grantId);
    expect((atSignIn?.exp as number) - now()).toBeGreaterThan(
      OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds,
    );

    // Age the grant as if the device had been quiet for most of the window.
    // oidc-provider only writes a Grant at authorization time, so without the
    // sliding middleware this expiry would keep counting down to a hard logout
    // no matter how much the app was used.
    await grants.upsert(
      grantId,
      { ...atSignIn!, exp: now() + 10 * DAY_SECONDS },
      10 * DAY_SECONDS,
    );

    const refreshRes = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenBody.refresh_token as string,
        client_id: MOBILE_CLIENT_ID,
        resource,
      }),
    });
    expect(refreshRes.status).toBe(200);

    const afterRefresh = await grants.find(grantId);
    expect((afterRefresh?.exp as number) - now()).toBeGreaterThan(
      OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds,
    );
  });

  // ── Third-party connections (ADR 019 D5) ──────────────────────────────────

  /** A DCR host signed in with a refresh token; returns what the clock tests need. */
  async function connectThirdParty() {
    const { clientId, redirectUri } = await registerMcpClient();
    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read",
      redirectUri,
      loginBody: { ledgerId: "ada/personal" },
      prompt: "consent",
    });
    const tokens = await exchangeToken({
      code,
      verifier,
      clientId,
      redirectUri,
    });
    const refreshToken = tokens.refresh_token as string;
    const issued = await new MemoryAdapter("RefreshToken").find(refreshToken);
    return { clientId, refreshToken, grantId: issued?.grantId as string };
  }

  async function refresh(clientId: string, refreshToken: string) {
    return fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    });
  }

  const epoch = () => Math.floor(Date.now() / 1000);

  /** Rewrites the stored grant as if it had been issued and last extended at other times. */
  async function ageGrant(grantId: string, iat: number, exp: number) {
    const grants = new MemoryAdapter("Grant");
    const stored = await grants.find(grantId);
    await grants.upsert(grantId, { ...stored!, iat, exp }, exp - epoch());
  }

  it("third-party flow: refreshing slides the grant a full idle window", async () => {
    const { clientId, refreshToken, grantId } = await connectThirdParty();
    const atSignIn = await new MemoryAdapter("Grant").find(grantId);
    expect((atSignIn?.exp as number) - epoch()).toBeGreaterThan(
      OAUTH_CONFIG.thirdParty.refreshTokenTtlSeconds,
    );

    // Quiet for most of the window, then used once.
    await ageGrant(
      grantId,
      epoch() - 40 * DAY_SECONDS,
      epoch() + 6 * DAY_SECONDS,
    );
    expect((await refresh(clientId, refreshToken)).status).toBe(200);

    const after = await new MemoryAdapter("Grant").find(grantId);
    expect((after?.exp as number) - epoch()).toBeGreaterThan(
      OAUTH_CONFIG.thirdParty.refreshTokenTtlSeconds,
    );
  });

  it("third-party flow: a slide never passes one year after authorization", async () => {
    const { clientId, refreshToken, grantId } = await connectThirdParty();
    const authorizedAt = epoch() - 360 * DAY_SECONDS;
    await ageGrant(grantId, authorizedAt, epoch() + 2 * DAY_SECONDS);

    expect((await refresh(clientId, refreshToken)).status).toBe(200);

    const after = await new MemoryAdapter("Grant").find(grantId);
    const ceiling = authorizedAt + OAUTH_CONFIG.thirdParty.grantCeilingSeconds;
    expect(after?.exp as number).toBeGreaterThan(epoch() + 4 * DAY_SECONDS);
    expect(after?.exp as number).toBeLessThanOrEqual(ceiling + 1);
  });

  it("third-party flow: a grant past the ceiling is not extended", async () => {
    const { clientId, refreshToken, grantId } = await connectThirdParty();
    const lastExp = epoch() + 2 * DAY_SECONDS;
    await ageGrant(grantId, epoch() - 366 * DAY_SECONDS, lastExp);

    expect((await refresh(clientId, refreshToken)).status).toBe(200);

    const after = await new MemoryAdapter("Grant").find(grantId);
    expect(after?.exp).toBe(lastExp);
  });

  it("mobile flow: a session issued before the long window keeps working and upgrades on its next refresh", async () => {
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const grants = new MemoryAdapter("Grant");
    const refreshTokens = new MemoryAdapter("RefreshToken");
    const now = () => Math.floor(Date.now() / 1000);

    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read",
      redirectUri,
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });
    const legacyToken = tokenBody.refresh_token as string;

    // Rewrite both records into the shapes this server used to write: a 30-day
    // refresh token backed by a 14-day grant. That is exactly what a phone
    // installed before this change is still holding, and it has to keep working
    // on its own terms rather than being invalidated by the new lifetimes.
    const issued = await refreshTokens.find(legacyToken);
    const grantId = issued?.grantId as string;
    await refreshTokens.upsert(
      legacyToken,
      { ...issued!, exp: now() + 30 * DAY_SECONDS },
      30 * DAY_SECONDS,
    );
    const grant = await grants.find(grantId);
    await grants.upsert(
      grantId,
      { ...grant!, exp: now() + 14 * DAY_SECONDS },
      14 * DAY_SECONDS,
    );

    const refreshRes = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: legacyToken,
        client_id: MOBILE_CLIENT_ID,
        resource,
      }),
    });
    expect(refreshRes.status).toBe(200);
    const refreshed = (await refreshRes.json()) as Record<string, unknown>;
    const rotated = refreshed.refresh_token as string;
    expect(rotated).not.toBe(legacyToken);

    // The old credential is honored, and what replaces it carries the new
    // window — so an existing install migrates itself the first time it
    // refreshes, with no re-authorization and no forced logout.
    const rotatedRecord = await refreshTokens.find(rotated);
    expect((rotatedRecord?.exp as number) - now()).toBeGreaterThan(
      OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds - DAY_SECONDS,
    );
    const slid = await grants.find(grantId);
    expect((slid?.exp as number) - now()).toBeGreaterThan(
      OAUTH_CONFIG.clients.mobile.refreshTokenTtlSeconds,
    );
  });

  it("mobile flow: a grant that already lapsed is not resurrected by the longer window", async () => {
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const grants = new MemoryAdapter("Grant");
    const refreshTokens = new MemoryAdapter("RefreshToken");
    const now = () => Math.floor(Date.now() / 1000);

    const { code, verifier } = await driveAuthorizationCode({
      clientId: MOBILE_CLIENT_ID,
      clientAuth: "",
      scope: "openid offline_access ledger.read",
      redirectUri,
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId: MOBILE_CLIENT_ID,
      redirectUri,
      resource,
    });
    const refresh = (token: string) =>
      fetch(`${ISSUER}/api-gateway/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: token,
          client_id: MOBILE_CLIENT_ID,
          resource,
        }),
      });

    // Refresh once untouched, so the only thing that differs below is the
    // grant's expiry — the 200 here is what makes the 400 later attributable.
    const first = await refresh(tokenBody.refresh_token as string);
    expect(first.status).toBe(200);
    const stillLive = (await first.json()) as Record<string, unknown>;
    const staleToken = stillLive.refresh_token as string;

    // The other half of the compatibility contract: sliding must only ever
    // extend an authorization that is still live. An install whose old 14-day
    // grant already ran out has to sign in again, exactly as it would have
    // before this change — a longer window must not resurrect it.
    const issued = await refreshTokens.find(staleToken);
    const grantId = issued?.grantId as string;
    const grant = await grants.find(grantId);
    await grants.upsert(
      grantId,
      { ...grant!, exp: now() - 60 },
      DAY_SECONDS, // outlives the payload's exp, so the row is found and judged
    );

    const afterLapse = await refresh(staleToken);
    expect(afterLapse.status).toBe(400);
    expect((await afterLapse.json()) as object).toMatchObject({
      error: "invalid_grant",
    });
  });

  it("resource indicators: rejects an arbitrary resource with invalid_target", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", MOBILE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid ledger.read");
    authUrl.searchParams.set("redirect_uri", MOBILE_REDIRECT_URIS[0]);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "mobile-state");
    authUrl.searchParams.set("resource", "https://attacker.example.test/v1");

    const res = await fetch(authUrl, { redirect: "manual" });
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("error")).toBe("invalid_target");
  });

  it("resource indicators: identity clients cannot request an API token", async () => {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", DISCOURSE_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid ledger.read");
    authUrl.searchParams.set("redirect_uri", DISCOURSE_REDIRECT_URI);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "identity-state");
    authUrl.searchParams.set("resource", `${ISSUER}/v1`);

    const res = await fetch(authUrl, { redirect: "manual" });
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("error")).toBe("invalid_target");
  });

  // ── MCP flow (dynamically-registered client, unchanged behavior) ──────────

  async function registerMcpClient(): Promise<{
    clientId: string;
    redirectUri: string;
  }> {
    const redirectUri = "https://mcp-client.example.test/callback";
    const res = await fetch(`${ISSUER}/api-gateway/oauth/reg`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "mcp-test-client",
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { client_id: string };
    return { clientId: body.client_id, redirectUri };
  }

  // ── Named MCP hosts (ADR 019 D8) ──────────────────────────────────────────
  //
  // Each host's documented DCR payload, registered and then authorized with the
  // redirect the host really uses. Registration and authorization happen before
  // any MCP request, so these failures are invisible to every MCP test. Payloads
  // re-verified against the hosts' docs on 2026-10-06 (ADR 019 Amendments).

  interface HostFixture {
    readonly host: string;
    readonly redirectUris: readonly string[];
    /** The redirect the host sends at authorization — may differ from the registered one. */
    readonly authorizeWith: string;
  }

  const HOSTS: readonly HostFixture[] = [
    {
      host: "Claude (hosted)",
      redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
      authorizeWith: "https://claude.ai/api/mcp/auth_callback",
    },
    {
      host: "Claude Code via DCR",
      redirectUris: ["http://localhost:51234/callback"],
      authorizeWith: "http://localhost:51234/callback",
    },
    {
      host: "ChatGPT",
      redirectUris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
      authorizeWith: "https://chatgpt.com/connector_platform_oauth_redirect",
    },
    {
      host: "VS Code (preferred port)",
      redirectUris: VSCODE_REDIRECTS,
      authorizeWith: "http://127.0.0.1:33418/",
    },
  ];

  async function registerHost(
    redirectUris: readonly string[],
  ): Promise<{ status: number; clientId?: string; error?: string }> {
    const res = await fetch(`${ISSUER}/api-gateway/oauth/reg`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // No `application_type`: none of these hosts sends one.
      body: JSON.stringify({
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      }),
    });
    const body = (await res.json()) as {
      client_id?: string;
      error_description?: string;
    };
    return {
      status: res.status,
      clientId: body.client_id,
      error: body.error_description,
    };
  }

  /** Where `/auth` sends the browser — the consent page when the redirect is accepted. */
  async function authorizeHost(clientId: string, redirectUri: string) {
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid ledger.read",
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: "host-state",
    }).toString();
    const res = await fetch(authUrl, { redirect: "manual" });
    const location = res.headers.get("location");
    return {
      status: res.status,
      path: location ? new URL(location, ISSUER).pathname : undefined,
    };
  }

  it.each(HOSTS)("$host registers and reaches consent", async (h) => {
    const reg = await registerHost(h.redirectUris);
    expect(reg).toMatchObject({ status: 201 });
    const auth = await authorizeHost(reg.clientId!, h.authorizeWith);
    expect(auth).toEqual({ status: 303, path: "/oauth/consent" });
  });

  // ADR 019 found these two failing under the provider's `web` default; D3
  // (an unstated `application_type` is native) is what lets them through.
  it("Cursor registers its three URIs without stating application_type", async () => {
    const reg = await registerHost(CURSOR_REDIRECTS);
    expect(reg.error).toBeUndefined();
    expect(reg.status).toBe(201);
    const auth = await authorizeHost(
      reg.clientId!,
      "cursor://anysphere.cursor-mcp/oauth/callback",
    );
    expect(auth).toEqual({ status: 303, path: "/oauth/consent" });
  });

  it("VS Code reaches consent from a loopback port other than 33418", async () => {
    const reg = await registerHost(VSCODE_REDIRECTS);
    expect(reg.status).toBe(201);
    const auth = await authorizeHost(reg.clientId!, "http://127.0.0.1:50123/");
    expect(auth).toEqual({ status: 303, path: "/oauth/consent" });
  });

  // What D3 newly refuses: neither is a legitimate host redirect, and native
  // rules forbid both.
  it.each([
    [
      "plain http to a non-loopback host",
      "http://mcp-client.example.test/callback",
    ],
    ["https to a loopback address", "https://127.0.0.1:8443/callback"],
  ])("refuses to register %s", async (_case, redirectUri) => {
    const reg = await registerHost([redirectUri]);
    expect(reg.status).toBe(400);
  });

  it("keeps web rules for a dynamic client that states application_type web", async () => {
    const res = await fetch(`${ISSUER}/api-gateway/oauth/reg`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        application_type: "web",
        redirect_uris: CURSOR_REDIRECTS,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code"],
        response_types: ["code"],
      }),
    });
    expect(res.status).toBe(400);
  });

  // ── Consent names who is asking (ADR 019 D4) ──────────────────────────────

  /** Starts an authorization and returns the interaction's details as the consent page reads them. */
  async function interactionFor(
    clientId: string,
    redirectUri: string,
    scope = "openid ledger.read",
  ): Promise<Record<string, unknown>> {
    const jar = new CookieJar();
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: "consent-details",
    }).toString();
    const authRes = await fetch(authUrl, { redirect: "manual" });
    jar.absorb(authRes);
    const uid = new URL(authRes.headers.get("location")!).searchParams.get(
      "uid",
    )!;
    const res = await fetch(`${ISSUER}/api-gateway/oauth/interaction/${uid}`, {
      headers: { cookie: jar.header() },
    });
    expect(res.status).toBe(200);
    return (await res.json()) as Record<string, unknown>;
  }

  it("names a dynamic client by its redirect and self-asserted name", async () => {
    const { clientId, redirectUri } = await registerMcpClient();
    const details = await interactionFor(clientId, redirectUri);
    expect(details).toMatchObject({
      client: clientId,
      redirect_uri: redirectUri,
      client_name: "mcp-test-client",
      client_id_host: null,
      loopback_only: false,
    });
  });

  it("flags a client whose every redirect is loopback", async () => {
    const reg = await registerHost([
      "http://localhost:51234/callback",
      "http://127.0.0.1/cb",
    ]);
    const details = await interactionFor(
      reg.clientId!,
      "http://127.0.0.1:61000/cb",
    );
    expect(details).toMatchObject({
      redirect_uri: "http://127.0.0.1:61000/cb",
      client_name: null,
      loopback_only: true,
    });
  });

  it("does not flag a client with any non-loopback redirect", async () => {
    const reg = await registerHost(VSCODE_REDIRECTS);
    const details = await interactionFor(
      reg.clientId!,
      "http://127.0.0.1:33418/",
    );
    expect(details.loopback_only).toBe(false);
  });

  it("answers interaction_not_found for an unknown interaction", async () => {
    const res = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/does-not-exist`,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "interaction_not_found" });
  });

  it("resource indicators: dynamic clients cannot request an API token", async () => {
    const { clientId, redirectUri } = await registerMcpClient();
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      scope: "openid ledger.read",
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: "mcp-state",
      resource: `${ISSUER}/v1`,
    }).toString();

    const res = await fetch(authUrl, { redirect: "manual" });
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("error")).toBe("invalid_target");
  });

  // Consent is an authorization decision. The grant's authority comes entirely
  // from the request — `params.scope` for the scopes, the body's `ledgerId` for
  // the pin — so an approver who holds less than what it hands out is a two-hop
  // privilege escalation: register a client via open DCR, approve it with a
  // read-only ledger-pinned key, redeem the code, walk away with an unpinned
  // `ledger.admin` token and a refresh token.
  async function startAuthorization(): Promise<{
    jar: CookieJar;
    uid: string;
    clientId: string;
    redirectUri: string;
  }> {
    const { clientId, redirectUri } = await registerMcpClient();
    const jar = new CookieJar();
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "openid offline_access ledger.read ledger.write ledger.admin",
    );
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", crypto.randomBytes(8).toString("hex"));
    authUrl.searchParams.set("prompt", "consent");
    const authRes = await fetch(authUrl, { redirect: "manual" });
    jar.absorb(authRes);
    const uid = new URL(authRes.headers.get("location")!).searchParams.get(
      "uid",
    )!;
    expect(uid).toBeTruthy();
    return { jar, uid, clientId, redirectUri };
  }

  async function postInteractionLogin(opts: {
    uid: string;
    jar: CookieJar;
    bearer: string;
    body?: Record<string, string>;
  }): Promise<Response> {
    return fetch(`${ISSUER}/api-gateway/oauth/interaction/${opts.uid}/login`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${opts.bearer}`,
        cookie: opts.jar.header(),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(opts.body ?? {}),
      redirect: "manual",
    });
  }

  it("consent: a scoped, ledger-pinned credential cannot approve a grant", async () => {
    const { jar, uid } = await startAuthorization();

    const res = await postInteractionLogin({
      uid,
      jar,
      bearer: TEST_SCOPED_TOKEN,
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("full signed-in session");
    // And the interaction is not finished: no redirect back to the client, so
    // there is no authorization code to redeem.
    expect(res.headers.get("location")).toBeNull();
  });

  it("consent: a scoped credential cannot approve even for its own pinned ledger", async () => {
    const { jar, uid } = await startAuthorization();

    // Naming the ledger the key is already confined to does not make the key a
    // valid approver — the escalation is over the *scopes*, which this handler
    // reads from the request either way.
    const res = await postInteractionLogin({
      uid,
      jar,
      bearer: TEST_SCOPED_TOKEN,
      body: { ledgerId: "ada/personal" },
    });

    expect(res.status).toBe(403);
  });

  it("consent: an unauthenticated approval is refused, not treated as a bad form", async () => {
    const { jar, uid } = await startAuthorization();

    const res = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/${uid}/login`,
      {
        method: "POST",
        headers: {
          cookie: jar.header(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({}),
        redirect: "manual",
      },
    );

    expect(res.status).toBe(401);
  });

  it("MCP flow: dynamic client registration still works, and a ledger-pinned grant gets ledger-scoped claims", async () => {
    const { clientId, redirectUri } = await registerMcpClient();

    // Confirm interactions.url routes MCP clients to the ledger-picker page.
    const jar = new CookieJar();
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set(
      "scope",
      "openid offline_access ledger.read ledger.write ledger.admin",
    );
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", "abc");
    const authRes = await fetch(authUrl, { redirect: "manual" });
    jar.absorb(authRes);
    expect(new URL(authRes.headers.get("location")!).pathname).toBe(
      "/oauth/consent",
    );

    // Full flow with a ledgerId provided. offline_access requires prompt=consent
    // per RFC — oidc-provider silently drops it from the granted scope otherwise.
    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
      loginBody: { ledgerId: "ada/personal" },
      prompt: "consent",
    });

    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId,
      redirectUri,
    });
    expect(tokenBody.access_token).toBeTruthy();
    expect(tokenBody.refresh_token).toBeTruthy();

    const userinfoRes = await fetch(`${ISSUER}/api-gateway/oauth/me`, {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });
    const claims = (await userinfoRes.json()) as Record<string, unknown>;
    // MCP's default scope never requests email/profile, so the shared
    // findAccount/claims() function returns exactly the pre-merge MCP shape.
    // sub is the raw "userId:ledgerId" accountId — oidc-provider always uses
    // accountId verbatim as sub regardless of what claims() returns for that key.
    expect(claims.sub).toBe(`${TEST_USER.id}:ada/personal`);
    expect(claims.email).toBeUndefined();
    expect(claims.preferred_username).toBeUndefined();
  });

  it("mints an unpinned grant only with explicit account-wide consent", async () => {
    const { clientId, redirectUri } = await registerMcpClient();

    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
      loginBody: {
        accountWide: "true",
        scope: "openid offline_access ledger.read ledger.write ledger.admin",
      },
      prompt: "consent",
    });

    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId,
      redirectUri,
    });
    expect(tokenBody.access_token).toBeTruthy();

    const userinfoRes = await fetch(`${ISSUER}/api-gateway/oauth/me`, {
      headers: { authorization: `Bearer ${tokenBody.access_token}` },
    });
    const claims = (await userinfoRes.json()) as Record<string, unknown>;
    // No ":ledgerId" suffix — the accountId is the bare user, which is what
    // leaves the token unconfined.
    expect(claims.sub).toBe(TEST_USER.id);
    const resource = `${ISSUER}/api-gateway/mcp`;
    const refresh = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenBody.refresh_token as string,
        client_id: clientId,
        resource,
      }),
    });
    expect(refresh.status).toBe(200);
    const refreshed = (await refresh.json()) as { access_token: string };
    expect(decodeJwt(refreshed.access_token).aud).toBe(resource);
    expect(decodeJwt(refreshed.access_token).ledger_id).toBeUndefined();
  });

  it.each<Record<string, string>>([
    {},
    { accountWide: "false" },
    { accountWide: "true" },
    { accountWide: "true", scope: "openid ledger.write" },
    {
      accountWide: "true",
      scope: "openid ledger.read",
      ledgerId: "ada/personal",
    },
  ])("rejects ambiguous or mismatched MCP consent: %j", async (loginBody) => {
    const { clientId, redirectUri } = await registerMcpClient();
    await expect(
      driveAuthorizationCode({
        clientId,
        clientAuth: "",
        scope: "openid ledger.read",
        redirectUri,
        loginBody,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("uses the MCP resource for authorization, refresh, and discovery", async () => {
    const { clientId, redirectUri } = await registerMcpClient();
    const resource = `${ISSUER}/api-gateway/mcp`;

    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
      loginBody: { ledgerId: "ada/personal" },
      prompt: "consent",
      resource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId,
      redirectUri,
      resource,
    });
    expect(tokenBody.refresh_token).toBeTruthy();

    const refresh = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenBody.refresh_token as string,
        client_id: clientId,
        resource,
      }),
    });
    expect(refresh.status).toBe(200);
    const refreshed = (await refresh.json()) as Record<string, unknown>;
    expect(decodeJwt(refreshed.access_token as string).aud).toBe(resource);
    expect(decodeJwt(refreshed.access_token as string).ledger_id).toBe(
      "ada/personal",
    );

    const metadata = (await (
      await fetch(`${ISSUER}/.well-known/oauth-protected-resource`)
    ).json()) as { resource?: string };
    expect(metadata.resource).toBe(resource);
  });

  // ── CIMD (ADR 019 D6) ─────────────────────────────────────────────────────

  it("advertises client ID metadata documents alongside dynamic registration", async () => {
    const body = (await (
      await fetch(`${ISSUER}/.well-known/oauth-authorization-server`)
    ).json()) as Record<string, unknown>;
    expect(body.client_id_metadata_document_supported).toBe(true);
    // Claude uses CIMD only when `none` is also accepted; DCR hosts still need registration.
    expect(body.token_endpoint_auth_methods_supported).toContain("none");
    expect(body.registration_endpoint).toBeTruthy();
  });

  // Hosts' metadata documents as published (re-verified 2026-10-06, ADR 019
  // Amendments). oidc-provider fetches them through its configurable `fetch`,
  // which defaults to the global one; tests answer these URLs locally and pass
  // every other request through, so nothing reaches the network.
  const CIMD_DOCUMENTS: Record<string, Record<string, unknown>> = {
    "https://claude.ai/oauth/claude-code-client-metadata": {
      client_id: "https://claude.ai/oauth/claude-code-client-metadata",
      client_name: "Claude Code",
      client_uri: "https://claude.ai",
      redirect_uris: ["http://localhost/callback", "http://127.0.0.1/callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    "https://vscode.dev/oauth/client-metadata.json": {
      client_id: "https://vscode.dev/oauth/client-metadata.json",
      client_name: "Visual Studio Code",
      application_type: "native",
      redirect_uris: ["http://127.0.0.1:33418/", "https://vscode.dev/redirect"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    // ChatGPT's document URL is not published; the shape follows its auth docs.
    "https://chatgpt.example.test/oauth/client-metadata.json": {
      client_id: "https://chatgpt.example.test/oauth/client-metadata.json",
      client_name: "ChatGPT",
      redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
  };

  describe("CIMD hosts reach consent without registering", () => {
    const realFetch = globalThis.fetch;
    let served: Record<string, () => Response>;

    beforeEach(() => {
      served = Object.fromEntries(
        Object.entries(CIMD_DOCUMENTS).map(([url, doc]) => [
          url,
          () => Response.json(doc),
        ]),
      );
      jest
        .spyOn(globalThis, "fetch")
        .mockImplementation(
          (input: string | URL | Request, init?: RequestInit) => {
            const url =
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url;
            const serve = served[url];
            return serve ? Promise.resolve(serve()) : realFetch(input, init);
          },
        );
    });
    afterEach(() => jest.restoreAllMocks());

    /** A refused metadata document is an OAuth error page, never a 500 or a consent page. */
    async function expectRefused(
      clientId: string,
      redirectUri: string,
      error: "invalid_client" | "invalid_redirect_uri",
    ) {
      const { codeChallenge } = pkce();
      const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
      authUrl.search = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        scope: "openid ledger.read",
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }).toString();
      const res = await fetch(authUrl, { redirect: "manual" });
      expect(res.status).toBe(400);
      expect(res.headers.get("location")).toBeNull();
      expect(await res.text()).toContain(error);
    }

    it("refuses a client whose metadata document cannot be fetched", async () => {
      const id = "https://gone.example.test/oauth/client-metadata.json";
      served[id] = () => new Response("not found", { status: 404 });
      await expectRefused(
        id,
        "https://gone.example.test/callback",
        "invalid_client",
      );
    });

    it("refuses a document that names a different client_id", async () => {
      const id = "https://impostor.example.test/oauth/client-metadata.json";
      served[id] = () =>
        Response.json({
          ...CIMD_DOCUMENTS[
            "https://claude.ai/oauth/claude-code-client-metadata"
          ],
        });
      await expectRefused(
        id,
        "http://localhost:51999/callback",
        "invalid_client",
      );
    });

    it("refuses a redirect the document does not list", async () => {
      await expectRefused(
        "https://chatgpt.example.test/oauth/client-metadata.json",
        "https://attacker.example.test/callback",
        "invalid_redirect_uri",
      );
    });

    it("refuses a client_id on a special-use address without fetching it", async () => {
      // Not in `served`: the request reaches oidc-provider's SSRF-protected
      // dispatcher, which refuses loopback before connecting.
      await expectRefused(
        "https://127.0.0.1/oauth/client-metadata.json",
        "http://localhost:51999/callback",
        "invalid_client",
      );
    });

    it.each([
      [
        "Claude Code",
        "https://claude.ai/oauth/claude-code-client-metadata",
        "http://localhost:51999/callback",
        "claude.ai",
        true,
      ],
      [
        "VS Code (preferred port)",
        "https://vscode.dev/oauth/client-metadata.json",
        "http://127.0.0.1:33418/",
        "vscode.dev",
        false,
      ],
      [
        "VS Code (fallback port)",
        "https://vscode.dev/oauth/client-metadata.json",
        "http://127.0.0.1:50123/",
        "vscode.dev",
        false,
      ],
      [
        "ChatGPT-shaped",
        "https://chatgpt.example.test/oauth/client-metadata.json",
        "https://chatgpt.com/connector_platform_oauth_redirect",
        "chatgpt.example.test",
        false,
      ],
    ])(
      "%s reaches consent naming its vouching domain",
      async (_host, clientId, redirectUri, vouchedBy, loopbackOnly) => {
        const auth = await authorizeHost(clientId, redirectUri);
        expect(auth).toEqual({ status: 303, path: "/oauth/consent" });
        const details = await interactionFor(clientId, redirectUri);
        expect(details).toMatchObject({
          client: clientId,
          redirect_uri: redirectUri,
          client_name: (CIMD_DOCUMENTS[clientId] as { client_name: string })
            .client_name,
          client_id_host: vouchedBy,
          loopback_only: loopbackOnly,
        });
        // Identified by URL, not registered: no row in the client store.
        expect(
          await new MemoryAdapter("Client").find(clientId),
        ).toBeUndefined();
      },
    );
  });

  // ── Discovery (consumed by Discourse's openid_connect_discovery_document) ──

  it("discovery document advertises profile/email scopes and the userinfo endpoint", async () => {
    const res = await fetch(`${ISSUER}/.well-known/oauth-authorization-server`);
    const body = (await res.json()) as {
      issuer?: string;
      authorization_endpoint?: string;
      token_endpoint?: string;
      userinfo_endpoint?: string;
      scopes_supported?: string[];
      code_challenge_methods_supported?: string[];
      token_endpoint_auth_methods_supported?: string[];
      response_types_supported?: string[];
      grant_types_supported?: string[];
      authorization_response_iss_parameter_supported?: boolean;
    };
    expect(body.issuer).toBe(ISSUER);
    expect(body.authorization_endpoint).toBe(
      `${ISSUER}/api-gateway/oauth/auth`,
    );
    expect(body.token_endpoint).toBe(`${ISSUER}/api-gateway/oauth/token`);
    expect(body.userinfo_endpoint).toBe(`${ISSUER}/api-gateway/oauth/me`);
    expect(body.scopes_supported).toEqual(
      expect.arrayContaining(["openid", "profile", "email"]),
    );
    expect(body.code_challenge_methods_supported).toContain("S256");
    expect(body.token_endpoint_auth_methods_supported).toContain(
      "client_secret_basic",
    );
    expect(body.response_types_supported).toEqual(["code"]);
    expect(body.authorization_response_iss_parameter_supported).toBe(true);
    expect(body.grant_types_supported).toEqual(
      expect.arrayContaining(["authorization_code", "refresh_token"]),
    );
  });

  it("public JWKS exposes only the active public signing key", async () => {
    const res = await fetch(`${ISSUER}/api-gateway/oauth/jwks`);
    const body = (await res.json()) as {
      keys?: Array<Record<string, unknown>>;
    };
    expect(res.status).toBe(200);
    expect(body.keys).toHaveLength(1);
    expect(body.keys?.[0]).toMatchObject({
      kid: "development-ephemeral",
      kty: "EC",
      crv: "P-256",
      alg: "ES256",
    });
    expect(body.keys?.[0].d).toBeUndefined();
  });

  it("canonical protected-resource metadata exactly names the API resource", async () => {
    const res = await fetch(
      `${ISSUER}/.well-known/oauth-protected-resource/v1`,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      resource: `${ISSUER}/v1`,
      authorization_servers: [ISSUER],
      scopes_supported: ["ledger.read", "ledger.write", "ledger.admin"],
      bearer_methods_supported: ["header"],
    });
  });
});

// The config layer now rejects an empty issuer before provider construction.
// The optional Discourse secret remains allowed to be empty; in that case only
// the always-present public mobile client is registered.
describe("oidc-route: missing Discourse secret must not crash the server", () => {
  const PORT = 47593;
  const ISSUER = `http://127.0.0.1:${PORT}`;
  let server: http.Server;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("setOidcRoutes does not throw when discourseClientSecret is empty", () => {
    const app = new Koa();
    const router = new Router();

    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: "https://beancount.io",
        interactionUrl: "https://beancount.io",
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClientSecret: "", // may be empty in production
      },
    } as unknown as AppConfig;

    expect(() => {
      setOidcRoutes(
        router,
        {
          database: { db: {} as never, models: {} as never },
          clients: {} as never,
        },
        config,
      );
    }).not.toThrow();

    app.use(router.routes());
    app.use(router.allowedMethods());
    server = http.createServer(app.callback());
  });

  it("keeps the server available and returns 503 when OAuth signing keys are absent", async () => {
    const app = new Koa();
    const router = new Router();
    const disabledIssuer = "http://127.0.0.1:47594";
    const config = {
      env: "production",
      oauth: {
        issuer: disabledIssuer,
        interactionUrl: disabledIssuer,
        jwks: undefined,
        unavailableReason: "OAUTH_JWKS is required in production",
        discourseClientSecret: "",
      },
    } as unknown as AppConfig;

    setOidcRoutes(
      router,
      {
        database: { db: {} as never, models: {} as never },
        clients: {} as never,
      },
      config,
    );
    router.get("/healthz", (ctx) => {
      ctx.body = { ok: true };
    });
    app.use(router.routes());
    app.use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(47594, resolve));

    const health = await fetch(`${disabledIssuer}/healthz`);
    expect(health.status).toBe(200);
    const oauth = await fetch(`${disabledIssuer}/api-gateway/oauth/token`, {
      method: "POST",
    });
    expect(oauth.status).toBe(503);
    expect(await oauth.json()).toMatchObject({
      error: "oauth_not_configured",
    });
  });

  it("the discourse client is simply absent — no crash, no client registered", async () => {
    const app = new Koa();
    const router = new Router();

    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: ISSUER,
        interactionUrl: ISSUER,
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClientSecret: "",
      },
    } as unknown as AppConfig;

    setOidcRoutes(
      router,
      {
        database: { db: {} as never, models: {} as never },
        clients: {} as never,
      },
      config,
    );
    app.use(router.routes());
    app.use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(PORT, resolve));

    // Server is up and serving requests at all (the crash regression would
    // have prevented this listen from ever completing).
    const res = await fetch(
      `${ISSUER}/api-gateway/oauth/auth?client_id=${DISCOURSE_CLIENT_ID}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(DISCOURSE_REDIRECT_URI)}&code_challenge=test&code_challenge_method=S256&state=test`,
      { redirect: "manual" },
    );
    // 400 invalid_client, not a connection failure or 500 — the route works,
    // it just correctly has no client registered for this id.
    expect(res.status).toBe(400);
  });
});

describe("oidc-route: path-prefixed public issuer", () => {
  const PORT = 47594;
  const ORIGIN = `http://127.0.0.1:${PORT}`;
  const ISSUER = `${ORIGIN}/books`;
  let server: http.Server;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith("/books/api-gateway/oauth/")) {
        ctx.req.url = ctx.req.url?.slice("/books".length) ?? ctx.req.url;
      }
      await next();
    });
    const koaBodyParser = bodyParser();
    app.use(async (ctx, next) => {
      const isOidcCore =
        ctx.path.startsWith("/api-gateway/oauth/") &&
        !ctx.path.startsWith("/api-gateway/oauth/interaction/");
      if (isOidcCore) return next();
      return koaBodyParser(
        ctx as unknown as Parameters<typeof koaBodyParser>[0],
        next,
      );
    });
    app.use(async (ctx, next) => {
      if (ctx.headers.authorization === `Bearer ${TEST_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "session",
          scopes: new Set(),
        };
      } else if (ctx.headers.authorization === `Bearer ${TEST_SCOPED_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "apikey",
          scopes: new Set(["ledger.read"]),
          ledgerScope: "ada/personal",
          tokenId: "akey_test",
        };
      }
      await next();
    });
    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: ISSUER,
        interactionUrl: ORIGIN,
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClientSecret: "",
      },
    } as unknown as AppConfig;

    setOidcRoutes(
      router,
      {
        database: {
          db: {} as never,
          models: {
            user: {
              getById: jest.fn(async (_db: unknown, id: string) =>
                id === TEST_USER.id ? TEST_USER : null,
              ),
            },
          } as never,
        },
        clients: {} as never,
      },
      config,
    );
    app.use(router.routes());
    app.use(router.allowedMethods());
    server = http.createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(PORT, resolve));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("serves an exact path-aware metadata chain", async () => {
    const resourceResponse = await fetch(
      `${ORIGIN}/.well-known/oauth-protected-resource/books/v1`,
    );
    expect(resourceResponse.status).toBe(200);
    expect(await resourceResponse.json()).toMatchObject({
      resource: `${ISSUER}/v1`,
      authorization_servers: [ISSUER],
    });

    const issuerResponse = await fetch(
      `${ORIGIN}/.well-known/oauth-authorization-server/books`,
    );
    expect(issuerResponse.status).toBe(200);
    expect(await issuerResponse.json()).toMatchObject({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/api-gateway/oauth/auth`,
      token_endpoint: `${ISSUER}/api-gateway/oauth/token`,
    });
  });

  it("preserves the issuer prefix through authorization, consent, and token exchange", async () => {
    const jar = new CookieJar();
    const { codeVerifier, codeChallenge } = pkce();
    const scope = "openid offline_access ledger.read";
    const resource = `${ISSUER}/v1`;
    const redirectUri = MOBILE_REDIRECT_URIS[0];
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.search = new URLSearchParams({
      client_id: MOBILE_CLIENT_ID,
      response_type: "code",
      scope,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state: "path-prefix-state",
      prompt: "consent",
      resource,
    }).toString();

    const authorization = await fetch(authUrl, { redirect: "manual" });
    expect(authorization.status).toBe(303);
    jar.absorb(authorization);
    const consentUrl = new URL(authorization.headers.get("location")!);
    expect(consentUrl.origin).toBe(ORIGIN);
    expect(consentUrl.pathname).toBe("/oauth/mobile-consent");
    const uid = consentUrl.searchParams.get("uid")!;

    const consent = await fetch(
      `${ISSUER}/api-gateway/oauth/interaction/${uid}/login`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
          cookie: jar.header(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ scope }),
        redirect: "manual",
      },
    );
    expect(consent.status).toBe(303);
    jar.absorb(consent);
    const resumeUrl = new URL(consent.headers.get("location")!, ISSUER);
    expect(resumeUrl.pathname.startsWith("/books/")).toBe(true);

    const resume = await fetch(resumeUrl, {
      headers: { cookie: jar.header() },
      redirect: "manual",
    });
    expect(resume.status).toBe(303);
    const callback = new URL(resume.headers.get("location")!);
    expect(`${callback.protocol}${callback.pathname}`).toBe(redirectUri);
    expect(callback.searchParams.get("iss")).toBe(ISSUER);

    const token = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: MOBILE_CLIENT_ID,
        code: callback.searchParams.get("code")!,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        resource,
      }),
    });
    expect(token.status).toBe(200);
    const tokenBody = (await token.json()) as { access_token: string };
    expect(decodeJwt(tokenBody.access_token)).toMatchObject({
      iss: ISSUER,
      aud: resource,
      sub: TEST_USER.id,
    });
  });
});
