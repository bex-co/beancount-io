import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import {
  feedResponse,
  feedText,
  giteaClient,
  memoryCache,
  scriptedFetch,
} from "@/foundation/managed-prices/__tests__/test-support";

/**
 * The status read and the manual refresh (ADR 015 sections 5 and 8) through
 * the real cached loader and feed cache; only Gitea and the network are fakes.
 */
const URL_BTC = "https://beancount.io/prices/BTC-USD";
const WITH_FEED = {
  "main.bean": `option "operating_currency" "USD"\n2020-01-01 open Assets:BTC BTC\ninclude "${URL_BTC}"\n`,
};
const WITHOUT_FEED = {
  "main.bean": `option "operating_currency" "USD"\n2020-01-01 open Assets:Cash USD\n`,
};
const T1 = feedText([["2026-09-15", "76000", "2026-09-15T08:25:00Z"]]);
const T2 = feedText([["2026-09-15", "77000", "2026-09-15T08:35:00Z"]], {
  revision: "r2",
});

function setup(
  files: Record<string, string>,
  responses: Parameters<typeof scriptedFetch>[0],
) {
  const { client, counts } = giteaClient(files);
  const { fetchImpl, calls } = scriptedFetch(responses);
  jest.spyOn(global, "fetch").mockImplementation(fetchImpl);
  const service = new LedgerDataService(
    { getPublicApiClient: async () => client } as never,
    memoryCache(),
  );
  return { service, counts, calls };
}

const params = { ledgerId: "alice/main", userId: undefined };

afterEach(() => jest.restoreAllMocks());

describe("LedgerDataService managed price status", () => {
  it("returns one status record per managed include, without engine-only fields", async () => {
    const { service } = setup(WITH_FEED, [feedResponse(T1, '"e1"')]);
    const [status, ...rest] = await service.getManagedPrices(params);
    expect(rest).toEqual([]);
    expect(status).toMatchObject({
      url: URL_BTC,
      alias: "BTC-USD",
      includedFrom: [{ file: "main.bean", line: 3, target: URL_BTC }],
      commodity: "BTC",
      quote: "USD",
      revision: "e1",
      etag: '"e1"',
      observedAt: "2026-09-15T08:25:00Z",
      error: null,
      shadowedCount: 0,
    });
    expect(["recent", "stale"]).toContain(status.freshness);
    expect(status).not.toHaveProperty("effectiveDates");
  });

  it("reports an unavailable source with its cause instead of failing", async () => {
    const { service } = setup(WITH_FEED, [feedResponse("nope", null, 404)]);
    const [status] = await service.getManagedPrices(params);
    expect(status).toMatchObject({
      freshness: "unavailable",
      revision: null,
      error: expect.stringContaining("404"),
    });
  });

  it("returns an empty list for a ledger with no managed include", async () => {
    const { service, calls } = setup(WITHOUT_FEED, []);
    await expect(service.getManagedPrices(params)).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });
});

describe("LedgerDataService.refreshManagedPrices", () => {
  it("re-fetches a feed still inside its window and returns the new revision", async () => {
    const { service, calls } = setup(WITH_FEED, [
      feedResponse(T1, '"e1"'),
      feedResponse(T2, '"e2"'),
    ]);
    await service.getManagedPrices(params);
    const [refreshed] = await service.refreshManagedPrices(params);
    expect(calls).toHaveLength(2);
    expect(calls[1].init.headers).toMatchObject({ "if-none-match": '"e1"' });
    expect(refreshed).toMatchObject({ revision: "e2", error: null });
  });

  it("never reads the repository again: the committed file map stays cached", async () => {
    const { service, counts } = setup(WITH_FEED, [
      feedResponse(T1, '"e1"'),
      feedResponse(T2, '"e2"'),
    ]);
    await service.getManagedPrices(params);
    const before = { ...counts };
    await service.refreshManagedPrices(params);
    expect(counts.tree).toBe(before.tree);
    expect(counts.contents).toBe(before.contents);
    // One load: a single HEAD lookup, not one to name the feeds and another
    // to re-resolve them.
    expect(counts.commits - before.commits).toBe(1);
  });

  it("keeps the last validated revision when the forced re-fetch fails", async () => {
    const { service } = setup(WITH_FEED, [
      feedResponse(T1, '"e1"'),
      feedResponse("slow down", null, 429),
    ]);
    await service.getManagedPrices(params);
    const [status] = await service.refreshManagedPrices(params);
    expect(status).toMatchObject({
      revision: "e1",
      error: expect.stringContaining("429"),
    });
    expect(status.freshness).not.toBe("unavailable");
  });

  it("does nothing for a ledger with no managed include", async () => {
    const { service, calls } = setup(WITHOUT_FEED, []);
    await expect(service.refreshManagedPrices(params)).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
