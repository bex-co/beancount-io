import type Koa from "koa";
import bodyParser from "koa-bodyparser";
import {
  MCP_ENDPOINT_PATH,
  mcpBodyParseFailure,
} from "@/features/ai-agent/api/mcp-route";

/** The JSON body cap, and how an over-cap MCP refusal names it. */
const JSON_LIMIT = { bytes: "2mb", label: "2 MiB" } as const;

/** A body the parser refused, carried past koa-bodyparser's own handling. */
class BodyParseFailure extends Error {
  constructor(readonly cause: Error & { status?: number; body?: unknown }) {
    super(cause.message);
  }
}

/**
 * `Content-Encoding` names Brotli, alone or anywhere in a list of encodings.
 *
 * koa-bodyparser hands such a body to zlib's Brotli decoder (via co-body and
 * inflation) before anyone has authenticated. CVE-2026-111497 was an
 * out-of-bounds write in exactly that decoder; patching Node closes it, and
 * this keeps the next decoder bug off the unauthenticated surface too. No
 * client of ours compresses a request body with Brotli — git gzips large
 * upload-pack requests, so gzip and deflate stay accepted.
 */
const BROTLI_ENCODING = /(^|,)\s*br\s*(,|$)/i;

function brotliBodyRefusal(): BodyParseFailure {
  return new BodyParseFailure(
    Object.assign(new Error("Brotli-encoded request bodies are not accepted"), {
      status: 415,
      expose: true,
    }),
  );
}

/**
 * The application's one body parser.
 *
 * Two paths are special. oidc-provider's core routes parse their own body from
 * the raw stream, so they are skipped. And a body the parser cannot read on
 * the MCP endpoint is answered as a JSON-RPC error rather than with Koa's
 * plain-text `Bad Request`: that endpoint speaks JSON-RPC to clients that
 * parse every response as JSON, and the refusal happened here, before the
 * route that knows that ever ran (w5/048). Every other path keeps the parser's
 * own error, translated by whatever error middleware sits above it.
 *
 * A Brotli-encoded body is refused on every path, the OIDC core included,
 * before any decoder sees it.
 */
export function bodyParserMiddleware(): Koa.Middleware {
  const parse = bodyParser({
    // A 1 MiB file needs ~1.4 MiB as base64, plus the request envelope.
    // Explicit file-write boundaries enforce the separate decoded-byte cap.
    jsonLimit: JSON_LIMIT.bytes,
    formLimit: "56kb",
    // koa-bodyparser carries on to the next middleware after `onerror`
    // returns, so the failure is thrown to stop the request here.
    onerror: (error) => {
      throw new BodyParseFailure(error);
    },
  });
  return async (ctx, next) => {
    // Interaction routes (/interaction/*) still need bodyParser — our handlers
    // read ctx.request.body there.
    const isOidcCore =
      ctx.path.startsWith("/api-gateway/oauth/") &&
      !ctx.path.startsWith("/api-gateway/oauth/interaction/");
    try {
      if (BROTLI_ENCODING.test(ctx.get("Content-Encoding"))) {
        throw brotliBodyRefusal();
      }
      if (isOidcCore) return await next();
      // Type cast: root @types/koa and @koa/router's bundled copy are
      // structurally incompatible
      return await parse(ctx as unknown as Parameters<typeof parse>[0], next);
    } catch (error) {
      if (!(error instanceof BodyParseFailure)) throw error;
      if (ctx.path !== MCP_ENDPOINT_PATH) throw error.cause;
      ctx.status = error.cause.status ?? 400;
      ctx.body = mcpBodyParseFailure(
        error.cause.body,
        ctx.status === 413 ? JSON_LIMIT.label : undefined,
      );
    }
  };
}
