import { Context } from "koa";

export const COOKIE_NAME = "authSess:beancount.io";

export interface CookieOptions {
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  path: string;
}

export function setAuthCookie(
  ctx: Context,
  token: string,
  expireAt: Date,
  _isProduction: boolean,
): void {
  ctx.cookies.set(COOKIE_NAME, token, getCookieOptions(ctx, expireAt));
}

function getCookieOptions(context: Context, expireAt: Date): CookieOptions {
  return {
    // Mirrors the JWT's own expiry so the cookie never outlives the token it carries.
    maxAge: Math.max(0, expireAt.getTime() - Date.now()),
    httpOnly: true, // Prevent JavaScript access
    secure: context.URL.protocol === "https:", // HTTPS only in production
    sameSite: "lax", // CSRF protection
    path: "/",
  };
}

export function clearAuthCookie(ctx: Context): void {
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
