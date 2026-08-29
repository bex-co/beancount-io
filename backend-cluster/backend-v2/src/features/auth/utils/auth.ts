import type { RouterContext } from "@koa/router";
import { getAuthCookieFromCtx } from "@/shared/cookie-utils";

export const getTokenFromCtx = (ctx: RouterContext): string | undefined => {
  // Priority 1: Authorization header (for API clients, mobile app)
  //
  // The scheme match is case-insensitive because RFC 7235 defines auth-scheme
  // as case-insensitive, and real clients do send `bearer`. This matters now
  // that MCP authenticates through here: its own parser was case-insensitive
  // (`/^Bearer\s+(.+)$/i`), so matching case-sensitively would have started
  // refusing third-party agents that had always worked.
  const authHeader = ctx.headers.authorization;
  if (authHeader) {
    return String(authHeader).replace(/^Bearer\s+/i, "");
  }

  // Priority 2: the public API's personal-access-token header. Keep an
  // explicitly supplied credential ahead of the browser cookie: otherwise a
  // signed-in browser trying a scoped key would silently exercise its full
  // session authority instead of the key being tested.
  const apiKeyHeader = ctx.headers["x-api-key"];
  if (apiKeyHeader) {
    return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : String(apiKeyHeader);
  }

  // Priority 3: httpOnly cookie (for browser clients with SSR)
  const cookieToken = getAuthCookieFromCtx(ctx as any);
  if (cookieToken) {
    return cookieToken;
  }

  return undefined;
};

export const getBasicAuthHeader = (user: string, password: string) => {
  const credentials = Buffer.from(`${user}:${password}`).toString("base64");

  return {
    Authorization: `Basic ${credentials}`,
  };
};
