import type { Context, Next } from "koa";
import { randomUUID } from "node:crypto";
import { asyncContext } from "@/shared/async-context";
import {
  FORWARDED_CONTEXT_HEADER,
  parseForwardedContext,
} from "./forwarded-context";

/**
 * A request ID this service will adopt. Anything else gets a fresh one: an ID
 * is only worth having if it is safe to print, and this value reaches every log
 * line, so separators and control characters would let a caller forge log
 * structure.
 */
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/u;

/**
 * Establish the request's async context.
 *
 * `shared/async-context.ts` and the logger's `mergeContext` have always been
 * able to stamp `requestId` on every line, but nothing ever populated the
 * store, so every ledger log was uncorrelated and a request could not be
 * followed across the backend-v2 boundary. This middleware is the missing half.
 *
 * Runs first, before error handling, so a request that fails inside
 * `restErrorMiddleware` is still logged under its ID.
 *
 * Only the fields this service consumes are stored, not the whole parsed
 * envelope: the parser tolerates unknown keys so a new field can be added
 * without a lockstep deploy, but keeping unread keys in the store would put
 * caller-controlled data within reach of code that has no reason to see it.
 */
export function requestContextMiddleware() {
  return async (ctx: Context, next: Next): Promise<void> => {
    const forwarded = parseForwardedContext(ctx.get(FORWARDED_CONTEXT_HEADER));
    const candidate = forwarded["request-id"];
    const requestId =
      candidate && REQUEST_ID_RE.test(candidate) ? candidate : randomUUID();

    // Echoed so a caller can name the request in a bug report, and so the ID
    // is observable end to end without reading the logs.
    ctx.set("X-Request-Id", requestId);

    await asyncContext.run(
      { requestId, sessionToken: forwarded["session-token"] || undefined },
      () => next(),
    );
  };
}
