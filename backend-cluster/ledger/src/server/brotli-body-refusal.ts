import type { Context, Next } from "koa";
import { errorResponse } from "./envelope";

/** `Content-Encoding` names Brotli, alone or anywhere in a list of encodings. */
const BROTLI_ENCODING = /(^|,)\s*br\s*(,|$)/i;

/**
 * Refuse a Brotli-encoded request body before koa-bodyparser hands it to
 * zlib's Brotli decoder (via co-body and inflation). CVE-2026-111497 was an
 * out-of-bounds write in that decoder; patching Node closes it, and this keeps
 * the next decoder bug away too. backend-v2, our only caller, never sends a
 * compressed body; gzip and deflate stay accepted all the same.
 */
export function brotliBodyRefusal() {
  return async (ctx: Context, next: Next): Promise<void> => {
    if (BROTLI_ENCODING.test(ctx.get("Content-Encoding"))) {
      ctx.status = 415;
      ctx.body = errorResponse(
        "Brotli-encoded request bodies are not accepted",
      );
      return;
    }
    await next();
  };
}
