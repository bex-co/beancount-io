import { SitemapService } from "../sitemap-service";
import { SitemapCache } from "../sitemap-cache";
import type { DatabaseLayer } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { ErrorCategory } from "@/shared/errors";

jest.mock("../sitemap-cache");
jest.mock("@/shared/logger", () => ({
  logger: { child: () => ({ debug: jest.fn(), error: jest.fn() }) },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const repository = (name: string, isPrivate = false) => ({
  name,
  private: isPrivate,
  updated_at: "2026-09-01T00:00:00Z",
});
const user = (name: string) => ({ id: name, ledger_username: name });
const config = {
  dashboard: { url: "https://example.com/" },
  gitea: { internalBaseUrl: "http://gitea:3000" },
} as AppConfig;
const incomplete = {
  category: ErrorCategory.SERVICE_UNAVAILABLE,
  metadata: expect.objectContaining({ reason: expect.any(String) }),
};

// Exercise the generated Gitea client too: only the network and persistence are
// stubbed. This catches status/JSON envelope behavior as well as page arguments.
describe("SitemapService", () => {
  let service: SitemapService;
  let database: DatabaseLayer;
  let getUsers: jest.Mock;
  let cache: jest.Mocked<SitemapCache>;
  let pageResponse: jest.Mock;
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      getStale: jest.fn(),
      set: jest.fn(),
    } as unknown as jest.Mocked<SitemapCache>;
    (SitemapCache.getInstance as jest.Mock).mockReturnValue(cache);
    getUsers = jest.fn().mockResolvedValue([user("open_ledger")]);
    database = {
      db: {},
      models: { user: { getActiveUsersWithUsername: getUsers } },
    } as unknown as DatabaseLayer;
    pageResponse = jest.fn().mockResolvedValue([]);
    fetchSpy = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input));
        const username = decodeURIComponent(url.pathname.split("/")[4]);
        const result: unknown = await pageResponse(
          username,
          Number(url.searchParams.get("page")),
        );
        return result instanceof Response
          ? result
          : new Response(JSON.stringify(result), {
              headers: { "Content-Type": "application/json" },
            });
      });
    service = new SitemapService(database, config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("walks capped 50 + 1 + 0 pages and publishes every eligible canonical URL once", async () => {
    pageResponse
      .mockResolvedValueOnce(
        Array.from({ length: 50 }, (_, i) => repository(`repo-${i}`)),
      )
      .mockResolvedValueOnce([repository("stock-example")])
      .mockResolvedValueOnce([]);

    const xml = await service.generateSitemap();

    expect(xml.match(/<loc>/g)).toHaveLength(1 + 51 * 7);
    expect(xml).toContain("<loc>https://example.com/ledger/open_ledger</loc>");
    expect(xml).toContain(
      "<loc>https://example.com/ledger/open_ledger/stock-example</loc>",
    );
    expect(xml).toContain(
      "<loc>https://example.com/ledger/open_ledger/stock-example/holdings</loc>",
    );
    expect(xml).not.toMatch(/\/<\/loc>/);
    expect(pageResponse.mock.calls).toEqual([
      ["open_ledger", 1],
      ["open_ledger", 2],
      ["open_ledger", 3],
    ]);
    for (const [url, options] of fetchSpy.mock.calls) {
      expect(new URL(String(url)).searchParams.get("limit")).toBe("100");
      expect(new Headers(options?.headers).has("Authorization")).toBe(false);
    }
    expect(cache.set).toHaveBeenCalledWith("sitemap:xml", xml, 86400000);
  });

  it("probes beyond an exact full final page", async () => {
    pageResponse.mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, i) => repository(`repo-${i}`)),
    );
    await service.generateSitemap();
    expect(pageResponse.mock.calls).toEqual([
      ["open_ledger", 1],
      ["open_ledger", 2],
    ]);
  });

  it("does not terminate on private-only pages and deduplicates overlapping pages", async () => {
    pageResponse
      .mockResolvedValueOnce([repository("first")])
      .mockResolvedValueOnce([repository("hidden", true)])
      .mockResolvedValueOnce([repository("first"), repository("last")]);
    const xml = await service.generateSitemap();
    expect(xml.match(/<loc>/g)).toHaveLength(15);
    expect(xml).not.toContain("hidden");
    expect(xml).toContain("/last</loc>");
    expect(pageResponse).toHaveBeenLastCalledWith("open_ledger", 4);
  });

  it("rejects repeated nonempty pages rather than publishing a truncated prefix", async () => {
    pageResponse.mockResolvedValue([repository("repeated")]);
    await expect(service.generateSitemap()).rejects.toMatchObject(incomplete);
    expect(pageResponse).toHaveBeenCalledTimes(2);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("rejects a repository traversal safety-limit overrun", async () => {
    jest.replaceProperty(SitemapService as any, "MAX_REPOSITORY_PAGES", 2);
    pageResponse.mockImplementation((_username, page) => [
      repository(`repo-${page}`),
    ]);
    await expect(service.generateSitemap()).rejects.toMatchObject(incomplete);
    expect(pageResponse).toHaveBeenCalledTimes(2);
    expect(cache.set).not.toHaveBeenCalled();
  });

  it.each([401, 403, 429, 500, 503])(
    "does not treat upstream %i as a missing user",
    async (status) => {
      pageResponse.mockResolvedValue(new Response("{}", { status }));
      await expect(service.generateSitemap()).rejects.toMatchObject(incomplete);
      expect(cache.set).not.toHaveBeenCalled();
    },
  );

  it("skips a missing user's first-page 404 while retaining other users", async () => {
    getUsers.mockResolvedValue([user("deleted"), user("active")]);
    pageResponse.mockImplementation((username) =>
      username === "deleted" ? new Response("{}", { status: 404 }) : [],
    );
    const xml = await service.generateSitemap();
    expect(xml).not.toContain("deleted");
    expect(xml).toContain("/active</loc>");
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it.each([404, 500])(
    "fails a page-two %i instead of caching the first page",
    async (status) => {
      pageResponse
        .mockResolvedValueOnce([repository("prefix")])
        .mockResolvedValueOnce(new Response("{}", { status }));
      await expect(service.generateSitemap()).rejects.toMatchObject(incomplete);
      expect(cache.set).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["invalid JSON", () => new Response("not-json")],
    ["null page", () => null],
    ["missing repository name", () => [{}]],
    [
      "invalid modification date",
      () => [{ ...repository("invalid-date"), updated_at: "invalid" }],
    ],
  ])(
    "rejects %s instead of inferring an empty result",
    async (_label, response) => {
      pageResponse.mockResolvedValue(response());
      await expect(service.generateSitemap()).rejects.toMatchObject(incomplete);
      expect(cache.set).not.toHaveBeenCalled();
    },
  );

  it("includes users beyond the first 1,000 and retains the correct DB offsets", async () => {
    jest.replaceProperty(SitemapService as any, "BATCH_DELAY_MS", 0);
    getUsers
      .mockResolvedValueOnce(
        Array.from({ length: 1000 }, (_, i) => user(`user-${i}`)),
      )
      .mockResolvedValueOnce([user("last-user")]);
    const xml = await service.generateSitemap();
    expect(getUsers.mock.calls.map((call) => call[1])).toEqual([
      { limit: 1000, offset: 0 },
      { limit: 1000, offset: 1000 },
    ]);
    expect(xml.match(/<loc>/g)).toHaveLength(1001);
    expect(xml).toContain("/last-user</loc>");
  });

  it("does not publish a prefix when the second user page fails", async () => {
    getUsers
      .mockResolvedValueOnce(
        Array.from({ length: 1000 }, (_, i) => user(`user-${i}`)),
      )
      .mockRejectedValueOnce(new Error("database unavailable"));
    await expect(service.generateSitemap()).rejects.toMatchObject({
      ...incomplete,
      metadata: { reason: "user-page-failed", offset: 1000 },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("probes the user safety limit and rejects additional users instead of truncating", async () => {
    jest.replaceProperty(SitemapService as any, "USER_PAGE_SIZE", 2);
    jest.replaceProperty(SitemapService as any, "MAX_USERS_LIMIT", 2);
    getUsers
      .mockResolvedValueOnce([user("a"), user("b")])
      .mockResolvedValueOnce([user("c")]);
    await expect(service.generateSitemap()).rejects.toMatchObject({
      ...incomplete,
      metadata: { reason: "user-limit", offset: 2 },
    });
    expect(getUsers).toHaveBeenLastCalledWith(database.db, {
      limit: 1,
      offset: 2,
    });
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("allows a complete result at exactly the user safety limit", async () => {
    jest.replaceProperty(SitemapService as any, "USER_PAGE_SIZE", 2);
    jest.replaceProperty(SitemapService as any, "MAX_USERS_LIMIT", 2);
    getUsers
      .mockResolvedValueOnce([user("a"), user("b")])
      .mockResolvedValueOnce([]);
    const xml = await service.generateSitemap();
    expect(xml.match(/<loc>/g)).toHaveLength(2);
  });

  it("keeps repository request concurrency bounded to ten across multiple pages", async () => {
    getUsers.mockResolvedValue(
      Array.from({ length: 11 }, (_, i) => user(`user-${i}`)),
    );
    const gate = deferred<void>();
    const started = deferred<void>();
    let active = 0;
    let maximum = 0;
    pageResponse.mockImplementation(async (_username, page) => {
      active++;
      maximum = Math.max(maximum, active);
      if (active === 10) started.resolve();
      await gate.promise;
      active--;
      return page === 1 ? [repository("example")] : [];
    });
    const pending = service.generateSitemap();
    await started.promise;
    expect(pageResponse).toHaveBeenCalledTimes(10);
    gate.resolve();
    const xml = await pending;
    expect(maximum).toBe(10);
    expect(xml.match(/<loc>/g)).toHaveLength(11 * 8);
    expect(pageResponse).toHaveBeenCalledTimes(22);
  });

  it("encodes path segments and XML-escapes the resulting canonical URLs", async () => {
    getUsers.mockResolvedValue([user("a&b")]);
    pageResponse.mockResolvedValueOnce([repository("tax #1's")]);
    const xml = await service.generateSitemap();
    expect(xml).toContain("/ledger/a%26b</loc>");
    expect(xml).toContain("/ledger/a%26b/tax%20%231&apos;s</loc>");
    expect(xml).toContain("<lastmod>2026-09-01T00:00:00.000Z</lastmod>");
  });

  it.each([
    ["MAX_SITEMAP_URLS", 1, "sitemap-url-limit"],
    ["MAX_SITEMAP_BYTES", 100, "sitemap-byte-limit"],
  ])("does not publish output exceeding %s", async (key, limit, reason) => {
    jest.replaceProperty(SitemapService as any, key, limit);
    pageResponse.mockResolvedValueOnce([repository("example")]);
    await expect(service.generateSitemap()).rejects.toMatchObject({
      ...incomplete,
      metadata: expect.objectContaining({ reason }),
    });
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("serves a fresh cache without touching upstream dependencies", async () => {
    cache.get.mockReturnValue("cached-xml");
    expect(await service.generateSitemap()).toBe("cached-xml");
    expect(getUsers).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shares one cold generation between service instances", async () => {
    const gate = deferred<unknown[]>();
    getUsers.mockReturnValue(gate.promise);
    const first = service.generateSitemap();
    const second = new SitemapService(database, config).generateSitemap();
    gate.resolve([]);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(getUsers).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it.each(["repository", "database"])(
    "retains stale XML after a failed %s refresh and permits retry",
    async (source) => {
      const gate = deferred<unknown[]>();
      if (source === "database") getUsers.mockReturnValueOnce(gate.promise);
      else pageResponse.mockReturnValueOnce(gate.promise);
      cache.getStale.mockReturnValueOnce("previous-complete-xml");

      expect(await service.generateSitemap()).toBe("previous-complete-xml");
      // A cold caller attaches to the same pending refresh; it must see failure.
      const cold = service.generateSitemap();
      gate.reject(new Error("temporary failure"));
      await expect(cold).rejects.toMatchObject(incomplete);
      expect(cache.set).not.toHaveBeenCalled();

      const recovered = await service.generateSitemap();
      expect(recovered).toContain("/open_ledger</loc>");
      expect(cache.set).toHaveBeenCalledTimes(1);
    },
  );

  it("returns stale XML immediately and replaces it only after successful completion", async () => {
    const gate = deferred<unknown[]>();
    pageResponse.mockReturnValueOnce(gate.promise);
    cache.getStale.mockReturnValueOnce("previous-complete-xml");
    expect(await service.generateSitemap()).toBe("previous-complete-xml");
    expect(cache.set).not.toHaveBeenCalled();
    const cold = service.generateSitemap();
    gate.resolve([repository("new")]);
    const xml = await cold;
    expect(xml).toContain("/new</loc>");
    expect(cache.set).toHaveBeenCalledWith("sitemap:xml", xml, 86400000);
    expect(getUsers).toHaveBeenCalledTimes(1);
  });
});
