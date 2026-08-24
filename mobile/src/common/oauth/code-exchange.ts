import { endpointFor } from "../server-url-validation";
import type { OAuthSession } from "./session-record";
import type { PendingOAuthAuthorization } from "./authorization-result";
import {
  accessTokenExpiry,
  parseOAuthTokenResponse,
  type OAuthTokenResponse,
} from "./token-response";

async function exchangeCode(
  pending: PendingOAuthAuthorization,
  code: string,
  fetcher: typeof fetch,
): Promise<OAuthTokenResponse> {
  const response = await fetcher(pending.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: pending.clientId,
      code,
      code_verifier: pending.codeVerifier,
      redirect_uri: pending.redirectUri,
      resource: pending.resource,
    }).toString(),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error("OAuth code exchange failed");
  return parseOAuthTokenResponse(body, {
    expectedScopes: pending.scopes,
    requireRefreshToken: true,
  });
}

async function resolveCurrentUserId(
  pending: PendingOAuthAuthorization,
  accessToken: string,
  fetcher: typeof fetch,
): Promise<string> {
  const response = await fetcher(
    endpointFor(pending.serverUrl, "api-gateway/"),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-app-id": "beancount-mobile",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: "query OAuthCurrentUser { userProfile { id } }",
      }),
    },
  );
  const body: unknown = await response.json();
  const userId =
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    typeof body.data === "object" &&
    body.data !== null &&
    "userProfile" in body.data &&
    typeof body.data.userProfile === "object" &&
    body.data.userProfile !== null &&
    "id" in body.data.userProfile &&
    typeof body.data.userProfile.id === "string"
      ? body.data.userProfile.id
      : undefined;
  if (!response.ok || !userId) {
    throw new Error("Authenticated user profile is unavailable");
  }
  return userId;
}

/** Exchange a code and resolve the caller through GraphQL; tokens stay opaque. */
export async function createOAuthSessionFromCode(
  pending: PendingOAuthAuthorization,
  code: string,
  fetcher: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<OAuthSession> {
  const token = await exchangeCode(pending, code, fetcher);
  if (!token.refreshToken) {
    throw new Error("OAuth token response is invalid");
  }
  const userId = await resolveCurrentUserId(
    pending,
    token.accessToken,
    fetcher,
  );
  return {
    kind: "oauth",
    serverUrl: pending.serverUrl,
    issuer: pending.issuer,
    resource: pending.resource,
    tokenEndpoint: pending.tokenEndpoint,
    revocationEndpoint: pending.revocationEndpoint,
    clientId: pending.clientId,
    userId,
    scopes: token.scopes,
    tokenType: "Bearer",
    accessToken: token.accessToken,
    accessTokenExpiresAt: accessTokenExpiry(now, token.expiresIn),
    refreshToken: token.refreshToken,
  };
}
