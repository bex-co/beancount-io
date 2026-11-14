import { BadUserInputError } from "@/shared/errors";

/**
 * The one has-more rule for every paginated read (w23/m28).
 *
 * Most list results are bare arrays or bare objects, so the signal rides
 * beside the result instead of inside it, and nothing that parses a result
 * today changes: REST response headers, an MCP sibling `page` object (a
 * resource's content `_meta`), and GraphQL `extensions.page`. All three carry
 * this one shape.
 */
export interface PageInfo {
  /** Entries in this page. */
  returned: number;
  /** The page size asked for, or the default the read applied. */
  limit?: number;
  /** Where this page began, for reads paged by `offset`. */
  offset?: number;
  /** This page's number (1-based), for reads paged by `page`. */
  page?: number;
  /** The whole filtered count, only when the read knows it. */
  total?: number;
  /** True when more entries remain after this page. */
  hasMore: boolean;
  /** The `offset` of the next page; present only when `hasMore`, for offset reads. */
  nextOffset?: number;
  /** The `page` of the next page; present only when `hasMore`, for numbered reads. */
  nextPage?: number;
}

/**
 * A page of an offset read. With a `total`, `hasMore` is exact. A read that
 * only says whether it was cut off passes `truncated` instead.
 */
export function offsetPage(input: {
  returned: number;
  offset?: number;
  limit?: number;
  total?: number;
  truncated?: boolean;
}): PageInfo {
  const offset = input.offset ?? 0;
  const hasMore =
    input.total !== undefined
      ? offset + input.returned < input.total
      : input.truncated === true;
  return {
    returned: input.returned,
    ...(input.limit !== undefined && { limit: input.limit }),
    offset,
    ...(input.total !== undefined && { total: input.total }),
    hasMore,
    ...(hasMore && { nextOffset: offset + input.returned }),
  };
}

/**
 * A page of a numbered read that cannot count what is left. A full page may be
 * followed by another, so `hasMore` is `returned >= limit`: the last page of an
 * exact multiple reads `hasMore: true` and the next page comes back empty.
 * Without a `limit` (a read that returns everything) nothing remains.
 */
export function numberedPage(input: {
  returned: number;
  page?: number;
  limit?: number;
}): PageInfo {
  const page = input.page ?? 1;
  const hasMore =
    input.limit !== undefined &&
    input.limit > 0 &&
    input.returned >= input.limit;
  return {
    returned: input.returned,
    ...(input.limit !== undefined && { limit: input.limit }),
    page,
    hasMore,
    ...(hasMore && { nextPage: page + 1 }),
  };
}

/** The largest page any `page`/`limit` read serves. */
const PAGE_LIMIT_MAX = 100;

/**
 * `page` and `limit` held to one bound on every numbered list (w1/205): the
 * owned-ledgers and account catalogs accepted `limit=0`, `limit=1000` and
 * `page=-1` and echoed them back, while search and REST refused them. Checked
 * in the service, so GraphQL refuses what REST's and MCP's schemas refuse.
 */
export function assertPageArgs(args: {
  page?: number | null;
  limit?: number | null;
}) {
  const page = args.page ?? undefined;
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1)) {
    throw new BadUserInputError("page must be a positive integer", "page");
  }
  const limit = args.limit ?? undefined;
  if (
    limit !== undefined &&
    (!Number.isSafeInteger(limit) || limit < 1 || limit > PAGE_LIMIT_MAX)
  ) {
    throw new BadUserInputError(
      `limit must be an integer from 1 to ${PAGE_LIMIT_MAX}`,
      "limit",
    );
  }
}
