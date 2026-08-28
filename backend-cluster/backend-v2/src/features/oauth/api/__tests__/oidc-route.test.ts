import * as http from "node:http";
import * as crypto from "node:crypto";
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
  MOBILE_CLIENT_ID,
  MOBILE_REDIRECT_URIS,
  oauthLifetimes,
  oauthWellKnownPath,
  setOidcRoutes,
  shouldRotateRefreshToken,
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
const MOBILE_SESSION_DAYS = 365;
const DAY_SECONDS = 24 * 60 * 60;
const ISSUER = `http://127.0.0.1:${PORT}`;
const DISCOURSE_CLIENT_ID = "discourse-test";
const DISCOURSE_CLIENT_SECRET = "test-client-secret-value";
const DISCOURSE_REDIRECT_URI = "https://forum.example.test/auth/callback";
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

describe("OAuth token lifetimes", () => {
  const lifetimes = oauthLifetimes(MOBILE_SESSION_DAYS);

  it("gives the native app a year-long idle window, others 30 days", () => {
    expect(lifetimes.refreshToken(MOBILE_CLIENT_ID)).toBe(365 * DAY_SECONDS);
    expect(lifetimes.refreshToken("some-mcp-client")).toBe(30 * DAY_SECONDS);
  });

  it("keeps the native grant alive longer than the token it backs", () => {
    // `validateGrant` runs before the refresh token is consumed, so a grant
    // that expires first fails the refresh with invalid_grant even while the
    // token itself is still valid. The grant must never be the binding cap.
    expect(lifetimes.grant(MOBILE_CLIENT_ID)).toBeGreaterThan(
      lifetimes.refreshToken(MOBILE_CLIENT_ID),
    );
    expect(lifetimes.grant("some-mcp-client")).toBe(14 * DAY_SECONDS);
  });

  it("scales the native lifetimes with the configured session length", () => {
    const tightened = oauthLifetimes(30);
    expect(tightened.refreshToken(MOBILE_CLIENT_ID)).toBe(30 * DAY_SECONDS);
    expect(tightened.grant(MOBILE_CLIENT_ID)).toBe(31 * DAY_SECONDS);
    // Other clients are unaffected by the native knob.
    expect(tightened.refreshToken("some-mcp-client")).toBe(30 * DAY_SECONDS);
    expect(tightened.grant("some-mcp-client")).toBe(14 * DAY_SECONDS);
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

  it("leaves other clients on oidc-provider's default policy", () => {
    const publicClient = { clientId: "mcp-public", clientAuthMethod: "none" };
    const confidential = {
      clientId: "mcp-confidential",
      clientAuthMethod: "client_secret_basic",
    };
    expect(shouldRotateRefreshToken(publicClient, fresh)).toBe(true);
    expect(shouldRotateRefreshToken(publicClient, ancient)).toBe(false);
    expect(shouldRotateRefreshToken(confidential, fresh)).toBe(false);
    expect(
      shouldRotateRefreshToken(confidential, {
        ...fresh,
        ttlPercentagePassed: () => 70,
      }),
    ).toBe(true);
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
          capabilityExempt: true,
        };
      } else if (ctx.headers.authorization === `Bearer ${TEST_SCOPED_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "apikey",
          scopes: new Set(["ledger.read"]),
          ledgerScope: "ada/personal",
          tokenId: "akey_test",
          capabilityExempt: false,
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
        discourseClient: {
          clientId: DISCOURSE_CLIENT_ID,
          clientSecret: DISCOURSE_CLIENT_SECRET,
          redirectUri: DISCOURSE_REDIRECT_URI,
        },
        mobileSessionDays: MOBILE_SESSION_DAYS,
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
        capabilityExempt: false,
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

  it("mobile flow: rejects the legacy MCP resource and ledger pinning", async () => {
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
      MOBILE_SESSION_DAYS * DAY_SECONDS,
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
      MOBILE_SESSION_DAYS * DAY_SECONDS,
    );
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
      (MOBILE_SESSION_DAYS - 1) * DAY_SECONDS,
    );
    const slid = await grants.find(grantId);
    expect((slid?.exp as number) - now()).toBeGreaterThan(
      MOBILE_SESSION_DAYS * DAY_SECONDS,
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
    authUrl.searchParams.set("resource", "https://attacker.example.test/api");

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

  // ADR 0006 D5: pinning a grant to one ledger is the least-privilege shape,
  // but it cannot be mandatory — a token confined to one ledger makes
  // cross-ledger operations (listing the caller's ledgers) inexpressible. An
  // omitted ledgerId now mints an unpinned grant rather than a 400.
  it("mints an unpinned grant when no ledgerId is supplied", async () => {
    const { clientId, redirectUri } = await registerMcpClient();

    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
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
  });

  // Guards the transition rule that keeps pre-existing MCP sessions alive.
  //
  // A refresh token carries the resource indicator its AUTHORIZATION request
  // named, and oidc-provider refuses a token request naming any other one
  // (resolveResource -> InvalidTarget, surfacing as 400 invalid_grant). Clients
  // learn which resource to name by reading
  // .well-known/oauth-protected-resource. So advertising a new resource while
  // grants issued against the old one are still alive kills every one of those
  // sessions on its next refresh — verified: it returns exactly that error.
  //
  // New grants carry both resources so they are ready for the eventual flip,
  // while discovery keeps naming the legacy resource until the last old-only
  // grant reaches its 30-day TTL. This test fails if either half is removed.
  it("bridges new MCP grants while discovery protects pre-existing grants", async () => {
    const { clientId, redirectUri } = await registerMcpClient();
    const legacyResource = `${ISSUER}/api-gateway/mcp`;
    const newResource = `${ISSUER}/v1`;

    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access ledger.read ledger.write ledger.admin",
      redirectUri,
      loginBody: { ledgerId: "ada/personal" },
      prompt: "consent",
      resource: legacyResource,
    });
    const tokenBody = await exchangeToken({
      code,
      verifier,
      clientId,
      redirectUri,
      resource: legacyResource,
    });
    expect(tokenBody.refresh_token).toBeTruthy();

    const refreshWith = async (resource: string) => {
      const res = await fetch(`${ISSUER}/api-gateway/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenBody.refresh_token as string,
          client_id: clientId,
          resource,
        }),
      });
      return {
        status: res.status,
        body: (await res.json()) as Record<string, unknown>,
      };
    };

    // New grants also carry the canonical resource, so they survive the future
    // discovery flip without a custom token-exchange grant.
    const switched = await refreshWith(newResource);
    expect(switched.status).toBe(200);
    expect(decodeJwt(switched.body.access_token as string).aud).toBe(
      newResource,
    );

    // Therefore discovery must keep naming the resource existing grants hold.
    const metadata = (await (
      await fetch(`${ISSUER}/.well-known/oauth-protected-resource`)
    ).json()) as { resource?: string };
    expect(metadata.resource).toBe(legacyResource);
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
describe("oidc-route: missing discourseClient config must not crash the server", () => {
  const PORT = 47593;
  const ISSUER = `http://127.0.0.1:${PORT}`;
  let server: http.Server;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("setOidcRoutes does not throw when discourseClient.clientSecret is empty", () => {
    const app = new Koa();
    const router = new Router();

    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: "https://beancount.io",
        interactionUrl: "https://beancount.io",
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClient: {
          clientId: "discourse-forum",
          clientSecret: "", // the one field that CAN be empty in production
          redirectUri: "https://beancount.io/forum/auth/oidc/callback",
        },
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
        discourseClient: {
          clientId: "discourse-forum",
          clientSecret: "",
          redirectUri: "https://beancount.io/forum/auth/oidc/callback",
        },
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
        discourseClient: {
          clientId: "discourse-forum",
          clientSecret: "",
          redirectUri: "https://beancount.io/forum/auth/oidc/callback",
        },
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
      `${ISSUER}/api-gateway/oauth/auth?client_id=discourse-forum&response_type=code&scope=openid&redirect_uri=https://beancount.io/forum/auth/oidc/callback&code_challenge=test&code_challenge_method=S256&state=test`,
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
          capabilityExempt: true,
        };
      } else if (ctx.headers.authorization === `Bearer ${TEST_SCOPED_TOKEN}`) {
        ctx.state.identity = {
          userId: TEST_USER.id,
          method: "apikey",
          scopes: new Set(["ledger.read"]),
          ledgerScope: "ada/personal",
          tokenId: "akey_test",
          capabilityExempt: false,
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
        discourseClient: {
          clientId: "discourse-forum",
          clientSecret: "",
          redirectUri: `${ORIGIN}/forum/callback`,
        },
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
