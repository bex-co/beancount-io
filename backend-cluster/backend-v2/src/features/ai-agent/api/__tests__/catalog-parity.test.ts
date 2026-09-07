import type { Identity } from "@/server/api/identity";
import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerQueryResolver } from "@/features/ledger/api/resolvers/ledger-resolver.query";
import { LedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
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

async function fixture(identity: Identity = readOnlyToken) {
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
    config,
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
    config,
    { apiKeys: false },
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      ledgerWorkflow: workflow,
    } as unknown as McpRequestContext,
    config,
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
