import type Koa from "koa";
import { ErrorCategory } from "@/shared/errors";

/** The prefix every v1 path carries. */
export const V1_PREFIX = "/api-gateway/v1";

/** Whether a request path is under the v1 REST surface. */
export function isV1Path(path: string): boolean {
  return path === V1_PREFIX || path.startsWith(`${V1_PREFIX}/`);
}

/**
 * The v1 error envelope, `{ ok: false, error: { code, message } }`, as
 * `restErrorMiddleware` writes it for a matched route. The refusals below
 * happen where no route has matched, or before one runs, and answered in
 * Koa's plain text, which a client parsing every error as JSON could not read
 * (w1/222).
 */
export function writeV1Error(
  // Structural: Koa's and the router's bundled context types do not unify.
  ctx: { status: number; body: unknown },
  status: number,
  code: ErrorCategory,
  message: string,
): void {
  ctx.status = status;
  ctx.body = { ok: false, error: { code, message } };
}

/**
 * Answer an unmatched v1 path or method in the envelope. Mounted ahead of the
 * router, so it sees the final response: the router's own 404 for a path no
 * route has, and the 405 or 501 its `allowedMethods` writes, `Allow` kept.
 */
export function v1FallbackMiddleware(): Koa.Middleware {
  return async (ctx, next) => {
    await next();
    if (!isV1Path(ctx.path) || typeof ctx.body === "object") return;
    if (ctx.status === 404 && ctx.body == null) {
      writeV1Error(
        ctx,
        404,
        ErrorCategory.NOT_FOUND,
        `No such endpoint: ${ctx.method} ${ctx.path}. The endpoints are listed in ${V1_PREFIX}/openapi.json.`,
      );
    } else if (ctx.status === 405 || ctx.status === 501) {
      const allow = ctx.response.get("Allow");
      writeV1Error(
        ctx,
        ctx.status,
        ErrorCategory.BAD_USER_INPUT,
        allow
          ? `${ctx.method} is not allowed on ${ctx.path}; it accepts ${allow}`
          : `${ctx.method} is not supported`,
      );
    }
  };
}
