export type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scopes: string[];
};

type ParseOAuthTokenResponseOptions = {
  expectedScopes: readonly string[];
  requireRefreshToken: boolean;
};

function exactScopes(
  value: unknown,
  expectedScopes: readonly string[],
): string[] {
  if (value === undefined) return [...expectedScopes];
  if (typeof value !== "string") {
    throw new Error("OAuth token response is invalid");
  }

  const scopes = value.split(/\s+/).filter(Boolean);
  const uniqueScopes = new Set(scopes);
  if (
    scopes.length !== expectedScopes.length ||
    uniqueScopes.size !== scopes.length ||
    !expectedScopes.every((scope) => uniqueScopes.has(scope))
  ) {
    throw new Error("OAuth token response scope does not match the grant");
  }
  return [...expectedScopes];
}

/** Parse one code/refresh response without accepting privilege drift. */
export function parseOAuthTokenResponse(
  value: unknown,
  options: ParseOAuthTokenResponseOptions,
): OAuthTokenResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("OAuth token response is invalid");
  }
  const body = value as Record<string, unknown>;
  if (
    typeof body.access_token !== "string" ||
    !body.access_token ||
    typeof body.token_type !== "string" ||
    body.token_type.toLowerCase() !== "bearer" ||
    typeof body.expires_in !== "number" ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0 ||
    (body.refresh_token !== undefined &&
      (typeof body.refresh_token !== "string" || !body.refresh_token)) ||
    (options.requireRefreshToken && !body.refresh_token)
  ) {
    throw new Error("OAuth token response is invalid");
  }

  return {
    accessToken: body.access_token,
    ...(typeof body.refresh_token === "string"
      ? { refreshToken: body.refresh_token }
      : {}),
    expiresIn: body.expires_in,
    scopes: exactScopes(body.scope, options.expectedScopes),
  };
}

export function accessTokenExpiry(now: number, expiresIn: number): number {
  const expiry = now + expiresIn * 1000;
  if (!Number.isFinite(now) || !Number.isFinite(expiry)) {
    throw new Error("OAuth token expiry is invalid");
  }
  return expiry;
}
