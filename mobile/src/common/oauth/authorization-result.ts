import type { OAuthDiscovery } from "./discovery";
import {
  apiResourceForServer,
  issuerForServer,
  oauthEndpointWithinIssuer,
  OAUTH_CLIENT_ID,
  OAUTH_REDIRECT_URIS,
  OAUTH_SCOPES,
} from "./discovery";
import { validateServerUrl } from "../server-url-validation";

const AUTHORIZATION_LIFETIME_MS = 10 * 60 * 1000;

export type PendingOAuthAuthorization = OAuthDiscovery & {
  flow: "sign_in" | "sign_up";
  clientId: typeof OAUTH_CLIENT_ID;
  scopes: string[];
  redirectUri: string;
  state: string;
  codeVerifier: string;
  createdAt: number;
};

export class OAuthAuthorizationError extends Error {
  constructor(
    readonly code: string,
    readonly cancelled = false,
  ) {
    super(cancelled ? "Authorization cancelled" : "Authorization failed");
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function deserializePendingAuthorization(
  serialized: string,
): PendingOAuthAuthorization {
  const parsed: unknown = JSON.parse(serialized);
  if (typeof parsed !== "object" || parsed === null) {
    throw new OAuthAuthorizationError("invalid_pending_request");
  }
  const candidate = parsed as Record<string, unknown>;
  const server = isString(candidate.serverUrl)
    ? validateServerUrl(candidate.serverUrl)
    : undefined;
  const scopes = Array.isArray(candidate.scopes)
    ? candidate.scopes.filter(isString)
    : [];
  try {
    if (
      !server?.ok ||
      server.url !== candidate.serverUrl ||
      (candidate.flow !== "sign_in" && candidate.flow !== "sign_up") ||
      candidate.clientId !== OAUTH_CLIENT_ID ||
      !isString(candidate.issuer) ||
      candidate.issuer !== issuerForServer(server.url) ||
      !isString(candidate.resource) ||
      candidate.resource !== apiResourceForServer(server.url) ||
      !isString(candidate.authorizationEndpoint) ||
      oauthEndpointWithinIssuer(
        candidate.authorizationEndpoint,
        candidate.issuer,
      ) !== candidate.authorizationEndpoint ||
      !isString(candidate.tokenEndpoint) ||
      oauthEndpointWithinIssuer(candidate.tokenEndpoint, candidate.issuer) !==
        candidate.tokenEndpoint ||
      !isString(candidate.revocationEndpoint) ||
      oauthEndpointWithinIssuer(
        candidate.revocationEndpoint,
        candidate.issuer,
      ) !== candidate.revocationEndpoint ||
      !OAUTH_REDIRECT_URIS.some((uri) => uri === candidate.redirectUri) ||
      !isString(candidate.state) ||
      !isString(candidate.codeVerifier) ||
      typeof candidate.createdAt !== "number" ||
      !Number.isFinite(candidate.createdAt) ||
      scopes.length !== OAUTH_SCOPES.length ||
      !OAUTH_SCOPES.every((scope) => scopes.includes(scope))
    ) {
      throw new Error("invalid");
    }
  } catch {
    throw new OAuthAuthorizationError("invalid_pending_request");
  }
  return candidate as PendingOAuthAuthorization;
}

function singleParameter(url: URL, name: string): string | undefined {
  const values = url.searchParams.getAll(name);
  if (values.length > 1) {
    throw new OAuthAuthorizationError("invalid_response");
  }
  return values[0];
}

function sameRedirect(actual: URL, expected: URL): boolean {
  return (
    actual.protocol === expected.protocol &&
    actual.username === expected.username &&
    actual.password === expected.password &&
    actual.host === expected.host &&
    actual.pathname === expected.pathname
  );
}

export function validateAuthorizationRedirect(
  callbackUrl: string,
  pending: PendingOAuthAuthorization,
  now: number = Date.now(),
): string {
  const actual = new URL(callbackUrl);
  const expected = new URL(pending.redirectUri);
  if (
    !sameRedirect(actual, expected) ||
    actual.hash ||
    now < pending.createdAt ||
    now - pending.createdAt > AUTHORIZATION_LIFETIME_MS
  ) {
    throw new OAuthAuthorizationError("invalid_response");
  }

  if (
    singleParameter(actual, "state") !== pending.state ||
    singleParameter(actual, "iss") !== pending.issuer
  ) {
    throw new OAuthAuthorizationError("invalid_response");
  }
  if (
    actual.searchParams.has("access_token") ||
    actual.searchParams.has("id_token") ||
    actual.searchParams.has("token")
  ) {
    throw new OAuthAuthorizationError("invalid_response");
  }

  const error = singleParameter(actual, "error");
  if (error) {
    throw new OAuthAuthorizationError(error, error === "access_denied");
  }
  const code = singleParameter(actual, "code");
  if (!code) throw new OAuthAuthorizationError("invalid_response");
  return code;
}

export function createPendingAuthorization(
  discovery: OAuthDiscovery,
  input: {
    flow: PendingOAuthAuthorization["flow"];
    redirectUri: string;
    state: string;
    codeVerifier: string;
    createdAt?: number;
  },
): PendingOAuthAuthorization {
  return {
    ...discovery,
    flow: input.flow,
    clientId: OAUTH_CLIENT_ID,
    scopes: [...OAUTH_SCOPES],
    redirectUri: input.redirectUri,
    state: input.state,
    codeVerifier: input.codeVerifier,
    createdAt: input.createdAt ?? Date.now(),
  };
}
