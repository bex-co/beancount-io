import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { ApolloServer } from "@apollo/server";
import { buildSchema } from "type-graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidQueryResolver } from "@/features/plaid/api/resolvers/plaid-resolver.query";
import { AuthorizationService } from "@/server/api/authorization";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { pageExtensionsPlugin } from "@/server/graphql/page-extensions-plugin";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/m44/t003. A first bank sync stages months of history, and since
 * `f58c89d64` the whole staged list also lands in the MCP text block a
 * text-only host reads. `limit` and `page` now bound the read on every
 * surface, each says whether more remain, and omitting `limit` still returns
 * every row for the dashboard's Bank Sync table. The service here is real:
 * the adapters, the slicing and the argument bounds all run.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};

// 250 staged rows, newest first, as the model returns them.
const STAGED = Array.from({ length: 250 }, (_, i) => ({
  id: `pbtx_${String(i).padStart(3, "0")}`,
  plaidAccountId: "pacc_1",
  transactionId: `txn_${String(i).padStart(3, "0")}`,
  date: new Date(Date.UTC(2026, 10, 1) - i * 86_400_000)
    .toISOString()
    .slice(0, 10),
  amount: 10 + i,
  merchantName: `PAYEE ${i}`,
  name: `PAYEE ${i}`,
  category: null,
  isPending: false,
  syncedToLedger: false,
  createdAt: new Date("2026-11-01T00:00:00Z"),
}));
const ids = (from: number, to: number) =>
  STAGED.slice(from, to).map((row) => row.transactionId);

let resolver: PlaidQueryResolver;
let apollo: ApolloServer;
beforeAll(async () => {
  const schema = await buildSchema({
    resolvers: [PlaidQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  apollo = new ApolloServer({
    schema,
    plugins: [pageExtensionsPlugin],
    formatError,
  });
  await apollo.start();
});
afterAll(() => apollo.stop());

async function fixture() {
  const authorization = new AuthorizationService(
    { check: async () => true },
    jest.fn(),
  );
  const models = {
    plaidAccount: {
      getEnabledByLedgerRepoIdAndUserId: jest.fn(async () => [
        {
          id: "pacc_1",
          accountName: "Checking",
          institutionName: "First Bank",
          ledgerAccount: "Assets:Bank:Checking",
        },
      ]),
    },
    plaidTransaction: {
      getUnsyncedByAccountIds: jest.fn(async () => STAGED),
    },
  };
  const favaClientFactory = {
    getAdminClient: () => ({
      ledgers: {
        getLedger: async () => ({
          data: { success: true, data: { id: 42, full_name: LEDGER } },
        }),
      },
    }),
  };
  const service = new PlaidItemService(
    {} as never,
    favaClientFactory as never,
    models as never,
    {} as never,
    authorization,
  );
  resolver = new PlaidQueryResolver(service);
  const rest = await startV1TestServer(
    { services: { plaidItem: service } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { plaidItem: service },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "staged-paging", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  /** One read on every surface, reduced to its row ids, page signal and code. */
  const read = async (query: { page?: number; limit?: number }) => {
    const search = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    ).toString();
    const suffix = search ? `?${search}` : "";

    const tool = await client.callTool({
      name: "listStagedBankTransactions",
      arguments: { ledger: LEDGER, ...query },
    });
    const structured = tool.structuredContent as {
      ok: boolean;
      result?: { transactionId: string }[];
      page?: unknown;
      error?: { code: string };
    };

    let resource: { ids?: string[]; page?: unknown; code?: string };
    try {
      const read = await client.readResource({
        uri: `beancount://${LEDGER}/bank-transactions/unsynced${suffix}`,
      });
      const content = read.contents[0] as { text: string; _meta?: unknown };
      resource = {
        ids: (JSON.parse(content.text) as { transactionId: string }[]).map(
          (row) => row.transactionId,
        ),
        page: (content._meta as { page?: unknown } | undefined)?.page,
      };
    } catch (error) {
      resource = { code: (error as { data?: { code?: string } }).data?.code };
    }

    const response = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/${LEDGER}/bank-transactions/unsynced${suffix}`,
    );
    const body = (await response.json()) as
      | { transactionId: string }[]
      | { error: { code: string } };

    const args = Object.entries(query)
      .map(([k, v]) => `, ${k}: ${v}`)
      .join("");
    const gqlResponse = await apollo.executeOperation(
      {
        query: `query { getUnsyncedPlaidTransactions(ledgerId: ${JSON.stringify(LEDGER)}${args}) { transactionId } }`,
      },
      { contextValue: { identity, getCurrentIdentity: () => identity } },
    );
    if (gqlResponse.body.kind !== "single") throw new Error("not single");
    const gql = gqlResponse.body.singleResult;

    return {
      tool: structured.ok
        ? {
            ids: structured.result?.map((row) => row.transactionId),
            page: structured.page,
            text: (tool.content as { text: string }[])[0].text,
          }
        : { code: structured.error?.code },
      resource,
      rest: Array.isArray(body)
        ? {
            ids: body.map((row) => row.transactionId),
            hasMore: response.headers.get("x-has-more"),
            link: response.headers.get("link"),
          }
        : { code: body.error.code, status: response.status },
      gql: gql.errors
        ? { code: gql.errors[0].extensions?.code }
        : {
            ids: (
              gql.data?.getUnsyncedPlaidTransactions as {
                transactionId: string;
              }[]
            ).map((row) => row.transactionId),
            page: (gql.extensions?.page as Record<string, unknown>)
              ?.getUnsyncedPlaidTransactions,
          },
    };
  };

  return {
    read,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("staged bank transactions are paged the same way on every surface", () => {
  it("serves the first page of 100 of 250 rows and says more remain", async () => {
    const f = await fixture();
    try {
      const out = await f.read({ page: 1, limit: 100 });
      const expected = ids(0, 100);
      const page = {
        returned: 100,
        limit: 100,
        page: 1,
        hasMore: true,
        nextPage: 2,
      };
      expect(out.tool.ids).toEqual(expected);
      expect(out.tool.page).toEqual(page);
      expect(out.resource.ids).toEqual(expected);
      expect(out.resource.page).toEqual(page);
      expect(out.rest.ids).toEqual(expected);
      expect(out.rest.hasMore).toBe("true");
      expect(out.rest.link).toContain("page=2");
      expect(out.gql.ids).toEqual(expected);
      expect(out.gql.page).toEqual(page);
      // A text-only host gets the page and the signal in the text block too.
      const last = JSON.parse(out.tool.text?.split("\n").at(-1) ?? "");
      expect(last.page).toEqual(page);
      expect(last.result).toHaveLength(100);
    } finally {
      await f.close();
    }
  });

  it("serves a short last page and says nothing remains", async () => {
    const f = await fixture();
    try {
      const out = await f.read({ page: 3, limit: 100 });
      const expected = ids(200, 250);
      for (const surface of [out.tool, out.resource, out.rest, out.gql])
        expect(surface.ids).toEqual(expected);
      expect(out.tool.page).toMatchObject({ returned: 50, hasMore: false });
      expect(out.rest.hasMore).toBe("false");
      expect(out.rest.link).toBeNull();
    } finally {
      await f.close();
    }
  });

  it("returns every row without a limit, as the dashboard reads it", async () => {
    const f = await fixture();
    try {
      const out = await f.read({});
      const expected = ids(0, 250);
      for (const surface of [out.tool, out.resource, out.rest, out.gql])
        expect(surface.ids).toEqual(expected);
      expect(out.tool.page).toEqual({
        returned: 250,
        page: 1,
        hasMore: false,
      });
    } finally {
      await f.close();
    }
  });

  it.each([
    ["a limit past 100", { limit: 101 }],
    ["a zero limit", { limit: 0 }],
    ["a page before the first", { page: 0, limit: 10 }],
  ])("refuses %s on every surface before listing", async (_name, query) => {
    const f = await fixture();
    try {
      const out = await f.read(query);
      expect(out.tool.code).toBe("BAD_USER_INPUT");
      expect(out.resource.code).toBe("BAD_USER_INPUT");
      // REST refuses a query its schema rejects as 400 VALIDATION_FAILED, as
      // it does for the catalog lists (v1-routes.test.ts).
      expect(out.rest).toMatchObject({
        status: 400,
        code: "VALIDATION_FAILED",
      });
      // GraphQL takes a plain Number; the service holds it to the same bound.
      expect(out.gql.code).toBe("BAD_USER_INPUT");
    } finally {
      await f.close();
    }
  });
});
