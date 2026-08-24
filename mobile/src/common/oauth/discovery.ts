import { validateServerUrl } from "../server-url-validation";

export const OAUTH_CLIENT_ID = "beancount-mobile";
export const OAUTH_SCOPES = [
  "openid",
  "offline_access",
  "ledger.read",
  "ledger.write",
  "ledger.admin",
] as const;
export const OAUTH_REDIRECT_URIS = [
  "io.beancount.ios:/oauth/callback",
  "io.beancount.android:/oauth/callback",
] as const;

export type OAuthDiscovery = {
  serverUrl: string;
  resource: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
};

type Fetch = typeof fetch;

function wellKnownUrl(kind: string, absoluteUrl: string): string {
  const url = new URL(absoluteUrl);
  const path = url.pathname.replace(/^\/|\/$/g, "");
  url.pathname = `/.well-known/${kind}${path ? `/${path}` : ""}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function issuerForServer(serverUrl: string): string {
  return serverUrl.replace(/\/$/, "");
}

export function apiResourceForServer(serverUrl: string): string {
  return new URL("v1", serverUrl).toString().replace(/\/$/, "");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

export function oauthEndpointWithinIssuer(
  endpoint: unknown,
  issuer: string,
): string {
  if (typeof endpoint !== "string")
    throw new Error("OAuth endpoint is missing");
  const endpointUrl = new URL(endpoint);
  const issuerUrl = new URL(issuer);
  const prefix = issuerUrl.pathname.replace(/\/$/, "");
  if (
    endpointUrl.username ||
    endpointUrl.password ||
    endpointUrl.origin !== issuerUrl.origin ||
    (prefix &&
      endpointUrl.pathname !== prefix &&
      !endpointUrl.pathname.startsWith(`${prefix}/`))
  ) {
    throw new Error("OAuth endpoint is outside the selected issuer");
  }
  return endpointUrl.toString();
}

async function fetchJson(url: string, fetcher: Fetch, signal?: AbortSignal) {
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("OAuth metadata is unavailable");
  const body: unknown = await response.json();
  if (!isObject(body)) throw new Error("OAuth metadata is invalid");
  return body;
}

/** Discover and validate the exact OAuth contract for the selected server. */
export async function discoverOAuthServer(
  selectedServerUrl: string,
  fetcher: Fetch = fetch,
  signal?: AbortSignal,
): Promise<OAuthDiscovery> {
  const validation = validateServerUrl(selectedServerUrl);
  if (!validation.ok) throw new Error("Selected server URL is invalid");

  const serverUrl = validation.url;
  const expectedIssuer = issuerForServer(serverUrl);
  const resource = apiResourceForServer(serverUrl);
  const resourceMetadata = await fetchJson(
    wellKnownUrl("oauth-protected-resource", resource),
    fetcher,
    signal,
  );
  if (resourceMetadata.resource !== resource) {
    throw new Error(
      "Protected-resource metadata does not match the selected server",
    );
  }
  const authorizationServers = stringArray(
    resourceMetadata.authorization_servers,
  );
  if (
    authorizationServers.length !== 1 ||
    authorizationServers[0] !== expectedIssuer
  ) {
    throw new Error("Authorization server does not match the selected server");
  }
  if (
    !OAUTH_SCOPES.slice(2).every((scope) =>
      stringArray(resourceMetadata.scopes_supported).includes(scope),
    )
  ) {
    throw new Error("Protected resource lacks required mobile scopes");
  }

  const metadata = await fetchJson(
    wellKnownUrl("oauth-authorization-server", expectedIssuer),
    fetcher,
    signal,
  );
  if (metadata.issuer !== expectedIssuer) {
    throw new Error("Authorization-server issuer mismatch");
  }
  if (
    !stringArray(metadata.response_types_supported).includes("code") ||
    !OAUTH_SCOPES.every((scope) =>
      stringArray(metadata.scopes_supported).includes(scope),
    )
  ) {
    throw new Error("Authorization code flow is unsupported");
  }
  if (
    stringArray(metadata.response_types_supported).some((type) =>
      type.includes("token"),
    )
  ) {
    throw new Error(
      "Authorization server advertises an implicit response flow",
    );
  }
  if (
    !stringArray(metadata.code_challenge_methods_supported).includes("S256")
  ) {
    throw new Error("S256 PKCE is unsupported");
  }
  if (
    !["authorization_code", "refresh_token"].every((grant) =>
      stringArray(metadata.grant_types_supported).includes(grant),
    ) ||
    !stringArray(metadata.token_endpoint_auth_methods_supported).includes(
      "none",
    ) ||
    metadata.authorization_response_iss_parameter_supported !== true
  ) {
    throw new Error("Authorization server lacks the native OAuth contract");
  }

  return {
    serverUrl,
    resource,
    issuer: expectedIssuer,
    authorizationEndpoint: oauthEndpointWithinIssuer(
      metadata.authorization_endpoint,
      expectedIssuer,
    ),
    tokenEndpoint: oauthEndpointWithinIssuer(
      metadata.token_endpoint,
      expectedIssuer,
    ),
    revocationEndpoint: oauthEndpointWithinIssuer(
      metadata.revocation_endpoint,
      expectedIssuer,
    ),
  };
}
