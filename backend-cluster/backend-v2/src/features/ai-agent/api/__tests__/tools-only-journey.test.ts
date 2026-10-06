import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * ADR 019 D7's structural claim, end to end: a host that only calls tools —
 * never `resources/read` — can finish the bank flow and key management,
 * because every id a tool requires appears in some tool's output. Each id
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
  publicKeys: {
    listPublicKeys: jest
      .fn()
      .mockResolvedValue([{ id: 4711, title: "laptop" }]),
    deletePublicKey: jest.fn().mockResolvedValue({ id: 4711 }),
  },
};

const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
  ledgerScope: LEDGER,
};

it("finishes the bank flow and key management through tools alone", async () => {
  const server = assembleMcpRegistry(
    {
      services,
      identity,
      ledgerId: LEDGER,
      publicKeyService: services.publicKeys,
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
  await call("manageBankImport", {
    operation: "sync",
    item_id: connections[0].id,
  });
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
  await call("manageBankImport", {
    operation: "discard",
    transaction_ids: staged.map((t) => t.id),
  });
  expect(services.plaidSync.deleteTransactions).toHaveBeenCalledWith(
    identity,
    LEDGER,
    ["ptxn_a1", "ptxn_b2"],
    false,
  );

  // 4. Map an account the list named to a ledger account.
  await call("manageBankConnection", {
    operation: "map_account",
    account_id: accounts[0].id,
    ledger_account: "Assets:Bank:Checking",
  });
  expect(services.plaidItem.updateAccountMapping.mock.calls[0]).toContain(
    "pacc_31c",
  );

  // 5. Delete an SSH key by the id the list named.
  const keys = (await call("listPublicKeys", {})) as { id: number }[];
  await call("managePublicKeys", { operation: "delete", keyId: keys[0].id });
  expect(services.publicKeys.deletePublicKey).toHaveBeenCalledWith(
    identity,
    4711,
  );

  expect(readResource).not.toHaveBeenCalled();
  await client.close();
  await server.close();
});
