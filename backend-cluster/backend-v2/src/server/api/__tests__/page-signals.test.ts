import http from "node:http";
import { ApolloServer } from "@apollo/server";
import Koa from "koa";
import Router from "@koa/router";
import type { ZodTypeAny } from "zod";
import { z } from "@/shared/zod-openapi-setup";

import { MCP_RESOURCES } from "@/features/ai-agent/api/mcp-resources";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import { COLLABORATOR_ROUTES } from "@/features/ledger/api/rest/v1/collaborators-handler";
import { LEDGER_ROUTES } from "@/features/ledger/api/rest/v1/ledgers-handler";
import { PUBLIC_KEY_ROUTES } from "@/features/ledger/api/rest/v1/public-keys-handler";
import { REPORT_ROUTES } from "@/features/ledger/api/rest/v1/reports-handler";
import { COMMIT_ROUTES } from "@/features/gitea/commits/api/commit-reads";
import { SOCIAL_V1_ROUTES } from "@/features/gitea/user-profile/api/social-read-routes";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { PAGE_RESPONSE_HEADERS } from "@/server/rest/page-headers";
import { registerV1Routes, v1Route } from "@/server/rest/v1-route";
import {
  PAGED_GRAPHQL_FIELDS,
  pageExtensionsPlugin,
} from "@/server/graphql/page-extensions-plugin";
import {
  PAGED_READ_NAMES,
  pagedResourceContent,
  pageSignal,
} from "../page-signals";

const PAGING_KEYS = ["limit", "offset", "page"];
const pagingParams = (schema: unknown): string[] => {
  const shape = (schema as { shape?: Record<string, unknown> } | undefined)
    ?.shape;
  return PAGING_KEYS.filter((key) => shape && key in shape);
};

describe("every paginated read carries the signal", () => {
  const routes = [
    ...REPORT_ROUTES,
    ...LEDGER_ROUTES,
    ...COMMIT_ROUTES,
    ...SOCIAL_V1_ROUTES,
    ...COLLABORATOR_ROUTES,
    ...PUBLIC_KEY_ROUTES,
  ] as readonly {
    path: string;
    query?: unknown;
    pagedRead?: string;
  }[];

  it("sets the headers on each REST route that takes a page size", () => {
    const missing = routes
      .filter((route) => pagingParams(route.query).length > 0)
      .filter((route) => !route.pagedRead)
      .map((route) => route.path);
    expect(missing).toEqual([]);
    // A descriptor-built route names its read whether or not it is paged
    // (source files, commit details); an unregistered name must take no page size.
    for (const route of routes)
      if (route.pagedRead && !PAGED_READ_NAMES.includes(route.pagedRead))
        expect(pagingParams(route.query)).toEqual([]);
  });

  it("carries it on each MCP resource that takes a page size", () => {
    const missing = MCP_RESOURCES.filter((resource) =>
      (resource.queryNames ?? []).some((name) => PAGING_KEYS.includes(name)),
    )
      .filter((resource) => !PAGED_READ_NAMES.includes(resource.name))
      .map((resource) => resource.name);
    expect(missing).toEqual([]);
  });

  it("carries it on each MCP tool that takes a page size", () => {
    const missing = MCP_TOOLS.filter(
      (tool) => pagingParams(tool.inputSchema as ZodTypeAny).length > 0,
    )
      .filter((tool) => !PAGED_READ_NAMES.includes(tool.name))
      .map((tool) => tool.name);
    expect(missing).toEqual([]);
  });

  it("names a read GraphQL, REST or an MCP tool actually exposes", () => {
    const exposed = new Set<string>([
      ...routes.flatMap((route) => (route.pagedRead ? [route.pagedRead] : [])),
      ...Object.values(PAGED_GRAPHQL_FIELDS).map((field) => field.read),
      ...MCP_TOOLS.map((tool) => tool.name),
      ...MCP_RESOURCES.map((resource) => resource.name),
    ]);
    expect(PAGED_READ_NAMES.filter((name) => !exposed.has(name))).toEqual([]);
    for (const field of Object.values(PAGED_GRAPHQL_FIELDS))
      expect(PAGED_READ_NAMES).toContain(field.read);
  });
});

describe("pageSignal", () => {
  it("reads the journal's total: more remains until offset plus rows reaches it", () => {
    const rows = (n: number) => ({ total: 45, data: new Array(n).fill({}) });
    expect(pageSignal("ledgerJournal", { limit: 20 }, rows(20))).toMatchObject({
      hasMore: true,
      nextOffset: 20,
      total: 45,
    });
    expect(
      pageSignal("ledgerJournal", { limit: 20, offset: 40 }, rows(5)),
    ).toMatchObject({ hasMore: false, total: 45 });
    // The MCP tool and the resource are the same read.
    expect(pageSignal("listLedgerEntries", {}, rows(20))?.limit).toBe(20);
  });

  it("derives the plaintext journal's page from its truncated flag", () => {
    expect(
      pageSignal(
        "ledgerPlaintextJournal",
        { limit: 200 },
        { content: "", total: 450, truncated: true },
      ),
    ).toMatchObject({ returned: 200, hasMore: true, nextOffset: 200 });
    expect(
      pageSignal(
        "ledgerPlaintextJournal",
        { limit: 200, offset: 400 },
        { content: "", total: 450, truncated: false },
      ),
    ).toMatchObject({ returned: 50, hasMore: false });
  });

  it("treats a full numbered page as possibly followed by another", () => {
    const commits = new Array(30).fill({});
    expect(pageSignal("ledgerCommits", {}, commits)).toMatchObject({
      hasMore: true,
      nextPage: 2,
      limit: 30,
    });
    expect(
      pageSignal("ledgerCommits", { page: 2 }, commits.slice(0, 7)),
    ).toMatchObject({ hasMore: false, page: 2 });
  });

  it("says nothing when the read cannot know", () => {
    // A catalog page past the first, asked for without a size, has no page size to compare to.
    expect(pageSignal("ownedLedgers", { page: 2 }, [{}])).toBeUndefined();
    expect(pageSignal("ledgerJournal", {}, "not rows")).toBeUndefined();
    expect(pageSignal("notAPagedRead", {}, [])).toBeUndefined();
  });

  it("reads every ledger as complete when neither page nor limit is sent", () => {
    expect(pageSignal("accessibleLedgers", {}, [{}, {}])).toEqual({
      returned: 2,
      page: 1,
      hasMore: false,
    });
  });
});

describe("pagedResourceContent", () => {
  it("puts the signal in the content's _meta and leaves the text alone", () => {
    const result = new Array(30).fill({ sha: "a" });
    const content = pagedResourceContent("ledgerCommits", {}, result);
    expect(content).toMatchObject({
      mimeType: "application/json",
      _meta: { page: { hasMore: true, nextPage: 2 } },
    });
    expect(JSON.parse((content as { text: string }).text)).toEqual(result);
  });

  it("stays a plain string for a read that is not paginated", () => {
    expect(pagedResourceContent("ledgerMetadata", {}, { a: 1 })).toBe(
      '{"a":1}',
    );
  });
});

describe("REST headers", () => {
  const identity: Identity = {
    userId: "usr_page",
    method: "session",
    scopes: new Set(),
  };
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    const router = new Router();
    router.use(restErrorMiddleware());
    router.use(async (ctx, next) => {
      ctx.state.identity = identity;
      await next();
    });
    const rows = (n: number) => new Array(n).fill({ sha: "a" });
    // A route accepts only the query it declares (w1/218).
    const query = z
      .object({ branch: z.string(), page: z.string(), limit: z.string() })
      .partial()
      .strict();
    registerV1Routes(
      router,
      { layers: {} as AppLayers, config: {} as AppConfig },
      [
        v1Route({
          method: "get",
          path: "/api-gateway/v1/paged/full",
          summary: "A full page",
          description: "A full page of commits.",
          pagedRead: "ledgerCommits",
          query,
          responses: { 200: { description: "ok" } },
          handler: async () => rows(30),
        }),
        v1Route({
          method: "get",
          path: "/api-gateway/v1/paged/last",
          summary: "A short page",
          description: "A short last page of commits.",
          pagedRead: "ledgerCommits",
          query,
          responses: { 200: { description: "ok" } },
          handler: async () => rows(4),
        }),
        v1Route({
          method: "get",
          path: "/api-gateway/v1/paged/journal",
          summary: "A journal page",
          description: "A journal page with a total.",
          pagedRead: "ledgerJournal",
          query,
          responses: { 200: { description: "ok" } },
          handler: async () => ({ total: 45, data: rows(20) }),
        }),
        v1Route({
          method: "get",
          path: "/api-gateway/v1/paged/not-paged",
          summary: "Not a paged read",
          description: "A plain read.",
          responses: { 200: { description: "ok" } },
          handler: async () => rows(30),
        }),
      ],
    );
    server = http.createServer(new Koa().use(router.routes()).callback());
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve()),
    );
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("says more remains, with a Link to the next page, beside an unchanged body", async () => {
    const response = await fetch(
      `${base}/api-gateway/v1/paged/full?branch=main`,
    );
    expect(response.headers.get("x-has-more")).toBe("true");
    expect(response.headers.get("x-total-count")).toBeNull();
    expect(response.headers.get("link")).toBe(
      '</api-gateway/v1/paged/full?branch=main&page=2&limit=30>; rel="next"',
    );
    expect(await response.json()).toHaveLength(30);
  });

  it("says nothing more remains on the last page and sends no Link", async () => {
    const response = await fetch(`${base}/api-gateway/v1/paged/last?page=3`);
    expect(response.headers.get("x-has-more")).toBe("false");
    expect(response.headers.get("link")).toBeNull();
  });

  it("reports the total when the read knows it, and steps the offset", async () => {
    const response = await fetch(
      `${base}/api-gateway/v1/paged/journal?limit=20`,
    );
    expect(response.headers.get("x-total-count")).toBe("45");
    expect(response.headers.get("link")).toContain("offset=20");
  });

  it("exposes to browsers exactly the headers it sends", async () => {
    // A full journal page with a total sends all three.
    const response = await fetch(
      `${base}/api-gateway/v1/paged/journal?limit=20`,
    );
    const sent = ["x-has-more", "x-total-count", "link"].filter((name) =>
      response.headers.has(name),
    );
    expect(sent.sort()).toEqual(
      PAGE_RESPONSE_HEADERS.map((name) => name.toLowerCase()).sort(),
    );
  });

  it("leaves a read without a registered signal untouched", async () => {
    const response = await fetch(`${base}/api-gateway/v1/paged/not-paged`);
    expect(response.headers.get("x-has-more")).toBeNull();
  });
});

describe("GraphQL extensions", () => {
  const typeDefs = `type Query {
    listCommits(page: Int, limit: Int): [String!]!
    getLedgerJournal(query: Q): J!
    getFeed: [String!]!
  }
  input Q { limit: Int, offset: Int }
  type J { total: Int!, data: [String!]! }`;
  const server = new ApolloServer({
    typeDefs,
    resolvers: {
      Query: {
        listCommits: (_: unknown, args: { limit?: number }) =>
          new Array(args.limit ?? 30).fill("c"),
        getLedgerJournal: () => ({ total: 45, data: new Array(20).fill("e") }),
        getFeed: () => ["x"],
      },
    },
    plugins: [pageExtensionsPlugin],
  });
  beforeAll(() => server.start());
  afterAll(() => server.stop());

  const run = async (query: string) => {
    const response = await server.executeOperation({ query });
    if (response.body.kind !== "single") throw new Error("not single");
    return response.body.singleResult;
  };

  it("keeps the data as it was and adds the signal under the response key", async () => {
    const result = await run(
      "{ listCommits(page: 1, limit: 3) getLedgerJournal(query: {limit: 20}) { total } }",
    );
    expect(result.data).toEqual({
      listCommits: ["c", "c", "c"],
      getLedgerJournal: { total: 45 },
    });
    expect(result.extensions?.page).toEqual({
      listCommits: expect.objectContaining({
        hasMore: true,
        nextPage: 2,
        returned: 3,
      }),
      getLedgerJournal: expect.objectContaining({
        hasMore: true,
        nextOffset: 20,
        total: 45,
      }),
    });
  });

  it("keys by the alias, and adds nothing for a read that is not paged", async () => {
    const aliased = await run("{ older: listCommits(page: 2, limit: 2) }");
    expect(Object.keys(aliased.extensions?.page as object)).toEqual(["older"]);
    expect((await run("{ getFeed }")).extensions?.page).toBeUndefined();
  });
});
