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
 * Expire the auth cookie in the browser.
 *
 * A browser keys a cookie by name, domain and path, so the expiry must carry
 * the same domain and path `setAuthCookie` used or the browser keeps the
 * original. The host-only expiry also removes a copy set without a domain
 * (every non-production cookie, and any older host-only one). Koa keeps both
 * `Set-Cookie` headers because `overwrite` defaults to false.
 *
 * Duck-typed on the jar's `set`, the only method used: Koa and @koa/router
 * contexts carry structurally identical cookie jars whose fluent `set` return
 * type (`this`) defeats nominal assignability between the two type graphs.
 */
export function clearAuthCookie(
  ctx: {
    cookies: {
      set(
        name: string,
        value: string,
        opts: { maxAge: number; path: string; domain?: string },
      ): unknown;
    };
  },
  isProduction: boolean,
): void {
  ctx.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  if (isProduction) {
    ctx.cookies.set(COOKIE_NAME, "", {
      maxAge: 0,
      path: "/",
      domain: authCookieDomain(),
    });
  }
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

/**
 * Parent domain the session cookie is shared across, so the dashboard host and
 * the API host both see it (the dashboard renders server-side from it).
 *
 * Unset or blank keeps beancount.io's `.beancount.io`, so existing
 * deployments, which never set this, behave exactly as before. A deployment on
 * its own domains must set AUTH_COOKIE_DOMAIN to the parent of its dashboard
 * and API hosts (e.g. `.example.com`): a browser rejects a cookie claiming
 * `.beancount.io` from any other site.
 */
function authCookieDomain(): string {
  return process.env.AUTH_COOKIE_DOMAIN?.trim() || ".beancount.io";
}

/**
 * True when the default `.beancount.io` cookie domain cannot work for this
 * dashboard URL: a non-beancount.io deployment that never set
 * AUTH_COOKIE_DOMAIN. Used only to warn at boot; behavior is unchanged.
 */
export function cookieDomainNeedsConfig(
  dashboardUrl: string | undefined,
): boolean {
  if (process.env.AUTH_COOKIE_DOMAIN?.trim() || !dashboardUrl) return false;
  try {
    const host = new URL(dashboardUrl).hostname;
    return (
      host !== "beancount.io" &&
      !host.endsWith(".beancount.io") &&
      host !== "localhost"
    );
  } catch {
    return false;
  }
}
