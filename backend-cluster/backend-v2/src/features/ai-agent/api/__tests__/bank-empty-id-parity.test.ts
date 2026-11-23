import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { PlaidMutationResolver } from "@/features/plaid/api/resolvers/plaid-resolver.mutation";
import { PlaidQueryResolver } from "@/features/plaid/api/resolvers/plaid-resolver.query";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/189 & w31/058. An empty bank id was dropped from the authorization
 * locator (or fell through `if (accountId)` on staged-transaction / category
 * suggestion reads and silently widened to every enabled bank account on the
 * ledger). Every surface — MCP tools/resources, REST, and GraphQL — now
 * refuses explicit blank ids as BAD_USER_INPUT before authorization or lookup,
 * while omitted (or GraphQL null) accountId keeps ledger-wide read behavior.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};

const untouchable = (name: string) =>
  new Proxy(
    {},
    {
      get: () => () => {
        throw new Error(`${name} must not be reached for an empty id`);
      },
    },
  );

let mutationResolver: PlaidMutationResolver;
let queryResolver: PlaidQueryResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [PlaidMutationResolver, PlaidQueryResolver, HealthResolver],
    container: {
      get: (target) => {
        if (target === PlaidMutationResolver) return mutationResolver;
        if (target === PlaidQueryResolver) return queryResolver;
        return new HealthResolver();
      },
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture(options?: { allowLedgerWideRead?: boolean }) {
  const allowLedgerWideRead = options?.allowLedgerWideRead ?? false;
  const getEnabledByLedgerRepoIdAndUserId = jest.fn(async () => []);
  const getUnsyncedByAccountIds = jest.fn(async () => []);
  const models = allowLedgerWideRead
    ? {
        plaidItem: untouchable("plaidItem"),
        plaidAccount: {
          getById: () => {
            throw new Error("plaidAccount.getById must not be reached");
          },
          getEnabledByLedgerRepoIdAndUserId,
        },
        plaidTransaction: {
          getUnsyncedByAccountId: () => {
            throw new Error(
              "plaidTransaction.getUnsyncedByAccountId must not be reached",
            );
          },
          getUnsyncedByAccountIds,
        },
        plaidSyncLog: untouchable("plaidSyncLog"),
        user: untouchable("user"),
      }
    : {
        plaidItem: untouchable("plaidItem"),
        plaidAccount: untouchable("plaidAccount"),
        plaidTransaction: untouchable("plaidTransaction"),
        plaidSyncLog: untouchable("plaidSyncLog"),
        user: untouchable("user"),
      };
  const fava = allowLedgerWideRead
    ? {
        getAdminClient: () => ({
          ledgers: {
            getLedger: async () => ({
              data: {
                success: true,
                data: { id: 1, full_name: "alice/main" },
              },
            }),
          },
        }),
      }
    : untouchable("fava");
  const authorization = {
    authorizeOrThrow: jest.fn(async () => ({ allowed: true })),
    authorize: jest.fn(),
  };
  const plaidItem = new PlaidItemService(
    untouchable("plaidClient") as never,
    fava as never,
    models as never,
    {} as never,
    authorization as never,
  );
  const plaidSync = new PlaidSyncService(
    untouchable("plaidClient") as never,
    fava as never,
    models as never,
    {} as never,
    authorization as never,
  );
  mutationResolver = new PlaidMutationResolver(plaidItem, plaidSync);
  queryResolver = new PlaidQueryResolver(plaidItem);
  const rest = await startV1TestServer(
    { services: { plaidItem, plaidSync } } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { plaidItem, plaidSync },
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bank-empty-id", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    authorization,
    getEnabledByLedgerRepoIdAndUserId,
    getUnsyncedByAccountIds,
    mcp: async (tool: string, args: Record<string, unknown>) => {
      const result = await client.callTool({
        name: tool,
        arguments: { ledger: "alice/main", ...args },
      });
      return result.isError
        ? (
            result.structuredContent as {
              error: { code: string; message?: string };
            }
          ).error
        : {
            code: "ok",
            result: (result.structuredContent as { result?: unknown }).result,
          };
    },
    mcpResource: async (uri: string) =>
      client.readResource({ uri }).then(
        (res) => ({
          ok: true as const,
          text: "text" in res.contents[0] ? res.contents[0].text : undefined,
        }),
        (error: { code?: number; data?: unknown; message: string }) => ({
          ok: false as const,
          rpcCode: error.code,
          data: error.data as { code?: string } | undefined,
          message: error.message,
        }),
      ),
    restGet: async (path: string) => {
      const response = await fetch(
        `${rest.url}/api-gateway/v1/ledgers/${path}`,
      );
      const body = (await response.json()) as {
        error?: {
          code: string;
          message?: string;
          metadata?: { field?: string };
        };
      };
      return { status: response.status, body };
    },
    gql: async (source: string) => {
      const result = await graphql({
        schema,
        source,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      return error ? formatError(error.toJSON(), error).extensions?.code : "ok";
    },
    gqlFull: async (source: string) => {
      const result = await graphql({
        schema,
        source,
        contextValue: { identity, getCurrentIdentity: () => identity },
      });
      const error = result.errors?.[0];
      if (!error) return { ok: true as const, data: result.data };
      const formatted = formatError(error.toJSON(), error);
      return {
        ok: false as const,
        code: formatted.extensions?.code,
        field: formatted.extensions?.field,
        message: formatted.message,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["", "  "])("bank id %j on MCP and GraphQL", (id) => {
  const quoted = JSON.stringify(id);
  it.each([
    [
      "syncBankTransactions",
      { itemId: id },
      `mutation { syncPlaidTransactions(itemId: ${quoted}, ledgerId: "alice/main") { success } }`,
    ],
    [
      "syncBankTransactions",
      { item_id: id, dry_run: true },
      `mutation { syncPlaidTransactions(itemId: ${quoted}, ledgerId: "alice/main") { success } }`,
    ],
    [
      "refreshBankConnection",
      { itemId: id },
      `mutation { refreshPlaidItemStatus(itemId: ${quoted}, ledgerId: "alice/main") { id } }`,
    ],
    [
      "unlinkBankConnection",
      { itemId: id, dry_run: true },
      `mutation { unlinkPlaidItem(itemId: ${quoted}, ledgerId: "alice/main") }`,
    ],
    [
      "reconcileBankAccounts",
      { itemId: id, dry_run: true },
      `mutation { reconcilePlaidAccounts(itemId: ${quoted}, ledgerId: "alice/main") { success } }`,
    ],
    [
      "mapBankAccount",
      { accountId: id, ledgerAccount: "Assets:Bank" },
      `mutation { updatePlaidAccountMapping(accountId: ${quoted}, ledgerAccount: "Assets:Bank", ledgerId: "alice/main") }`,
    ],
    [
      "setBankAccountCurrency",
      { accountId: id, currency: "USD" },
      `mutation { updatePlaidAccountCurrency(accountId: ${quoted}, currency: "USD", ledgerId: "alice/main") }`,
    ],
  ])(
    "%s %j is BAD_USER_INPUT before any lookup",
    async (tool, args, mutation) => {
      const f = await fixture();
      try {
        const mcp = await f.mcp(tool, args);
        expect(mcp.code).toBe("BAD_USER_INPUT");
        expect((mcp as { message?: string }).message).toMatch(
          /must not be empty/,
        );
        expect(await f.gql(mutation)).toBe("BAD_USER_INPUT");
        expect(f.authorization.authorizeOrThrow).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );
});

describe.each(["", "  "])(
  "optional bank read accountId %j on MCP, REST, and GraphQL",
  (id) => {
    const quoted = JSON.stringify(id);
    const encoded = encodeURIComponent(id);

    it("refuses staged bank transaction reads before authorization or lookup", async () => {
      const f = await fixture();
      try {
        const mcpTool = await f.mcp("listStagedBankTransactions", {
          accountId: id,
        });
        expect(mcpTool.code).toBe("BAD_USER_INPUT");
        expect((mcpTool as { message?: string }).message).toMatch(
          /accountId must not be empty/,
        );

        const mcpRes = await f.mcpResource(
          `beancount://alice/main/bank-transactions/unsynced?accountId=${encoded}`,
        );
        expect(mcpRes.ok).toBe(false);
        if (!mcpRes.ok) {
          expect(mcpRes.rpcCode).toBe(-32602);
          expect(mcpRes.data?.code).toBe("BAD_USER_INPUT");
          expect(mcpRes.message).toMatch(/accountId must not be empty/);
        }

        const restRes = await f.restGet(
          `alice/main/bank-transactions/unsynced?accountId=${encoded}`,
        );
        expect(restRes.status).toBe(400);
        expect(restRes.body.error?.code).toBe("BAD_USER_INPUT");
        expect(restRes.body.error?.metadata?.field).toBe("accountId");
        expect(restRes.body.error?.message).toMatch(
          /accountId must not be empty/,
        );

        const gqlRes = await f.gqlFull(
          `query { getUnsyncedPlaidTransactions(ledgerId: "alice/main", accountId: ${quoted}) { id } }`,
        );
        expect(gqlRes.ok).toBe(false);
        if (!gqlRes.ok) {
          expect(gqlRes.code).toBe("BAD_USER_INPUT");
          expect(gqlRes.field).toBe("accountId");
          expect(gqlRes.message).toMatch(/accountId must not be empty/);
        }

        expect(f.authorization.authorizeOrThrow).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });

    it("refuses category suggestion reads before authorization or lookup", async () => {
      const f = await fixture();
      try {
        const mcpRes = await f.mcpResource(
          `beancount://alice/main/bank-transactions/suggested-categories?accountId=${encoded}`,
        );
        expect(mcpRes.ok).toBe(false);
        if (!mcpRes.ok) {
          expect(mcpRes.rpcCode).toBe(-32602);
          expect(mcpRes.data?.code).toBe("BAD_USER_INPUT");
          expect(mcpRes.message).toMatch(/accountId must not be empty/);
        }

        const restRes = await f.restGet(
          `alice/main/bank-transactions/suggested-categories?accountId=${encoded}`,
        );
        expect(restRes.status).toBe(400);
        expect(restRes.body.error?.code).toBe("BAD_USER_INPUT");
        expect(restRes.body.error?.metadata?.field).toBe("accountId");
        expect(restRes.body.error?.message).toMatch(
          /accountId must not be empty/,
        );

        const gqlRes = await f.gqlFull(
          `query { suggestPlaidTransactionCategories(ledgerId: "alice/main", accountId: ${quoted}) { targetAccount } }`,
        );
        expect(gqlRes.ok).toBe(false);
        if (!gqlRes.ok) {
          expect(gqlRes.code).toBe("BAD_USER_INPUT");
          expect(gqlRes.field).toBe("accountId");
          expect(gqlRes.message).toMatch(/accountId must not be empty/);
        }

        expect(f.authorization.authorizeOrThrow).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    });
  },
);

describe("omitted accountId (and GraphQL null) keeps ledger-wide reads", () => {
  it("succeeds ledger-wide on MCP, REST, and GraphQL for unsynced transactions and category suggestions", async () => {
    const f = await fixture({ allowLedgerWideRead: true });
    try {
      const mcpTool = await f.mcp("listStagedBankTransactions", {});
      expect(mcpTool.code).toBe("ok");
      expect((mcpTool as { result?: unknown }).result).toEqual([]);

      const mcpUnsynced = await f.mcpResource(
        "beancount://alice/main/bank-transactions/unsynced",
      );
      expect(mcpUnsynced.ok).toBe(true);
      if (mcpUnsynced.ok) {
        expect(JSON.parse(mcpUnsynced.text ?? "null")).toEqual([]);
      }

      const mcpSuggested = await f.mcpResource(
        "beancount://alice/main/bank-transactions/suggested-categories",
      );
      expect(mcpSuggested.ok).toBe(true);
      if (mcpSuggested.ok) {
        expect(JSON.parse(mcpSuggested.text ?? "null")).toEqual([]);
      }

      const restUnsynced = await f.restGet(
        "alice/main/bank-transactions/unsynced",
      );
      expect(restUnsynced.status).toBe(200);
      expect(restUnsynced.body).toEqual([]);

      const restSuggested = await f.restGet(
        "alice/main/bank-transactions/suggested-categories",
      );
      expect(restSuggested.status).toBe(200);
      expect(restSuggested.body).toEqual([]);

      const gqlUnsyncedOmitted = await f.gqlFull(
        `query { getUnsyncedPlaidTransactions(ledgerId: "alice/main") { id } }`,
      );
      expect(gqlUnsyncedOmitted).toEqual({
        ok: true,
        data: { getUnsyncedPlaidTransactions: [] },
      });

      const gqlUnsyncedNull = await f.gqlFull(
        `query { getUnsyncedPlaidTransactions(ledgerId: "alice/main", accountId: null) { id } }`,
      );
      expect(gqlUnsyncedNull).toEqual({
        ok: true,
        data: { getUnsyncedPlaidTransactions: [] },
      });

      const gqlSuggestedOmitted = await f.gqlFull(
        `query { suggestPlaidTransactionCategories(ledgerId: "alice/main") { targetAccount } }`,
      );
      expect(gqlSuggestedOmitted).toEqual({
        ok: true,
        data: { suggestPlaidTransactionCategories: [] },
      });

      const gqlSuggestedNull = await f.gqlFull(
        `query { suggestPlaidTransactionCategories(ledgerId: "alice/main", accountId: null) { targetAccount } }`,
      );
      expect(gqlSuggestedNull).toEqual({
        ok: true,
        data: { suggestPlaidTransactionCategories: [] },
      });

      expect(f.getEnabledByLedgerRepoIdAndUserId).toHaveBeenCalledTimes(9);
      expect(f.getUnsyncedByAccountIds).toHaveBeenCalledTimes(9);
    } finally {
      await f.close();
    }
  });
});
