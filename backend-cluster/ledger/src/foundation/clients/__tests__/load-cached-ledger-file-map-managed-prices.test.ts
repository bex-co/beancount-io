import { CACHE_KEYS } from "@/shared/cache";
import { loadCachedFileMapForRepo } from "../load-cached-ledger-file-map";
import {
  fakeClock,
  feedResponse,
  feedText,
  memoryCache,
  giteaClient,
  scriptedFetch,
  SHA,
  TEST_CONFIG,
} from "@/foundation/managed-prices/__tests__/test-support";

const URL_BTC = "https://beancount.io/prices/BTC-USD";
const KEY_BTC = "https:/beancount.io/prices/BTC-USD";
const LEDGER = {
  "main.bean": `option "operating_currency" "USD"\n2020-01-01 open Assets:BTC BTC\ninclude "${URL_BTC}"\n`,
};

describe("loadCachedFileMapForRepo with managed price includes", () => {
  it("overlays the feed after the SHA cache and never stores it in that cache", async () => {
    const helper = memoryCache();
    const { client, counts } = giteaClient(LEDGER);
    const clock = fakeClock();
    const text = feedText([["2026-09-15", "76000", "2026-09-15T08:29:00Z"]]);
    const { fetchImpl, calls } = scriptedFetch([feedResponse(text, '"e1"')]);
    const managedPrices = { config: TEST_CONFIG, now: clock.now, fetchImpl };

    const loaded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices,
    });

    expect(loaded.files[KEY_BTC]).toBe(text);
    expect(loaded.managedPricePaths).toEqual([KEY_BTC]);
    expect(loaded.sourceFiles).toEqual(["main.bean"]);
    expect(loaded.managedPrices[0]).toMatchObject({
      url: URL_BTC,
      revision: "e1",
      freshness: "recent",
    });
    const cached = await helper.get<{ files: Record<string, string> }>(
      CACHE_KEYS.ledger.fileMapBySha("o", "r", SHA),
    );
    expect(Object.keys(cached?.files ?? {})).toEqual(["main.bean"]);
    expect(calls).toHaveLength(1);
    expect(counts).toEqual({ commits: 1, tree: 1, contents: 1 });
  });

  it("returns the committed files only, with no fetch, when asked", async () => {
    const helper = memoryCache();
    const { client } = giteaClient(LEDGER);
    const { fetchImpl, calls } = scriptedFetch([]);
    const loaded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      committedOnly: true,
      managedPrices: { config: TEST_CONFIG, fetchImpl },
    });
    expect(Object.keys(loaded.files)).toEqual(["main.bean"]);
    expect(loaded.managedPrices).toEqual([]);
    expect(loaded.managedPricePaths).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("refreshes prices on an unchanged commit without any repository read", async () => {
    const helper = memoryCache();
    const { client, counts } = giteaClient(LEDGER);
    const clock = fakeClock();
    const t1 = feedText([["2026-09-15", "76000", "2026-09-15T08:29:00Z"]]);
    const t2 = feedText([["2026-09-15", "77000", "2026-09-15T08:35:00Z"]], {
      revision: "r2",
    });
    const { fetchImpl, calls } = scriptedFetch([
      feedResponse(t1, '"e1"'),
      feedResponse(t2, '"e2"'),
    ]);
    const managedPrices = { config: TEST_CONFIG, now: clock.now, fetchImpl };

    await loadCachedFileMapForRepo(client, helper, "o", "r", { managedPrices });
    const inside = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices,
    });
    expect(inside.files[KEY_BTC]).toBe(t1);
    expect(calls).toHaveLength(1);

    clock.advance(TEST_CONFIG.refreshMs);
    const after = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices,
    });
    expect(after.files[KEY_BTC]).toBe(t2);
    expect(after.managedPrices[0].revision).toBe("e2");
    expect(calls).toHaveLength(2);
    // Three loads resolved HEAD three times but read the tree and contents once.
    expect(counts).toEqual({ commits: 3, tree: 1, contents: 1 });
  });

  it("keeps serving the last revision when the refresh fails", async () => {
    const helper = memoryCache();
    const { client } = giteaClient(LEDGER);
    const clock = fakeClock();
    const t1 = feedText([["2026-09-15", "76000", "2026-09-15T08:29:00Z"]]);
    const { fetchImpl } = scriptedFetch([
      feedResponse(t1, '"e1"'),
      feedResponse("", null, 429),
    ]);
    const managedPrices = { config: TEST_CONFIG, now: clock.now, fetchImpl };

    await loadCachedFileMapForRepo(client, helper, "o", "r", { managedPrices });
    clock.advance(TEST_CONFIG.refreshMs);
    const degraded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices,
    });
    expect(degraded.files[KEY_BTC]).toBe(t1);
    expect(degraded.managedPrices[0]).toMatchObject({
      revision: "e1",
      error: "fetch failed (http): HTTP 429",
    });
  });

  it("loads the books with no virtual file when the feed is unavailable", async () => {
    const helper = memoryCache();
    const { client } = giteaClient(LEDGER);
    const { fetchImpl } = scriptedFetch([new Error("ECONNREFUSED")]);
    const loaded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices: { config: TEST_CONFIG, fetchImpl },
    });
    expect(Object.keys(loaded.files)).toEqual(["main.bean"]);
    expect(loaded.managedPricePaths).toEqual([]);
    expect(loaded.managedPrices[0]).toMatchObject({
      freshness: "unavailable",
      error: "fetch failed (network): ECONNREFUSED",
    });
  });

  it("overlays on the uncached fallback path too", async () => {
    const helper = memoryCache();
    const { client } = giteaClient(LEDGER);
    (
      client.repos as unknown as { repoGetAllCommits: () => Promise<unknown> }
    ).repoGetAllCommits = async () => {
      throw new Error("no commits");
    };
    const text = feedText([["2026-09-15", "1"]]);
    const { fetchImpl } = scriptedFetch([feedResponse(text)]);
    const loaded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices: { config: TEST_CONFIG, fetchImpl },
    });
    expect(loaded.files[KEY_BTC]).toBe(text);
  });

  it("does nothing for a ledger without URL includes", async () => {
    const helper = memoryCache();
    const { client } = giteaClient({ "main.bean": "2020-01-01 open Assets:A USD\n" });
    const { fetchImpl, calls } = scriptedFetch([]);
    const loaded = await loadCachedFileMapForRepo(client, helper, "o", "r", {
      managedPrices: { config: TEST_CONFIG, fetchImpl },
    });
    expect(loaded.managedPrices).toEqual([]);
    expect(loaded.managedPricePaths).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
