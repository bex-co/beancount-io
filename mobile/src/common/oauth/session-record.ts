export type LegacySession = {
  kind: "legacy";
  userId: string;
  authToken: string;
  /** The normalized base URL that issued this bearer token. */
  serverUrl?: string;
};

export type OAuthSession = {
  kind: "oauth";
  serverUrl: string;
  issuer: string;
  resource: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  clientId: "beancount-mobile";
  userId: string;
  scopes: string[];
  tokenType: "Bearer";
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
};

export type Session = LegacySession | OAuthSession;

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Hydrate both new discriminated sessions and the pre-migration legacy shape. */
export function deserializeSession(value: string): Session | null {
  const parsed: unknown = JSON.parse(value);
  if (parsed === null) return null;
  if (typeof parsed !== "object") throw new Error("Stored session is invalid");
  const candidate = parsed as Record<string, unknown>;

  if (candidate.kind === "oauth") {
    if (
      !isString(candidate.serverUrl) ||
      !isString(candidate.issuer) ||
      !isString(candidate.resource) ||
      !isString(candidate.tokenEndpoint) ||
      !isString(candidate.revocationEndpoint) ||
      candidate.clientId !== "beancount-mobile" ||
      !isString(candidate.userId) ||
      !Array.isArray(candidate.scopes) ||
      !candidate.scopes.every(isString) ||
      candidate.tokenType !== "Bearer" ||
      !isString(candidate.accessToken) ||
      typeof candidate.accessTokenExpiresAt !== "number" ||
      !Number.isFinite(candidate.accessTokenExpiresAt) ||
      !isString(candidate.refreshToken)
    ) {
      throw new Error("Stored OAuth session is invalid");
    }
    return candidate as OAuthSession;
  }

  if (
    (candidate.kind === undefined || candidate.kind === "legacy") &&
    isString(candidate.userId) &&
    isString(candidate.authToken) &&
    (candidate.serverUrl === undefined || isString(candidate.serverUrl))
  ) {
    return {
      kind: "legacy",
      userId: candidate.userId,
      authToken: candidate.authToken,
      ...(candidate.serverUrl ? { serverUrl: candidate.serverUrl } : {}),
    };
  }
  throw new Error("Stored session is invalid");
}
