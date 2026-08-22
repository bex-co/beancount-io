import { Context, Next } from "koa";
import type { IModels } from "@/foundation/models/types";
import type { DbExecutor } from "@/drizzle/drizzle";
import { logger } from "@/shared/logger";

const orphanLogger = logger.child({ module: "orphaned-host-cookie" });

/**
 * The production auth cookie name introduced by c8fee979d7 and dropped again by
 * its revert (fcfef590ff). Nothing reads it anymore — see the middleware below.
 */
export const ORPHANED_HOST_AUTH_COOKIE_NAME = "__Host-authSess";

/**
 * TEMPORARY SHIM — safe to delete after 2026-10-21.
 *
 * Between the c8fee979d7 deploy and its revert, production wrote auth JWTs into
 * a `__Host-authSess` cookie and actively deleted the legacy
 * `authSess:beancount.io` one. The reverted code reads and writes only the
 * legacy name, so every token issued in that window is now stranded in a cookie
 * nothing reads — and `AUTH_JWT_EXP_MINUTES` defaults to 525600 (365 days), so
 * those cookies would sit in browsers for a year still carrying a valid,
 * DB-backed credential.
 *
 * This retires them on first contact: revoke the JWT — which deletes its `jwts`
 * row, and `JwtPostgresModel.verify` requires that row, so the token then
 * behaves exactly like an expired one — and clear the cookie so the browser
 * stops presenting it.
 *
 * Mounted app-wide rather than inside the GraphQL gateway so it covers REST and
 * the git proxy too: whichever route the browser hits first retires the cookie.
 */
export function createOrphanedHostCookieMiddleware(
  models: Pick<IModels, "jwt">,
  db: DbExecutor,
) {
  return async function orphanedHostCookieMiddleware(
    ctx: Context,
    next: Next,
  ): Promise<void> {
    const orphanedToken = ctx.cookies.get(ORPHANED_HOST_AUTH_COOKIE_NAME);

    if (orphanedToken) {
      try {
        // Verifies the signature first and no-ops on a garbage value, so a
        // forged cookie can never delete someone else's row.
        await models.jwt.revoke(db, orphanedToken);
      } catch (error) {
        // Fail open: a database blip must not turn every request into a 500.
        // The cookie is cleared either way, so the credential stops circulating.
        orphanLogger.warn("Failed to revoke orphaned __Host- session", {
          error,
        });
      }

      ctx.cookies.set(ORPHANED_HOST_AUTH_COOKIE_NAME, "", {
        maxAge: 0,
        httpOnly: true,
        // The __Host- prefix mandates Secure and Path=/ with no Domain —
        // a deletion that omits them is rejected by the browser outright.
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    }

    await next();
  };
}
