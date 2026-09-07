import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { MCP_TOOLS } from "../mcp-tools";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

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

function ctx(services: ReturnType<typeof fakeServices>): McpRequestContext {
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
  } as unknown as McpRequestContext;
}

async function connect(toolCtx: McpRequestContext) {
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
      "bank-transactions/unsynced{?accountId}",
      "bank-transactions/suggested-categories{?accountId}",
      "banks/{itemId}/suggested-mapping",
    ]) {
      expect(uris).toContain(`${RESOURCE_SCHEME}://{owner}/{name}/${path}`);
    }
    await close();
  });

  describe.each(["unsynced", "suggested-categories"])(
    "bank read %s",
    (path) => {
      it.each([undefined, "pacc_1", "pacc_/a+b%20"])(
        "preserves the account filter %s through the SDK",
        async (accountId) => {
          const services = fakeServices();
          const read = jest.fn(async (...args: unknown[]) => {
            const selected = args[path === "unsynced" ? 1 : 2];
            return ["pacc_1", "pacc_/a+b%20"]
              .filter((id) => selected === undefined || id === selected)
              .map((id) => ({ accountId: id }));
          });
          if (path === "unsynced")
            services.plaidItem.getUnsyncedTransactions = read;
          else services.plaidItem.suggestCategories = read;
          const { client, close } = await connect(ctx(services));
          try {
            const query =
              accountId === undefined
                ? ""
                : `?accountId=${encodeURIComponent(accountId)}`;
            const result = await client.readResource({
              uri: `${RESOURCE_SCHEME}://alice/main/bank-transactions/${path}${query}`,
            });
            const content = result.contents[0];
            if (!content || !("text" in content))
              throw new Error("Expected text resource");
            expect(JSON.parse(content.text)).toEqual(
              (accountId === undefined
                ? ["pacc_1", "pacc_/a+b%20"]
                : [accountId]
              ).map((id) => ({ accountId: id })),
            );
            expect(read.mock.calls[0]?.[path === "unsynced" ? 2 : 1]).toBe(
              LEDGER,
            );
          } finally {
            await close();
          }
        },
      );

      it.each(["accountId=a&accountId=b", "unknown=a"])(
        "rejects ambiguous or unsupported query %s",
        async (query) => {
          const services = fakeServices();
          const { client, close } = await connect(ctx(services));
          try {
            await expect(
              client.readResource({
                uri: `${RESOURCE_SCHEME}://alice/main/bank-transactions/${path}?${query}`,
              }),
            ).rejects.toThrow();
            expect(
              services.plaidItem.getUnsyncedTransactions,
            ).not.toHaveBeenCalled();
            expect(services.plaidItem.suggestCategories).not.toHaveBeenCalled();
          } finally {
            await close();
          }
        },
      );
    },
  );

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

  describe.each([
    { operation: "refresh", item_id: "pitm_1" },
    {
      operation: "map_account",
      account_id: "pacc_1",
      ledger_account: "Assets:Checking",
    },
    { operation: "set_currency", account_id: "pacc_1", currency: "USD" },
  ])("$operation without a preview contract", (args) => {
    it("refuses a requested preview before invoking any bank operation", async () => {
      const services = fakeServices();
      const result = await call(services, "manageBankConnection", {
        ...args,
        dry_run: true,
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("dry_run");
      for (const operation of Object.values(services.plaidItem)) {
        expect(operation).not.toHaveBeenCalled();
      }
    });

    it.each([undefined, false])(
      "applies the operation with dry_run=%s",
      async (dryRun) => {
        const services = fakeServices();
        const result = await call(services, "manageBankConnection", {
          ...args,
          ...(dryRun === undefined ? {} : { dry_run: dryRun }),
        });
        expect(result.isError).not.toBe(true);
        const writes = [
          services.plaidItem.refreshItemStatus,
          services.plaidItem.updateAccountMapping,
          services.plaidItem.updateAccountCurrency,
        ];
        expect(
          writes.reduce((count, write) => count + write.mock.calls.length, 0),
        ).toBe(1);
      },
    );
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
