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
        latestPriceDate: (latest as string).slice(0, 10),
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

  it("turns stale a week after the newest price date even though the bytes are unchanged", async () => {
    const text = feedText([["2026-09-15", "1"]]);
    const clock = fakeClock(Date.parse("2026-09-22T23:59:59Z"));
    const { deps } = feedDeps([feedResponse(text)], clock);
    const files = { "main.bean": `include "${URL_BTC}"\n` };
    const [source] = (await overlay(files, deps)).managedPrices;
    expect(source).toMatchObject({
      observedAt: null,
      latestPriceDate: "2026-09-15",
      freshness: "recent",
    });
    clock.advance(1000);
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

  it.each(["2026-09-14", "2026/09/14", "2026-9-14", "2026/9/14", "2026/9-14"])(
    "lets a ledger price dated %s shadow the managed point (w1/163)",
    async (spelling) => {
      const text = feedText([
        ["2026-09-14", "76000"],
        ["2026-09-15", "77000"],
      ]);
      const { deps } = feedDeps([feedResponse(text)]);
      const files = { "main.bean": `include "${URL_BTC}"\n${spelling} price BTC 5 USD\n` };
      const out = await overlay(files, deps);
      expect(out.managedPrices[0].shadowedCount).toBe(1);
      expect(out.managedPrices[0].effectiveDates).toEqual(["2026-09-15"]);
    },
  );

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

  // w5/378: any price the ledger authors shadows the feed; text inside a
  // string never does. The CLI collector pins the same cases.
  it.each(["90000", "90000 * 1", "(90000 + 0)", "180000 / 2", "90,000.00"])(
    "reads a price whose amount is the expression %s",
    (amount) => {
      const pairs = collectLedgerPricePairs(
        { "a.bean": `2026-01-10 price BTC ${amount} USD\n` },
        ["a.bean"],
      );
      expect([...pairs]).toEqual(["2026-01-10\0BTC\0USD"]);
    },
  );

  it.each([
    [
      "a price-shaped line inside a multi-line string",
      '2026-01-09 note Assets:Crypto "pasted:\n2026-01-10 price BTC 1 USD\nend"\n',
      [],
    ],
    [
      "a quote inside a comment",
      '; she said "hold\n2026-01-10 price BTC 90000 USD\n',
      ["2026-01-10\0BTC\0USD"],
    ],
    // Beancount skips these lines whole, quotes and all, and the parse turns
    // them into comments for the engine (w21/654; rustledger alone opened a
    // string at the quote, w5/844), so the price after one is seen.
    [
      "a quote on an org heading (w21/654)",
      '* Prices for the 12" binder\n2026-09-10 price BTC 70000 USD\n2026-09-12 * "Later"\n',
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "a quote on a # line (w21/654)",
      '# Prices for the 12" binder\n2026-09-10 price BTC 70000 USD\n2026-09-12 * "Later"\n',
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "a quote on a % line (w5/844)",
      '% Prices for the 12" binder\n2026-09-10 price BTC 70000 USD\n2026-09-12 * "Later"\n',
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "a quote on a : line (w21/654)",
      ': Prices for the 12" binder\n2026-09-10 price BTC 70000 USD\n',
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "an org heading without a quote (w5/844)",
      "* Prices\n2026-09-10 price BTC 70000 USD\n",
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "a byte-order mark before the first line (w5/625)",
      "\uFEFF2026-09-10 price BTC 70000 USD\n",
      ["2026-09-10\0BTC\0USD"],
    ],
    [
      "an escaped quote inside a string",
      '2026-01-09 note Assets:Crypto "a \\" b\n2026-01-10 price BTC 1 USD\n"\n2026-01-11 price BTC 2 USD\n',
      ["2026-01-11\0BTC\0USD"],
    ],
  ])("reads only directives around %s", (_label, text, expected) => {
    const pairs = collectLedgerPricePairs({ "a.bean": text }, ["a.bean"]);
    expect([...pairs]).toEqual(expected);
  });

  // The engine now sees an authored price after a quoted heading (w21/654),
  // so it shadows the feed's point for that date, as any authored price does.
  it("shadows the feed's point with an authored price after a quoted heading", () => {
    const ledger =
      'include "feed.bean"\n* Prices for the 12" binder\n2026-09-10 price BTC 70000 USD\n' +
      '* Transactions\n2026-09-12 * "Later"\n  Assets:A  1 USD\n  Assets:B\n';
    const feed = "2026-09-10 price BTC 69000 USD\n2026-09-11 price BTC 69500 USD\n";
    const validation = validateManagedPriceText(feed);
    if (!validation.ok) throw new Error(validation.reason);

    const pairs = collectLedgerPricePairs({ "main.bean": ledger }, ["main.bean"]);
    const result = applyLedgerPricePrecedence(feed, validation.feed, pairs);

    expect(result.shadowedCount).toBe(1);
    expect(result.effectiveDates).toEqual(["2026-09-11"]);
  });

  it("normalises slash and unpadded ledger dates and skips impossible ones (w1/163)", () => {
    const pairs = collectLedgerPricePairs(
      {
        "a.bean":
          "2026/01/02 price X 5 USD\n2026-1-3 price X 6 USD\n2026/1-4 price X 7 USD\n2026/02/30 price X 8 USD\n",
      },
      ["a.bean"],
    );
    expect([...pairs].sort()).toEqual([
      "2026-01-02\0X\0USD",
      "2026-01-03\0X\0USD",
      "2026-01-04\0X\0USD",
    ]);
  });

  // An indented comment between a shadowed price and its metadata ended the
  // walk, leaving the metadata indented under nothing: the effective feed
  // failed to parse (w5/632).
  it("comments out every indented line of a shadowed point, past an indented comment", () => {
    const text =
      "; alias: K2\n; commodity: XC\n; quote: USD\n2026-10-15 price XC 10 USD\n" +
      '    ; provider note\n  observed-at: "2026-10-16T12:00:00Z"\n\n' +
      '2026-10-16 price XC 11 USD\n  observed-at: "2026-10-17T12:00:00Z"\n';
    const validation = validateManagedPriceText(text);
    if (!validation.ok) throw new Error(validation.reason);

    const result = applyLedgerPricePrecedence(
      text,
      validation.feed,
      collectLedgerPricePairs({ "a.bean": "2026-10-15 price XC 12 USD\n" }, ["a.bean"]),
    );

    const lines = result.text.split("\n");
    expect(lines).toHaveLength(text.split("\n").length);
    expect(lines.slice(3, 7)).toEqual([
      expect.stringMatching(/^;/u),
      "; ; provider note",
      '; observed-at: "2026-10-16T12:00:00Z"',
      "",
    ]);
    expect(lines.slice(7, 9)).toEqual(text.split("\n").slice(7, 9));
    expect(result).toMatchObject({ shadowedCount: 1, effectiveDates: ["2026-10-16"] });
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
  // Sunday 2026-11-15, just after midnight and just before the next one.
  const sundayEarly = Date.parse("2026-11-15T00:00:01Z");
  const sundayLate = Date.parse("2026-11-15T23:59:59Z");
  it("is recent for a price up to seven UTC days old, whatever the time of day", () => {
    expect(managedPriceFreshness("2026-11-15", sundayEarly)).toBe("recent");
    expect(managedPriceFreshness("2026-11-08", sundayEarly)).toBe("recent");
    expect(managedPriceFreshness("2026-11-08", sundayLate)).toBe("recent");
    expect(managedPriceFreshness("2026-11-07", sundayEarly)).toBe("stale");
  });
  it("keeps a daily equity or FX feed recent across a weekend and Easter", () => {
    // Friday's close is still the newest price on Sunday.
    expect(managedPriceFreshness("2026-11-13", sundayLate)).toBe("recent");
    // Good Friday and Easter Monday 2027 (26 and 29 March) close ECB fixings:
    // Thursday's rate is the newest until Tuesday's is published Wednesday.
    expect(
      managedPriceFreshness("2027-03-25", Date.parse("2027-03-31T03:00:00Z")),
    ).toBe("recent");
  });
  it("is stale without a readable date or more than a day ahead of today", () => {
    expect(managedPriceFreshness(null, sundayEarly)).toBe("stale");
    expect(managedPriceFreshness("garbage", sundayEarly)).toBe("stale");
    expect(managedPriceFreshness("2026-11-16", sundayLate)).toBe("recent");
    expect(managedPriceFreshness("2026-11-17", sundayLate)).toBe("stale");
    expect(managedPriceFreshness("2099-01-01", sundayLate)).toBe("stale");
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
