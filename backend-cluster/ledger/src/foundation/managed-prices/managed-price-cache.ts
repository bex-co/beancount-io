import type { ManagedPricesConfig } from "@/config";
import { sliceSha256 } from "@/foundation/rustledger/source-slice";
import { CACHE_KEYS, TTL, type CacheHelper } from "@/shared/cache";
import { lock } from "@/shared/lock";
import { logger } from "@/shared/logger";
import {
  fetchManagedPriceFeed,
  validateManagedPriceText,
  type ManagedPriceFeedSummary,
  type ManagedPriceValidation,
} from "./managed-price-feed";

const log = logger.child({ module: "managed-prices" });
const FEED_LOCK_PREFIX = "managed-price:";

/**
 * Feed cache for managed price includes (ADR 015 section 5): an immutable
 * blob per validated revision plus a small mutable head per URL. Refresh is
 * driven by `head.nextRefreshAt` (time stamps), never by key expiry, and a
 * failed or invalid refresh only records the error while the previous
 * revision keeps serving. Concurrent loads for one URL share a single fetch
 * through the process lock, across every ledger on the node.
 */

interface PriceFeedBlob {
  url: string;
  revision: string;
  etag: string | null;
  text: string;
  /** Epoch ms of the fetch that produced these bytes. */
  fetchedAt: number;
  feed: ManagedPriceFeedSummary;
}

export interface PriceFeedHead {
  /** The revision currently serving; null until one validates. */
  revision: string | null;
  /** Epoch ms after which the next load re-fetches. */
  nextRefreshAt: number;
  /** Why the last refresh failed, cleared by the next success. */
  lastError: string | null;
}

export interface ManagedPriceFeedDeps {
  cache: CacheHelper;
  config: ManagedPricesConfig;
  /** Injectable clock (epoch ms) so tests control refresh windows. */
  now?: () => number;
  fetchImpl?: typeof fetch;
}

export interface ResolvedManagedPriceFeed {
  /** The revision now serving, or null when none has ever validated. */
  blob: PriceFeedBlob | null;
  head: PriceFeedHead;
}

/** Stable, key-safe identity for a canonical feed URL. */
export function managedPriceUrlHash(url: string): string {
  return sliceSha256(url).slice(0, 32);
}

/**
 * The revision id for a fetched body: the server's strong ETag when it sends
 * one (sanitized to key-safe characters), else the body's own SHA-256.
 */
function revisionFor(etag: string | null, text: string): string {
  if (etag) {
    const safe = etag
      .replace(/^W\//u, "")
      .replace(/"/gu, "")
      .replace(/[^A-Za-z0-9._-]/gu, "");
    if (safe.length > 0 && safe.length <= 128) return safe;
  }
  return sliceSha256(text);
}

/** `BTC-USD`, `BTC-USD`, and `btc_usd` name the same instrument. */
const canonicalAlias = (alias: string): string =>
  alias.replace(/[^A-Za-z0-9]/gu, "").toUpperCase();

/**
 * A body that parses as prices can still be the wrong instrument: reject a
 * feed whose header alias disagrees with the URL (ignoring case and
 * separators), or whose commodity pair differs from the revision it would
 * replace (PRFAQ002 FAQ 6 and 14).
 */
function checkIdentity(
  validation: ManagedPriceValidation,
  alias: string,
  previous: PriceFeedBlob | null,
): ManagedPriceValidation {
  if (!validation.ok) return validation;
  const { feed } = validation;
  if (
    feed.alias !== null &&
    canonicalAlias(feed.alias) !== canonicalAlias(alias)
  ) {
    return {
      ok: false,
      reason: `feed alias ${feed.alias} does not match the requested ${alias}`,
      line: null,
    };
  }
  if (
    previous &&
    (previous.feed.commodity !== feed.commodity ||
      previous.feed.quote !== feed.quote)
  ) {
    return {
      ok: false,
      reason: `commodity pair changed from ${previous.feed.commodity}/${previous.feed.quote} to ${feed.commodity}/${feed.quote}`,
      line: null,
    };
  }
  return validation;
}

const EMPTY_HEAD: PriceFeedHead = {
  revision: null,
  nextRefreshAt: 0,
  lastError: null,
};

async function readBlob(
  cache: CacheHelper,
  urlHash: string,
  head: PriceFeedHead,
): Promise<PriceFeedBlob | null> {
  if (head.revision === null) return null;
  const blob = await cache.get<PriceFeedBlob>(
    CACHE_KEYS.ledger.priceFeedBlob(urlHash, head.revision),
  );
  return blob ?? null;
}

/**
 * Whether the cached state answers a load without a fetch: the refresh window
 * is still open, and either the blob is present or no revision has ever
 * validated (a head recording a failure inside its retry window). A head
 * whose blob was evicted falls through to a fetch instead of reporting nothing.
 */
function servable(
  head: PriceFeedHead,
  blob: PriceFeedBlob | null,
  now: number,
): boolean {
  return now < head.nextRefreshAt && (blob !== null || head.revision === null);
}

/**
 * Serve the feed at `url` from the cache, refreshing it when its window has
 * elapsed. Never throws for a feed problem: every failure is recorded on the
 * head and the caller receives whatever revision last validated.
 */
export async function resolveManagedPriceFeed(
  url: string,
  alias: string,
  deps: ManagedPriceFeedDeps,
): Promise<ResolvedManagedPriceFeed> {
  const { cache, config } = deps;
  const now = deps.now ?? Date.now;
  const urlHash = managedPriceUrlHash(url);
  const headKey = CACHE_KEYS.ledger.priceFeedHead(urlHash);

  const head = (await cache.get<PriceFeedHead>(headKey)) ?? EMPTY_HEAD;
  if (now() < head.nextRefreshAt) {
    const blob = await readBlob(cache, urlHash, head);
    if (servable(head, blob, now())) return { blob, head };
  }

  return lock.acquire(`${FEED_LOCK_PREFIX}${urlHash}`, async () => {
    // Another waiter may have refreshed while this one queued.
    const current = (await cache.get<PriceFeedHead>(headKey)) ?? EMPTY_HEAD;
    const previous = await readBlob(cache, urlHash, current);
    if (servable(current, previous, now())) {
      return { blob: previous, head: current };
    }

    const result = await fetchManagedPriceFeed(url, {
      etag: previous?.etag ?? null,
      timeoutMs: config.fetchTimeoutMs,
      maxBodyBytes: config.maxBodyBytes,
      fetchImpl: deps.fetchImpl,
    });
    const at = now();

    if (result.kind === "not-modified" && previous) {
      const refreshed: PriceFeedHead = {
        revision: previous.revision,
        nextRefreshAt: at + config.refreshMs,
        lastError: null,
      };
      await cache.set(headKey, refreshed, TTL.HOUR_24);
      log.debug("managed price feed unchanged", { url, revision: previous.revision });
      return { blob: previous, head: refreshed };
    }

    let message: string;
    if (result.kind === "fetched") {
      const validation = checkIdentity(
        validateManagedPriceText(result.text),
        alias,
        previous,
      );
      if (validation.ok) {
        const revision = revisionFor(result.etag, result.text);
        const blob: PriceFeedBlob = {
          url,
          revision,
          etag: result.etag,
          text: result.text,
          fetchedAt: at,
          feed: validation.feed,
        };
        const refreshed: PriceFeedHead = {
          revision,
          nextRefreshAt: at + config.refreshMs,
          lastError: null,
        };
        // The blob must exist before the head points at it; the superseded
        // blob can go while the head is written.
        await cache.set(
          CACHE_KEYS.ledger.priceFeedBlob(urlHash, revision),
          blob,
          TTL.HOUR_24,
        );
        await Promise.all([
          cache.set(headKey, refreshed, TTL.HOUR_24),
          previous && previous.revision !== revision
            ? cache.del(CACHE_KEYS.ledger.priceFeedBlob(urlHash, previous.revision))
            : Promise.resolve(),
        ]);
        log.info("managed price feed refreshed", {
          url,
          revision,
          prices: validation.feed.prices.length,
          latestObservedAt: validation.feed.latestObservedAt,
        });
        return { blob, head: refreshed };
      }
      message =
        validation.line === null
          ? `invalid feed: ${validation.reason}`
          : `invalid feed at line ${validation.line}: ${validation.reason}`;
    } else if (result.kind === "not-modified") {
      message = "server answered 304 without a cached revision to reuse";
    } else {
      message = `fetch failed (${result.reason}): ${result.message}`;
    }

    const degraded: PriceFeedHead = {
      revision: current.revision,
      nextRefreshAt: at + config.retryMs,
      lastError: message,
    };
    await cache.set(headKey, degraded, TTL.HOUR_24);
    log.warn("managed price feed refresh failed; serving the last revision", {
      url,
      previousRevision: previous?.revision ?? null,
      message,
    });
    return { blob: previous, head: degraded };
  });
}
