import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { PlaidMutationResolver } from "@/features/plaid/api/resolvers/plaid-resolver.mutation";
import { HealthResolver } from "@/features/healthz/api/health-resolver";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { Identity } from "@/server/api/identity";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/211. REST and MCP preview all five bank writes; GraphQL refused `dryRun`
 * as an unknown argument on every one. Each surface now sends the same
 * preview to the same service call, and GraphQL returns the preview fields
 * the service computed. The previews themselves (nothing written, every check
 * run) are the services' own, pinned in `plaid-dry-run.test.ts`.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_admin",
};

const plaidSync = {
  syncItemTransactions: jest.fn(async () => ({
    success: true,
    transactionsFetched: 3,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
    dryRun: true,
    wouldAdd: 3,
    wouldModify: 0,
    wouldRemove: 0,
    morePagesAvailable: false,
  })),
  submitTransactionsToLedger: jest.fn(async () => ({
    success: true,
    addedCount: 0,
    dryRun: true,
    wouldAddCount: 1,
    preview: [{ date: "2026-01-02", narration: "Coffee" }],
  })),
  deleteTransactions: jest.fn(async () => ({
    success: true,
    deletedCount: 0,
    dryRun: true,
    wouldDeleteCount: 1,
    preview: [{ transactionId: "ptxn_1", name: "Coffee", amount: "4.50" }],
  })),
};
const plaidItem = {
  reconcileItemAccounts: jest.fn(async () => ({
    success: true,
    addedCount: 0,
    removedCount: 0,
    dryRun: true,
    wouldAdd: [{ accountId: "pacc_9", accountName: "Savings", mask: "0042" }],
    wouldDelete: [],
  })),
  unlinkItem: jest.fn(async () => ({
    dryRun: true,
    wouldUnlink: true,
    institutionName: "Fixture Bank",
    accountsSevered: 1,
    accounts: [],
  })),
};

let schema: Awaited<ReturnType<typeof buildSchema>>;
beforeAll(async () => {
  const resolver = new PlaidMutationResolver(
    plaidItem as never,
    plaidSync as never,
  );
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
beforeEach(() => jest.clearAllMocks());

async function surfaces() {
  const services = { plaidSync, plaidItem };
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
  );
  rest.setIdentity(identity);
  const server = assembleMcpRegistry(
    { identity, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "bank-preview-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    rest: (method: string, path: string, body?: unknown) =>
      fetch(
        `${rest.url}/api-gateway/v1/ledgers/alice/main${path}?dry_run=true`,
        {
          method,
          headers: { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        },
      ),
    mcp: (tool: string, args: Record<string, unknown>) =>
      client.callTool({
        name: tool,
        arguments: { ledger: "alice/main", dry_run: true, ...args },
      }),
    gql: (source: string) =>
      graphql({
        schema,
        source,
        contextValue: { identity, getCurrentIdentity: () => identity },
      }),
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

const CASES = [
  {
    name: "sync",
    service: plaidSync.syncItemTransactions,
    rest: ["POST", "/banks/pitm_1/sync"] as const,
    mcp: ["syncBankTransactions", { itemId: "pitm_1" }] as const,
    gql: 'mutation { r: syncPlaidTransactions(itemId: "pitm_1", ledgerId: "alice/main", dryRun: true) { dryRun wouldAdd wouldModify wouldRemove morePagesAvailable } }',
    preview: {
      dryRun: true,
      wouldAdd: 3,
      wouldModify: 0,
      wouldRemove: 0,
      morePagesAvailable: false,
    },
  },
  {
    name: "submit",
    service: plaidSync.submitTransactionsToLedger,
    rest: [
      "POST",
      "/bank-transactions/submit",
      {
        transactions: [
          { transactionId: "ptxn_1", targetAccount: "Expenses:Coffee" },
        ],
      },
    ] as const,
    mcp: [
      "importStagedBankTransactions",
      {
        transactions: [
          { transactionId: "ptxn_1", targetAccount: "Expenses:Coffee" },
        ],
      },
    ] as const,
    gql: 'mutation { r: submitPlaidTransactionsToLedger(ledgerId: "alice/main", transactions: [{ transactionId: "ptxn_1", targetAccount: "Expenses:Coffee" }], dry_run: true) { dryRun wouldAddCount preview } }',
    preview: {
      dryRun: true,
      wouldAddCount: 1,
      preview: [{ date: "2026-01-02", narration: "Coffee" }],
    },
  },
  {
    name: "discard",
    service: plaidSync.deleteTransactions,
    rest: [
      "DELETE",
      "/bank-transactions",
      { transactionIds: ["ptxn_1"] },
    ] as const,
    mcp: [
      "discardStagedBankTransactions",
      { transactionIds: ["ptxn_1"] },
    ] as const,
    gql: 'mutation { r: deletePlaidTransactions(ledgerId: "alice/main", transactionIds: ["ptxn_1"], dryRun: true) { dryRun wouldDeleteCount preview { transactionId name amount } } }',
    preview: {
      dryRun: true,
      wouldDeleteCount: 1,
      preview: [{ transactionId: "ptxn_1", name: "Coffee", amount: "4.50" }],
    },
  },
  {
    name: "reconcile",
    service: plaidItem.reconcileItemAccounts,
    rest: ["POST", "/banks/pitm_1/reconcile"] as const,
    mcp: ["reconcileBankAccounts", { itemId: "pitm_1" }] as const,
    gql: 'mutation { r: reconcilePlaidAccounts(itemId: "pitm_1", ledgerId: "alice/main", dryRun: true) { dryRun wouldAdd { accountId accountName mask } wouldDelete { accountId } } }',
    preview: {
      dryRun: true,
      wouldAdd: [{ accountId: "pacc_9", accountName: "Savings", mask: "0042" }],
      wouldDelete: [],
    },
  },
  {
    name: "unlink",
    service: plaidItem.unlinkItem,
    rest: ["DELETE", "/banks/pitm_1"] as const,
    mcp: ["unlinkBankConnection", { itemId: "pitm_1" }] as const,
    // GraphQL's unlink stays Boolean, which the dashboard and the app select.
    gql: 'mutation { r: unlinkPlaidItem(itemId: "pitm_1", ledgerId: "alice/main", dryRun: true) }',
    preview: true,
  },
];

describe.each(CASES)("the $name preview", (c) => {
  it("reaches the service as a preview on REST, MCP and GraphQL", async () => {
    const f = await surfaces();
    try {
      const [method, path, body] = c.rest;
      expect((await f.rest(method, path, body)).status).toBe(200);
      const tool = await f.mcp(c.mcp[0], { ...c.mcp[1] });
      expect(tool.isError).not.toBe(true);
      const gql = await f.gql(c.gql);
      expect(gql.errors).toBeUndefined();
      expect(c.service).toHaveBeenCalledTimes(3);
      for (const call of c.service.mock.calls as unknown[][])
        expect(call.at(-1)).toBe(true);
      const answer = (gql.data as { r: unknown }).r;
      if (typeof c.preview === "boolean") expect(answer).toBe(c.preview);
      else expect(answer).toMatchObject(c.preview);
    } finally {
      await f.close();
    }
  });
});

it("refuses one true and one false preview flag on GraphQL", async () => {
  const f = await surfaces();
  try {
    const gql = await f.gql(
      'mutation { syncPlaidTransactions(itemId: "pitm_1", ledgerId: "alice/main", dryRun: true, dry_run: false) { success } }',
    );
    expect(gql.errors?.[0]?.originalError).toMatchObject({
      category: "BAD_USER_INPUT",
    });
    expect(plaidSync.syncItemTransactions).not.toHaveBeenCalled();
  } finally {
    await f.close();
  }
});
