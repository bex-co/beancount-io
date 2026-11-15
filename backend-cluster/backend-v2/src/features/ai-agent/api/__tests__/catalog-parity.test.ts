import type { Identity } from "@/server/api/identity";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { ApolloServer } from "@apollo/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { pageExtensionsPlugin } from "@/server/graphql/page-extensions-plugin";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  readOnlyToken,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

const config = {
  api: { scopeEnforcement: "enforce" },
  gitea: { hostname: "example.com", externalHttpPort: 443, sshPort: 22 },
} as AppConfig;
const ledger = {
  full_name: "alice/main",
  name: "main",
  empty: false,
  private: true,
  created_at: "2026-01-01",
  updated_at: "2026-09-01",
  size: 42,
  description: "café books",
};
const fields =
  "id name fullName sshUrl httpUrl empty private createdAt updatedAt size description";
const envelope = (data: unknown) => ({ data: { success: true, data } });

let currentResolver: LedgerQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(
  identity: Identity = readOnlyToken,
  appConfig: AppConfig = config,
) {
  const authorizeOrThrow = jest.fn().mockResolvedValue(undefined);
  const ledgers = {
    listLedgers: jest.fn().mockResolvedValue(envelope([ledger])),
    getLedger: jest.fn().mockResolvedValue(envelope(ledger)),
    listUserLedgers: jest.fn().mockResolvedValue(envelope([ledger])),
    searchLedgers: jest.fn().mockResolvedValue(envelope({ data: [ledger] })),
  };
  const factory = {
    getPublicApiClient: async () => ({ ledgers }),
    getApiContext: async () => ({
      favaApiClient: { ledgers },
      favaUser: { username: "alice" },
    }),
  };
  const workflow = new LedgerWorkflow(
    factory as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    appConfig,
    { authorizeOrThrow } as never,
  );
  currentResolver = new LedgerQueryResolver(workflow);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerQueryResolver],
    container: { get: () => currentResolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { workflows: { ledger: workflow } } as unknown as AppLayers,
    appConfig,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
    } as unknown as McpRequestContext,
    appConfig,
  );
  const client = new Client({ name: "catalog-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    ledgers,
    authorizeOrThrow,
    rest: (path: string) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers${path.startsWith("?") || !path ? path : `/${path}`}`,
      ),
    gql: (field: string) =>
      graphql({
        schema,
        source: `{ ${field} { ${fields} } }`,
        contextValue: {
          identity,
          getCurrentIdentity: () => identity,
        },
      }),
    /** One aliased root field through Apollo, so `extensions.page` is filled. */
    gqlPage: async (field: string) => {
      const apollo = new ApolloServer({
        schema,
        plugins: [pageExtensionsPlugin],
      });
      await apollo.start();
      try {
        const response = await apollo.executeOperation(
          { query: `{ rows: ${field} { fullName } }` },
          {
            contextValue: { identity, getCurrentIdentity: () => identity },
          },
        );
        if (response.body.kind !== "single") throw new Error("not single");
        const { data, errors, extensions } = response.body.singleResult;
        expect(errors).toBeUndefined();
        return {
          rows: (data as { rows: { fullName: string }[] }).rows,
          page: (extensions?.page as Record<string, unknown> | undefined)?.rows,
        };
      } finally {
        await apollo.stop();
      }
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("catalog adapters", () => {
  it.each([
    {
      path: "?page=2&limit=7",
      uri: "beancount://catalog/ledgers?page=2&limit=7",
      gql: "listLedgers(page: 2, limit: 7)",
      field: "listLedgers",
      call: "listLedgers",
      args: [{ page: 2, limit: 7 }],
    },
    {
      path: "alice/main",
      uri: "beancount://alice/main/metadata",
      gql: 'getLedger(ledgerId: "alice/main")',
      field: "getLedger",
      call: "getLedger",
      args: ["alice", "main"],
    },
    {
      path: "owned?page=2&limit=7",
      uri: "beancount://catalog/ledgers/owned?page=2&limit=7",
      gql: "listUserOwnedLedgers(page: 2, limit: 7)",
      field: "listUserOwnedLedgers",
      call: "listUserLedgers",
      args: ["alice", { page: 2, limit: 7 }],
    },
    {
      path: "search?q=caf%C3%A9&topic=false&includeDesc=true&uid=2&priorityOwnerId=3&teamId=4&starredBy=5&private=false&isPrivate=true&template=false&archived=false&mode=source&exclusive=true&sort=updated&order=desc&page=2&limit=7",
      uri: "beancount://catalog/ledgers/search?q=caf%C3%A9&topic=false&includeDesc=true&uid=2&priorityOwnerId=3&teamId=4&starredBy=5&private=false&isPrivate=true&template=false&archived=false&mode=source&exclusive=true&sort=updated&order=desc&page=2&limit=7",
      gql: 'searchLedgers(q: "café", topic: false, includeDesc: true, uid: 2, priorityOwnerId: 3, teamId: 4, starredBy: 5, private: false, isPrivate: true, template: false, archived: false, mode: "source", exclusive: true, sort: "updated", order: "desc", page: 2, limit: 7)',
      field: "searchLedgers",
      call: "searchLedgers",
      args: [
        {
          q: "café",
          topic: false,
          include_desc: true,
          uid: 2,
          priority_owner_id: 3,
          team_id: 4,
          starred_by: 5,
          private: false,
          is_private: true,
          template: false,
          archived: false,
          mode: "source",
          exclusive: true,
          sort: "updated",
          order: "desc",
          page: 2,
          limit: 7,
        },
      ],
    },
  ])("preserves $field results and inputs across surfaces", async (entry) => {
    const f = await fixture();
    try {
      const response = await f.rest(entry.path);
      expect(response.status).toBe(200);
      const rest = await response.json();
      const gql = await f.gql(entry.gql);
      expect(gql.errors).toBeUndefined();
      const mcp = await f.client.readResource({ uri: entry.uri });
      const content = mcp.contents[0];
      if (!("text" in content)) throw new Error("Expected JSON resource text");
      expect(JSON.parse(content.text)).toEqual(rest);
      // GraphQL returns only selected fields; REST/MCP may also carry permissions.
      expect(rest).toMatchObject(gql.data?.[entry.field] as object);
      const call = f.ledgers[entry.call as keyof typeof f.ledgers];
      expect(call).toHaveBeenCalledTimes(3);
      for (const args of call.mock.calls) expect(args).toEqual(entry.args);
    } finally {
      await f.close();
    }
  });

  it("says the same thing about what remains on REST, the MCP resource and the MCP tool", async () => {
    const f = await fixture();
    try {
      // One ledger comes back for a page size of one: a full page, so more may follow.
      const response = await f.rest("?page=2&limit=1");
      expect(response.status).toBe(200);
      expect(response.headers.get("x-has-more")).toBe("true");
      expect(response.headers.get("link")).toBe(
        '</api-gateway/v1/ledgers?page=3&limit=1>; rel="next"',
      );
      const expected = {
        returned: 1,
        limit: 1,
        page: 2,
        hasMore: true,
        nextPage: 3,
      };
      const resource = await f.client.readResource({
        uri: "beancount://catalog/ledgers?page=2&limit=1",
      });
      expect(resource.contents[0]._meta).toEqual({ page: expected });
      // A host that shows only content text sees the signal too, in a second
      // item, while the first stays byte-identical to the REST body (t004).
      expect((resource.contents[0] as { text: string }).text).toBe(
        await response.text(),
      );
      expect(resource.contents[1]).toEqual({
        uri: "beancount://catalog/ledgers?page=2&limit=1",
        mimeType: "application/json",
        text: JSON.stringify({ page: expected }),
      });
      expect(resource.contents).toHaveLength(2);
      const tool = await f.client.callTool({
        name: "listLedgers",
        arguments: { page: 2, limit: 1 },
      });
      expect(tool.structuredContent).toMatchObject({
        ok: true,
        page: expected,
      });
    } finally {
      await f.close();
    }
  });

  // w1/m46: a self-hosted stack whose SSH proxy is off serves no Git over SSH,
  // so no surface may hand out an SSH clone address.
  it("returns the same null sshUrl on every surface when no Git over SSH is served", async () => {
    const f = await fixture(readOnlyToken, {
      ...config,
      gitea: { ...config.gitea, sshUnavailable: true },
    } as AppConfig);
    try {
      const rest = await (await f.rest("alice/main")).json();
      const gql = await f.gql('getLedger(ledgerId: "alice/main")');
      expect(gql.errors).toBeUndefined();
      const resource = await f.client.readResource({
        uri: "beancount://alice/main/metadata",
      });
      const tool = await f.client.callTool({
        name: "listLedgers",
        arguments: {},
      });
      const toolLedgers = (
        tool.structuredContent as { result: Array<{ sshUrl: unknown }> }
      ).result;
      expect(rest.sshUrl).toBeNull();
      expect(rest.httpUrl).toBe("https://example.com/alice/main.git");
      expect(
        (gql.data?.getLedger as { sshUrl: unknown } | undefined)?.sshUrl,
      ).toBeNull();
      const text = (resource.contents[0] as { text: string }).text;
      expect(JSON.parse(text).sshUrl).toBeNull();
      expect(toolLedgers[0].sshUrl).toBeNull();
      expect(tool.isError).toBeFalsy();
    } finally {
      await f.close();
    }
  });

  it("refuses catalog access before contacting the ledger service", async () => {
    const f = await fixture();
    f.authorizeOrThrow.mockRejectedValue(new ForbiddenError("Access revoked"));
    try {
      expect((await f.rest("owned")).status).toBe(403);
      expect((await f.gql("listUserOwnedLedgers")).errors).toHaveLength(1);
      await expect(
        f.client.readResource({ uri: "beancount://catalog/ledgers/owned" }),
      ).rejects.toThrow();
      expect(f.ledgers.listUserLedgers).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });
});

// w1/205: the account catalog and the owned-ledgers list took any page and
// limit and echoed it back, while search, the public catalog and REST refused.
describe("list pagination arguments", () => {
  it.each(
    [
      ["catalog/ledgers/owned", "listUserOwnedLedgers", "owned"],
      ["catalog/ledgers", "listLedgers", ""],
    ].flatMap(([uri, field, path]) =>
      [
        ["limit=0", "limit: 0", "limit"],
        ["limit=1000", "limit: 1000", "limit"],
        ["page=-1", "page: -1", "page"],
        ["page=0", "page: 0", "page"],
      ].map(([param, gqlArg, name]) => [uri, field, path, param, gqlArg, name]),
    ),
  )(
    "refuses %s on %s on every surface before listing",
    async (uri, field, path, param, gqlArg, name) => {
      const f = await fixture();
      try {
        const rest = await f.rest(`${path}?${param}`);
        expect(rest.status).toBe(400);
        await expect(
          f.client.readResource({ uri: `beancount://${uri}?${param}` }),
        ).rejects.toMatchObject({ data: { code: "BAD_USER_INPUT" } });
        const gql = await f.gql(`${field}(${gqlArg})`);
        const error = gql.errors?.[0];
        expect(error).toBeDefined();
        expect(formatError(error!.toJSON(), error!).extensions).toMatchObject({
          code: "BAD_USER_INPUT",
          field: name,
        });
        expect(f.ledgers.listLedgers).not.toHaveBeenCalled();
        expect(f.ledgers.listUserLedgers).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

// w23/019: search ignored a bad `order`, `limit=0` and negative ids, unlike
// the catalog's other lists.
describe("search arguments", () => {
  it.each([
    ["order=sideways", 'order: "sideways"', "order"],
    ["limit=0", "limit: 0", "limit"],
    ["limit=1000", "limit: 1000", "limit"],
    ["page=0", "page: 0", "page"],
    ["starredBy=-5", "starredBy: -5", "starredBy"],
  ])(
    "refuses %s on every surface before searching",
    async (param, gqlArg, field) => {
      const f = await fixture();
      try {
        const rest = await f.rest(`search?q=example&${param}`);
        expect(rest.status).toBe(400);
        await expect(
          f.client.readResource({
            uri: `beancount://catalog/ledgers/search?q=example&${param}`,
          }),
        ).rejects.toMatchObject({ data: { code: "BAD_USER_INPUT" } });
        const gql = await f.gql(`searchLedgers(q: "example", ${gqlArg})`);
        const error = gql.errors?.[0];
        expect(error).toBeDefined();
        expect(formatError(error!.toJSON(), error!).extensions).toMatchObject({
          code: "BAD_USER_INPUT",
          field,
        });
        expect(f.ledgers.searchLedgers).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("still passes valid order and bounds through", async () => {
    const f = await fixture();
    try {
      for (const order of ["asc", "desc"]) {
        expect(
          (await f.rest(`search?q=example&order=${order}&limit=100`)).status,
        ).toBe(200);
      }
      expect(f.ledgers.searchLedgers).toHaveBeenCalledTimes(2);
    } finally {
      await f.close();
    }
  });
});

describe("catalogs larger than one ledger-service page", () => {
  const catalog = Array.from({ length: 120 }, (_, i) => {
    const name = `book-${String(i + 1).padStart(3, "0")}`;
    return { ...ledger, full_name: `alice/${name}`, name };
  });
  const fullNames = (from: number, to: number) =>
    catalog.slice(from - 1, to).map((entry) => entry.full_name);
  // The ledger service relays Gitea: at most 50 per page, 30 when `limit` is omitted.
  const paged = ({
    page,
    limit,
  }: { page?: number | null; limit?: number | null } = {}) => {
    const size = Math.min(limit && limit > 0 ? limit : 30, 50);
    const start = ((page && page > 0 ? page : 1) - 1) * size;
    return Promise.resolve(envelope(catalog.slice(start, start + size)));
  };
  const namesOf = (rows: unknown) =>
    (rows as { fullName: string }[]).map((row) => row.fullName);

  async function pagedFixture() {
    const f = await fixture();
    f.ledgers.listLedgers.mockImplementation(paged);
    f.ledgers.listUserLedgers.mockImplementation(
      (_owner: string, query: Parameters<typeof paged>[0]) => paged(query),
    );
    return f;
  }

  async function resourceRows(
    f: Awaited<ReturnType<typeof fixture>>,
    uri: string,
  ) {
    const content = (await f.client.readResource({ uri })).contents[0];
    if (!("text" in content)) throw new Error("Expected JSON resource text");
    return JSON.parse(content.text) as unknown;
  }

  async function toolRows(
    f: Awaited<ReturnType<typeof fixture>>,
    args: Record<string, number>,
  ) {
    const result = await f.client.callTool({
      name: "listLedgers",
      arguments: args,
    });
    expect(result.isError).not.toBe(true);
    return (result.structuredContent as { result: unknown }).result;
  }

  it.each([
    {
      kind: "accessible",
      path: "",
      uri: "beancount://catalog/ledgers",
      field: "listLedgers",
    },
    {
      kind: "owned",
      path: "owned",
      uri: "beancount://catalog/ledgers/owned",
      field: "listUserOwnedLedgers",
    },
  ])(
    "returns the whole $kind catalog when page and limit are omitted",
    async (entry) => {
      const f = await pagedFixture();
      try {
        const response = await f.rest(entry.path);
        expect(response.status).toBe(200);
        const rest = await response.json();
        expect(namesOf(rest)).toEqual(fullNames(1, 120));
        const gql = await f.gql(entry.field);
        expect(gql.errors).toBeUndefined();
        expect(rest).toMatchObject(gql.data?.[entry.field] as object);
        expect(await resourceRows(f, entry.uri)).toEqual(rest);
        if (entry.field === "listLedgers")
          expect(namesOf(await toolRows(f, {}))).toEqual(fullNames(1, 120));
      } finally {
        await f.close();
      }
    },
  );

  // w31/012: a page sent without a size read the host's default page of 30
  // and reported `hasMore: false`, so a catalog of 120 looked like 30.
  it.each([
    {
      kind: "accessible",
      path: "",
      uri: "beancount://catalog/ledgers",
      field: "listLedgers",
    },
    {
      kind: "owned",
      path: "owned",
      uri: "beancount://catalog/ledgers/owned",
      field: "listUserOwnedLedgers",
    },
  ])(
    "says more remains after a full $kind page asked for without a size",
    async (entry) => {
      const f = await pagedFixture();
      try {
        for (const [page, from, to, hasMore] of [
          [1, 1, 30, true],
          [4, 91, 120, true],
          [5, 1, 0, false],
        ] as const) {
          const expected = {
            returned: to - from + 1,
            limit: 30,
            page,
            hasMore,
            ...(hasMore && { nextPage: page + 1 }),
          };
          const response = await f.rest(`${entry.path}?page=${page}`);
          expect(response.status).toBe(200);
          expect(namesOf(await response.json())).toEqual(fullNames(from, to));
          expect(response.headers.get("x-has-more")).toBe(String(hasMore));
          expect(response.headers.get("link")).toBe(
            hasMore
              ? `</api-gateway/v1/ledgers${entry.path ? `/${entry.path}` : ""}?page=${page + 1}&limit=30>; rel="next"`
              : null,
          );
          const resource = await f.client.readResource({
            uri: `${entry.uri}?page=${page}`,
          });
          expect(resource.contents[0]._meta).toEqual({ page: expected });
          const gql = await f.gqlPage(`${entry.field}(page: ${page})`);
          expect(namesOf(gql.rows)).toEqual(fullNames(from, to));
          expect(gql.page).toEqual(expected);
          if (entry.field === "listLedgers") {
            const tool = await f.client.callTool({
              name: "listLedgers",
              arguments: { page },
            });
            expect(tool.structuredContent).toMatchObject({
              ok: true,
              page: expected,
            });
          }
        }
        // The default size is sent, not left to the ledger service.
        const upstream =
          entry.field === "listLedgers"
            ? f.ledgers.listLedgers.mock.calls.map(([query]) => query)
            : f.ledgers.listUserLedgers.mock.calls.map(([, query]) => query);
        expect(upstream.length).toBeGreaterThan(0);
        for (const query of upstream) expect(query.limit).toBe(30);
      } finally {
        await f.close();
      }
    },
  );

  it("returns exactly the documented maximum page size on every surface", async () => {
    const f = await pagedFixture();
    try {
      for (const [page, from, to] of [
        [1, 1, 100],
        [2, 101, 120],
      ]) {
        const response = await f.rest(`?page=${page}&limit=100`);
        expect(response.status).toBe(200);
        expect(namesOf(await response.json())).toEqual(fullNames(from, to));
        const gql = await f.gql(`listLedgers(page: ${page}, limit: 100)`);
        expect(gql.errors).toBeUndefined();
        expect(namesOf(gql.data?.listLedgers)).toEqual(fullNames(from, to));
        expect(
          namesOf(
            await resourceRows(
              f,
              `beancount://catalog/ledgers?page=${page}&limit=100`,
            ),
          ),
        ).toEqual(fullNames(from, to));
        expect(namesOf(await toolRows(f, { page, limit: 100 }))).toEqual(
          fullNames(from, to),
        );
      }
    } finally {
      await f.close();
    }
  });
});

// w31/012: search without a `limit` let the ledger service pick the page size
// (20 for a query naming an owner, 30 otherwise) and reported that first page
// as every match; a `limit` above 50 came back clamped to 50 and read as the
// last page.
describe("searches larger than one default page", () => {
  const catalog = Array.from({ length: 263 }, (_, i) => {
    const name = `co-${String(i + 1).padStart(3, "0")}`;
    return { ...ledger, full_name: `open_ledger/${name}`, name };
  });
  const fullNames = (from: number, to: number) =>
    catalog.slice(from - 1, to).map((entry) => entry.full_name);
  const namesOf = (rows: unknown) =>
    (rows as { fullName: string }[]).map((row) => row.fullName);
  // The ledger service: a word naming an owner is paged there, 20 by default
  // and unclamped; any other search is Gitea's, 30 by default and at most 50.
  const host = ({
    q,
    page,
    limit,
  }: { q?: string; page?: number; limit?: number } = {}) => {
    const size =
      q === "open_ledger" ? (limit ?? 20) : Math.min(limit ?? 30, 50);
    const start = ((page ?? 1) - 1) * size;
    return Promise.resolve(
      envelope({ data: catalog.slice(start, start + size) }),
    );
  };

  async function searchFixture() {
    const f = await fixture();
    f.ledgers.searchLedgers.mockImplementation(host);
    return f;
  }

  it.each([
    { label: "a query naming an owner", q: "open_ledger" },
    { label: "no query", q: undefined },
  ])(
    "reads a page of 30 for $label and says more remains on every surface",
    async ({ q }) => {
      const f = await searchFixture();
      const query = q ? `q=${q}` : "";
      try {
        const expected = {
          returned: 30,
          limit: 30,
          page: 1,
          hasMore: true,
          nextPage: 2,
        };
        const response = await f.rest(`search${query ? `?${query}` : ""}`);
        expect(response.status).toBe(200);
        const rest = await response.json();
        expect(namesOf(rest)).toEqual(fullNames(1, 30));
        expect(response.headers.get("x-has-more")).toBe("true");
        expect(response.headers.get("link")).toBe(
          `</api-gateway/v1/ledgers/search?${query ? `${query}&` : ""}page=2&limit=30>; rel="next"`,
        );
        const uri = `beancount://catalog/ledgers/search${query ? `?${query}` : ""}`;
        const resource = await f.client.readResource({ uri });
        const [content, signal] = resource.contents;
        expect((content as { text: string }).text).toBe(JSON.stringify(rest));
        expect(content._meta).toEqual({ page: expected });
        expect(signal).toEqual({
          uri,
          mimeType: "application/json",
          text: JSON.stringify({ page: expected }),
        });
        const gql = await f.gqlPage(
          q ? `searchLedgers(q: "${q}")` : "searchLedgers",
        );
        expect(namesOf(gql.rows)).toEqual(fullNames(1, 30));
        expect(gql.page).toEqual(expected);
        for (const [args] of f.ledgers.searchLedgers.mock.calls)
          expect(args).toEqual({ ...(q && { q }), limit: 30 });
      } finally {
        await f.close();
      }
    },
  );

  it("reaches every match by following the signal from an unpaged search", async () => {
    const f = await searchFixture();
    try {
      const viaLink: string[] = [];
      let next: string | null = "search?q=open_ledger";
      while (next) {
        const response = await f.rest(next);
        viaLink.push(...namesOf(await response.json()));
        const link = response.headers.get("link");
        next =
          link && link.replace(/^<\/api-gateway\/v1\/ledgers\/(.*)>.*$/, "$1");
      }
      expect(viaLink).toEqual(fullNames(1, 263));

      const viaResource: string[] = [];
      let page: number | undefined = 1;
      while (page) {
        const query: string = page > 1 ? `&page=${page}` : "";
        const { contents } = await f.client.readResource({
          uri: `beancount://catalog/ledgers/search?q=open_ledger${query}`,
        });
        const { text, _meta } = contents[0] as { text: string; _meta: object };
        viaResource.push(...namesOf(JSON.parse(text)));
        page = (_meta as { page: { nextPage?: number } }).page.nextPage;
      }
      expect(viaResource).toEqual(fullNames(1, 263));
    } finally {
      await f.close();
    }
  });

  it("serves a limit above the host's page size in full on every surface", async () => {
    const f = await searchFixture();
    try {
      for (const [page, from, to, hasMore] of [
        [1, 1, 100, true],
        [2, 101, 200, true],
        [3, 201, 263, false],
      ] as const) {
        const response = await f.rest(`search?q=co&page=${page}&limit=100`);
        expect(response.status).toBe(200);
        expect(namesOf(await response.json())).toEqual(fullNames(from, to));
        expect(response.headers.get("x-has-more")).toBe(String(hasMore));
        const [content] = (
          await f.client.readResource({
            uri: `beancount://catalog/ledgers/search?q=co&page=${page}&limit=100`,
          })
        ).contents;
        expect(namesOf(JSON.parse((content as { text: string }).text))).toEqual(
          fullNames(from, to),
        );
        expect(content._meta).toMatchObject({ page: { hasMore } });
        const gql = await f.gqlPage(
          `searchLedgers(q: "co", page: ${page}, limit: 100)`,
        );
        expect(namesOf(gql.rows)).toEqual(fullNames(from, to));
        expect(gql.page).toMatchObject({ hasMore });
      }
    } finally {
      await f.close();
    }
  });
});

describe("pinned catalog disclosure", () => {
  it.each([1, 2])(
    "returns only the pinned ledger on catalog page %s",
    async (page) => {
      const f = await fixture(pinnedReadToken);
      try {
        const response = await f.rest(`?page=${page}&limit=10`);
        expect(response.status).toBe(200);
        const rest = await response.json();
        const gql = await f.gql(`listLedgers(page: ${page}, limit: 10)`);
        expect(gql.errors).toBeUndefined();
        const resource = await f.client.readResource({
          uri: `beancount://catalog/ledgers?page=${page}&limit=10`,
        });
        const content = resource.contents[0];
        if (!("text" in content))
          throw new Error("Expected JSON resource text");
        expect(JSON.parse(content.text)).toEqual(rest);
        expect(rest).toMatchObject(gql.data?.listLedgers as object);
        expect(rest).toHaveLength(page === 1 ? 1 : 0);
        if (page === 1) expect(rest[0].fullName).toBe("alice/main");
        expect(f.ledgers.listLedgers).not.toHaveBeenCalled();
        expect(f.ledgers.getLedger).toHaveBeenCalledTimes(3);
      } finally {
        await f.close();
      }
    },
  );

  it.each(["owned", "search"])(
    "filters other ledgers from the pinned %s catalog",
    async (kind) => {
      const f = await fixture(pinnedReadToken);
      const mixed = [
        ledger,
        { ...ledger, full_name: "alice/other", name: "other" },
      ];
      f.ledgers.listUserLedgers.mockResolvedValue(envelope(mixed));
      f.ledgers.searchLedgers.mockResolvedValue(envelope({ data: mixed }));
      try {
        const response = await f.rest(kind);
        const rest = await response.json();
        const field =
          kind === "owned" ? "listUserOwnedLedgers" : "searchLedgers";
        const gql = await f.gql(field);
        expect(gql.errors).toBeUndefined();
        const resource = await f.client.readResource({
          uri: `beancount://catalog/ledgers/${kind}`,
        });
        const content = resource.contents[0];
        if (!("text" in content))
          throw new Error("Expected JSON resource text");
        expect(JSON.parse(content.text)).toEqual(rest);
        expect(rest).toMatchObject(gql.data?.[field] as object);
        expect(
          rest.map((entry: { fullName: string }) => entry.fullName),
        ).toEqual(["alice/main"]);
      } finally {
        await f.close();
      }
    },
  );
});
