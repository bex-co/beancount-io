import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  fetchManagedPriceFeed,
  validateManagedPriceText,
} from "../managed-price-feed";

const FIXTURE = readFileSync(
  join(__dirname, "fixtures", "btcusd.feed.txt"),
  "utf8",
);

const GOOD = `; commodity: BTC
; quote: USD
; source: example
; revision: r1

2026-09-14 price BTC 76000.00 USD
  price-source: "example"
  price-kind: "daily-close"
  observed-at: "2026-09-14T23:59:59Z"
  provisional: FALSE

2026-09-15 price BTC 76841.85 USD
  observed-at: "2026-09-15T08:29:24Z"
  provisional: TRUE
`;

describe("validateManagedPriceText", () => {
  it("accepts the real BTC-USD feed and summarizes it", () => {
    const result = validateManagedPriceText(FIXTURE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feed).toMatchObject({
      alias: "BTCUSD",
      commodity: "BTC",
      quote: "USD",
      source: "binance.us",
    });
    expect(result.feed.revision).toMatch(/^btcusd-\d{8}T\d{6}Z$/u);
    expect(result.feed.prices.length).toBeGreaterThan(50);
    expect(result.feed.latestObservedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
    const last = result.feed.prices[result.feed.prices.length - 1];
    expect(last.observedAt).toBe(result.feed.latestObservedAt);
  });

  it("records each price's line so precedence can address it", () => {
    const result = validateManagedPriceText(GOOD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feed.prices.map((p) => [p.line, p.date])).toEqual([
      [6, "2026-09-14"],
      [12, "2026-09-15"],
    ]);
    expect(result.feed.latestObservedAt).toBe("2026-09-15T08:29:24Z");
  });

  it.each([
    ["a transaction", '2026-09-15 * "Coffee"\n  Assets:Cash -1 USD\n  Expenses:Food 1 USD\n', 1],
    ["an open", "2026-09-15 open Assets:Cash USD\n", 1],
    ["an option", 'option "operating_currency" "EUR"\n', 1],
    ["a plugin", 'plugin "beancount.plugins.auto"\n', 1],
    ["a nested include", 'include "other.bean"\n', 1],
    ["a pushtag", "pushtag #x\n", 1],
    ["an unknown metadata key", "2026-09-15 price BTC 1 USD\n  note: \"x\"\n", 2],
    ["a metadata value that is not a literal", '2026-09-15 price BTC 1 USD\n  price-source: Assets:Cash\n', 2],
    ["a zero price", "2026-09-15 price BTC 0 USD\n", 1],
    ["a negative price", "2026-09-15 price BTC -5 USD\n", 1],
    ["exponent notation", "2026-09-15 price BTC 1e5 USD\n", 1],
    ["an impossible date", "2026-02-30 price BTC 1 USD\n", 1],
    ["a self-quote", "2026-09-15 price USD 1 USD\n", 1],
    ["mixed pairs", "2026-09-15 price BTC 1 USD\n2026-09-15 price ETH 1 USD\n", 2],
  ])("rejects %s", (_label, text, line) => {
    const result = validateManagedPriceText(`${GOOD}${text}`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.line).toBe(GOOD.split("\n").length - 1 + line);
  });

  it("rejects metadata that precedes any price directive", () => {
    expect(
      validateManagedPriceText('  provisional: TRUE\n2026-09-15 price BTC 1 USD\n'),
    ).toMatchObject({
      ok: false,
      reason: "metadata without a preceding price directive",
      line: 1,
    });
  });

  it("rejects an empty or comment-only body", () => {
    expect(validateManagedPriceText("")).toMatchObject({
      ok: false,
      reason: "no price directives",
    });
    expect(validateManagedPriceText("; nothing here\n\n")).toMatchObject({
      ok: false,
      reason: "no price directives",
    });
  });

  it("rejects a body whose header names a different pair than its directives", () => {
    expect(
      validateManagedPriceText(
        "; commodity: ETH\n; quote: USD\n2026-09-15 price BTC 1 USD\n",
      ),
    ).toMatchObject({ ok: false, reason: expect.stringContaining("header commodity ETH") });
    expect(
      validateManagedPriceText(
        "; commodity: BTC\n; quote: EUR\n2026-09-15 price BTC 1 USD\n",
      ),
    ).toMatchObject({ ok: false, reason: expect.stringContaining("header quote EUR") });
  });

  it("accepts a bare feed with no header comments and no metadata", () => {
    const result = validateManagedPriceText("2026-09-15 price BTC 1.5 USD\n");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.feed).toMatchObject({
      alias: null,
      source: null,
      revision: null,
      latestObservedAt: null,
    });
    expect(result.feed.prices).toHaveLength(1);
  });
});

function response(
  status: number,
  body: string | null,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, { status, headers });
}

describe("fetchManagedPriceFeed", () => {
  const options = { timeoutMs: 1000, maxBodyBytes: 1024 };

  it("sends a plain GET with If-None-Match and returns the text and ETag", async () => {
    const fetchImpl = jest.fn(async () =>
      response(200, GOOD, { etag: '"abc"' }),
    );
    const result = await fetchManagedPriceFeed("https://x/prices/A", {
      ...options,
      etag: '"old"',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ kind: "fetched", text: GOOD, etag: '"abc"' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://x/prices/A");
    expect(init.method).toBe("GET");
    expect(init.redirect).toBe("manual");
    expect(init.headers).toEqual({
      accept: "text/plain",
      "user-agent": "beancount-ledger-v2 managed-prices",
      "if-none-match": '"old"',
    });
  });

  it("omits If-None-Match when there is no prior ETag", async () => {
    const fetchImpl = jest.fn(async () => response(200, GOOD));
    await fetchManagedPriceFeed("https://x/prices/A", {
      ...options,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(init.headers).not.toHaveProperty("if-none-match");
  });

  it("sends the Cookie header when one is supplied, and omits it otherwise", async () => {
    const fetchImpl = jest.fn(async () => response(200, GOOD));
    const call = (cookie: string | null) =>
      fetchManagedPriceFeed("https://beancount.io/prices/BTC-USD", {
        ...options,
        cookie,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
    await call("authSess:beancount.io=tok-abc");
    await call(null);
    const headersOf = (index: number) =>
      (fetchImpl.mock.calls[index] as unknown as [string, RequestInit])[1]
        .headers;
    expect(headersOf(0)).toMatchObject({
      cookie: "authSess:beancount.io=tok-abc",
    });
    expect(headersOf(1)).not.toHaveProperty("cookie");
  });

  it("sends the cookie alongside If-None-Match on a conditional GET", async () => {
    const fetchImpl = jest.fn(async () => response(304, null));
    const result = await fetchManagedPriceFeed(
      "https://beancount.io/prices/BTC-USD",
      {
        ...options,
        etag: '"e1"',
        cookie: "authSess:beancount.io=tok-abc",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result).toEqual({ kind: "not-modified" });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({
      accept: "text/plain",
      "user-agent": "beancount-ledger-v2 managed-prices",
      "if-none-match": '"e1"',
      cookie: "authSess:beancount.io=tok-abc",
    });
  });

  it("omits the Cookie header when none is supplied at all", async () => {
    const fetchImpl = jest.fn(async () => response(200, GOOD));
    await fetchManagedPriceFeed("https://beancount.io/prices/BTC-USD", {
      ...options,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({
      accept: "text/plain",
      "user-agent": "beancount-ledger-v2 managed-prices",
    });
  });

  it("refuses a redirect without re-sending the cookie to the new location", async () => {
    // The gate answers a signed-out caller with a redirect; nothing may follow
    // it, so the credential never reaches the Location host and never surfaces
    // in the failure the caller sees.
    const fetchImpl = jest.fn(async () =>
      response(302, null, { location: "https://evil.example/login" }),
    );
    const result = await fetchManagedPriceFeed(
      "https://beancount.io/prices/BTC-USD",
      {
        ...options,
        cookie: "authSess:beancount.io=tok-abc",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      },
    );
    expect(result).toEqual({
      kind: "failed",
      reason: "redirect",
      message: "redirects are not followed (HTTP 302)",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://beancount.io/prices/BTC-USD");
    expect(init.redirect).toBe("manual");
    expect(JSON.stringify(result)).not.toContain("tok-abc");
  });

  it("reports 304 as not-modified", async () => {
    const fetchImpl = async () => response(304, null);
    await expect(
      fetchManagedPriceFeed("https://x/prices/A", {
        ...options,
        etag: '"a"',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ kind: "not-modified" });
  });

  it.each([
    [301, "redirect"],
    [302, "redirect"],
    [404, "http"],
    [429, "http"],
    [500, "http"],
  ])("fails a %s response as %s without reading a body", async (status, reason) => {
    const fetchImpl = async () =>
      response(status, "x", status === 429 ? { "retry-after": "30" } : {});
    const result = await fetchManagedPriceFeed("https://x/prices/A", {
      ...options,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toMatchObject({ kind: "failed", reason });
    if (result.kind === "failed") {
      expect(result.message).toBe(
        status === 429
          ? "HTTP 429 (retry after 30)"
          : reason === "redirect"
            ? `redirects are not followed (HTTP ${status})`
            : `HTTP ${status}`,
      );
    }
  });

  it("stops reading past the byte cap", async () => {
    const fetchImpl = async () => response(200, "x".repeat(2048));
    await expect(
      fetchManagedPriceFeed("https://x/prices/A", {
        ...options,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ kind: "failed", reason: "too-large" });
  });

  it("rejects a body that is not UTF-8", async () => {
    const fetchImpl = async () =>
      new Response(new Uint8Array([0xff, 0xfe, 0x20]), { status: 200 });
    await expect(
      fetchManagedPriceFeed("https://x/prices/A", {
        ...options,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ kind: "failed", reason: "not-utf8" });
  });

  it("turns an abort into a timeout failure", async () => {
    const fetchImpl = async (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    await expect(
      fetchManagedPriceFeed("https://x/prices/A", {
        timeoutMs: 20,
        maxBodyBytes: 1024,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({ kind: "failed", reason: "timeout" });
  });

  it("reports a thrown network error", async () => {
    const fetchImpl = async () => {
      throw new Error("ECONNREFUSED");
    };
    await expect(
      fetchManagedPriceFeed("https://x/prices/A", {
        ...options,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({
      kind: "failed",
      reason: "network",
      message: "ECONNREFUSED",
    });
  });
});
