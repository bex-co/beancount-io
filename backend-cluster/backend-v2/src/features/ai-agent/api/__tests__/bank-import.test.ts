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
const failureOf = (result: Awaited<ReturnType<typeof call>>) =>
  (
    result.structuredContent as {
      error?: { code?: string; message?: string };
    }
  ).error;

describe("bank import on MCP", () => {
  const BANK_TOOLS = [
    "syncBankTransactions",
    "importStagedBankTransactions",
    "discardStagedBankTransactions",
    "reconcileBankAccounts",
    "mapBankAccount",
    "setBankAccountCurrency",
    "refreshBankConnection",
    "unlinkBankConnection",
  ];

  // OpenAI's app-directory scan rejects a tool that dispatches on an
  // `operation` argument (ADR 019, 2026-10-18), so each bank operation is its
  // own tool and the grouped names are gone.
  it("exposes one tool per bank operation, none taking an operation argument", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    const { tools } = await client.listTools();

    expect(tools).toHaveLength(MCP_TOOLS.length);
    const names = tools.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(BANK_TOOLS));
    expect(names).not.toContain("manageBankImport");
    expect(names).not.toContain("manageBankConnection");
    for (const tool of tools.filter((t) => BANK_TOOLS.includes(t.name))) {
      expect({
        tool: tool.name,
        operation: "operation" in (tool.inputSchema.properties ?? {}),
      }).toEqual({ tool: tool.name, operation: false });
    }
    await close();
  });

  /**
   * A credential that may import transactions must not thereby be able to
   * sever the bank connection: unlink is its own admin-class tool, never a
   * branch of an import tool.
   */
  it("keeps unlink a separate tool from the import tools", async () => {
    const services = fakeServices();
    await call(services, "syncBankTransactions", { item_id: "pitm_1" });
    expect(services.plaidSync.syncItemTransactions).toHaveBeenCalledTimes(1);
    expect(services.plaidItem.unlinkItem).not.toHaveBeenCalled();
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
      ["sync", "syncBankTransactions", { item_id: "pitm_1" }],
      [
        "discard",
        "discardStagedBankTransactions",
        { transaction_ids: ["ptxn_1"] },
      ],
      ["reconcile", "reconcileBankAccounts", { item_id: "pitm_1" }],
      ["unlink", "unlinkBankConnection", { item_id: "pitm_1" }],
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
      await call(services, "unlinkBankConnection", { item_id: "pitm_1" });

      expect(services.plaidItem.unlinkItem.mock.calls[0]!.at(-1)).toBe(false);
    });
  });

  describe.each([
    { tool: "refreshBankConnection", args: { item_id: "pitm_1" } },
    {
      tool: "mapBankAccount",
      args: { account_id: "pacc_1", ledger_account: "Assets:Checking" },
    },
    {
      tool: "setBankAccountCurrency",
      args: { account_id: "pacc_1", currency: "USD" },
    },
  ])("$tool without a preview contract", ({ tool, args }) => {
    it("refuses a requested preview before invoking any bank operation", async () => {
      const services = fakeServices();
      const result = await call(services, tool, {
        ...args,
        dry_run: true,
      });
      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain("dry_run");
      // The caller's to fix, as REST's 400 for the same request says — not a
      // server fault with a hint to retry (w5/034).
      const { error } = result.structuredContent as {
        error: { code: string; hint: string };
      };
      expect(error.code).toBe("BAD_USER_INPUT");
      expect(error.hint).not.toMatch(/retry/i);
      for (const operation of Object.values(services.plaidItem)) {
        expect(operation).not.toHaveBeenCalled();
      }
    });

    // These tools publish no `dry_run`, so it is omitted; `dry_run: false`
    // is an undeclared argument and is refused like any other.
    it("applies the operation when dry_run is omitted", async () => {
      const services = fakeServices();
      const result = await call(services, tool, args);
      expect(result.isError).not.toBe(true);
      const writes = [
        services.plaidItem.refreshItemStatus,
        services.plaidItem.updateAccountMapping,
        services.plaidItem.updateAccountCurrency,
      ];
      expect(
        writes.reduce((count, write) => count + write.mock.calls.length, 0),
      ).toBe(1);
    });
  });

  // w23/m8/t002: the bank tools took snake_case ids while REST and
  // GraphQL take camelCase, so a pasted id died in strict validation. Both
  // spellings are accepted; two different ids are refused rather than
  // guessed — the same rule m3 set for entry hashes.
  describe.each([
    {
      tool: "syncBankTransactions",
      service: "plaidSync",
      method: "syncItemTransactions",
      argIndex: 1,
      camel: "itemId",
      snake: "item_id",
      id: "pitm_1",
      other: "pitm_2",
      extra: {},
    },
    {
      tool: "reconcileBankAccounts",
      service: "plaidItem",
      method: "reconcileItemAccounts",
      argIndex: 1,
      camel: "itemId",
      snake: "item_id",
      id: "pitm_1",
      other: "pitm_2",
      extra: {},
    },
    {
      tool: "refreshBankConnection",
      service: "plaidItem",
      method: "refreshItemStatus",
      argIndex: 1,
      camel: "itemId",
      snake: "item_id",
      id: "pitm_1",
      other: "pitm_2",
      extra: {},
    },
    {
      tool: "unlinkBankConnection",
      service: "plaidItem",
      method: "unlinkItem",
      argIndex: 1,
      camel: "itemId",
      snake: "item_id",
      id: "pitm_1",
      other: "pitm_2",
      extra: {},
    },
    {
      tool: "mapBankAccount",
      service: "plaidItem",
      method: "updateAccountMapping",
      argIndex: 1,
      camel: "accountId",
      snake: "account_id",
      id: "pacc_1",
      other: "pacc_2",
      extra: { ledger_account: "Assets:Checking" },
    },
    {
      tool: "setBankAccountCurrency",
      service: "plaidItem",
      method: "updateAccountCurrency",
      argIndex: 1,
      camel: "accountId",
      snake: "account_id",
      id: "pacc_1",
      other: "pacc_2",
      extra: { currency: "USD" },
    },
    {
      tool: "discardStagedBankTransactions",
      service: "plaidSync",
      method: "deleteTransactions",
      argIndex: 2,
      camel: "transactionIds",
      snake: "transaction_ids",
      id: ["ptxn_1"],
      other: ["ptxn_2"],
      extra: {},
    },
  ])("$tool id aliases", (entry) => {
    const mockOf = (services: ReturnType<typeof fakeServices>) =>
      (services[entry.service as "plaidSync"] as Record<string, jest.Mock>)[
        entry.method
      ] as jest.Mock;

    it("accepts the camelCase spelling", async () => {
      const services = fakeServices();
      const result = await call(services, entry.tool, {
        ...entry.extra,
        [entry.camel]: entry.id,
      });
      expect(result.isError).not.toBe(true);
      expect(mockOf(services).mock.calls[0]?.[entry.argIndex]).toEqual(
        entry.id,
      );
    });

    it("keeps accepting the snake_case spelling", async () => {
      const services = fakeServices();
      const result = await call(services, entry.tool, {
        ...entry.extra,
        [entry.snake]: entry.id,
      });
      expect(result.isError).not.toBe(true);
      expect(mockOf(services).mock.calls[0]?.[entry.argIndex]).toEqual(
        entry.id,
      );
    });

    it("accepts both spellings when they name the same id", async () => {
      const services = fakeServices();
      const result = await call(services, entry.tool, {
        ...entry.extra,
        [entry.camel]: entry.id,
        [entry.snake]: entry.id,
      });
      expect(result.isError).not.toBe(true);
      expect(mockOf(services).mock.calls[0]?.[entry.argIndex]).toEqual(
        entry.id,
      );
    });

    it("refuses two different ids without calling the service", async () => {
      const services = fakeServices();
      const result = await call(services, entry.tool, {
        ...entry.extra,
        [entry.camel]: entry.id,
        [entry.snake]: entry.other,
      });
      expect(result.isError).toBe(true);
      expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
      expect(failureOf(result)?.message).toContain("two different");
      expect(mockOf(services)).not.toHaveBeenCalled();
    });

    it("names the missing id instead of letting the service guess", async () => {
      const services = fakeServices();
      const result = await call(services, entry.tool, { ...entry.extra });
      expect(result.isError).toBe(true);
      expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
      expect(failureOf(result)?.message).toContain(entry.snake);
      expect(mockOf(services)).not.toHaveBeenCalled();
    });
  });

  it("advertises both id spellings on the seven bank tools", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    try {
      const { tools } = await client.listTools();
      const byName = new Map(tools.map((tool) => [tool.name, tool]));
      const expected: Record<string, [string, string]> = {
        syncBankTransactions: ["itemId", "item_id"],
        reconcileBankAccounts: ["itemId", "item_id"],
        refreshBankConnection: ["itemId", "item_id"],
        unlinkBankConnection: ["itemId", "item_id"],
        mapBankAccount: ["accountId", "account_id"],
        setBankAccountCurrency: ["accountId", "account_id"],
        discardStagedBankTransactions: ["transactionIds", "transaction_ids"],
      };
      for (const [name, keys] of Object.entries(expected)) {
        const properties = Object.keys(
          byName.get(name)?.inputSchema.properties ?? {},
        );
        expect({ tool: name, properties }).toEqual({
          tool: name,
          properties: expect.arrayContaining(keys),
        });
      }
    } finally {
      await close();
    }
  });

  // w23/m8/t003: the nested bank spellings alias like the top-level ids —
  // the submit-item triple and map_account's ledger account accept
  // camelCase, with the same conflict refusal.
  describe("nested bank aliases", () => {
    it("accepts the camelCase submit triple", async () => {
      const services = fakeServices();
      const result = await call(services, "importStagedBankTransactions", {
        transactions: [
          {
            transactionId: "tx_1",
            targetAccount: "Expenses:Food",
            sourceAccount: "Assets:Checking",
          },
        ],
      });
      expect(result.isError).not.toBe(true);
      expect(
        services.plaidSync.submitTransactionsToLedger.mock.calls[0]?.[3],
      ).toEqual([
        {
          transactionId: "tx_1",
          targetAccount: "Expenses:Food",
          sourceAccount: "Assets:Checking",
        },
      ]);
    });

    it("accepts a mixed batch spelling by spelling", async () => {
      const services = fakeServices();
      const result = await call(services, "importStagedBankTransactions", {
        transactions: [
          { transactionId: "tx_1", targetAccount: "Expenses:Food" },
          {
            transaction_id: "tx_2",
            target_account: "Expenses:Travel",
            source_account: "Assets:Savings",
          },
        ],
      });
      expect(result.isError).not.toBe(true);
      expect(
        services.plaidSync.submitTransactionsToLedger.mock.calls[0]?.[3],
      ).toEqual([
        {
          transactionId: "tx_1",
          targetAccount: "Expenses:Food",
          sourceAccount: undefined,
        },
        {
          transactionId: "tx_2",
          targetAccount: "Expenses:Travel",
          sourceAccount: "Assets:Savings",
        },
      ]);
    });

    it.each([
      ["transactionId", "transaction_id", "tx_1", "tx_2"],
      ["targetAccount", "target_account", "Expenses:Food", "Expenses:Travel"],
      ["sourceAccount", "source_account", "Assets:A", "Assets:B"],
    ])(
      "refuses conflicting %s and %s without submitting",
      async (camel, snake, one, two) => {
        const services = fakeServices();
        const result = await call(services, "importStagedBankTransactions", {
          transactions: [
            {
              transaction_id: "tx_1",
              target_account: "Expenses:Food",
              [camel]: one,
              [snake]: two,
            },
          ],
        });
        expect(result.isError).toBe(true);
        expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
        expect(failureOf(result)?.message).toContain("two different");
        expect(
          services.plaidSync.submitTransactionsToLedger,
        ).not.toHaveBeenCalled();
      },
    );

    it("names a missing target account instead of submitting", async () => {
      const services = fakeServices();
      const result = await call(services, "importStagedBankTransactions", {
        transactions: [{ transactionId: "tx_1" }],
      });
      expect(result.isError).toBe(true);
      expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
      expect(failureOf(result)?.message).toContain("target_account");
      expect(
        services.plaidSync.submitTransactionsToLedger,
      ).not.toHaveBeenCalled();
    });

    it("accepts ledgerAccount on mapBankAccount", async () => {
      const services = fakeServices();
      const result = await call(services, "mapBankAccount", {
        accountId: "pacc_1",
        ledgerAccount: "Assets:Checking",
      });
      expect(result.isError).not.toBe(true);
      expect(
        services.plaidItem.updateAccountMapping.mock.calls[0]?.slice(1, 3),
      ).toEqual(["pacc_1", "Assets:Checking"]);
    });

    it("refuses conflicting ledger accounts without mapping", async () => {
      const services = fakeServices();
      const result = await call(services, "mapBankAccount", {
        account_id: "pacc_1",
        ledgerAccount: "Assets:Checking",
        ledger_account: "Assets:Savings",
      });
      expect(result.isError).toBe(true);
      expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
      expect(failureOf(result)?.message).toContain("two different");
      expect(services.plaidItem.updateAccountMapping).not.toHaveBeenCalled();
    });

    it("names a missing ledger account instead of mapping", async () => {
      const services = fakeServices();
      const result = await call(services, "mapBankAccount", {
        account_id: "pacc_1",
      });
      expect(result.isError).toBe(true);
      expect(failureOf(result)?.code).toBe("BAD_USER_INPUT");
      expect(failureOf(result)?.message).toContain("ledger_account");
      expect(services.plaidItem.updateAccountMapping).not.toHaveBeenCalled();
    });

    it("advertises the nested aliases", async () => {
      const { client, close } = await connect(ctx(fakeServices()));
      try {
        const { tools } = await client.listTools();
        const byName = new Map(tools.map((tool) => [tool.name, tool]));
        const submit = byName.get("importStagedBankTransactions");
        const itemProperties = (
          submit?.inputSchema.properties as
            | Record<string, { items?: { properties?: object } }>
            | undefined
        )?.transactions?.items?.properties;
        expect(Object.keys(itemProperties ?? {})).toEqual(
          expect.arrayContaining([
            "transactionId",
            "transaction_id",
            "targetAccount",
            "target_account",
            "sourceAccount",
            "source_account",
          ]),
        );
        const mapProperties = Object.keys(
          byName.get("mapBankAccount")?.inputSchema.properties ?? {},
        );
        expect(mapProperties).toEqual(
          expect.arrayContaining(["ledgerAccount", "ledger_account"]),
        );
      } finally {
        await close();
      }
    });
  });

  // w5/942: the write reports where it landed and what it wrote, as every
  // other write tool does, so an agent need not query to find the entries.
  describe("importStagedBankTransactions reports its write", () => {
    const submit = {
      transactions: [
        { transaction_id: "tx_1", target_account: "Expenses:Food" },
      ],
    };

    it("names the default file and one hash per entry", async () => {
      const services = fakeServices();
      services.plaidSync.submitTransactionsToLedger.mockResolvedValue({
        success: true,
        addedCount: 1,
        entryHashes: ["hash-1"],
        targetFile: "main.bean",
      });

      const result = await call(services, "importStagedBankTransactions", {
        ...submit,
      });

      const out = (
        result.structuredContent as { result: Record<string, unknown> }
      ).result;
      expect(out.wrote).toEqual([{ path: "main.bean" }]);
      expect(out.entryHashes).toEqual(["hash-1"]);
      expect(out).not.toHaveProperty("targetFile");
    });

    it("names the file it was asked to write", async () => {
      const services = fakeServices();
      services.plaidSync.submitTransactionsToLedger.mockResolvedValue({
        success: true,
        addedCount: 1,
        entryHashes: ["hash-1"],
        targetFile: "bank/2024.bean",
      });

      const result = await call(services, "importStagedBankTransactions", {
        ...submit,
        filename: "bank/2024.bean",
      });

      const out = (
        result.structuredContent as { result: Record<string, unknown> }
      ).result;
      expect(out.wrote).toEqual([{ path: "bank/2024.bean" }]);
    });

    it("writes nothing to report on a dry run", async () => {
      const services = fakeServices();
      services.plaidSync.submitTransactionsToLedger.mockResolvedValue({
        success: true,
        addedCount: 0,
        dryRun: true,
        wouldAddCount: 1,
      });

      const result = await call(services, "importStagedBankTransactions", {
        ...submit,
        dry_run: true,
      });

      const out = (
        result.structuredContent as { result: Record<string, unknown> }
      ).result;
      expect(out.wrote).toEqual([]);
      expect(out.entryHashes).toEqual([]);
    });
  });

  it("names a missing argument instead of letting the service guess", async () => {
    const services = fakeServices();
    const result = await call(services, "unlinkBankConnection", {});

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("item_id");
    expect(services.plaidItem.unlinkItem).not.toHaveBeenCalled();
  });

  // An agent that sync'd without `item_id` against the hosted server was told
  // INTERNAL_SERVER_ERROR and "retry once" — a retry that could never succeed.
  it.each([
    ["unlinkBankConnection", {}],
    ["syncBankTransactions", { dry_run: true }],
  ])(
    "reports a missing item_id on %s as bad input the caller can fix",
    async (name, args) => {
      const result = await call(fakeServices(), name, args);
      const failure = (
        result.structuredContent as {
          error?: { code?: string; message?: string; hint?: string };
        }
      ).error;

      expect(result.isError).toBe(true);
      expect(failure?.code).toBe("BAD_USER_INPUT");
      expect(failure?.message).toContain("item_id");
      expect(failure?.hint).not.toMatch(/retry/i);
    },
  );
});
