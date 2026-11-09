import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { AuthorizationService } from "@/server/api/authorization";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * ADR 019 D7's structural claim, end to end: a host that only calls tools —
 * never `resources/read` — can finish the bank flow and inspect an existing
 * entry, because every id a tool requires appears in some tool's output. Each id
 * below is taken from a previous call's `structuredContent`, never written
 * into the test by hand.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const LEDGER = "alice/main";

const services = {
  plaidItem: {
    getItems: jest
      .fn()
      .mockResolvedValue([{ id: "pitm_9f2", institutionName: "Bank A" }]),
    getAccountsForLedger: jest
      .fn()
      .mockResolvedValue([
        { id: "pacc_31c", itemId: "pitm_9f2", mappedAccount: null },
      ]),
    getUnsyncedTransactions: jest.fn().mockResolvedValue([
      { id: "ptxn_a1", accountId: "pacc_31c" },
      { id: "ptxn_b2", accountId: "pacc_31c" },
    ]),
    updateAccountMapping: jest.fn().mockResolvedValue(true),
  },
  plaidSync: {
    syncItemTransactions: jest.fn().mockResolvedValue({ added: 2 }),
    deleteTransactions: jest.fn().mockResolvedValue({ deleted: 2 }),
  },
};

const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
  ledgerScope: LEDGER,
};

it("finishes the bank flow through tools alone", async () => {
  const server = assembleMcpRegistry(
    {
      services,
      identity,
      ledgerId: LEDGER,
      llmService: {},
      ledgerReceiptWorkflow: {},
    } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "tools-only-host", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  const readResource = jest.spyOn(client, "readResource");

  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    expect({
      name,
      error: result.isError ? result.content : undefined,
    }).toEqual({
      name,
      error: undefined,
    });
    return (result.structuredContent as { result: unknown }).result;
  };

  // 1. Which banks and accounts exist?
  const { connections, accounts } = (await call("listBankConnections", {})) as {
    connections: { id: string }[];
    accounts: { id: string }[];
  };

  // 2. Pull new transactions from the bank the list named.
  await call("syncBankTransactions", { item_id: connections[0].id });
  expect(services.plaidSync.syncItemTransactions).toHaveBeenCalledWith(
    identity,
    "pitm_9f2",
    "manual",
    LEDGER,
    false,
  );

  // 3. Which transactions are staged, and drop them by the ids listed.
  const staged = (await call("listStagedBankTransactions", {})) as {
    id: string;
  }[];
  await call("discardStagedBankTransactions", {
    transaction_ids: staged.map((t) => t.id),
  });
  expect(services.plaidSync.deleteTransactions).toHaveBeenCalledWith(
    identity,
    LEDGER,
    ["ptxn_a1", "ptxn_b2"],
    false,
  );

  // 4. Map an account the list named to a ledger account.
  await call("mapBankAccount", {
    account_id: accounts[0].id,
    ledger_account: "Assets:Bank:Checking",
  });
  expect(services.plaidItem.updateAccountMapping.mock.calls[0]).toContain(
    "pacc_31c",
  );

  expect(readResource).not.toHaveBeenCalled();
  await client.close();
  await server.close();
});

/**
 * w6/008. `getEntryContext` takes an existing entry's canonical hash. Before
 * `listLedgerEntries`, a tools-only host had no tool whose output carried
 * one: BQL's `id` is a directive index, which the context tool refuses.
 * The ledger client is faked; the journal service and PDP are real.
 */
it("inspects an existing entry through tools alone", async () => {
  // Two identical August groceries: the ledger hashes each occurrence
  // separately, so the second is addressable on its own.
  const groceries = (hash: string) => ({
    directive_type: "Transaction",
    date: "2026-08-20",
    narration: "Groceries",
    entry_hash: hash,
    postings: [{ account: "Assets:Checking", amount: "-42.10 USD" }],
  });
  const contexts: Record<string, { sha256sum: string; slice: string }> = {
    ["f0".repeat(16)]: { sha256sum: "sum-first", slice: "first occurrence" },
    ["5e".repeat(16)]: { sha256sum: "sum-second", slice: "second occurrence" },
  };
  const journal = {
    getJournal: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          total: 2,
          items: [groceries("5e".repeat(16))],
          is_empty: false,
        },
      },
    }),
    getContext: jest
      .fn()
      .mockImplementation((_owner: string, _name: string, hash: string) =>
        Promise.resolve({
          data: {
            success: true,
            data: { entry: groceries(hash), ...contexts[hash] },
          },
        }),
      ),
  };
  const check = jest.fn().mockResolvedValue(true);
  const ledgerJournal = new LedgerJournalService(
    { getPublicApiClient: async () => ({ journal }) } as never,
    new AuthorizationService({ check }, jest.fn()),
  );
  const server = assembleMcpRegistry(
    {
      services: { ledgerJournal },
      identity,
      ledgerId: LEDGER,
    } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "tools-only-host", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  const readResource = jest.spyOn(client, "readResource");
  const call = async (name: string, args: Record<string, unknown>) => {
    const result = await client.callTool({ name, arguments: args });
    expect({
      name,
      error: result.isError ? result.content : undefined,
    }).toEqual({ name, error: undefined });
    return (result.structuredContent as { result: unknown }).result;
  };

  // 1. Find the older, filtered entry: the second of two matches.
  const page = (await call("listLedgerEntries", {
    account: "Assets:Checking",
    time: "2026-08",
    directiveTypes: ["Transaction"],
    limit: 1,
    offset: 1,
  })) as { total: number; data: { entry_hash: string }[] };
  expect(page.total).toBe(2);
  expect(journal.getJournal).toHaveBeenCalledWith(
    "alice",
    "main",
    expect.objectContaining({
      account: "Assets:Checking",
      time: "2026-08",
      directive_types: ["Transaction"],
      limit: 1,
      offset: 1,
    }),
  );

  // 2. Read that occurrence's context by the hash the list returned.
  const context = (await call("getEntryContext", {
    entryHash: page.data[0].entry_hash,
  })) as { entry: { entry_hash: string }; sha256sum: string; slice: string };
  expect(context).toMatchObject({
    entry: { entry_hash: "5e".repeat(16) },
    sha256sum: "sum-second",
    slice: "second occurrence",
  });
  expect(journal.getContext).toHaveBeenCalledWith(
    "alice",
    "main",
    "5e".repeat(16),
  );

  expect(readResource).not.toHaveBeenCalled();
  await client.close();
  await server.close();
});
