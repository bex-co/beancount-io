import cors from "@koa/cors";
import { isAllowedOrigin } from "@/server/api/allowed-origin";
import { PAGE_RESPONSE_HEADERS } from "@/server/rest/page-headers";

/**
 * Response headers a cross-origin browser client may read.
 *
 * The has-more headers are for paginated reads (w23/m28). `WWW-Authenticate`
 * carries the `resource_metadata` pointer on an MCP 401: a browser-hosted MCP
 * client reads it to learn where to sign in, and cross-origin JavaScript
 * cannot see a header that is not listed here (w23/m32).
 */
const EXPOSED_RESPONSE_HEADERS: string[] = [
  ...PAGE_RESPONSE_HEADERS,
  "WWW-Authenticate",
];

/**
 * CORS with credentials for cookie-based auth. Origins are matched by pattern
 * (no env vars needed): an allowed origin is echoed back and anything else
 * gets no `Access-Control-Allow-Origin` at all.
 */
export function corsMiddleware(): ReturnType<typeof cors> {
  return cors({
    origin: (ctx) => {
      const origin = ctx.get("Origin");

      // If no origin header (same-origin request), allow it
      if (!origin) {
        return "*";
      }

      // A rejected origin gets an empty string, which keeps the
      // Access-Control-Allow-Origin header from being set
      return isAllowedOrigin(origin) ? origin : "";
    },
    credentials: true,
    exposeHeaders: EXPOSED_RESPONSE_HEADERS,
  });
}
