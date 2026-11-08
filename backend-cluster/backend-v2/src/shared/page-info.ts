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
