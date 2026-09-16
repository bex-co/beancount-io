import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DirectiveJson, FileMap } from "@rustledger/wasm";
import { collectSourceFiles } from "@/foundation/rustledger/file-map-loader";
import {
  applyLedgerPricePrecedence,
  assertNotManagedPricePath,
  collectLedgerPricePairs,
  managedPriceDirectiveMatcher,
  managedPriceFreshness,
  MANAGED_PRICE_PLACEHOLDER,
  overlayManagedPrices,
} from "../managed-price-overlay";
import { validateManagedPriceText } from "../managed-price-feed";
import type { ManagedPriceFeedDeps } from "../managed-price-cache";
import { fakeClock, feedDeps, feedResponse, feedText, TEST_CONFIG } from "./test-support";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "btcusd.feed.txt"),
  "utf8",
);
const URL_BTC = "https://beancount.io/prices/BTC-USD";
const KEY_BTC = "https:/beancount.io/prices/BTC-USD";

const overlay = (files: FileMap, deps: ManagedPriceFeedDeps) =>
  overlayManagedPrices(files, collectSourceFiles(files, "main.bean"), deps);

const price = (date: string, base: string, quote: string): DirectiveJson =>
  ({
    type: "price",
    date,
    currency: base,
    amount: { number: "1", currency: quote },
  }) as DirectiveJson;

describe("overlayManagedPrices", () => {
  it("adds the feed under the engine key and reports a recent source", async () => {
    const latest = /observed-at: "([^"]+)"\s*\n\s*provisional: TRUE/u.exec(
      FIXTURE,
    )?.[1];
    expect(latest).toBeDefined();
    const clock = fakeClock(Date.parse(latest as string) + 60_000);
    const { deps, calls } = feedDeps([feedResponse(FIXTURE, '"e1"')], clock);
    const files = {
      "main.bean": `2020-01-01 open Assets:BTC BTC\ninclude "${URL_BTC}"\n`,
    };
    const out = await overlay(files, deps);

    expect(calls.map((c) => c.url)).toEqual([URL_BTC]);
    expect(Object.keys(out.files).sort()).toEqual([KEY_BTC, "main.bean"]);
    expect(out.files[KEY_BTC]).toBe(FIXTURE);
    expect(out.managedPricePaths).toEqual([KEY_BTC]);
    expect(out.managedPrices).toEqual([
      {
        url: URL_BTC,
        alias: "BTC-USD",
        includedFrom: [{ file: "main.bean", line: 2, target: URL_BTC }],
        commodity: "BTC",
        quote: "USD",
        source: "binance.us",
        revision: "e1",
        etag: '"e1"',
        observedAt: latest,
        fetchedAt: new Date(clock.now()).toISOString(),
        nextRefreshAt: new Date(clock.now() + TEST_CONFIG.refreshMs).toISOString(),
        freshness: "recent",
        error: null,
        shadowedCount: 0,
        effectiveDates: expect.any(Array),
      },
    ]);
    expect(out.managedPrices[0].effectiveDates.length).toBeGreaterThan(50);
    // The input map is untouched.
    expect(Object.keys(files)).toEqual(["main.bean"]);
  });

  it("turns stale as the clock advances even though the bytes are unchanged", async () => {
    const text = feedText([["2026-09-15", "1", "2026-09-15T08:00:00Z"]]);
    const clock = fakeClock(Date.parse("2026-09-15T08:05:00Z"));
    const { deps } = feedDeps([feedResponse(text)], clock);
    const files = { "main.bean": `include "${URL_BTC}"\n` };
    expect((await overlay(files, deps)).managedPrices[0].freshness).toBe("recent");
    clock.advance(TEST_CONFIG.staleMs);
    expect((await overlay(files, deps)).managedPrices[0].freshness).toBe("stale");
  });

  it("lets a same-date ledger price or its reciprocal win, line-preserving", async () => {
    const text = feedText([
      ["2026-09-14", "76000", "2026-09-14T23:59:59Z"],
      ["2026-09-15", "77000", "2026-09-15T08:00:00Z"],
    ]);
    const { deps } = feedDeps([feedResponse(text)]);
    const files = {
      "main.bean": `include "${URL_BTC}"\n2026-09-15 price USD 0.00001 BTC\ninclude "prices.bean"\n`,
      "prices.bean": "2026-09-14 price BTC 1 USD\n",
    };
    const out = await overlay(files, deps);
    const virtual = out.files[KEY_BTC].split("\n");
    expect(virtual).toHaveLength(text.split("\n").length);
    expect(virtual.filter((line) => /^\d{4}-\d{2}-\d{2} price/u.test(line))).toEqual([]);
    expect(virtual.filter((line) => line.startsWith("; shadowed"))).toHaveLength(2);
    expect(virtual.filter((line) => line.startsWith("; price-source"))).toHaveLength(2);
    expect(out.managedPrices[0].shadowedCount).toBe(2);
    expect(out.managedPrices[0].effectiveDates).toEqual([]);
  });

  it("does not shadow a managed price on a date the ledger does not price", async () => {
    const text = feedText([
      ["2026-09-14", "76000"],
      ["2026-09-15", "77000"],
    ]);
    const { deps } = feedDeps([feedResponse(text)]);
    const files = {
      "main.bean": `include "${URL_BTC}"\n2026-09-13 price BTC 1 USD\n2026-09-15 price ETH 1 USD\n`,
    };
    const out = await overlay(files, deps);
    expect(out.files[KEY_BTC]).toBe(text);
    expect(out.managedPrices[0].shadowedCount).toBe(0);
    expect(out.managedPrices[0].effectiveDates).toEqual(["2026-09-14", "2026-09-15"]);
  });

  it("identifies exactly the directives the feed contributed", async () => {
    const text = feedText([
      ["2026-09-13", "75000"],
      ["2026-09-14", "76000"],
      ["2026-09-15", "77000"],
    ]);
    const { deps } = feedDeps([feedResponse(text)]);
    const files = {
      "main.bean": `include "${URL_BTC}"\n2026-09-14 price BTC 1 USD\n2026-09-12 price BTC 2 USD\n2026-09-15 price ETH 3 USD\n`,
    };
    const out = await overlay(files, deps);
    expect(out.managedPrices[0].effectiveDates).toEqual(["2026-09-13", "2026-09-15"]);
    const isManaged = managedPriceDirectiveMatcher(out.managedPrices);
    expect(isManaged).not.toBeNull();
    if (!isManaged) return;
    expect(isManaged(price("2026-09-13", "BTC", "USD"))).toBe(true);
    expect(isManaged(price("2026-09-15", "BTC", "USD"))).toBe(true);
    // The ledger's own prices: same pair on a shadowed date, another date, another pair.
    expect(isManaged(price("2026-09-14", "BTC", "USD"))).toBe(false);
    expect(isManaged(price("2026-09-12", "BTC", "USD"))).toBe(false);
    expect(isManaged(price("2026-09-15", "ETH", "USD"))).toBe(false);
    expect(isManaged(price("2026-09-15", "USD", "BTC"))).toBe(false);
    expect(isManaged({ type: "open", date: "2026-09-15", account: "Assets:A", currencies: [] } as DirectiveJson)).toBe(false);
  });

  it("has no matcher when no feed contributed anything", async () => {
    expect(managedPriceDirectiveMatcher([])).toBeNull();
    const { deps } = feedDeps([feedResponse("down", null, 503)]);
    const out = await overlay({ "main.bean": `include "${URL_BTC}"\n` }, deps);
    expect(managedPriceDirectiveMatcher(out.managedPrices)).toBeNull();
  });

  it("materializes one feed and a placeholder when the same URL is included from two directories", async () => {
    const text = feedText([["2026-09-15", "1"]]);
    const { deps, calls } = feedDeps([feedResponse(text)]);
    const files = {
      "main.bean": `include "${URL_BTC}"\ninclude "sub/x.bean"\n`,
      "sub/x.bean": `include "${URL_BTC}"\n`,
    };
    const out = await overlay(files, deps);
    expect(calls).toHaveLength(1);
    expect(out.files[KEY_BTC]).toBe(text);
    expect(out.files[`sub/${KEY_BTC}`]).toBe(MANAGED_PRICE_PLACEHOLDER);
    expect(out.managedPricePaths.sort()).toEqual([KEY_BTC, `sub/${KEY_BTC}`]);
    expect(out.managedPrices[0].includedFrom).toHaveLength(2);
  });

  it("adds no file and reports unavailable when the feed never validated", async () => {
    const { deps } = feedDeps([feedResponse("down", null, 503)]);
    const files = { "main.bean": `include "${URL_BTC}"\n` };
    const out = await overlay(files, deps);
    expect(out.files).toEqual(files);
    expect(out.managedPricePaths).toEqual([]);
    expect(out.managedPrices[0]).toMatchObject({
      freshness: "unavailable",
      revision: null,
      error: "fetch failed (http): HTTP 503",
      effectiveDates: [],
    });
  });

  it("ignores disallowed URLs and unreachable files without fetching", async () => {
    const { deps, calls } = feedDeps([]);
    const files = {
      "main.bean":
        'include "https://example.com/prices/BTC-USD"\ninclude "https://beancount.io/prices/BTC-USD?x=1"\n',
      "scratch.bean": `include "${URL_BTC}"\n`,
    };
    const out = await overlay(files, deps);
    expect(calls).toHaveLength(0);
    expect(out.managedPrices).toEqual([]);
    expect(out.files).toBe(files);
  });

  it("caps the number of feeds per ledger", async () => {
    const text = feedText([["2026-09-15", "1"]]);
    const { deps, calls } = feedDeps([feedResponse(text), feedResponse(text)]);
    const files = {
      "main.bean": [
        'include "https://beancount.io/prices/A"',
        'include "https://beancount.io/prices/B"',
        'include "https://beancount.io/prices/C"',
      ].join("\n"),
    };
    const out = await overlay(files, {
      ...deps,
      config: { ...TEST_CONFIG, maxFeedsPerLedger: 2 },
    });
    expect(calls).toHaveLength(2);
    expect(out.managedPrices.map((s) => s.alias)).toEqual(["A", "B"]);
    expect(Object.keys(out.files)).not.toContain("https:/beancount.io/prices/C");
  });

  it("never overwrites a committed file that already sits on the engine key", async () => {
    const text = feedText([["2026-09-15", "1"]]);
    const { deps } = feedDeps([feedResponse(text)]);
    const files = {
      "main.bean": `include "${URL_BTC}"\n`,
      [KEY_BTC]: "; the customer's own file\n",
    };
    const out = await overlay(files, deps);
    expect(out.files[KEY_BTC]).toBe("; the customer's own file\n");
    expect(out.managedPricePaths).toEqual([]);
  });
});

describe("precedence helpers", () => {
  it("collects (date, base, quote) from price lines only", () => {
    const pairs = collectLedgerPricePairs(
      {
        "a.bean": '2026-01-01 price BTC 1 USD\n2026-01-02 * "x"\n  Assets:A 1 USD\n',
        "b.bean": "2026-01-03 price ETH 2 EUR ; c\n  ; 2026-01-04 price ETH 2 EUR\n",
      },
      ["a.bean", "b.bean", "missing.bean"],
    );
    expect([...pairs].sort()).toEqual([
      "2026-01-01\0BTC\0USD",
      "2026-01-03\0ETH\0EUR",
    ]);
  });

  it("returns the text untouched when nothing is shadowed", () => {
    const text = feedText([["2026-09-15", "1"]]);
    const validation = validateManagedPriceText(text);
    if (!validation.ok) throw new Error(validation.reason);
    expect(applyLedgerPricePrecedence(text, validation.feed, new Set())).toEqual({
      text,
      shadowedCount: 0,
      effectiveDates: ["2026-09-15"],
    });
  });
});

describe("managedPriceFreshness", () => {
  const now = Date.parse("2026-09-15T08:30:00Z");
  it("is recent within the window, stale beyond it or without a timestamp", () => {
    expect(managedPriceFreshness("2026-09-15T08:21:00Z", now, 600_000)).toBe("recent");
    expect(managedPriceFreshness("2026-09-15T08:19:59Z", now, 600_000)).toBe("stale");
    expect(managedPriceFreshness(null, now, 600_000)).toBe("stale");
    expect(managedPriceFreshness("garbage", now, 600_000)).toBe("stale");
  });
});

describe("assertNotManagedPricePath", () => {
  it("refuses a virtual key with a precise read-only error and passes anything else", () => {
    expect(() => assertNotManagedPricePath("main.bean", [KEY_BTC])).not.toThrow();
    expect(() => assertNotManagedPricePath(KEY_BTC, [])).not.toThrow();
    expect(() => assertNotManagedPricePath(KEY_BTC, [KEY_BTC])).toThrow(
      `Operation 'edit managed price source' not allowed: ${KEY_BTC} is a managed price feed resolved from a URL include and is read-only`,
    );
  });
});
