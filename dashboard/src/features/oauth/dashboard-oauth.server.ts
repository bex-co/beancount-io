import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import {
  getBackendBase,
  proxyOauthInteractionLogin,
} from "@/common/lib/oauth/forward-to-backend";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { serverConfig } from "@/config/config.server";
import {
  DASHBOARD_AUTH_COOKIE,
  DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
  DASHBOARD_OAUTH_CLIENT_ID,
  DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
  DASHBOARD_OAUTH_PATHS,
  DASHBOARD_OAUTH_SCOPES,
  DASHBOARD_OAUTH_TRANSACTION_COOKIE,
  DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS,
  dashboardOAuthStartHref,
  dashboardOAuthUrls,
  issuerEndpointBackendPath,
  issuerFromRouteUrl,
  oauthAuthorizationServerMetadataPath,
} from "./dashboard-oauth";
import { getCookie, getRequestUrl } from "@tanstack/react-start/server";

interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

interface OAuthPublicJwk extends JsonWebKey {
  alg?: string;
  kid?: string;
  use?: string;
}

interface OAuthJwks {
  keys: OAuthPublicJwk[];
}

interface DashboardAccessTokenHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

export interface DashboardOAuthTransaction {
  version: 1;
  state: string;
  codeVerifier: string;
  issuer: string;
  resource: string;
  redirectUri: string;
  next: string;
  createdAt: number;
  interactionUid?: string;
  magicLinkToken?: string;
  reason?: typeof DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON;
}

interface DashboardAccessTokenClaims {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  client_id?: unknown;
  ledger_id?: unknown;
  scope?: unknown;
  iat?: unknown;
  exp?: unknown;
}

function forwardedHeaders(request: Request): HeadersInit {
  const url = new URL(request.url);
  return {
    "x-forwarded-host": url.host,
    "x-forwarded-proto": url.protocol.replace(":", ""),
  };
}

function redirectResponse(location: string, headers?: Headers): Response {
  const result = headers ?? new Headers();
  result.set("location", location);
  result.set("cache-control", "no-store");
  result.set("pragma", "no-cache");
  return new Response(null, { status: 303, headers: result });
}

function cookieValue(request: Request, name: string): string | undefined {
  for (const item of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;
    if (item.slice(0, separator).trim() === name) {
      return item.slice(separator + 1).trim();
    }
  }
  return undefined;
}

function responseSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  return typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie")].filter(
        (value): value is string => value !== null,
      );
}

function cookieJar(request: Request): Map<string, string> {
  const result = new Map<string, string>();
  for (const item of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = item.indexOf("=");
    if (separator === -1) continue;
    result.set(
      item.slice(0, separator).trim(),
      item.slice(separator + 1).trim(),
    );
  }
  return result;
}

function absorbSetCookies(jar: Map<string, string>, values: string[]): void {
  for (const value of values) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    const cookie = pair.slice(separator + 1).trim();
    if (cookie) jar.set(name, cookie);
    else jar.delete(name);
  }
}

function cookieJarHeader(jar: Map<string, string>): string {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function setCookie(
  headers: Headers,
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  headers.append(
    "set-cookie",
    `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearCookie(headers: Headers, name: string): void {
  headers.append(
    "set-cookie",
    `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
}

function clearLegacyProductionDomainCookie(
  headers: Headers,
  name: string,
  issuer: string,
): void {
  const hostname = new URL(issuer).hostname;
  if (hostname !== "beancount.io" && !hostname.endsWith(".beancount.io"))
    return;

  // Historical production sessions were set with Domain=.beancount.io. A
  // host-only deletion (or Domain=<current host>) cannot remove that distinct
  // cookie, which would leave two same-named credentials in the browser.
  headers.append(
    "set-cookie",
    `${name}=; Domain=.beancount.io; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  );
}

function hmac(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

export function sealDashboardOAuthTransaction(
  transaction: DashboardOAuthTransaction,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify(transaction), "utf8").toString(
    "base64url",
  );
  return `${payload}.${hmac(payload, secret).toString("base64url")}`;
}

export function openDashboardOAuthTransaction(
  value: string | undefined,
  secret: string,
): DashboardOAuthTransaction | undefined {
  if (!value) return undefined;
  const parts = value.split(".");
  if (parts.length !== 2) return undefined;
  const [payload, signature] = parts;
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return undefined;
  }
  const expected = hmac(payload, secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<DashboardOAuthTransaction>;
    if (
      parsed.version !== 1 ||
      typeof parsed.state !== "string" ||
      typeof parsed.codeVerifier !== "string" ||
      typeof parsed.issuer !== "string" ||
      typeof parsed.resource !== "string" ||
      typeof parsed.redirectUri !== "string" ||
      typeof parsed.next !== "string" ||
      typeof parsed.createdAt !== "number" ||
      (parsed.interactionUid !== undefined &&
        typeof parsed.interactionUid !== "string") ||
      (parsed.magicLinkToken !== undefined &&
        typeof parsed.magicLinkToken !== "string") ||
      (parsed.reason !== undefined &&
        parsed.reason !== DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON)
    ) {
      return undefined;
    }
    return parsed as DashboardOAuthTransaction;
  } catch {
    return undefined;
  }
}

function singleSearchParam(
  url: URL,
  name: string,
  required: boolean,
): string | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length > 1 || (required && values.length !== 1)) {
    throw new Error(`Invalid OAuth ${name} parameter`);
  }
  const value = values[0];
  if (required && !value) throw new Error(`Missing OAuth ${name} parameter`);
  return value || undefined;
}

function validatePublicIssuer(issuer: string): void {
  const url = new URL(issuer);
  const loopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("Dashboard OAuth issuer must use HTTPS");
  }
}

export function validateAuthorizationServerMetadata(
  value: unknown,
  issuer: string,
): AuthorizationServerMetadata {
  if (!value || typeof value !== "object") {
    throw new Error("OAuth discovery returned invalid metadata");
  }
  const metadata = value as Partial<AuthorizationServerMetadata>;
  const expectedAuthorization = `${issuer}/api-gateway/oauth/auth`;
  const expectedToken = `${issuer}/api-gateway/oauth/token`;
  const expectedJwks = `${issuer}/api-gateway/oauth/jwks`;
  if (
    metadata.issuer !== issuer ||
    metadata.authorization_endpoint !== expectedAuthorization ||
    metadata.token_endpoint !== expectedToken ||
    metadata.jwks_uri !== expectedJwks
  ) {
    throw new Error("OAuth discovery does not match the selected issuer");
  }
  issuerEndpointBackendPath(metadata.authorization_endpoint, issuer);
  issuerEndpointBackendPath(metadata.token_endpoint, issuer);
  issuerEndpointBackendPath(metadata.jwks_uri, issuer);
  if (metadata.end_session_endpoint) {
    issuerEndpointBackendPath(metadata.end_session_endpoint, issuer);
  }
  return metadata as AuthorizationServerMetadata;
}

async function authorizationServerSigningKeys(
  request: Request,
  metadata: AuthorizationServerMetadata,
  issuer: string,
): Promise<OAuthJwks> {
  const jwksPath = issuerEndpointBackendPath(metadata.jwks_uri, issuer);
  const response = await fetch(`${getBackendBase()}${jwksPath}`, {
    headers: forwardedHeaders(request),
    redirect: "error",
  });
  if (!response.ok) throw new Error("OAuth signing keys are unavailable");
  const value = (await response.json()) as Partial<OAuthJwks>;
  if (!Array.isArray(value.keys) || value.keys.length === 0) {
    throw new Error("OAuth signing keys are invalid");
  }
  return { keys: value.keys };
}

async function authorizationServerMetadata(
  request: Request,
  issuer: string,
): Promise<AuthorizationServerMetadata> {
  const response = await fetch(
    `${getBackendBase()}${oauthAuthorizationServerMetadataPath(issuer)}`,
    { headers: forwardedHeaders(request), redirect: "error" },
  );
  if (!response.ok) throw new Error("OAuth discovery is unavailable");
  return validateAuthorizationServerMetadata(await response.json(), issuer);
}

function callbackFailure(issuer: string): Response {
  const headers = new Headers();
  clearCookie(headers, DASHBOARD_OAUTH_TRANSACTION_COOKIE);
  // Preserve any already-valid session/OAuth cookie. This matters when two
  // tabs complete concurrent transactions or the user refreshes a consumed
  // callback: a failed attempt must not sign out the successful tab.
  return redirectResponse(`${issuer}/auth/login?reason=expired`, headers);
}

export async function handleDashboardOAuthStart({
  request,
}: {
  request: Request;
}): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    const issuer = issuerFromRouteUrl(request.url, DASHBOARD_OAUTH_PATHS.start);
    validatePublicIssuer(issuer);
    const nextValues = requestUrl.searchParams.getAll("next");
    if (nextValues.length > 1) throw new Error("Duplicate OAuth continuation");
    const next = getSafeRedirectPath(nextValues[0]) ?? "/auth/welcome";
    const screenHint = singleSearchParam(requestUrl, "screen_hint", false);
    if (screenHint !== undefined && screenHint !== "signup") {
      throw new Error("Invalid OAuth screen hint");
    }
    const magicLinkToken = singleSearchParam(
      requestUrl,
      "one_time_token",
      false,
    );
    if (magicLinkToken && magicLinkToken.length > 500) {
      throw new Error("Invalid magic-link token");
    }
    const reason = singleSearchParam(requestUrl, "reason", false);
    if (
      reason !== undefined &&
      reason !== DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON
    ) {
      throw new Error("Invalid OAuth restart reason");
    }
    const metadata = await authorizationServerMetadata(request, issuer);
    const { redirectUri, resource } = dashboardOAuthUrls(issuer);
    const state = randomBytes(32).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    const transaction: DashboardOAuthTransaction = {
      version: 1,
      state,
      codeVerifier,
      issuer,
      resource,
      redirectUri,
      next,
      createdAt: Date.now(),
      ...(magicLinkToken ? { magicLinkToken } : {}),
      ...(reason ? { reason } : {}),
    };

    const authorization = new URL(metadata.authorization_endpoint);
    authorization.searchParams.set("client_id", DASHBOARD_OAUTH_CLIENT_ID);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("redirect_uri", redirectUri);
    authorization.searchParams.set("resource", resource);
    authorization.searchParams.set("scope", DASHBOARD_OAUTH_SCOPES.join(" "));
    authorization.searchParams.set("state", state);
    authorization.searchParams.set("code_challenge", codeChallenge);
    authorization.searchParams.set("code_challenge_method", "S256");
    if (screenHint) authorization.searchParams.set("screen_hint", screenHint);

    const headers = new Headers();
    setCookie(
      headers,
      DASHBOARD_OAUTH_TRANSACTION_COOKIE,
      sealDashboardOAuthTransaction(
        transaction,
        serverConfig.oauthTransactionSecret(),
      ),
      DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS,
    );
    return redirectResponse(authorization.toString(), headers);
  } catch {
    return new Response("Unable to start sign-in", {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }
}

function decodeJwtPart(value: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function validateDashboardAccessToken(
  token: string,
  tokenResponse: Record<string, unknown>,
  transaction: DashboardOAuthTransaction,
  jwks: OAuthJwks,
): void {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("OAuth access token is not a JWT");
  const header = decodeJwtPart(parts[0]) as
    | DashboardAccessTokenHeader
    | undefined;
  const claims = decodeJwtPart(parts[1]) as
    | DashboardAccessTokenClaims
    | undefined;
  if (
    !header ||
    header.alg !== "ES256" ||
    header.typ !== "at+jwt" ||
    typeof header.kid !== "string" ||
    !header.kid ||
    !claims
  ) {
    throw new Error("OAuth access token is not asymmetrically signed");
  }

  const matchingKeys = jwks.keys.filter((key) => key.kid === header.kid);
  const key = matchingKeys.length === 1 ? matchingKeys[0] : undefined;
  if (
    !key ||
    key.kty !== "EC" ||
    key.crv !== "P-256" ||
    key.alg !== "ES256" ||
    (key.use !== undefined && key.use !== "sig") ||
    (key.key_ops !== undefined && !key.key_ops.includes("verify")) ||
    typeof key.x !== "string" ||
    typeof key.y !== "string" ||
    key.d !== undefined
  ) {
    throw new Error("OAuth access token signing key is invalid");
  }
  const signature = Buffer.from(parts[2], "base64url");
  const signatureValid =
    signature.length === 64 &&
    verifySignature(
      "sha256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      {
        key: createPublicKey({ key, format: "jwk" }),
        dsaEncoding: "ieee-p1363",
      },
      signature,
    );
  if (!signatureValid) {
    throw new Error("OAuth access token signature is invalid");
  }

  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const scopes =
    typeof claims.scope === "string"
      ? new Set(claims.scope.split(/\s+/).filter(Boolean))
      : new Set();
  const responseScopes =
    typeof tokenResponse.scope === "string"
      ? new Set(tokenResponse.scope.split(/\s+/).filter(Boolean))
      : undefined;
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== transaction.issuer ||
    audience.length !== 1 ||
    audience[0] !== transaction.resource ||
    typeof claims.sub !== "string" ||
    !claims.sub ||
    claims.client_id !== DASHBOARD_OAUTH_CLIENT_ID ||
    claims.ledger_id !== undefined ||
    typeof claims.iat !== "number" ||
    typeof claims.exp !== "number" ||
    claims.exp - claims.iat !== DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS ||
    claims.iat > now + 60 ||
    claims.exp <= now - 60 ||
    scopes.size !== DASHBOARD_OAUTH_SCOPES.length ||
    !DASHBOARD_OAUTH_SCOPES.every((scope) => scopes.has(scope)) ||
    tokenResponse.token_type?.toString().toLowerCase() !== "bearer" ||
    tokenResponse.expires_in !== DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS ||
    (tokenResponse.scope !== undefined &&
      (responseScopes?.size !== DASHBOARD_OAUTH_SCOPES.length ||
        !DASHBOARD_OAUTH_SCOPES.every((scope) => responseScopes.has(scope)))) ||
    "refresh_token" in tokenResponse
  ) {
    throw new Error("OAuth access token does not match the Dashboard contract");
  }
}

export async function handleDashboardOAuthCallback({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const issuer = issuerFromRouteUrl(
    request.url,
    DASHBOARD_OAUTH_PATHS.callback,
  );
  try {
    const url = new URL(request.url);
    if (singleSearchParam(url, "error", false)) {
      throw new Error("OAuth authorization was denied");
    }
    const code = singleSearchParam(url, "code", true)!;
    const state = singleSearchParam(url, "state", true)!;
    const responseIssuer = singleSearchParam(url, "iss", true)!;
    const transaction = openDashboardOAuthTransaction(
      cookieValue(request, DASHBOARD_OAUTH_TRANSACTION_COOKIE),
      serverConfig.oauthTransactionSecret(),
    );
    if (!transaction) throw new Error("OAuth transaction is missing");
    const expectedUrls = dashboardOAuthUrls(issuer);
    const stateMatches =
      Buffer.byteLength(state) === Buffer.byteLength(transaction.state) &&
      timingSafeEqual(Buffer.from(state), Buffer.from(transaction.state));
    if (
      !stateMatches ||
      responseIssuer !== issuer ||
      transaction.issuer !== issuer ||
      transaction.resource !== expectedUrls.resource ||
      transaction.redirectUri !== expectedUrls.redirectUri ||
      Date.now() - transaction.createdAt >
        DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS * 1000 ||
      transaction.createdAt > Date.now() + 30_000 ||
      getSafeRedirectPath(transaction.next) !== transaction.next
    ) {
      throw new Error("OAuth callback validation failed");
    }

    const metadata = await authorizationServerMetadata(request, issuer);
    const tokenPath = issuerEndpointBackendPath(
      metadata.token_endpoint,
      issuer,
    );
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: DASHBOARD_OAUTH_CLIENT_ID,
      code,
      redirect_uri: transaction.redirectUri,
      code_verifier: transaction.codeVerifier,
      resource: transaction.resource,
    });
    // The code exchange and JWKS read are independent once discovery has been
    // pinned. Start both together so the extra signature verification adds no
    // request waterfall to the callback.
    const tokenResultPromise = fetch(`${getBackendBase()}${tokenPath}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...forwardedHeaders(request),
      },
      body,
      redirect: "error",
    });
    const signingKeysPromise = authorizationServerSigningKeys(
      request,
      metadata,
      issuer,
    );
    const [tokenResult, signingKeys] = await Promise.all([
      tokenResultPromise,
      signingKeysPromise,
    ]);
    if (!tokenResult.ok) throw new Error("OAuth code exchange failed");
    const tokenResponse = (await tokenResult.json()) as Record<string, unknown>;
    const accessToken = tokenResponse.access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      throw new Error("OAuth code exchange returned no access token");
    }
    validateDashboardAccessToken(
      accessToken,
      tokenResponse,
      transaction,
      signingKeys,
    );

    const headers = new Headers();
    clearCookie(headers, DASHBOARD_OAUTH_TRANSACTION_COOKIE);
    clearLegacyProductionDomainCookie(headers, DASHBOARD_AUTH_COOKIE, issuer);
    setCookie(
      headers,
      DASHBOARD_AUTH_COOKIE,
      accessToken,
      DASHBOARD_OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    );
    return redirectResponse(`${issuer}${transaction.next}`, headers);
  } catch {
    return callbackFailure(issuer);
  }
}

export async function handleDashboardOAuthConsent({
  request,
}: {
  request: Request;
}): Promise<Response> {
  let uid: string | undefined;
  let screenHint: string | undefined;
  try {
    const requestUrl = new URL(request.url);
    uid = singleSearchParam(requestUrl, "uid", true);
    screenHint = singleSearchParam(requestUrl, "screen_hint", false);
  } catch {
    return new Response("Invalid OAuth interaction", { status: 400 });
  }
  if (
    !uid ||
    !/^[A-Za-z0-9_-]{8,200}$/.test(uid) ||
    (screenHint !== undefined && screenHint !== "signup")
  ) {
    return new Response("Invalid OAuth interaction", { status: 400 });
  }

  const issuer = issuerFromRouteUrl(request.url, DASHBOARD_OAUTH_PATHS.consent);
  const transaction = openDashboardOAuthTransaction(
    cookieValue(request, DASHBOARD_OAUTH_TRANSACTION_COOKIE),
    serverConfig.oauthTransactionSecret(),
  );
  if (
    !transaction ||
    transaction.issuer !== issuer ||
    Date.now() - transaction.createdAt >
      DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS * 1000 ||
    transaction.createdAt > Date.now() + 30_000
  ) {
    return callbackFailure(issuer);
  }

  const magicAttempted = Boolean(transaction.magicLinkToken);
  if (transaction.magicLinkToken) {
    const magicRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({
        action: "magic_link",
        token: transaction.magicLinkToken,
      }),
    });
    const magicResult = await proxyOauthInteractionLogin(
      magicRequest,
      `/api-gateway/oauth/interaction/${uid}/dashboard`,
    );
    if (magicResult.status === 303) return magicResult;
    delete transaction.magicLinkToken;
  } else {
    const headers = new Headers({
      "content-type": "application/x-www-form-urlencoded",
      cookie: request.headers.get("cookie") ?? "",
    });
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("authorization", authorization);
    const approval = new Request(request.url, {
      method: "POST",
      headers,
      body: new URLSearchParams({
        decision: "approve",
        dashboardClientId: DASHBOARD_OAUTH_CLIENT_ID,
      }),
    });
    const approvalResult = await proxyOauthInteractionLogin(
      approval,
      `/api-gateway/oauth/interaction/${uid}/login`,
    );
    if (approvalResult.status === 303) return approvalResult;
    if (approvalResult.status !== 401) return approvalResult;
  }

  // The provider interaction has now been validated. Bind the credential form
  // to this exact uid in the signed, HttpOnly PKCE transaction before rendering
  // it; a copied query parameter alone can never create a usable login form.
  transaction.interactionUid = uid;
  const headers = new Headers({
    "cache-control": "no-store",
  });
  setCookie(
    headers,
    DASHBOARD_OAUTH_TRANSACTION_COOKIE,
    sealDashboardOAuthTransaction(
      transaction,
      serverConfig.oauthTransactionSecret(),
    ),
    DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS,
  );
  const authPath = screenHint === "signup" ? "/auth/sign-up" : "/auth/login";
  const destination = new URL(`${issuer}${authPath}`);
  destination.searchParams.set("interaction", uid);
  destination.searchParams.set("next", transaction.next);
  if (transaction.reason) {
    destination.searchParams.set("reason", transaction.reason);
  }
  if (magicAttempted && !screenHint) {
    destination.searchParams.set("reason", "expired");
  }
  return redirectResponse(destination.toString(), headers);
}

/**
 * Submit first-party credentials from the interaction-scoped Dashboard page.
 * oidc-provider deliberately paths its interaction cookie to this consent URL,
 * so the Dashboard server validates its own signed binding here before
 * forwarding the body to the provider's exact interaction endpoint.
 */
function invalidDashboardCredentialResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Invalid Dashboard authentication request" }),
    {
      status: 400,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
      },
    },
  );
}

function expiredDashboardInteractionResponse(options: {
  issuer: string;
  requestPath: string;
  next?: string;
  screenHint?: "signup";
}): Response {
  const restart = new URL(
    dashboardOAuthStartHref(
      options.next,
      options.requestPath,
      options.screenHint,
      DASHBOARD_OAUTH_INTERACTION_EXPIRED_REASON,
    ),
    options.issuer,
  );
  const headers = new Headers({
    "cache-control": "no-store",
    "content-type": "application/json",
    location: restart.toString(),
  });
  clearCookie(headers, DASHBOARD_OAUTH_TRANSACTION_COOKIE);
  return new Response(JSON.stringify({ error: "oauth_interaction_expired" }), {
    status: 410,
    headers,
  });
}

export async function handleDashboardOAuthCredential({
  request,
}: {
  request: Request;
}): Promise<Response> {
  let requestUrl: URL;
  let uid: string | undefined;
  let screenHint: "signup" | undefined;
  let requestedNext: string | undefined;
  let issuer: string;
  try {
    requestUrl = new URL(request.url);
    uid = singleSearchParam(requestUrl, "uid", true);
    if (!uid || !/^[A-Za-z0-9_-]{8,200}$/.test(uid)) {
      throw new Error("Invalid OAuth interaction");
    }
    const rawScreenHint = singleSearchParam(requestUrl, "screen_hint", false);
    if (rawScreenHint !== undefined && rawScreenHint !== "signup") {
      throw new Error("Invalid OAuth screen hint");
    }
    screenHint = rawScreenHint;
    requestedNext = getSafeRedirectPath(
      singleSearchParam(requestUrl, "next", false),
    );
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      throw new Error("Invalid Dashboard authentication request");
    }
    issuer = issuerFromRouteUrl(request.url, DASHBOARD_OAUTH_PATHS.consent);
  } catch {
    return invalidDashboardCredentialResponse();
  }

  const sealedTransaction = cookieValue(
    request,
    DASHBOARD_OAUTH_TRANSACTION_COOKIE,
  );
  if (!sealedTransaction) {
    return expiredDashboardInteractionResponse({
      issuer,
      requestPath: requestUrl.pathname,
      next: requestedNext,
      screenHint,
    });
  }
  const transaction = openDashboardOAuthTransaction(
    sealedTransaction,
    serverConfig.oauthTransactionSecret(),
  );
  if (
    !transaction ||
    transaction.issuer !== issuer ||
    transaction.interactionUid !== uid ||
    transaction.createdAt > Date.now() + 30_000
  ) {
    return invalidDashboardCredentialResponse();
  }
  if (
    Date.now() - transaction.createdAt >
    DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS * 1000
  ) {
    return expiredDashboardInteractionResponse({
      issuer,
      requestPath: requestUrl.pathname,
      next: transaction.next,
      screenHint,
    });
  }

  try {
    const response = await proxyOauthInteractionLogin(
      request,
      `/api-gateway/oauth/interaction/${uid}/dashboard`,
    );
    return response.status === 410
      ? expiredDashboardInteractionResponse({
          issuer,
          requestPath: requestUrl.pathname,
          next: transaction.next,
          screenHint,
        })
      : response;
  } catch {
    return new Response(
      JSON.stringify({ error: "Dashboard authentication is unavailable" }),
      {
        status: 502,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json",
        },
      },
    );
  }
}

export async function handleDashboardMagicLinkStart({
  request,
}: {
  request: Request;
}): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    const issuer = issuerFromRouteUrl(request.url, "/auth/callback");
    validatePublicIssuer(issuer);
    const token = singleSearchParam(requestUrl, "oneTimeToken", true);
    if (!token || token.length > 500) throw new Error("Invalid magic link");
    const next = getSafeRedirectPath(
      singleSearchParam(requestUrl, "next", false),
    );
    const start = new URL(`${issuer}${DASHBOARD_OAUTH_PATHS.start}`);
    start.searchParams.set("next", next ?? "/auth/welcome");
    start.searchParams.set("one_time_token", token);
    return redirectResponse(start.toString());
  } catch {
    return new Response("Invalid or expired sign-in link", {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }
}

export function dashboardOAuthInteractionIsBound(uid: string): boolean {
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(uid)) return false;
  const transaction = openDashboardOAuthTransaction(
    getCookie(DASHBOARD_OAUTH_TRANSACTION_COOKIE),
    serverConfig.oauthTransactionSecret(),
  );
  if (!transaction || transaction.interactionUid !== uid) return false;
  const requestUrl = getRequestUrl({
    xForwardedHost: true,
    xForwardedProto: true,
  });
  const issuer = new URL(transaction.issuer);
  const prefix = issuer.pathname.replace(/\/$/, "");
  return (
    requestUrl.origin === issuer.origin &&
    (requestUrl.pathname === prefix ||
      requestUrl.pathname.startsWith(`${prefix}/`)) &&
    Date.now() - transaction.createdAt <=
      DASHBOARD_OAUTH_TRANSACTION_TTL_SECONDS * 1000 &&
    transaction.createdAt <= Date.now() + 30_000
  );
}

export async function handleDashboardOAuthLogout({
  request,
}: {
  request: Request;
}): Promise<Response> {
  const issuer = issuerFromRouteUrl(request.url, DASHBOARD_OAUTH_PATHS.logout);
  const headers = new Headers();
  clearCookie(headers, DASHBOARD_AUTH_COOKIE);
  clearLegacyProductionDomainCookie(headers, DASHBOARD_AUTH_COOKIE, issuer);
  clearCookie(headers, DASHBOARD_OAUTH_TRANSACTION_COOKIE);
  try {
    const { postLogoutRedirectUri } = dashboardOAuthUrls(issuer);
    const endSession = new URL(`${issuer}/api-gateway/oauth/logout`);
    endSession.searchParams.set("client_id", DASHBOARD_OAUTH_CLIENT_ID);
    endSession.searchParams.set(
      "post_logout_redirect_uri",
      postLogoutRedirectUri,
    );
    const jar = cookieJar(request);
    jar.delete(DASHBOARD_OAUTH_TRANSACTION_COOKIE);
    const endSessionPath = issuerEndpointBackendPath(
      `${endSession.origin}${endSession.pathname}`,
      issuer,
    );
    const begin = await fetch(
      `${getBackendBase()}${endSessionPath}${endSession.search}`,
      {
        headers: {
          ...forwardedHeaders(request),
          cookie: cookieJarHeader(jar),
        },
        redirect: "manual",
      },
    );
    const beginCookies = responseSetCookies(begin);
    absorbSetCookies(jar, beginCookies);
    for (const cookie of beginCookies) headers.append("set-cookie", cookie);
    const html = await begin.text();
    const action = html.match(/<form[^>]+action="([^"]+)"/)?.[1];
    const xsrf = html.match(/name="xsrf" value="([^"]+)"/)?.[1];
    if (!action || !xsrf) throw new Error("OAuth logout form is invalid");
    const confirmPath = issuerEndpointBackendPath(action, issuer);
    const confirm = await fetch(`${getBackendBase()}${confirmPath}`, {
      method: "POST",
      headers: {
        ...forwardedHeaders(request),
        cookie: cookieJarHeader(jar),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ xsrf, logout: "yes" }),
      redirect: "manual",
    });
    for (const cookie of responseSetCookies(confirm)) {
      headers.append("set-cookie", cookie);
    }
    if (
      confirm.status !== 303 ||
      confirm.headers.get("location") !== postLogoutRedirectUri
    ) {
      throw new Error("OAuth provider logout did not complete");
    }
  } catch {
    // Local authority is still cleared below. Provider cleanup is defense in
    // depth and must not strand the user on a failed logout page.
  }
  // Clearing the browser cookie ends this browser's authority. A copied
  // self-contained access token remains usable until its exp claim; the public
  // ADR and operator runbook describe signing-key rotation for compromise.
  return redirectResponse(`${issuer}/auth/login`, headers);
}

function jwtSigningAlgorithm(token: string): string | undefined {
  const [encodedHeader] = token.split(".");
  if (!encodedHeader) return undefined;
  const header = decodeJwtPart(encodedHeader);
  return typeof header?.alg === "string" ? header.alg : undefined;
}

/**
 * Return a one-time upgrade navigation only for a verified protected-page SSR.
 * The caller first resolves userProfile through the backend, so merely forging
 * an HS-looking cookie cannot enter the authorization flow.
 */
export function legacyDashboardSessionUpgradeHref(): string | undefined {
  const token = getCookie(DASHBOARD_AUTH_COOKIE);
  const requestUrl = getRequestUrl({
    xForwardedHost: true,
    xForwardedProto: true,
  });
  return legacyDashboardSessionUpgradeHrefForRequest(token, requestUrl);
}

export function legacyDashboardSessionUpgradeHrefForRequest(
  token: string | undefined,
  requestUrl: URL,
): string | undefined {
  if (!jwtSigningAlgorithm(token ?? "")?.startsWith("HS")) return undefined;

  const protectedMarkers = ["/ledger", "/settings", "/dashboard"];
  const marker = protectedMarkers
    .map((candidate) => ({
      candidate,
      index: requestUrl.pathname.indexOf(candidate),
    }))
    .find(({ candidate, index }) => {
      if (index < 0) return false;
      const boundary = requestUrl.pathname[index + candidate.length];
      return boundary === undefined || boundary === "/";
    });
  if (!marker) return undefined;
  const prefix = requestUrl.pathname.slice(0, marker.index).replace(/\/$/, "");
  const next = `${requestUrl.pathname.slice(prefix.length)}${requestUrl.search}`;
  const start = new URL(
    `${prefix}${DASHBOARD_OAUTH_PATHS.start}`,
    requestUrl.origin,
  );
  start.searchParams.set("next", next);
  return `${start.pathname}${start.search}`;
}
