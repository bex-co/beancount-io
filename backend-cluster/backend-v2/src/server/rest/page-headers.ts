import type { RouterContext } from "@koa/router";

import type { PageInfo } from "@/shared/page-info";

/**
 * The REST channel of the has-more rule (w23/m28): response headers, so the
 * body of a list stays exactly what it was.
 *
 * `X-Has-More` is always set; `X-Total-Count` only when the read knows the
 * whole count; `Link: <…>; rel="next"` only when more remains, carrying the
 * same query with the next `offset` or `page` (and the page size, so a default
 * size is kept).
 */
export function setPageHeaders(
  ctx: RouterContext,
  info: PageInfo | undefined,
): void {
  if (!info) return;
  ctx.set("X-Has-More", String(info.hasMore));
  if (info.total !== undefined) ctx.set("X-Total-Count", String(info.total));
  if (!info.hasMore) return;
  const next = new URLSearchParams(ctx.querystring);
  if (info.nextOffset !== undefined)
    next.set("offset", String(info.nextOffset));
  if (info.nextPage !== undefined) next.set("page", String(info.nextPage));
  if (info.limit !== undefined) next.set("limit", String(info.limit));
  ctx.set("Link", `<${ctx.path}?${next.toString()}>; rel="next"`);
}

/** The headers a paginated read documents on its 200 response in the OpenAPI spec. */
export const PAGE_HEADER_DOCS = {
  "X-Has-More": {
    description: "`true` when more entries remain after this page.",
    schema: { type: "string", enum: ["true", "false"] },
  },
  "X-Total-Count": {
    description: "The whole filtered count; sent only by reads that know it.",
    schema: { type: "string" },
  },
  Link: {
    description:
      'The next page as `<path?query>; rel="next"`; sent only when more remains.',
    schema: { type: "string" },
  },
} as const;

/** Every header the signal uses, for CORS `Access-Control-Expose-Headers`. */
export const PAGE_RESPONSE_HEADERS: string[] = Object.keys(PAGE_HEADER_DOCS);
