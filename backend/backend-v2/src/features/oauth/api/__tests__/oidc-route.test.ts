import * as http from "node:http";
import * as crypto from "node:crypto";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import type { AppConfig } from "@/config/config";
import { getJwks } from "@/config/jwks";
import { setOidcRoutes } from "../oidc-route";

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
const ISSUER = `http://127.0.0.1:${PORT}`;
const DISCOURSE_CLIENT_ID = "discourse-test";
const DISCOURSE_CLIENT_SECRET = "test-client-secret-value";
const DISCOURSE_REDIRECT_URI = "https://forum.example.test/auth/callback";
const TEST_TOKEN = "test-bearer-token";
const TEST_USER = {
  id: "user_test123",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  ledger_username: "ada",
  avatarUrl: "https://example.com/avatar.png",
  isBlocked: false,
};

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
        jwks: getJwks("test" as AppConfig["env"]),
        discourseClient: {
          clientId: DISCOURSE_CLIENT_ID,
          clientSecret: DISCOURSE_CLIENT_SECRET,
          redirectUri: DISCOURSE_REDIRECT_URI,
        },
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
        body: new URLSearchParams(opts.loginBody ?? {}),
        redirect: "manual",
      },
    );
    if (loginRes.status >= 400) {
      const body = (await loginRes.json().catch(() => ({}))) as {
        error?: string;
      };
      throw Object.assign(new Error("login failed"), {
        status: loginRes.status,
        body,
      });
    }
    jar.absorb(loginRes);
    const resumeLocation = loginRes.headers.get("location")!;

    const resumeRes = await fetch(new URL(resumeLocation, ISSUER), {
      headers: { cookie: jar.header() },
      redirect: "manual",
    });
    expect(resumeRes.status).toBe(303);
    const finalLocation = new URL(resumeRes.headers.get("location")!);
    expect(finalLocation.origin + finalLocation.pathname).toBe(
      opts.redirectUri,
    );
    const code = finalLocation.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(finalLocation.searchParams.get("state")).toBe(state);

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

  it("MCP flow: dynamic client registration still works, and a ledger-pinned grant gets ledger-scoped claims", async () => {
    const { clientId, redirectUri } = await registerMcpClient();

    // Confirm interactions.url routes MCP clients to the ledger-picker page.
    const jar = new CookieJar();
    const { codeChallenge } = pkce();
    const authUrl = new URL(`${ISSUER}/api-gateway/oauth/auth`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid offline_access");
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
      scope: "openid offline_access",
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
      scope: "openid offline_access",
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
  // Hence discovery keeps naming the legacy resource until the 30-day refresh
  // TTL has retired every such grant. This test fails if that is flipped early.
  it("does not advertise a resource that pre-existing grants cannot refresh against", async () => {
    const { clientId, redirectUri } = await registerMcpClient();
    const legacyResource = `${ISSUER}/api-gateway/mcp`;
    const newResource = `${ISSUER}/v1`;

    const { code, verifier } = await driveAuthorizationCode({
      clientId,
      clientAuth: "",
      scope: "openid offline_access",
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

    // Refreshing against the resource the grant was issued for works.
    const sameResource = await refreshWith(legacyResource);
    expect(sameResource.status).toBe(200);

    // Naming a different one does not — this is the failure mode being guarded,
    // pinned so nobody has to rediscover why discovery lags behind.
    const switched = await refreshWith(newResource);
    expect(switched.status).toBe(400);
    expect(switched.body.error).toBe("invalid_grant");

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
  });
});

// Regression test for a real incident: passing OAUTH_ISSUER through
// docker-compose.yml as `${OAUTH_ISSUER:-}` turned "env var unset" into "env
// var set to an empty string". config.ts used `??`, which only falls back on
// null/undefined, so the empty string reached `new Provider("", ...)`
// directly — oidc-provider asserts the issuer is a non-empty URL and throws,
// which was an unhandled rejection that crashed the entire server on boot
// (not just the OAuth feature). issuer is now hardcoded (see config.ts), so
// this exact scenario can no longer happen — but the discourseClient fields
// are still partially env-sourced (clientSecret), so this locks in that an
// empty/missing config there degrades gracefully instead of crashing.
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
        issuer: "https://beancount.io", // hardcoded, per config.ts — never empty
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

  it("the discourse client is simply absent — no crash, no client registered", async () => {
    const app = new Koa();
    const router = new Router();

    const config = {
      env: "test",
      jwt: { secret: "test-jwt-secret", expMins: 525600 },
      oauth: {
        issuer: ISSUER,
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
