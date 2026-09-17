import { createCache } from "cache-manager";
import type { ManagedPricesConfig } from "@/config";
import { createCacheHelper, type CacheHelper } from "@/shared/cache";
import type { ManagedPriceFeedDeps } from "../managed-price-cache";

/** The same in-memory store production uses by default (`build-cache.ts`). */
export function memoryCache(): CacheHelper {
  return createCacheHelper(createCache());
}

export const TEST_CONFIG: ManagedPricesConfig = {
  origins: ["https://beancount.io"],
  refreshMs: 5 * 60 * 1000,
  retryMs: 60 * 1000,
  staleMs: 10 * 60 * 1000,
  fetchTimeoutMs: 1000,
  maxBodyBytes: 1024 * 1024,
  maxFeedsPerLedger: 16,
  gatedPriceHost: "beancount.io",
  gatedPriceCookieName: "authSess:beancount.io",
};

/** A controllable clock starting at a fixed instant. */
export function fakeClock(start = Date.parse("2026-09-15T08:30:00Z")) {
  let current = start;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
    },
  };
}

/** A scripted fetch: each call shifts the next response (or throws). */
export function scriptedFetch(
  responses: Array<Response | Error | (() => Response)>,
): { fetchImpl: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (next === undefined) throw new Error("unexpected fetch");
    if (next instanceof Error) throw next;
    return typeof next === "function" ? next() : next;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

/** Cache, clock, and scripted fetch composed into overlay/cache deps. */
export function feedDeps(
  responses: Parameters<typeof scriptedFetch>[0],
  clock = fakeClock(),
): {
  deps: ManagedPriceFeedDeps;
  cache: CacheHelper;
  calls: ReturnType<typeof scriptedFetch>["calls"];
  clock: ReturnType<typeof fakeClock>;
} {
  const cache = memoryCache();
  const { fetchImpl, calls } = scriptedFetch(responses);
  return {
    deps: { cache, config: TEST_CONFIG, now: clock.now, fetchImpl },
    cache,
    calls,
    clock,
  };
}

export function feedResponse(
  text: string,
  etag: string | null = '"etag-1"',
  status = 200,
): Response {
  // A 304 (or 204) response cannot carry a body, even an empty string.
  return new Response(status === 304 || status === 204 ? null : text, {
    status,
    headers: etag ? { etag, "content-type": "text/plain" } : {},
  });
}

export function feedText(
  points: Array<[string, string, string?]>,
  header: { commodity?: string; quote?: string; revision?: string } = {},
): string {
  const commodity = header.commodity ?? "BTC";
  const quote = header.quote ?? "USD";
  const lines = [
    `; alias: ${commodity}${quote}`,
    `; commodity: ${commodity}`,
    `; quote: ${quote}`,
    "; source: test",
    `; revision: ${header.revision ?? "r1"}`,
    "",
  ];
  for (const [date, price, observedAt] of points) {
    lines.push(`${date} price ${commodity} ${price} ${quote}`);
    lines.push('  price-source: "test"');
    if (observedAt) lines.push(`  observed-at: "${observedAt}"`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
