import { numberedPage, offsetPage, type PageInfo } from "@/shared/page-info";

/**
 * Where each paginated read says whether more remains (w23/m28).
 *
 * One table for every surface: REST sets headers from it, an MCP tool or
 * resource carries it beside the result, and GraphQL puts it in the response
 * `extensions`. A read is keyed by the name all three surfaces share, so the
 * rule cannot drift between them. `PAGED_READ_NAMES` is the registry the
 * parity test compares against the descriptors.
 */
type Query = Record<string, unknown>;
type Signal = (query: Query, result: unknown) => PageInfo | undefined;

const number = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const list = (value: unknown): unknown[] | undefined =>
  Array.isArray(value) ? value : undefined;
const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;

/** `{ total, <rows> }` read by `offset` and `limit`, where `total` is the whole filtered count. */
const offsetRows =
  (rows: string, defaultLimit: number): Signal =>
  (query, result) => {
    const entries = list(field(result, rows));
    const total = number(field(result, "total"));
    if (!entries || total === undefined) return undefined;
    return offsetPage({
      returned: entries.length,
      offset: number(query.offset),
      limit: number(query.limit) ?? defaultLimit,
      total,
    });
  };

/** A bare array read by `page` and `limit`. Without `limit` the read has no page size to compare to. */
const numberedArray =
  (defaults: { page?: number; limit?: number } = {}): Signal =>
  (query, result) => {
    const rows = list(result);
    if (!rows) return undefined;
    const page = number(query.page) ?? defaults.page;
    const limit = number(query.limit) ?? defaults.limit;
    // A page asked for without a size has no upstream default to compare to.
    if (page !== undefined && page > 1 && limit === undefined) return undefined;
    return numberedPage({ returned: rows.length, page, limit });
  };

/** `{ <rows>, total }` social lists, where `total` is only the page size. */
const socialRows =
  (rows: string): Signal =>
  (query, result) => {
    const entries = list(field(result, rows));
    if (!entries) return undefined;
    return numberedPage({
      returned: entries.length,
      page: number(query.page) ?? 1,
      limit: number(query.limit) ?? 20,
    });
  };

const SIGNALS: Record<string, Signal> = {
  // Journal reads: the tool and the resource are the same read.
  listLedgerEntries: offsetRows("data", 20),
  ledgerJournal: offsetRows("data", 20),
  ledgerAccountJournal: offsetRows("items", 20),
  // The plaintext journal returns text, not rows: `total` counts all matching
  // entries and `truncated` says this page stopped short.
  ledgerPlaintextJournal: (query, result) => {
    const total = number(field(result, "total"));
    if (total === undefined) return undefined;
    const offset = number(query.offset) ?? 0;
    const limit = number(query.limit);
    const truncated = field(result, "truncated") === true;
    return offsetPage({
      returned: truncated ? (limit ?? 0) : Math.max(0, total - offset),
      offset,
      limit,
      total,
    });
  },
  getFeed: (query, result) => {
    const items = list(field(result, "items"));
    const total = number(field(result, "total"));
    if (!items || total === undefined) return undefined;
    return offsetPage({
      returned: items.length,
      offset: number(query.offset),
      limit: number(query.limit) ?? 10,
      total,
    });
  },
  // Page-and-limit reads that cannot count what is left.
  listLedgers: numberedArray(),
  accessibleLedgers: numberedArray(),
  ownedLedgers: numberedArray(),
  searchLedgers: numberedArray(),
  ledgerCommits: numberedArray({ page: 1, limit: 30 }),
  ledgerCollaborators: numberedArray({ page: 1, limit: 10 }),
  ledgerPublicKeys: numberedArray(),
  userFollowers: socialRows("users"),
  userFollowing: socialRows("users"),
  userStarredRepos: socialRows("repositories"),
};

/** Every read that carries a page signal, by the name the surfaces share. */
export const PAGED_READ_NAMES: readonly string[] = Object.keys(SIGNALS);

/** The page signal for a read, or undefined when the read is not paginated or its result is not recognized. */
export function pageSignal(
  read: string,
  query: Query,
  result: unknown,
): PageInfo | undefined {
  return SIGNALS[read]?.(query, result);
}

/**
 * An MCP resource's content: the JSON text, with the page signal in `_meta`
 * when the read is paginated. A read that has no signal stays a plain string.
 */
export function pagedResourceContent(
  read: string,
  query: Query,
  result: unknown,
): string | { text: string; mimeType: string; _meta: { page: PageInfo } } {
  const text = JSON.stringify(result);
  const page = pageSignal(read, query, result);
  return page ? { text, mimeType: "application/json", _meta: { page } } : text;
}
