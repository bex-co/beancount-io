import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { config } from "@/config";
import { setLedgersHandler } from "@/api/ledgers";
import { restErrorMiddleware } from "@/server/error-middleware";
import { clearMemoizedGiteaClients } from "@/features/gitea/service/gitea-client-factory";
import {
  mightBeOwnerName,
  normalizeSearchText,
  readMatches,
  repoMatchesTerm,
  searchTerms,
  type SearchPage,
} from "@/api/ledger-search";

const AUTH = `Basic ${Buffer.from("alice:synthetic-password").toString("base64")}`;

type Repo = {
  id: number;
  name: string;
  full_name: string;
  owner: number;
  description: string;
};

const repo = (
  id: number,
  owner: string,
  ownerId: number,
  name: string,
  description = "",
): Repo => ({
  id,
  name,
  full_name: `${owner}/${name}`,
  owner: ownerId,
  description,
});

// Gitea, reduced to the rule that matters here: `q` is ONE substring of the
// repository name (or, with includeDesc, its description), and `uid` limits the
// search to one owner.
const REPOS = [
  repo(1, "open_ledger", 7, "crypto-example", "Crypto sample"),
  repo(2, "open_ledger", 7, "kroger", "Groceries"),
  repo(3, "open_ledger", 7, "stocks-example", "Stocks sample"),
  repo(4, "alice", 1, "my-book", "Household budget"),
  repo(5, "bob", 2, "example-ledger", "Work"),
  repo(6, "elsewhere", 9, "demo", "A demo of open_ledger"),
  // An owner with more ledgers than one upstream page holds.
  ...Array.from({ length: 130 }, (_, i) =>
    repo(100 + i, "gallery", 11, `book-${String(i + 1).padStart(3, "0")}`),
  ),
];
const OWNERS: Record<string, number> = {
  open_ledger: 7,
  alice: 1,
  bob: 2,
  gallery: 11,
};

function wire(r: Repo): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    full_name: r.full_name,
    private: false,
    empty: false,
    size: 1,
    description: r.description,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    permissions: null,
  };
}

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("GET /ledgers/search reads the query as words (w21/245)", () => {
  const upstreamCalls: string[] = [];
  // Searches Gitea is answering right now, and the most at once.
  let inFlight = 0;
  let mostInFlight = 0;
  let searchDelayMs = 0;
  let upstream: http.Server;
  let ledgerServer: http.Server;
  let ledgerUrl: string;
  const originalGiteaUrl = config.gitea.baseUrl;

  beforeAll(async () => {
    upstream = http.createServer((request, response) => {
      const url = new URL(request.url!, "http://upstream");
      upstreamCalls.push(`${url.pathname}${url.search}`);
      const send = (status: number, data: unknown) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(data));
      };
      const user = /^\/api\/v1\/users\/([^/]+)$/.exec(url.pathname);
      if (user) {
        const id = OWNERS[decodeURIComponent(user[1])];
        return id === undefined
          ? send(404, { message: "user does not exist" })
          : send(200, { id, login: user[1] });
      }
      if (url.pathname === "/api/v1/repos/search") {
        inFlight += 1;
        mostInFlight = Math.max(mostInFlight, inFlight);
        const answer = () => {
          inFlight -= 1;
          searchRepos(url, send);
        };
        return void (searchDelayMs > 0
          ? setTimeout(answer, searchDelayMs)
          : answer());
      }
      return send(500, { message: `Unexpected: ${request.url}` });
    });
    const searchRepos = (
      url: URL,
      send: (status: number, data: unknown) => void,
    ) => {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const uid = url.searchParams.get("uid");
      const desc = url.searchParams.get("includeDesc") === "true";
      const page = Number(url.searchParams.get("page") ?? "1");
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const found = REPOS.filter(
        (r) =>
          (uid === null || r.owner === Number(uid)) &&
          (!q ||
            r.name.toLowerCase().includes(q) ||
            (desc && r.description.toLowerCase().includes(q))),
      );
      send(200, {
        ok: true,
        data: found.slice((page - 1) * limit, page * limit).map(wire),
      });
    };
    config.gitea.baseUrl = await listen(upstream);
    clearMemoizedGiteaClients();
    const app = new Koa();
    const router = new Router();
    setLedgersHandler(router);
    app.use(restErrorMiddleware()).use(router.routes());
    ledgerServer = http.createServer(app.callback());
    ledgerUrl = await listen(ledgerServer);
  });

  beforeEach(() => {
    upstreamCalls.length = 0;
    mostInFlight = 0;
    searchDelayMs = 0;
  });

  afterAll(async () => {
    await Promise.all(
      [ledgerServer, upstream].map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    config.gitea.baseUrl = originalGiteaUrl;
    clearMemoizedGiteaClients();
  });

  const search = async (query: string): Promise<string[]> => {
    const response = await fetch(`${ledgerUrl}/ledgers/search?${query}`, {
      headers: { authorization: AUTH },
      signal: AbortSignal.timeout(5000),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: { data: { full_name: string }[] };
    };
    return body.data.data.map((r) => r.full_name);
  };

  it("finds crypto-example for the words 'crypto example'", async () => {
    expect(await search("q=crypto%20example&include_desc=true")).toEqual([
      "open_ledger/crypto-example",
    ]);
  });

  it("lists an owner's ledgers, then ledgers that merely mention it", async () => {
    expect(await search("q=open_ledger&include_desc=true")).toEqual([
      "elsewhere/demo",
      "open_ledger/crypto-example",
      "open_ledger/kroger",
      "open_ledger/stocks-example",
    ]);
  });

  it("narrows an owner's ledgers by another word", async () => {
    expect(await search("q=open_ledger%20crypto&include_desc=true")).toEqual([
      "open_ledger/crypto-example",
    ]);
  });

  it("needs every word", async () => {
    expect(await search("q=crypto%20household&include_desc=true")).toEqual([]);
  });

  it("pages the matches, not Gitea's pages", async () => {
    const first = await search(
      "q=open_ledger&include_desc=true&limit=2&page=1",
    );
    const second = await search(
      "q=open_ledger&include_desc=true&limit=2&page=2",
    );
    expect(first).toEqual(["elsewhere/demo", "open_ledger/crypto-example"]);
    expect(second).toEqual([
      "open_ledger/kroger",
      "open_ledger/stocks-example",
    ]);
    expect(
      await search("q=open_ledger&include_desc=true&limit=2&page=3"),
    ).toEqual([]);
  });

  it("leaves a single word that names no owner to Gitea, as before", async () => {
    expect(await search("q=example")).toEqual([
      "open_ledger/crypto-example",
      "open_ledger/stocks-example",
      "bob/example-ledger",
    ]);
    expect(await search("q=crypto")).toEqual(["open_ledger/crypto-example"]);
  });

  it("does not expand an owner the caller already pinned with uid", async () => {
    expect(await search("q=open_ledger&uid=7")).toEqual([]);
    expect(
      upstreamCalls.some((call) => call.startsWith("/api/v1/users/")),
    ).toBe(false);
  });

  it("passes an empty query straight through", async () => {
    expect((await search("limit=3")).length).toBe(3);
    expect(await search("q=%20%20&limit=2")).toEqual([
      "open_ledger/crypto-example",
      "open_ledger/kroger",
    ]);
  });

  /** The repository searches Gitea was asked for, as `<search> page=<n>`. */
  const searchesRead = (): string[] =>
    upstreamCalls
      .filter((call) => call.startsWith("/api/v1/repos/search?"))
      .map((call) => {
        const params = new URL(call, "http://upstream").searchParams;
        const search = params.has("uid")
          ? `uid=${params.get("uid")}`
          : `q=${params.get("q")}`;
        return `${search} page=${params.get("page")}`;
      })
      .sort();
  const book = (n: number) => `gallery/book-${String(n).padStart(3, "0")}`;

  it("reads only the upstream pages an owner's first page needs (w2/135)", async () => {
    const first = await search("q=gallery&limit=50&page=1");
    expect(first).toEqual(Array.from({ length: 50 }, (_, i) => book(i + 1)));
    expect(searchesRead()).toEqual(["q=gallery page=1", "uid=11 page=1"]);
  });

  it("requests the pages a later page needs together, not in turn (w2/135)", async () => {
    searchDelayMs = 100;
    const third = await search("q=gallery&limit=50&page=3");
    expect(third).toEqual(Array.from({ length: 30 }, (_, i) => book(101 + i)));
    expect(searchesRead()).toEqual([
      "q=gallery page=1",
      "q=gallery page=2",
      "q=gallery page=3",
      "uid=11 page=1",
      "uid=11 page=2",
      "uid=11 page=3",
    ]);
    expect(mostInFlight).toBe(6);
  });

  it("answers every page as the same window of the whole result (w2/135)", async () => {
    const all = await search("q=gallery&limit=500&page=1");
    expect(all).toEqual(Array.from({ length: 130 }, (_, i) => book(i + 1)));
    for (const limit of [7, 20, 50, 60]) {
      for (let page = 1; page <= Math.ceil(130 / limit) + 1; page++) {
        expect(await search(`q=gallery&limit=${limit}&page=${page}`)).toEqual(
          all.slice((page - 1) * limit, page * limit),
        );
      }
    }
  });
});

describe("readMatches (w2/135)", () => {
  // Two searches that overlap, as a word search overlaps an owner's ledgers.
  const SEARCHES = [
    Array.from({ length: 23 }, (_, i) => ({ id: i * 3 })),
    Array.from({ length: 41 }, (_, i) => ({ id: i * 2 })),
  ];
  const keep = (repo: { id: number }) => repo.id % 5 !== 0;
  const pageSize = 10;
  const maxPages = 4;

  const reader = () => {
    const reads: string[] = [];
    const readPage = async (
      search: number,
      page: number,
    ): Promise<SearchPage<{ id: number }>> => {
      reads.push(`${search}:${page}`);
      return {
        ok: search === 0 ? null : true,
        data: SEARCHES[search].slice((page - 1) * pageSize, page * pageSize),
      };
    };
    return { reads, readPage };
  };

  // What reading every page of every search finds: first occurrences, kept.
  const seen = new Set<number>();
  const everything = SEARCHES.flatMap((repos) =>
    repos.slice(0, pageSize * maxPages),
  )
    .filter((repo) => !seen.has(repo.id) && Boolean(seen.add(repo.id)))
    .filter(keep)
    .map((repo) => repo.id);

  it("finds the same first matches as reading every page", async () => {
    for (let wanted = 0; wanted <= everything.length + 2; wanted++) {
      const { readPage } = reader();
      const { matches, ok } = await readMatches(2, readPage, {
        keep,
        wanted,
        pageSize,
        maxPages,
      });
      expect(matches.slice(0, wanted).map((repo) => repo.id)).toEqual(
        everything.slice(0, wanted),
      );
      expect(ok).toBe(true);
    }
  });

  it("reads no page past the ones the wanted matches come from", async () => {
    const { reads, readPage } = reader();
    await readMatches(2, readPage, { keep, wanted: 5, pageSize, maxPages });
    expect(reads.sort()).toEqual(["0:1", "1:1"]);
  });

  it("reads the pages the window spans from every search at once", async () => {
    const { reads, readPage } = reader();
    const { matches } = await readMatches(2, readPage, {
      keep,
      wanted: 25,
      pageSize,
      maxPages,
    });
    expect(matches.slice(0, 25).map((repo) => repo.id)).toEqual(
      everything.slice(0, 25),
    );
    expect(reads.sort()).toEqual(["0:1", "0:2", "0:3", "1:1", "1:2", "1:3"]);
  });

  it("reads every page of every search, up to maxPages, for an endless window", async () => {
    const { reads, readPage } = reader();
    const { matches } = await readMatches(2, readPage, {
      keep,
      wanted: Infinity,
      pageSize,
      maxPages,
    });
    expect(matches.map((repo) => repo.id)).toEqual(everything);
    expect(reads.sort()).toEqual([
      "0:1",
      "0:2",
      "0:3",
      "0:4",
      "1:1",
      "1:2",
      "1:3",
      "1:4",
    ]);
  });
});

describe("ledger search words", () => {
  it("splits a query into words and reads hyphens as breaks", () => {
    expect(searchTerms("  crypto   example ")).toEqual(["crypto", "example"]);
    expect(searchTerms(undefined)).toEqual([]);
    expect(normalizeSearchText("Open_Ledger/Crypto-Example")).toBe(
      "open ledger crypto example",
    );
    expect(
      repoMatchesTerm(
        { full_name: "open_ledger/crypto-example" },
        "ledger crypto",
      ),
    ).toBe(true);
    expect(
      repoMatchesTerm({ full_name: "a/b", description: "Household" }, "house"),
    ).toBe(true);
    expect(repoMatchesTerm({ full_name: "a/b" }, "zzz")).toBe(false);
  });

  it("only looks up words that can be an owner name", () => {
    expect(mightBeOwnerName("open_ledger")).toBe(true);
    expect(mightBeOwnerName("a/b")).toBe(false);
    expect(mightBeOwnerName("-x")).toBe(false);
    expect(mightBeOwnerName("a".repeat(40))).toBe(false);
  });
});
