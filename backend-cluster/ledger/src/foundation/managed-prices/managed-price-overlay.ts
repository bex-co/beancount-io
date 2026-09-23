import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import {
  extractIncludeDeclarations,
  isUrlIncludeTarget,
  resolveIncludeTarget,
} from "@/foundation/rustledger/file-map-loader";
import { OperationNotAllowedError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { parseManagedPriceUrl } from "./managed-price-policy";
import {
  requestManagedPriceRefresh,
  resolveManagedPriceFeed,
  type ManagedPriceFeedDeps,
} from "./managed-price-cache";
import type { ManagedPriceFeedSummary } from "./managed-price-feed";

const log = logger.child({ module: "managed-prices" });

/**
 * Overlay validated managed price feeds onto a loaded file map as read-only
 * virtual files (ADR 015 sections 1, 6, 7, 8). Runs AFTER the SHA-keyed cache
 * returns the committed files, so prices never bake into that cache, and
 * before the engine sees the map, so the include resolves like any file.
 */

export type ManagedPriceFreshness = "recent" | "stale" | "unavailable";

interface ManagedPriceInclude {
  file: string;
  line: number;
  target: string;
}

/** Per-source status threaded to callers alongside the file map. */
export interface ManagedPriceSource {
  url: string;
  alias: string;
  includedFrom: ManagedPriceInclude[];
  commodity: string | null;
  quote: string | null;
  source: string | null;
  revision: string | null;
  etag: string | null;
  observedAt: string | null;
  fetchedAt: string | null;
  nextRefreshAt: string | null;
  freshness: ManagedPriceFreshness;
  error: string | null;
  /** Managed prices withheld because the ledger declares the same date/pair. */
  shadowedCount: number;
  /**
   * Dates of the managed prices the engine actually sees. A ledger-authored
   * price on one of these dates for this pair would have shadowed the managed
   * point, so `(date, commodity, quote)` over these dates identifies exactly
   * the directives that came from the feed.
   */
  effectiveDates: string[];
}

interface ManagedPriceOverlay {
  files: FileMap;
  managedPrices: ManagedPriceSource[];
  /** Every virtual key added to `files`, for read-only and counting guards. */
  managedPricePaths: string[];
}

export const MANAGED_PRICE_PLACEHOLDER =
  "; managed price feed already included from another file\n";
const SHADOWED_LINE = "; shadowed by a ledger-authored price for the same date";
const LEDGER_PRICE_RE =
  /^(\d{4}-\d{2}-\d{2})[ \t]+price[ \t]+([A-Z][A-Z0-9'._-]*)[ \t]+\S+[ \t]+([A-Z][A-Z0-9'._-]*)/gmu;
const METADATA_LINE_RE = /^[ \t]+[a-z][A-Za-z0-9_-]*\s*:/u;

const pairKey = (date: string, base: string, quote: string): string =>
  `${date}\0${base}\0${quote}`;

/**
 * Every `(date, base, quote)` the ledger's own files declare. Managed prices
 * on those keys, or on their reciprocals, are withheld so a customer's price
 * wins regardless of include order.
 */
export function collectLedgerPricePairs(
  files: FileMap,
  paths: readonly string[],
): Set<string> {
  const pairs = new Set<string>();
  for (const path of paths) {
    for (const match of (files[path] ?? "").matchAll(LEDGER_PRICE_RE)) {
      pairs.add(pairKey(match[1], match[2], match[3]));
    }
  }
  return pairs;
}

/**
 * Replace shadowed managed price lines (and their metadata lines) with
 * comments. Line count is preserved so any diagnostic that names a line of
 * the virtual file still points at the right place in the feed revision.
 */
export function applyLedgerPricePrecedence(
  text: string,
  feed: ManagedPriceFeedSummary,
  ledgerPairs: ReadonlySet<string>,
): { text: string; shadowedCount: number; effectiveDates: string[] } {
  const lines = text.split(/\r\n|\r|\n/u);
  const effectiveDates: string[] = [];
  let shadowedCount = 0;
  for (const price of feed.prices) {
    const shadowed =
      ledgerPairs.has(pairKey(price.date, price.base, price.quote)) ||
      ledgerPairs.has(pairKey(price.date, price.quote, price.base));
    if (!shadowed) {
      effectiveDates.push(price.date);
      continue;
    }
    shadowedCount += 1;
    lines[price.line - 1] = SHADOWED_LINE;
    for (
      let next = price.line;
      next < lines.length && METADATA_LINE_RE.test(lines[next]);
      next += 1
    ) {
      lines[next] = `; ${lines[next].trim()}`;
    }
  }
  return {
    text: shadowedCount === 0 ? text : lines.join("\n"),
    shadowedCount,
    effectiveDates,
  };
}

/**
 * A predicate that recognizes the directives a managed feed contributed, for
 * reports that must count only the customer's own entries (ADR 015 section
 * 9), or null when no feed contributed anything. Exact because precedence
 * already removed every managed point that a ledger-authored price on the
 * same date and pair would collide with.
 */
export function managedPriceDirectiveMatcher(
  managedPrices: readonly ManagedPriceSource[],
): ((directive: DirectiveJson) => boolean) | null {
  const keys = new Set<string>();
  for (const source of managedPrices) {
    if (source.commodity === null || source.quote === null) continue;
    for (const date of source.effectiveDates) {
      keys.add(pairKey(date, source.commodity, source.quote));
    }
  }
  if (keys.size === 0) return null;
  return (directive) =>
    directive.type === "price" &&
    keys.has(
      pairKey(directive.date, directive.currency, directive.amount.currency),
    );
}

/**
 * Managed price feeds are virtual, read-only files (ADR 015 section 9). A
 * write that resolves to one must be refused before any commit: the path is
 * not a repository file, and writing it would create one named after a URL.
 */
export function assertNotManagedPricePath(
  path: string,
  managedPricePaths: readonly string[],
): void {
  if (!managedPricePaths.includes(path)) return;
  throw new OperationNotAllowedError(
    "edit managed price source",
    `${path} is a managed price feed resolved from a URL include and is read-only; ` +
      "declare a price directive in your own ledger file to override it",
  );
}

/** Freshness from observation age, recomputed on every read (never stored). */
export function managedPriceFreshness(
  observedAt: string | null,
  now: number,
  staleMs: number,
): Exclude<ManagedPriceFreshness, "unavailable"> {
  const observed = observedAt === null ? NaN : Date.parse(observedAt);
  if (!Number.isFinite(observed)) return "stale";
  return now - observed <= staleMs ? "recent" : "stale";
}

const iso = (ms: number | null): string | null =>
  ms === null ? null : new Date(ms).toISOString();

interface PendingSource {
  url: string;
  alias: string;
  includes: ManagedPriceInclude[];
}

/**
 * Group the reachable files' allowed URL includes by canonical feed URL.
 * Disallowed URLs are left for the engine to report (`reportUrlIncludes`
 * phrases them); URLs past the per-ledger cap are logged and left the same
 * way, so no feed is ever partially ingested.
 */
function collectManagedIncludes(
  files: FileMap,
  reachable: readonly string[],
  origins: readonly string[],
  maxFeeds: number,
): PendingSource[] {
  const byUrl = new Map<string, PendingSource>();
  for (const file of reachable) {
    for (const { target, line } of extractIncludeDeclarations(files[file] ?? "")) {
      if (!isUrlIncludeTarget(target)) continue;
      const decision = parseManagedPriceUrl(target, origins);
      if (!decision.allowed) continue;
      const include = { file, line, target };
      const existing = byUrl.get(decision.url);
      if (existing) {
        existing.includes.push(include);
      } else if (byUrl.size >= maxFeeds) {
        log.warn("managed price feed cap reached; include left unresolved", {
          file,
          line,
          url: decision.url,
          maxFeeds,
        });
      } else {
        byUrl.set(decision.url, {
          url: decision.url,
          alias: decision.alias,
          includes: [include],
        });
      }
    }
  }
  return [...byUrl.values()];
}

/**
 * Write one source's virtual files under the engine's own key for each
 * include (`https:/host/...`, verified live against `@rustledger/wasm`
 * 0.24.0 and the same key `url-include-errors.ts` matches): the first key
 * carries the feed text, later distinct keys a placeholder comment so the
 * same URL included from several directories never multiplies entries. A
 * committed file already sitting on a key is the customer's own and is never
 * overwritten. Returns the keys written.
 */
function writeVirtualFiles(
  target: FileMap,
  includes: readonly ManagedPriceInclude[],
  text: string,
): string[] {
  const paths: string[] = [];
  for (const include of includes) {
    const key = resolveIncludeTarget(include.file, include.target);
    if (paths.includes(key) || Object.hasOwn(target, key)) continue;
    target[key] = paths.length === 0 ? text : MANAGED_PRICE_PLACEHOLDER;
    paths.push(key);
  }
  return paths;
}

/**
 * Resolve every managed price include reachable from `entryPoint` (the
 * loader's `sourceFiles` closure) and return the file map with the virtual
 * files added, plus per-source status. The input map is never mutated. A
 * source with no validated revision adds no file, so the engine reports the
 * include missing and `reportUrlIncludes` names it as unavailable.
 */
export async function overlayManagedPrices(
  files: FileMap,
  sourceFiles: readonly string[],
  deps: ManagedPriceFeedDeps,
  options: { refresh?: boolean } = {},
): Promise<ManagedPriceOverlay> {
  const sources = collectManagedIncludes(
    files,
    sourceFiles,
    deps.config.origins,
    deps.config.maxFeedsPerLedger,
  );
  if (sources.length === 0) {
    return { files, managedPrices: [], managedPricePaths: [] };
  }

  const now = deps.now ?? Date.now;
  // A manual refresh (ADR 015 §5) makes each feed due just before resolving
  // it, so the same load re-fetches it.
  const resolved = await Promise.all(
    sources.map(async (source) => {
      if (options.refresh) await requestManagedPriceRefresh(source.url, deps.cache);
      return resolveManagedPriceFeed(source.url, source.alias, deps);
    }),
  );
  const ledgerPairs = resolved.some((feed) => feed.blob !== null)
    ? collectLedgerPricePairs(files, sourceFiles)
    : new Set<string>();

  const overlaid: FileMap = { ...files };
  const managedPricePaths: string[] = [];
  const managedPrices = sources.map((source, index): ManagedPriceSource => {
    const { blob, head } = resolved[index];
    const effective = blob
      ? applyLedgerPricePrecedence(blob.text, blob.feed, ledgerPairs)
      : null;
    if (effective) {
      managedPricePaths.push(
        ...writeVirtualFiles(overlaid, source.includes, effective.text),
      );
    }
    return {
      url: source.url,
      alias: source.alias,
      includedFrom: source.includes,
      commodity: blob?.feed.commodity ?? null,
      quote: blob?.feed.quote ?? null,
      source: blob?.feed.source ?? null,
      revision: blob?.revision ?? null,
      etag: blob?.etag ?? null,
      observedAt: blob?.feed.latestObservedAt ?? null,
      fetchedAt: iso(blob?.fetchedAt ?? null),
      nextRefreshAt: iso(head.nextRefreshAt),
      freshness: blob
        ? managedPriceFreshness(
            blob.feed.latestObservedAt,
            now(),
            deps.config.staleMs,
          )
        : "unavailable",
      error: head.lastError,
      shadowedCount: effective?.shadowedCount ?? 0,
      effectiveDates: effective?.effectiveDates ?? [],
    };
  });

  return { files: overlaid, managedPrices, managedPricePaths };
}
