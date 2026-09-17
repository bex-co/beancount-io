import { asyncContext } from "@/shared/async-context";
import { CACHE_KEYS } from "@/shared/cache";
import {
  managedPriceUrlHash,
  resolveManagedPriceFeed,
  type PriceFeedHead,
} from "../managed-price-cache";
import { feedDeps, feedResponse, feedText, TEST_CONFIG } from "./test-support";

const URL_A = "https://beancount.io/prices/BTC-USD";
const ALIAS = "BTC-USD";
const HASH = managedPriceUrlHash(URL_A);
const T1 = feedText([["2026-09-15", "76000", "2026-09-15T08:25:00Z"]]);
const T2 = feedText([["2026-09-15", "77000", "2026-09-15T08:35:00Z"]], {
  revision: "r2",
});

const resolve = (deps: ReturnType<typeof feedDeps>["deps"]) =>
  resolveManagedPriceFeed(URL_A, ALIAS, deps);

describe("resolveManagedPriceFeed", () => {
  it("fetches on first use, stores the blob and head, and re-arms five minutes ahead", async () => {
    const { deps, cache, calls, clock } = feedDeps([feedResponse(T1, '"e1"')]);
    const result = await resolve(deps);
    expect(result.blob).toMatchObject({
      url: URL_A,
      revision: "e1",
      etag: '"e1"',
      text: T1,
      fetchedAt: clock.now(),
    });
    expect(result.blob?.feed.prices).toHaveLength(1);
    await expect(
      cache.get<PriceFeedHead>(CACHE_KEYS.ledger.priceFeedHead(HASH)),
    ).resolves.toEqual({
      revision: "e1",
      nextRefreshAt: clock.now() + TEST_CONFIG.refreshMs,
      lastError: null,
    });
    await expect(
      cache.get(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e1")),
    ).resolves.toMatchObject({ revision: "e1" });
    expect(calls).toHaveLength(1);
  });

  it("serves from cache inside the window without touching the network", async () => {
    const { deps, calls, clock } = feedDeps([feedResponse(T1)]);
    await resolve(deps);
    clock.advance(TEST_CONFIG.refreshMs - 1);
    const again = await resolve(deps);
    expect(again.blob?.text).toBe(T1);
    expect(calls).toHaveLength(1);
  });

  // Wraps the call the way the middleware does in production, so these cover
  // the ambient read that actually ships rather than an injected substitute.
  const asCaller = <T>(sessionToken: string, fn: () => Promise<T>) =>
    asyncContext.run({ requestId: "req-test", sessionToken }, fn);

  it("presents the caller's token as a cookie to the gated host only", async () => {
    const gated = feedDeps([feedResponse(T1)]);
    await asCaller("tok-abc", () => resolveManagedPriceFeed(URL_A, ALIAS, gated.deps));
    expect(gated.calls[0].init.headers).toMatchObject({
      cookie: "authSess:beancount.io=tok-abc",
    });

    const elsewhere = feedDeps([feedResponse(T1)]);
    await asCaller("tok-abc", () =>
      resolveManagedPriceFeed(
        "https://other.example/prices/BTC-USD",
        ALIAS,
        elsewhere.deps,
      ),
    );
    expect(elsewhere.calls[0].init.headers).not.toHaveProperty("cookie");
  });

  it.each([
    ["another host entirely", "https://other.example/prices/BTC-USD"],
    ["a lookalike host", "https://beancount.io.evil.example/prices/BTC-USD"],
    ["a sibling subdomain", "https://www.beancount.io/prices/BTC-USD"],
    ["a non-price path on the gated host", "https://beancount.io/catalog/BTC-USD"],
    ["the bare prices path", "https://beancount.io/prices"],
  ])("never relays the credential to %s", async (_label, url) => {
    const { deps, calls } = feedDeps([feedResponse(T1)]);
    await asCaller("tok-abc", () =>
      resolveManagedPriceFeed(url, ALIAS, deps),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(url);
    expect(calls[0].init.headers).not.toHaveProperty("cookie");
  });

  it("fetches anonymously when the relay is disabled by configuration", async () => {
    const { deps, calls } = feedDeps([feedResponse(T1)]);
    const disabled = {
      ...deps,
      config: { ...TEST_CONFIG, gatedPriceHost: "" },
    };
    await asCaller("tok-abc", () =>
      resolveManagedPriceFeed(URL_A, ALIAS, disabled),
    );
    expect(calls[0].init.headers).not.toHaveProperty("cookie");
  });

  it("scopes the credential on the conditional refresh, not just the first fetch", async () => {
    const { deps, calls, clock } = feedDeps([
      feedResponse(T1, '"e1"'),
      feedResponse("", null, 304),
    ]);
    await asCaller("tok-first", () => resolveManagedPriceFeed(URL_A, ALIAS, deps));
    clock.advance(TEST_CONFIG.refreshMs);
    // A later caller refreshes the same feed; the 304 path must present that
    // caller's own token, not the one cached with the previous revision.
    const again = await asCaller("tok-second", () =>
      resolveManagedPriceFeed(URL_A, ALIAS, deps),
    );
    expect(again.blob?.revision).toBe("e1");
    expect(calls[0].init.headers).toMatchObject({
      cookie: "authSess:beancount.io=tok-first",
    });
    expect(calls[1].init.headers).toMatchObject({
      "if-none-match": '"e1"',
      cookie: "authSess:beancount.io=tok-second",
    });
  });

  it("keeps the refresh of a non-gated feed anonymous too", async () => {
    const url = "https://other.example/prices/BTC-USD";
    const { deps, calls, clock } = feedDeps([
      feedResponse(T1, '"e1"'),
      feedResponse("", null, 304),
    ]);
    await asCaller("tok-abc", () => resolveManagedPriceFeed(url, ALIAS, deps));
    clock.advance(TEST_CONFIG.refreshMs);
    await asCaller("tok-abc", () => resolveManagedPriceFeed(url, ALIAS, deps));
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.init.headers).not.toHaveProperty("cookie");
    }
  });

  it("gives each concurrent caller its own token across different feeds", async () => {
    // Two callers, two feeds, one process: the token is read inside the fetch
    // lock, so each request's own store must reach its own fetch.
    const URL_B = "https://beancount.io/prices/BTC-USD.2";
    const { deps, calls } = feedDeps([feedResponse(T1), feedResponse(T1)]);
    await Promise.all([
      asCaller("tok-alice", () => resolveManagedPriceFeed(URL_A, ALIAS, deps)),
      asCaller("tok-bob", () => resolveManagedPriceFeed(URL_B, ALIAS, deps)),
    ]);
    const cookieFor = (url: string) =>
      (calls.find((c) => c.url === url)?.init.headers as
        | Record<string, string>
        | undefined)?.cookie;
    expect(calls).toHaveLength(2);
    expect(cookieFor(URL_A)).toBe("authSess:beancount.io=tok-alice");
    expect(cookieFor(URL_B)).toBe("authSess:beancount.io=tok-bob");
  });

  it("sends no cookie for a load that runs with no active request store", async () => {
    // A background refresh runs alongside a request; it must not inherit the
    // request's credential.
    const URL_B = "https://beancount.io/prices/BTC-USD.2";
    const { deps, calls } = feedDeps([feedResponse(T1), feedResponse(T1)]);
    await Promise.all([
      asCaller("tok-alice", () => resolveManagedPriceFeed(URL_A, ALIAS, deps)),
      resolveManagedPriceFeed(URL_B, ALIAS, deps),
    ]);
    const headersFor = (url: string) =>
      calls.find((c) => c.url === url)?.init.headers as Record<string, string>;
    expect(headersFor(URL_A)).toMatchObject({
      cookie: "authSess:beancount.io=tok-alice",
    });
    expect(headersFor(URL_B)).not.toHaveProperty("cookie");
  });

  it("fetches anonymously when the request carried no credential", async () => {
    const { deps, calls } = feedDeps([feedResponse(T1)]);
    await resolve(deps);
    expect(calls[0].init.headers).not.toHaveProperty("cookie");
  });

  it("sends a conditional GET after the window and treats 304 as a refresh", async () => {
    const { deps, calls, clock } = feedDeps([
      feedResponse(T1, '"e1"'),
      feedResponse("", null, 304),
    ]);
    await resolve(deps);
    clock.advance(TEST_CONFIG.refreshMs);
    const again = await resolve(deps);
    expect(calls).toHaveLength(2);
    expect(calls[1].init.headers).toMatchObject({ "if-none-match": '"e1"' });
    expect(again.blob?.revision).toBe("e1");
    expect(again.head).toEqual({
      revision: "e1",
      nextRefreshAt: clock.now() + TEST_CONFIG.refreshMs,
      lastError: null,
    });
  });

  it("swaps to a new revision on 200 and deletes the superseded blob", async () => {
    const { deps, cache, clock } = feedDeps([
      feedResponse(T1, '"e1"'),
      feedResponse(T2, '"e2"'),
    ]);
    await resolve(deps);
    clock.advance(TEST_CONFIG.refreshMs);
    const next = await resolve(deps);
    expect(next.blob).toMatchObject({ revision: "e2", text: T2 });
    await expect(
      cache.get(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e1")),
    ).resolves.toBeUndefined();
    await expect(
      cache.get(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e2")),
    ).resolves.toMatchObject({ revision: "e2" });
  });

  it.each([
    ["a timeout", () => Object.assign(new Error("t"), { name: "AbortError" })],
    ["a 429", () => feedResponse("slow down", null, 429)],
    ["a 404", () => feedResponse("unknown alias", null, 404)],
    ["an empty body", () => feedResponse("", '"e9"')],
    ["a transaction in the body", () => feedResponse(`${T1}2026-09-15 * "x"\n  Assets:A 1 USD\n  Assets:B -1 USD\n`, '"e9"')],
    ["a changed commodity pair", () => feedResponse(feedText([["2026-09-15", "1"]], { commodity: "ETH" }), '"e9"')],
    ["an invalid decimal", () => feedResponse("2026-09-15 price BTC 1e5 USD\n", '"e9"')],
  ])("keeps the last revision through %s and backs off one minute", async (_label, make) => {
    const failure = make();
    const { deps, cache, calls, clock } = feedDeps([
      feedResponse(T1, '"e1"'),
      failure instanceof Error ? failure : () => failure,
    ]);
    await resolve(deps);
    clock.advance(TEST_CONFIG.refreshMs);
    const degraded = await resolve(deps);
    expect(calls).toHaveLength(2);
    expect(degraded.blob).toMatchObject({ revision: "e1", text: T1 });
    expect(degraded.head).toEqual({
      revision: "e1",
      nextRefreshAt: clock.now() + TEST_CONFIG.retryMs,
      lastError: expect.any(String),
    });
    await expect(
      cache.get(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e1")),
    ).resolves.toMatchObject({ revision: "e1" });
    await expect(
      cache.get(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e9")),
    ).resolves.toBeUndefined();
  });

  it("accepts a header alias that differs only in separators or case", async () => {
    // feedText writes the pre-rename `; alias: BTCUSD`; the URL alias is BTC-USD.
    const { deps } = feedDeps([feedResponse(T1, '"e1"')]);
    const result = await resolveManagedPriceFeed(URL_A, "btc-usd", deps);
    expect(result.blob?.revision).toBe("e1");
    expect(result.head.lastError).toBeNull();
  });

  it("rejects a first revision whose header alias is not the requested instrument", async () => {
    const { deps } = feedDeps([
      feedResponse(feedText([["2026-09-15", "1"]], { commodity: "ETH" }), '"e1"'),
    ]);
    const result = await resolve(deps);
    expect(result.blob).toBeNull();
    expect(result.head.lastError).toBe(
      "invalid feed: feed alias ETHUSD does not match the requested BTC-USD",
    );
  });

  it("reports unavailable with the cause when no revision ever validated", async () => {
    const { deps, calls, clock } = feedDeps([
      feedResponse("nope", null, 500),
      feedResponse(T1, '"e1"'),
    ]);
    const first = await resolve(deps);
    expect(first.blob).toBeNull();
    expect(first.head.lastError).toBe("fetch failed (http): HTTP 500");
    // Inside the retry window nothing is fetched again.
    clock.advance(TEST_CONFIG.retryMs - 1);
    const held = await resolve(deps);
    expect(held.blob).toBeNull();
    expect(calls).toHaveLength(1);
    // After it, recovery needs validated data.
    clock.advance(1);
    const recovered = await resolve(deps);
    expect(recovered.blob?.revision).toBe("e1");
    expect(recovered.head.lastError).toBeNull();
  });

  it("re-fetches when the head is fresh but its blob was evicted", async () => {
    const { deps, cache, calls } = feedDeps([
      feedResponse(T1, '"e1"'),
      feedResponse(T1, '"e1"'),
    ]);
    await resolve(deps);
    await cache.del(CACHE_KEYS.ledger.priceFeedBlob(HASH, "e1"));
    const again = await resolve(deps);
    expect(again.blob?.text).toBe(T1);
    expect(calls).toHaveLength(2);
    // No stale ETag is offered for a blob that no longer exists.
    expect(calls[1].init.headers).not.toHaveProperty("if-none-match");
  });

  it("coalesces concurrent loads for one URL into a single fetch", async () => {
    const { deps, calls } = feedDeps([feedResponse(T1, '"e1"')]);
    const results = await Promise.all(
      Array.from({ length: 10 }, () => resolve(deps)),
    );
    expect(calls).toHaveLength(1);
    expect(new Set(results.map((r) => r.blob?.revision))).toEqual(
      new Set(["e1"]),
    );
  });

  it("falls back to a body hash when the server sends no ETag", async () => {
    const { deps } = feedDeps([feedResponse(T1, null)]);
    const result = await resolve(deps);
    expect(result.blob?.revision).toMatch(/^[0-9a-f]{64}$/u);
    expect(result.blob?.etag).toBeNull();
  });
});
