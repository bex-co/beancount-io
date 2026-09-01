import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
  DASHBOARD_OAUTH_CLIENT_ID,
  DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
  DASHBOARD_OAUTH_PATHS,
  DASHBOARD_OAUTH_SCOPES,
  DASHBOARD_OAUTH_TRANSACTION_COOKIE,
  dashboardAuthLoginHref,
  dashboardOAuthStartHref,
  dashboardOAuthUrls,
  issuerEndpointBackendPath,
  issuerFromRouteUrl,
  oauthAuthorizationServerMetadataPath,
} from "../dashboard-oauth";
import {
  handleDashboardOAuthCallback,
  handleDashboardOAuthConsent,
  handleDashboardOAuthCredential,
  handleDashboardOAuthLogout,
  handleDashboardMagicLinkStart,
  handleDashboardOAuthStart,
  legacyDashboardSessionUpgradeHrefForRequest,
  openDashboardOAuthTransaction,
  sealDashboardOAuthTransaction,
  type DashboardOAuthTransaction,
} from "../dashboard-oauth.server";

const ISSUER = "https://books.example.test/beancount";
const SECRET = "test-secret-with-at-least-thirty-two-bytes";
const SIGNING_KEY_ID = "dashboard-oauth-test-key";
const signingKeyPair = generateKeyPairSync("ec", { namedCurve: "P-256" });
const publicSigningJwk = {
  ...signingKeyPair.publicKey.export({ format: "jwk" }),
  kid: SIGNING_KEY_ID,
  alg: "ES256",
  use: "sig",
  key_ops: ["verify"],
} as JsonWebKey;

function metadata() {
  return {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/api-gateway/oauth/auth`,
    token_endpoint: `${ISSUER}/api-gateway/oauth/token`,
    jwks_uri: `${ISSUER}/api-gateway/oauth/jwks`,
    end_session_endpoint: `${ISSUER}/api-gateway/oauth/logout`,
  };
}

function jwks(key: JsonWebKey = publicSigningJwk) {
  return { keys: [key] };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function jwtPart(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function dashboardToken(
  now = Math.floor(Date.now() / 1000),
  claimOverrides: Record<string, unknown> = {},
): string {
  const header = jwtPart({
    alg: "ES256",
    typ: "at+jwt",
    kid: SIGNING_KEY_ID,
  });
  const claims = jwtPart({
    iss: ISSUER,
    aud: `${ISSUER}/v1`,
    sub: "usr_ada",
    client_id: DASHBOARD_OAUTH_CLIENT_ID,
    scope: DASHBOARD_OAUTH_SCOPES.join(" "),
    iat: now,
    exp: now + DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    ...claimOverrides,
  });
  const signature = sign("sha256", Buffer.from(`${header}.${claims}`), {
    key: signingKeyPair.privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

function tamperJwtSignature(token: string): string {
  const parts = token.split(".");
  const signature = parts[2];
  parts[2] = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  return parts.join(".");
}

function transaction(
  overrides: Partial<DashboardOAuthTransaction> = {},
): DashboardOAuthTransaction {
  const urls = dashboardOAuthUrls(ISSUER);
  return {
    version: 1,
    state: "state-value-with-enough-entropy",
    codeVerifier: "verifier-value-with-enough-entropy-for-pkce",
    issuer: ISSUER,
    resource: urls.resource,
    redirectUri: urls.redirectUri,
    next: "/ledger/ada/personal",
    createdAt: Date.now(),
    ...overrides,
  };
}

function transactionCookie(value: DashboardOAuthTransaction): string {
  return `${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=${sealDashboardOAuthTransaction(value, SECRET)}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET;
});

describe("Dashboard OAuth URL policy", () => {
  it("preserves issuer path prefixes without a production-host constant", () => {
    expect(
      issuerFromRouteUrl(
        `${ISSUER}${DASHBOARD_OAUTH_PATHS.callback}?code=redacted`,
        DASHBOARD_OAUTH_PATHS.callback,
      ),
    ).toBe(ISSUER);
    expect(oauthAuthorizationServerMetadataPath(ISSUER)).toBe(
      "/.well-known/oauth-authorization-server/beancount",
    );
    expect(
      issuerEndpointBackendPath(`${ISSUER}/api-gateway/oauth/token`, ISSUER),
    ).toBe("/api-gateway/oauth/token");
  });

  it("keeps safe continuations and rejects cross-origin continuations", () => {
    expect(
      dashboardOAuthStartHref(
        "/ledger/ada/personal?tab=journal",
        "/beancount/auth/login",
      ),
    ).toBe(
      "/beancount/oauth/dashboard/start?next=%2Fledger%2Fada%2Fpersonal%3Ftab%3Djournal",
    );
    expect(
      dashboardOAuthStartHref(
        "https://attacker.example/callback",
        "/beancount/auth/login",
      ),
    ).toBe("/beancount/oauth/dashboard/start?next=%2Fauth%2Fwelcome");
    expect(
      dashboardOAuthStartHref(
        "/beancount/ledger/ada/personal",
        "/beancount/auth/login",
      ),
    ).toBe("/beancount/oauth/dashboard/start?next=%2Fledger%2Fada%2Fpersonal");
    expect(
      dashboardAuthLoginHref(
        "/beancount/settings/general?tab=profile",
        "/beancount/settings/general",
      ),
    ).toBe(
      "/beancount/auth/login?next=%2Fsettings%2Fgeneral%3Ftab%3Dprofile&reason=expired",
    );
  });

  it("upgrades only verified legacy sessions on protected route boundaries", () => {
    const legacy = [
      jwtPart({ alg: "HS256" }),
      jwtPart({ sub: "usr_ada" }),
      "sig",
    ].join(".");
    const oauth = dashboardToken();

    expect(
      legacyDashboardSessionUpgradeHrefForRequest(
        legacy,
        new URL(`${ISSUER}/ledger/ada/personal?tab=journal`),
      ),
    ).toBe(
      "/beancount/oauth/dashboard/start?next=%2Fledger%2Fada%2Fpersonal%3Ftab%3Djournal",
    );
    expect(
      legacyDashboardSessionUpgradeHrefForRequest(
        oauth,
        new URL(`${ISSUER}/ledger/ada/personal`),
      ),
    ).toBeUndefined();
    expect(
      legacyDashboardSessionUpgradeHrefForRequest(
        legacy,
        new URL(`${ISSUER}/ledger-gallery`),
      ),
    ).toBeUndefined();
  });
});

describe("Dashboard OAuth transaction", () => {
  it("authenticates every server-side transaction field", () => {
    const tx = transaction();
    const sealed = sealDashboardOAuthTransaction(tx, SECRET);
    expect(openDashboardOAuthTransaction(sealed, SECRET)).toEqual(tx);
    const [payload, signature] = sealed.split(".");
    const changed = `${payload.slice(0, -1)}A.${signature}`;
    expect(openDashboardOAuthTransaction(changed, SECRET)).toBeUndefined();
  });
});

describe("Dashboard OAuth route handlers", () => {
  it("starts code + S256 PKCE and stores verifier/state only in a secure HttpOnly cookie", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn(async () => jsonResponse(metadata()));
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleDashboardOAuthStart({
      request: new Request(
        `${ISSUER}/oauth/dashboard/start?next=${encodeURIComponent("/settings/general")}`,
      ),
    });
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(
      metadata().authorization_endpoint,
    );
    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      client_id: DASHBOARD_OAUTH_CLIENT_ID,
      response_type: "code",
      redirect_uri: `${ISSUER}/oauth/dashboard/callback`,
      resource: `${ISSUER}/v1`,
      code_challenge_method: "S256",
      scope: DASHBOARD_OAUTH_SCOPES.join(" "),
    });
    expect(location.searchParams.has("code_verifier")).toBe(false);
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toContain(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(response.headers.get("location")).not.toContain("verifier");
  });

  it("keeps a magic-link credential inside the signed transaction while starting OAuth", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(metadata())),
    );
    const response = await handleDashboardOAuthStart({
      request: new Request(
        `${ISSUER}/oauth/dashboard/start?one_time_token=single-use-secret&screen_hint=signup`,
      ),
    });
    const authorization = response.headers.get("location")!;
    expect(authorization).not.toContain("single-use-secret");
    expect(new URL(authorization).searchParams.get("screen_hint")).toBe(
      "signup",
    );
    const sealed = response.headers
      .get("set-cookie")!
      .match(new RegExp(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=([^;]+)`))?.[1];
    expect(openDashboardOAuthTransaction(sealed, SECRET)).toMatchObject({
      magicLinkToken: "single-use-secret",
    });
  });

  it("carries an expiry notice through the fresh signed transaction", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse(metadata())),
    );
    const response = await handleDashboardOAuthStart({
      request: new Request(
        `${ISSUER}/oauth/dashboard/start?reason=${DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON}`,
      ),
    });
    const sealed = response.headers
      .get("set-cookie")!
      .match(new RegExp(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=([^;]+)`))?.[1];
    expect(openDashboardOAuthTransaction(sealed, SECRET)).toMatchObject({
      reason: DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
    });
  });

  it("rejects oversized magic-link credentials before creating a transaction cookie", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn(async () => jsonResponse(metadata()));
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthStart({
      request: new Request(
        `${ISSUER}/oauth/dashboard/start?one_time_token=${"x".repeat(501)}`,
      ),
    });
    expect(response.status).toBe(400);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exchanges the code server-side and writes only the validated one-year bearer cookie", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const tx = transaction();
    const token = dashboardToken();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(metadata()))
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: token,
          token_type: "Bearer",
          expires_in: DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
          scope: DASHBOARD_OAUTH_SCOPES.join(" "),
        }),
      )
      .mockResolvedValueOnce(jsonResponse(jwks()));
    vi.stubGlobal("fetch", fetchMock);
    const callback = new URL(`${ISSUER}/oauth/dashboard/callback`);
    callback.search = new URLSearchParams({
      code: "one-time-code",
      state: tx.state,
      iss: ISSUER,
    }).toString();

    const response = await handleDashboardOAuthCallback({
      request: new Request(callback, {
        headers: { cookie: transactionCookie(tx) },
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${ISSUER}/ledger/ada/personal`,
    );
    const cookies = response.headers.get("set-cookie")!;
    expect(cookies).toContain(`${DASHBOARD_AUTH_COOKIE}=${token}`);
    expect(cookies).toContain(
      `Max-Age=${DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS}`,
    );
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Secure");
    expect(response.headers.get("location")).not.toContain(token);
    expect(await response.text()).not.toContain(token);

    const exchange = fetchMock.mock.calls[1];
    const options = exchange?.[1] as RequestInit;
    expect(String(options.body)).toContain("code_verifier=");
    expect(String(options.body)).not.toContain(token);
  });

  it.each([
    {
      name: "duplicate state",
      query: `state=wrong&state=second&code=code&iss=${encodeURIComponent(ISSUER)}`,
      tx: transaction(),
    },
    {
      name: "wrong issuer",
      query: `state=state-value-with-enough-entropy&code=code&iss=${encodeURIComponent("https://attacker.example")}`,
      tx: transaction(),
    },
    {
      name: "stale transaction",
      query: `state=state-value-with-enough-entropy&code=code&iss=${encodeURIComponent(ISSUER)}`,
      tx: transaction({ createdAt: Date.now() - 11 * 60 * 1000 }),
    },
    {
      name: "wrong resource",
      query: `state=state-value-with-enough-entropy&code=code&iss=${encodeURIComponent(ISSUER)}`,
      tx: transaction({ resource: `${ISSUER}/api-gateway/mcp` }),
    },
    {
      name: "wrong redirect",
      query: `state=state-value-with-enough-entropy&code=code&iss=${encodeURIComponent(ISSUER)}`,
      tx: transaction({ redirectUri: "https://attacker.example/callback" }),
    },
    {
      name: "unsafe continuation",
      query: `state=state-value-with-enough-entropy&code=code&iss=${encodeURIComponent(ISSUER)}`,
      tx: transaction({ next: "https://attacker.example" }),
    },
  ])(
    "fails closed for $name without exchanging or writing a credential",
    async ({ query, tx }) => {
      process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const response = await handleDashboardOAuthCallback({
        request: new Request(`${ISSUER}/oauth/dashboard/callback?${query}`, {
          headers: {
            cookie: `${transactionCookie(tx)}; ${DASHBOARD_AUTH_COOKIE}=existing-valid-session`,
          },
        }),
      });
      expect(response.status).toBe(303);
      expect(fetchMock).not.toHaveBeenCalled();
      const cookies = response.headers.get("set-cookie")!;
      expect(cookies).toContain(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=;`);
      expect(cookies).not.toContain(`${DASHBOARD_AUTH_COOKIE}=`);
      expect(cookies).not.toContain("eyJhbGciOi");
    },
  );

  it.each([
    {
      name: "wrong audience",
      token: dashboardToken(undefined, { aud: `${ISSUER}/api-gateway/mcp` }),
      responseOverrides: {},
      keys: jwks(),
    },
    {
      name: "wrong client",
      token: dashboardToken(undefined, { client_id: "some-dynamic-client" }),
      responseOverrides: {},
      keys: jwks(),
    },
    {
      name: "missing subject",
      token: dashboardToken(undefined, { sub: undefined }),
      responseOverrides: {},
      keys: jwks(),
    },
    {
      name: "ledger pin",
      token: dashboardToken(undefined, { ledger_id: "ada/personal" }),
      responseOverrides: {},
      keys: jwks(),
    },
    {
      name: "missing scope",
      token: dashboardToken(undefined, { scope: "openid ledger.read" }),
      responseOverrides: { scope: "openid ledger.read" },
      keys: jwks(),
    },
    {
      name: "refresh credential",
      token: dashboardToken(),
      responseOverrides: { refresh_token: "must-not-exist" },
      keys: jwks(),
    },
    {
      name: "invalid signature",
      token: tamperJwtSignature(dashboardToken()),
      responseOverrides: {},
      keys: jwks(),
    },
    {
      name: "unknown signing key",
      token: dashboardToken(),
      responseOverrides: {},
      keys: jwks({ ...publicSigningJwk, kid: "rotated-away" }),
    },
  ])(
    "rejects a token response with $name",
    async ({ token, responseOverrides, keys }) => {
      process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
      const tx = transaction();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(metadata()))
        .mockResolvedValueOnce(
          jsonResponse({
            access_token: token,
            token_type: "Bearer",
            expires_in: DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
            scope: DASHBOARD_OAUTH_SCOPES.join(" "),
            ...responseOverrides,
          }),
        )
        .mockResolvedValueOnce(jsonResponse(keys));
      vi.stubGlobal("fetch", fetchMock);
      const callback = new URL(`${ISSUER}/oauth/dashboard/callback`);
      callback.search = new URLSearchParams({
        code: "one-time-code",
        state: tx.state,
        iss: ISSUER,
      }).toString();

      const response = await handleDashboardOAuthCallback({
        request: new Request(callback, {
          headers: { cookie: transactionCookie(tx) },
        }),
      });
      expect(response.status).toBe(303);
      expect(response.headers.get("location")).toBe(
        `${ISSUER}/auth/login?reason=expired`,
      );
      expect(response.headers.get("set-cookie")).not.toContain(
        `${DASHBOARD_AUTH_COOKIE}=`,
      );
    },
  );

  it("rejects off-issuer discovery endpoints before creating a transaction", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          ...metadata(),
          token_endpoint: "https://attacker.example/token",
        }),
      ),
    );
    const response = await handleDashboardOAuthStart({
      request: new Request(`${ISSUER}/oauth/dashboard/start`),
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects duplicate interaction ids without reaching the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthConsent({
      request: new Request(
        `${ISSUER}/oauth/dashboard-consent?uid=abcdefgh&uid=ijklmnop`,
      ),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("auto-approves only through the server-side interaction proxy", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.method).toBe("POST");
      expect(String(init.body)).toBe(
        `decision=approve&dashboardClientId=${DASHBOARD_OAUTH_CLIENT_ID}`,
      );
      return new Response(null, {
        status: 303,
        headers: { location: "/resume" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthConsent({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=abcdefgh`, {
        headers: {
          cookie: `provider=session; authSess:beancount.io=legacy; ${transactionCookie(transaction())}`,
        },
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/resume");
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("cookie"),
    ).toBe("provider=session; authSess:beancount.io=legacy");
  });

  it("binds the login form after an unauthenticated approval attempt", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 401 })),
    );
    const response = await handleDashboardOAuthConsent({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=abcdefgh`, {
        headers: {
          cookie: transactionCookie(
            transaction({
              reason: DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
            }),
          ),
        },
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${ISSUER}/auth/login?interaction=abcdefgh&next=%2Fledger%2Fada%2Fpersonal&reason=interaction_expired`,
    );
    const sealed = response.headers
      .get("set-cookie")!
      .match(new RegExp(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=([^;]+)`))?.[1];
    expect(openDashboardOAuthTransaction(sealed, SECRET)).toMatchObject({
      interactionUid: "abcdefgh",
    });
  });

  it("submits credentials through the signed consent route where the provider interaction cookie is scoped", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain(
        "/api-gateway/oauth/interaction/abcdefgh/dashboard",
      );
      expect(new Headers(init.headers).get("cookie")).toBe(
        "_interaction=provider-state",
      );
      expect(JSON.parse(String(init.body))).toEqual({
        action: "password",
        email: "person@example.test",
        password: "correct horse battery staple",
      });
      return Response.json({ sessionId: "signup-session" });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthCredential({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=abcdefgh`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `_interaction=provider-state; ${transactionCookie(
            transaction({ interactionUid: "abcdefgh" }),
          )}`,
        },
        body: JSON.stringify({
          action: "password",
          email: "person@example.test",
          password: "correct horse battery staple",
        }),
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sessionId: "signup-session" });
  });

  it("rejects credential submission copied to another interaction before forwarding", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthCredential({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=otheruid`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: transactionCookie(
            transaction({ interactionUid: "abcdefgh" }),
          ),
        },
        body: JSON.stringify({ action: "password" }),
      }),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restarts a missing interaction instead of treating it as bad credentials", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthCredential({
      request: new Request(
        `${ISSUER}/oauth/dashboard-consent?uid=abcdefgh&next=%2Fledger%2Fada%2Fpersonal&screen_hint=signup`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "otp", otp: "1234" }),
        },
      ),
    });

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "oauth_interaction_expired",
    });
    expect(response.headers.get("location")).toBe(
      `${ISSUER}/oauth/dashboard/start?next=%2Fledger%2Fada%2Fpersonal&screen_hint=signup&reason=interaction_expired`,
    );
    expect(response.headers.get("set-cookie")).toContain(
      `${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=;`,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restarts when the provider expires before the signed Dashboard transaction", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "oauth_interaction_expired" }, { status: 410 }),
      ),
    );
    const response = await handleDashboardOAuthCredential({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=abcdefgh`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: transactionCookie(
            transaction({ interactionUid: "abcdefgh" }),
          ),
        },
        body: JSON.stringify({ action: "password" }),
      }),
    });

    expect(response.status).toBe(410);
    expect(response.headers.get("location")).toBe(
      `${ISSUER}/oauth/dashboard/start?next=%2Fledger%2Fada%2Fpersonal&reason=interaction_expired`,
    );
  });

  it("consumes magic links inside the OAuth interaction instead of GraphQL", async () => {
    process.env.DASHBOARD_OAUTH_TRANSACTION_SECRET = SECRET;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toContain(
        "/api-gateway/oauth/interaction/abcdefgh/dashboard",
      );
      expect(JSON.parse(String(init.body))).toEqual({
        action: "magic_link",
        token: "single-use-secret",
      });
      return new Response(null, {
        status: 303,
        headers: { location: "/resume" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthConsent({
      request: new Request(`${ISSUER}/oauth/dashboard-consent?uid=abcdefgh`, {
        headers: {
          cookie: transactionCookie(
            transaction({ magicLinkToken: "single-use-secret" }),
          ),
        },
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/resume");
  });

  it("turns the historical callback URL into an OAuth start", async () => {
    const response = await handleDashboardMagicLinkStart({
      request: new Request(
        `${ISSUER}/auth/callback?oneTimeToken=single-use-secret&next=%2Fledger%2Fada%2Fmain`,
      ),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${ISSUER}/oauth/dashboard/start?next=%2Fledger%2Fada%2Fmain&one_time_token=single-use-secret`,
    );
  });

  it("clears local and provider state without claiming copied-token revocation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '<form id="op.logoutForm" method="post" action="https://books.example.test/beancount/api-gateway/oauth/logout/confirm"><input type="hidden" name="xsrf" value="xsrf-value"/></form>',
          {
            status: 200,
            headers: { "set-cookie": "_session=updated; HttpOnly; Secure" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 303,
          headers: {
            location: `${ISSUER}/auth/login`,
            "set-cookie": "_session=; Max-Age=0; HttpOnly; Secure",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const response = await handleDashboardOAuthLogout({
      request: new Request(`${ISSUER}/oauth/dashboard/logout`, {
        headers: {
          cookie: `_session=provider-state; ${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=signed-verifier`,
        },
      }),
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${ISSUER}/auth/login`);
    const cookies = response.headers.get("set-cookie")!;
    expect(cookies).toContain(`${DASHBOARD_AUTH_COOKIE}=;`);
    expect(cookies).toContain(`${DASHBOARD_OAUTH_TRANSACTION_COOKIE}=;`);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("cookie"),
    ).toBe("_session=provider-state");
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toBe(
      "xsrf=xsrf-value&logout=yes",
    );
  });

  it("deletes the exact legacy production Domain cookie during logout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    const response = await handleDashboardOAuthLogout({
      request: new Request(
        "https://dashboard.beancount.io/oauth/dashboard/logout",
      ),
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${DASHBOARD_AUTH_COOKIE}=; Domain=.beancount.io;`,
    );
  });
});
