import { isIsoDate } from "@/foundation/rustledger/directive-filter";

/**
 * Fetch one managed price feed within hard bounds and accept only bodies that
 * are pure `price` directives with allowlisted metadata (ADR 015 sections 3
 * and 4). Nothing but prices can enter the engine through a URL: a single
 * transaction, `option`, `plugin`, or nested `include` rejects the whole body.
 */

export interface FetchManagedPriceFeedOptions {
  /** Last known ETag; sent as `If-None-Match` so an unchanged feed is a 304. */
  etag?: string | null;
  /**
   * `Cookie` header for a price route behind beancount.io's login gate,
   * already scoped to this URL by `managedPriceCookieFor`. Absent by default.
   */
  cookie?: string | null;
  timeoutMs: number;
  maxBodyBytes: number;
  fetchImpl?: typeof fetch;
}

type ManagedPriceFetchResult =
  | { kind: "not-modified" }
  | { kind: "fetched"; text: string; etag: string | null }
  | {
      kind: "failed";
      reason: "timeout" | "network" | "redirect" | "http" | "too-large" | "not-utf8";
      message: string;
    };

function failure(
  reason: Extract<ManagedPriceFetchResult, { kind: "failed" }>["reason"],
  message: string,
): ManagedPriceFetchResult {
  return { kind: "failed", reason, message };
}

/** Read a body up to `maxBytes`; `null` when it would exceed the cap. */
async function readCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Buffer | null> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

/**
 * GET a feed with a whole-exchange timeout, no redirects, and an incremental
 * byte cap. The request carries the URL, a static user agent, and nothing about
 * the ledger itself: no authorization header, and no cookie beyond the
 * caller's own credential relayed for beancount.io's login-gated price routes
 * (ADR 015 §3, amended by ADR 016 §7). Redirects are still refused, so that
 * cookie can never follow a hop to another host.
 */
export async function fetchManagedPriceFeed(
  url: string,
  options: FetchManagedPriceFeedOptions,
): Promise<ManagedPriceFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    accept: "text/plain",
    "user-agent": "beancount-ledger-v2 managed-prices",
  };
  if (options.etag) headers["if-none-match"] = options.etag;
  if (options.cookie) headers["cookie"] = options.cookie;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status === 304) return { kind: "not-modified" };
    if (response.status >= 300 && response.status < 400) {
      return failure(
        "redirect",
        `redirects are not followed (HTTP ${response.status})`,
      );
    }
    if (response.status !== 200) {
      const retryAfter = response.headers.get("retry-after");
      return failure(
        "http",
        retryAfter
          ? `HTTP ${response.status} (retry after ${retryAfter})`
          : `HTTP ${response.status}`,
      );
    }
    if (!response.body) return failure("network", "empty response body");
    const bytes = await readCapped(response.body, options.maxBodyBytes);
    if (bytes === null) {
      return failure("too-large", `body exceeds ${options.maxBodyBytes} bytes`);
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return failure("not-utf8", "body is not valid UTF-8");
    }
    return { kind: "fetched", text, etag: response.headers.get("etag") };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError");
    if (aborted) {
      return failure("timeout", `timed out after ${options.timeoutMs} ms`);
    }
    return failure(
      "network",
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Metadata keys a managed feed may attach to a price (PRFAQ002 FAQ 12). */
const MANAGED_PRICE_METADATA_KEYS: ReadonlySet<string> = new Set([
  "price-source",
  "price-kind",
  "observed-at",
  "provisional",
]);

/** Header comments (`; key: value`) the validator records when present. */
const HEADER_KEYS = new Set(["alias", "commodity", "quote", "source", "revision"]);

const COMMENT_RE = /^\s*;/u;
const HEADER_RE = /^;\s*([a-z][a-z0-9_-]*)\s*:\s*(.+?)\s*$/u;
const PRICE_RE =
  /^(\d{4}-\d{2}-\d{2})\s+price\s+([A-Z][A-Z0-9'._-]*)\s+([0-9]+(?:\.[0-9]+)?)\s+([A-Z][A-Z0-9'._-]*)\s*(?:;.*)?$/u;
const METADATA_RE = /^[ \t]+([a-z][A-Za-z0-9_-]*)\s*:\s*(.*?)\s*$/u;
const METADATA_VALUE_RE =
  /^(?:"[^"\\]*"|TRUE|FALSE|\d{4}-\d{2}-\d{2}|-?[0-9]+(?:\.[0-9]+)?)$/u;
const MAX_COMMODITY_LENGTH = 24;
const MAX_NUMBER_LENGTH = 40;

interface ManagedPriceDirective {
  /** 1-based line of the `price` directive inside the feed text. */
  line: number;
  date: string;
  base: string;
  quote: string;
  observedAt: string | null;
}

export interface ManagedPriceFeedSummary {
  alias: string | null;
  commodity: string;
  quote: string;
  source: string | null;
  revision: string | null;
  /** The latest `observed-at` across every price, as the feed wrote it. */
  latestObservedAt: string | null;
  prices: ManagedPriceDirective[];
}

export type ManagedPriceValidation =
  | { ok: true; feed: ManagedPriceFeedSummary }
  | { ok: false; reason: string; line: number | null };

const unquote = (value: string): string =>
  value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;

/**
 * Validate a feed body against the price-only grammar. Every non-blank line
 * must be a comment, a `price` directive, or an indented allowlisted metadata
 * line attached to the preceding price. All directives must share one
 * commodity pair, which must agree with the header when the header names it.
 */
export function validateManagedPriceText(text: string): ManagedPriceValidation {
  const headers = new Map<string, string>();
  const prices: ManagedPriceDirective[] = [];
  let current: ManagedPriceDirective | null = null;
  const lines = text.split(/\r\n|\r|\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    if (line.trim() === "") continue;

    if (COMMENT_RE.test(line)) {
      const header = HEADER_RE.exec(line);
      if (header && HEADER_KEYS.has(header[1]) && !headers.has(header[1])) {
        headers.set(header[1], header[2]);
      }
      continue;
    }

    const price = PRICE_RE.exec(line);
    if (price) {
      const [, date, base, number, quote] = price;
      if (!isIsoDate(date)) {
        return { ok: false, reason: `invalid date ${date}`, line: lineNumber };
      }
      if (
        base.length > MAX_COMMODITY_LENGTH ||
        quote.length > MAX_COMMODITY_LENGTH
      ) {
        return { ok: false, reason: "commodity name too long", line: lineNumber };
      }
      if (number.length > MAX_NUMBER_LENGTH || Number(number) <= 0) {
        return {
          ok: false,
          reason: `price must be a finite positive decimal (got ${number})`,
          line: lineNumber,
        };
      }
      if (base === quote) {
        return {
          ok: false,
          reason: `price quotes ${base} in itself`,
          line: lineNumber,
        };
      }
      current = { line: lineNumber, date, base, quote, observedAt: null };
      prices.push(current);
      continue;
    }

    const metadata = METADATA_RE.exec(line);
    if (metadata) {
      const [, key, value] = metadata;
      if (current === null) {
        return {
          ok: false,
          reason: "metadata without a preceding price directive",
          line: lineNumber,
        };
      }
      if (!MANAGED_PRICE_METADATA_KEYS.has(key)) {
        return {
          ok: false,
          reason: `metadata key ${key} is not allowed in a price feed`,
          line: lineNumber,
        };
      }
      if (!METADATA_VALUE_RE.test(value)) {
        return {
          ok: false,
          reason: `metadata value for ${key} is not a string, boolean, date, or number`,
          line: lineNumber,
        };
      }
      if (key === "observed-at") current.observedAt = unquote(value);
      continue;
    }

    return {
      ok: false,
      reason: "only price directives, their metadata, and comments are allowed",
      line: lineNumber,
    };
  }

  if (prices.length === 0) {
    return { ok: false, reason: "no price directives", line: null };
  }
  const { base, quote } = prices[0];
  const mixed = prices.find((p) => p.base !== base || p.quote !== quote);
  if (mixed) {
    return {
      ok: false,
      reason: `mixed commodity pairs (${base}/${quote} and ${mixed.base}/${mixed.quote})`,
      line: mixed.line,
    };
  }
  const headerCommodity = headers.get("commodity");
  if (headerCommodity !== undefined && headerCommodity !== base) {
    return {
      ok: false,
      reason: `header commodity ${headerCommodity} does not match price directives (${base})`,
      line: null,
    };
  }
  const headerQuote = headers.get("quote");
  if (headerQuote !== undefined && headerQuote !== quote) {
    return {
      ok: false,
      reason: `header quote ${headerQuote} does not match price directives (${quote})`,
      line: null,
    };
  }

  let latestObservedAt: string | null = null;
  let latestTime = -Infinity;
  for (const price of prices) {
    if (price.observedAt === null) continue;
    const time = Date.parse(price.observedAt);
    if (Number.isFinite(time) && time > latestTime) {
      latestTime = time;
      latestObservedAt = price.observedAt;
    }
  }

  return {
    ok: true,
    feed: {
      alias: headers.get("alias") ?? null,
      commodity: base,
      quote,
      source: headers.get("source") ?? null,
      revision: headers.get("revision") ?? null,
      latestObservedAt,
      prices,
    },
  };
}
