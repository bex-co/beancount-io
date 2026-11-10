import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { PlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import { PlaidMutationResolver } from "@/features/plaid/api/resolvers/plaid-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { formatError } from "@/server/graphql/format-error";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/189. An empty bank id was dropped from the authorization locator, so it
 * was authorized as the ledger-level bank resource and then failed on whatever
 * ran next: a sync wrote a failed-sync log whose foreign-key error, SQL and
 * user id included, reached MCP callers as NOT_FOUND; a refresh answered
 * "Unauthorized access to Item"; a mapping answered NOT_FOUND. Every surface
 * now refuses it as BAD_USER_INPUT before anything is looked up — every
 * dependency below fails the test if it is reached.
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

let resolver: PlaidMutationResolver;
let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  schema = await buildSchema({
    resolvers: [PlaidMutationResolver, HealthResolver],
    container: {
      get: (target) =>
        target === PlaidMutationResolver ? resolver : new HealthResolver(),
    },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
});

async function fixture() {
  const models = {
    plaidItem: untouchable("plaidItem"),
    plaidAccount: untouchable("plaidAccount"),
    plaidTransaction: untouchable("plaidTransaction"),
    plaidSyncLog: untouchable("plaidSyncLog"),
    user: untouchable("user"),
  };
  const authorization = { authorizeOrThrow: jest.fn(), authorize: jest.fn() };
  const plaidItem = new PlaidItemService(
    untouchable("plaidClient") as never,
    untouchable("fava") as never,
    models as never,
    {} as never,
    authorization as never,
  );
  const plaidSync = new PlaidSyncService(
    untouchable("plaidClient") as never,
    untouchable("fava") as never,
    models as never,
    {} as never,
    authorization as never,
  );
  resolver = new PlaidMutationResolver(plaidItem, plaidSync);
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
    mcp: async (tool: string, args: Record<string, unknown>) => {
      const result = await client.callTool({
        name: tool,
        arguments: { ledger: "alice/main", ...args },
      });
      return result.isError
        ? (result.structuredContent as { error: { code: string } }).error
        : { code: "ok" };
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
    close: async () => {
      await client.close();
      await server.close();
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
