import { Context } from "koa";

export const COOKIE_NAME = "authSess:beancount.io";

interface CookieOptions {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
  domain?: string;
}

export function setAuthCookie(
  ctx: Context,
  token: string,
  expireAt: Date,
  isProduction: boolean,
): void {
  ctx.cookies.set(
    COOKIE_NAME,
    token,
    getCookieOptions(ctx, expireAt, isProduction),
  );
}

function getCookieOptions(
  context: Context,
  expireAt: Date,
  isProduction: boolean,
): CookieOptions {
  return {
    // Mirrors the JWT's own expiry so the cookie never outlives the token it carries.
    maxAge: Math.max(0, expireAt.getTime() - Date.now()),
    httpOnly: true, // Prevent JavaScript access
    secure: context.URL.protocol === "https:", // HTTPS only in production
    sameSite: "lax", // CSRF protection
    path: "/",
    domain: isProduction ? authCookieDomain() : undefined,
  };
}

/**
 * Parent domain the session cookie is shared across, so the dashboard host and
 * the API host both see it (the dashboard renders server-side from it).
 *
 * Hosted beancount.io keeps `.beancount.io` when AUTH_COOKIE_DOMAIN is unset.
 * A self-hosted deployment runs on its own domains, where a cookie claiming
 * `.beancount.io` is rejected by the browser and nobody can sign in, so it
 * sets AUTH_COOKIE_DOMAIN to the parent of its app and API hosts
 * (e.g. `.example.com`). An empty value means host-only, for a deployment that
 * serves the dashboard and `/api-gateway/` from one host.
 */
function authCookieDomain(): string | undefined {
  const configured = process.env.AUTH_COOKIE_DOMAIN;
  if (configured === undefined) return ".beancount.io";
  return configured.trim() || undefined;
}

// Duck-typed on the one call made: Koa and @koa/router contexts carry
// structurally identical cookie jars whose fluent `set` return type (`this`)
// defeats nominal assignability between the two type graphs.
export function clearAuthCookie(ctx: {
  cookies: {
    set(name: string, value: string, opts: { maxAge: number }): unknown;
  };
}): void {
  ctx.cookies.set(COOKIE_NAME, "", { maxAge: 0 });
}

/**
 * Read the auth cookie, tolerating a context that has no cookie jar.
 *
 * Not every caller holds a full Koa context: the shared identity gate
 * (`server/api/identity.ts`) accepts anything header-shaped, and Apollo hands
 * GraphQL a context whose declared type is headers-only. A missing jar means
 * "no cookie was presented", which is a legitimate answer — not a crash.
 */
export function getAuthCookieFromCtx(ctx: Context): string | undefined {
  return ctx.cookies?.get(COOKIE_NAME);
}
