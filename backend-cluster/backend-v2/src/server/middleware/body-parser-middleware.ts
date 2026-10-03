import type Koa from "koa";
import bodyParser from "koa-bodyparser";
import {
  MCP_ENDPOINT_PATH,
  mcpBodyParseFailure,
} from "@/features/ai-agent/api/mcp-route";

/** A body the parser refused, carried past koa-bodyparser's own handling. */
class BodyParseFailure extends Error {
  constructor(readonly cause: Error & { status?: number; body?: unknown }) {
    super(cause.message);
  }
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
 */
export function bodyParserMiddleware(): Koa.Middleware {
  const parse = bodyParser({
    jsonLimit: "1mb",
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
    if (isOidcCore) return next();
    try {
      // Type cast: root @types/koa and @koa/router's bundled copy are
      // structurally incompatible
      return await parse(ctx as unknown as Parameters<typeof parse>[0], next);
    } catch (error) {
      if (!(error instanceof BodyParseFailure)) throw error;
      if (ctx.path !== MCP_ENDPOINT_PATH) throw error.cause;
      ctx.status = error.cause.status ?? 400;
      ctx.body = mcpBodyParseFailure(error.cause.body);
    }
  };
}
