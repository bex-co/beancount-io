import "reflect-metadata";
import { FeedService } from "../feed-service";
import { FeedSource } from "../../api/feed-resolver.types";
import { ValidationError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { createMockContext } from "./test-fixtures";

type RssItem = { title: string; link: string; date: string };

function rssFeed(items: RssItem[]): string {
  const entries = items
    .map(
      (item) => `<item>
      <title><![CDATA[${item.title}]]></title>
      <link>${item.link}</link>
      <guid isPermaLink="true">${item.link}</guid>
      <pubDate>${item.date}</pubDate>
      <description><![CDATA[<p>Summary of ${item.title}</p>]]></description>
      <dc:creator><![CDATA[mike]]></dc:creator>
      <category><![CDATA[changelog]]></category>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Beancount.io Changelog</title>
    <link>https://beancount.io/changelog</link>
    <description>Releases</description>
    ${entries}
  </channel>
</rss>`;
}

function atomFeed(items: RssItem[]): string {
  const entries = items
    .map(
      (item) => `<entry>
    <title>${item.title}</title>
    <id>${item.link}</id>
    <link href="${item.link}"/>
    <updated>${item.date}</updated>
    <summary>Summary of ${item.title}</summary>
    <author><name>mike</name></author>
  </entry>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>https://beancount.io/blog</id>
  <title>Beancount.io Blog</title>
  <updated>2026-09-16T00:00:00.000Z</updated>
  ${entries}
</feed>`;
}

const EN_CHANGELOG = "https://beancount.io/changelog/rss.xml";
const ZH_CHANGELOG = "https://beancount.io/zh/changelog/rss.xml";
const EN_BLOG = "https://beancount.io/blog/atom.xml";

const RELEASE_EN: RssItem = {
  title: "Declare cash-flow roles in your ledger",
  link: "https://beancount.io/blog/2026/08/28/declare-cash-flow-roles",
  date: "Fri, 28 Aug 2026 00:00:00 GMT",
};
const RELEASE_ZH: RssItem = {
  title: "在账本中声明现金流角色",
  link: "https://beancount.io/zh/blog/2026/08/28/declare-cash-flow-roles",
  date: "Fri, 28 Aug 2026 00:00:00 GMT",
};
const OLDER_RELEASE_EN: RssItem = {
  title: "Beancount.io 3.6 Summer Release",
  link: "https://beancount.io/blog/2026/08/14/beancount-io-3-6",
  date: "Fri, 14 Aug 2026 00:00:00 GMT",
};
const BLOG_POST: RssItem = {
  title: "The Three Liquidity Ratios Lenders Check",
  link: "https://beancount.io/blog/2026/09/16/three-liquidity-ratios",
  date: "2026-09-16T00:00:00.000Z",
};
const BLOG_COPY_OF_RELEASE: RssItem = {
  title: "Declare cash-flow roles in your ledger",
  link: "https://beancount.io/blog/2026/08/28/declare-cash-flow-roles",
  date: "2026-08-28T00:00:00.000Z",
};

function installFetch(responses: Record<string, string>): jest.Mock {
  const fetchMock = jest.fn(async (url: string) => {
    const body = responses[url];
    if (body === undefined) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "",
      };
    }
    return { ok: true, status: 200, statusText: "OK", text: async () => body };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function createService() {
  const store = new Map<string, unknown>();
  const cacheHelper = {
    get: jest.fn(async (key: string) => store.get(key)),
    set: jest.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
  };
  const getById = jest.fn().mockResolvedValue({
    id: "user-123",
    email: "test@example.com",
    ledger_username: "testuser",
    locale: "en",
  });
  const giteaClientFactory = {
    getUserApiClient: jest.fn().mockRejectedValue(new Error("gitea offline")),
  };
  const service = new FeedService(
    cacheHelper as never,
    { getApiContext: jest.fn() } as never,
    giteaClientFactory as never,
    { user: { getById } } as never,
    {} as never,
    { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, cacheHelper, store };
}

describe("FeedService changelog source", () => {
  const identity = createMockContext().getCurrentIdentity();
  const originalFetch = global.fetch;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined);
    jest.spyOn(logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("returns the localized changelog newest first when source is CHANGELOG", async () => {
    const fetchMock = installFetch({
      [ZH_CHANGELOG]: rssFeed([OLDER_RELEASE_EN, RELEASE_ZH]),
    });
    const { service } = createService();

    const result = await service.getFeed(
      { offset: 0, limit: 10, source: "CHANGELOG", locale: "zh" },
      identity,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(ZH_CHANGELOG);
    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.title)).toEqual([
      RELEASE_ZH.title,
      OLDER_RELEASE_EN.title,
    ]);
    expect(result.items[0]).toMatchObject({
      id: `changelog:${RELEASE_ZH.link}`,
      link: RELEASE_ZH.link,
      summary: `Summary of ${RELEASE_ZH.title}`,
      author: "mike",
      source: FeedSource.CHANGELOG,
    });
    expect(result.items[0].publishedAt.toISOString()).toBe(
      "2026-08-28T00:00:00.000Z",
    );
  });

  it("falls back to the English changelog when the localized feed fails and caches it under the requested locale", async () => {
    const fetchMock = installFetch({
      [EN_CHANGELOG]: rssFeed([RELEASE_EN]),
    });
    const { service, cacheHelper } = createService();

    const first = await service.getFeed(
      { offset: 0, limit: 10, source: "CHANGELOG", locale: "zh" },
      identity,
    );
    const second = await service.getFeed(
      { offset: 0, limit: 10, source: "CHANGELOG", locale: "zh" },
      identity,
    );

    expect(first.items.map((item) => item.title)).toEqual([RELEASE_EN.title]);
    expect(second.items.map((item) => item.title)).toEqual([RELEASE_EN.title]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      ZH_CHANGELOG,
      EN_CHANGELOG,
    ]);
    expect(cacheHelper.set).toHaveBeenCalledWith(
      "feed:changelog:zh",
      expect.any(Array),
      expect.any(Number),
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps a release once in the merged feed, as the changelog entry", async () => {
    installFetch({
      [EN_CHANGELOG]: rssFeed([RELEASE_EN]),
      [EN_BLOG]: atomFeed([BLOG_POST, BLOG_COPY_OF_RELEASE]),
    });
    const { service } = createService();

    const result = await service.getFeed({ offset: 0, limit: 10 }, identity);

    expect(result.items.map((item) => [item.title, item.source])).toEqual([
      [BLOG_POST.title, FeedSource.BLOG],
      [RELEASE_EN.title, FeedSource.CHANGELOG],
    ]);
  });

  it("excludes releases from a BLOG-only request", async () => {
    installFetch({
      [EN_CHANGELOG]: rssFeed([RELEASE_EN]),
      [EN_BLOG]: atomFeed([BLOG_POST, BLOG_COPY_OF_RELEASE]),
    });
    const { service } = createService();

    const result = await service.getFeed(
      { offset: 0, limit: 10, source: "blog" },
      identity,
    );

    expect(result.items.map((item) => item.title)).toEqual([BLOG_POST.title]);
    expect(result.items.every((item) => item.source === FeedSource.BLOG)).toBe(
      true,
    );
  });

  it("fetches nothing over HTTP for a LEDGER_RSS-only request", async () => {
    const fetchMock = installFetch({});
    const { service } = createService();

    const result = await service.getFeed(
      { offset: 0, limit: 10, source: "LEDGER_RSS" },
      identity,
    );

    expect(result.items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown source instead of returning the merged feed", async () => {
    const fetchMock = installFetch({});
    const { service } = createService();

    await expect(
      service.getFeed({ offset: 0, limit: 10, source: "NEWS" }, identity),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("paginates the filtered list", async () => {
    installFetch({
      [EN_CHANGELOG]: rssFeed([OLDER_RELEASE_EN, RELEASE_EN]),
    });
    const { service } = createService();

    const page = await service.getFeed(
      { offset: 1, limit: 1, source: "CHANGELOG" },
      identity,
    );

    expect(page.items.map((item) => item.title)).toEqual([
      OLDER_RELEASE_EN.title,
    ]);
    expect(page.total).toBe(2);
    expect(page.hasMore).toBe(false);
  });
});
