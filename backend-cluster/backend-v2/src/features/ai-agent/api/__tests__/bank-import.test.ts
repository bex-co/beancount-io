import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { MCP_TOOLS } from "../mcp-tools";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const LEDGER = "alice/main";

const fakeServices = () => ({
  ledgerShell: {},
  ledgerRepo: {},
  apiKey: {},
  ledgerData: {},
  ledgerFinance: {},
  ledgerJournal: {},
  ledgerAccount: {},
  plaidItem: {
    getItems: jest.fn().mockResolvedValue([{ id: "pitm_1" }]),
    getItem: jest.fn().mockResolvedValue({ id: "pitm_1" }),
    getAccounts: jest.fn().mockResolvedValue([{ id: "pacc_1" }]),
    getAccountsForLedger: jest.fn().mockResolvedValue([]),
    getUnsyncedTransactions: jest.fn().mockResolvedValue([]),
    suggestCategories: jest.fn().mockResolvedValue([]),
    suggestAccountMapping: jest.fn().mockResolvedValue([]),
    reconcileItemAccounts: jest.fn().mockResolvedValue({ success: true }),
    unlinkItem: jest.fn().mockResolvedValue({ dryRun: false, unlinked: true }),
    refreshItemStatus: jest.fn().mockResolvedValue({ id: "pitm_1" }),
    updateAccountMapping: jest.fn().mockResolvedValue(true),
    updateAccountCurrency: jest.fn().mockResolvedValue(true),
  },
  plaidSync: {
    syncItemTransactions: jest.fn().mockResolvedValue({ success: true }),
    submitTransactionsToLedger: jest.fn().mockResolvedValue({ success: true }),
    deleteTransactions: jest.fn().mockResolvedValue({ success: true }),
  },
});

function ctx(services: ReturnType<typeof fakeServices>): ToolContext {
  return {
    services,
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
      tokenId: "tok_1",
      ledgerScope: LEDGER,
    },
    ledgerId: LEDGER,
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as ToolContext;
}

async function connect(toolCtx: ToolContext) {
  const server = assembleMcpRegistry(toolCtx, config);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

const call = async (
  services: ReturnType<typeof fakeServices>,
  name: string,
  args: Record<string, unknown>,
) => {
  const { client, close } = await connect(ctx(services));
  const result = await client.callTool({ name, arguments: args });
  await close();
  return result;
};

describe("bank import on MCP", () => {
  it("adds exactly two tools, split by authorization class", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    const names = tools.map((t) => t.name);
    expect(names).toContain("manageBankImport");
    expect(names).toContain("manageBankConnection");
    await close();
  });

  /**
   * The split exists because a credential that may import transactions must not
   * thereby be able to sever the bank connection. If `unlink` ever appears on
   * the write-class tool, that separation is gone.
   */
  it("keeps unlink off the write-class import tool", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    const { tools } = await client.listTools();

    const importTool = tools.find((t) => t.name === "manageBankImport");
    const ops = JSON.stringify(importTool?.inputSchema);
    expect(ops).toContain("sync");
    expect(ops).not.toContain("unlink");
    await close();
  });

  it("publishes the seven bank reads as resources", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    const { resourceTemplates } = await client.listResourceTemplates();
    const uris = resourceTemplates.map((t) => t.uriTemplate);

    for (const path of [
      "banks",
      "banks/{itemId}",
      "banks/{itemId}/accounts",
      "bank-accounts",
      "bank-transactions/unsynced",
      "bank-transactions/suggested-categories",
      "banks/{itemId}/suggested-mapping",
    ]) {
      expect(uris).toContain(`${RESOURCE_SCHEME}://{owner}/{name}/${path}`);
    }
    await close();
  });

  /**
   * The `dry_run` promise is "nothing changes". A flag that is accepted and
   * then dropped on the way to the service would keep every test above green
   * while writing to a customer's bank connection, so it is asserted at the
   * boundary that matters: what the service was told.
   */
  describe("dry_run reaches the service", () => {
    it.each([
      ["sync", "manageBankImport", { operation: "sync", item_id: "pitm_1" }],
      [
        "discard",
        "manageBankImport",
        { operation: "discard", transaction_ids: ["ptxn_1"] },
      ],
      [
        "reconcile",
        "manageBankConnection",
        { operation: "reconcile", item_id: "pitm_1" },
      ],
      [
        "unlink",
        "manageBankConnection",
        { operation: "unlink", item_id: "pitm_1" },
      ],
    ])("%s passes dry_run through", async (_op, tool, args) => {
      const services = fakeServices();
      await call(services, tool, { ...args, dry_run: true });

      const mocks = [
        services.plaidSync.syncItemTransactions,
        services.plaidSync.deleteTransactions,
        services.plaidItem.reconcileItemAccounts,
        services.plaidItem.unlinkItem,
      ];
      const called = mocks.find((m) => m.mock.calls.length > 0);
      expect(called).toBeDefined();
      // The flag is the last argument on every one of these signatures.
      expect(called!.mock.calls[0]!.at(-1)).toBe(true);
    });

    it("defaults to false when the caller does not ask for a preview", async () => {
      const services = fakeServices();
      await call(services, "manageBankConnection", {
        operation: "unlink",
        item_id: "pitm_1",
      });

      expect(services.plaidItem.unlinkItem.mock.calls[0]!.at(-1)).toBe(false);
    });
  });

  it("names a missing argument instead of letting the service guess", async () => {
    const services = fakeServices();
    const result = await call(services, "manageBankConnection", {
      operation: "unlink",
    });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("item_id");
    expect(services.plaidItem.unlinkItem).not.toHaveBeenCalled();
  });
});
