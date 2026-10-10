import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { RESOURCE_SCHEME } from "../mcp-resources";
import {
  authorizationActionForOp,
  classifyOp,
  mcpOpId,
  mcpResourceOpId,
} from "@/server/api/op-class";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * The list tools tools-only hosts need (ADR 019 D7): each must return exactly
 * what its resource twin returns, from the same service call with the same
 * identity and ledger, so the two surfaces cannot disagree.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const LEDGER = "alice/main";
const CONNECTIONS = [{ id: "pitm_1", institutionName: "Bank A" }];
const ACCOUNTS = [{ id: "pacc_1", itemId: "pitm_1", mappedAccount: null }];
const STAGED = [{ id: "ptxn_1", accountId: "pacc_1", amount: 12.5 }];
const fakeServices = () => ({
  plaidItem: {
    getItems: jest.fn().mockResolvedValue(CONNECTIONS),
    getAccountsForLedger: jest.fn().mockResolvedValue(ACCOUNTS),
    getUnsyncedTransactions: jest.fn().mockResolvedValue(STAGED),
  },
});

const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
  ledgerScope: LEDGER,
};

function ctx(services: ReturnType<typeof fakeServices>): McpRequestContext {
  return {
    services,
    identity,
    ledgerId: LEDGER,
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as McpRequestContext;
}

async function connect(services: ReturnType<typeof fakeServices>) {
  const server = assembleMcpRegistry(ctx(services), config);
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

async function readJson(client: Client, path: string) {
  const { contents } = await client.readResource({
    uri: `${RESOURCE_SCHEME}://${LEDGER}/${path}`,
  });
  return JSON.parse(String((contents[0] as { text: string }).text));
}

describe("listBankConnections", () => {
  it("returns what the banks and bank-accounts resources return", async () => {
    const services = fakeServices();
    const { client, close } = await connect(services);
    const result = await client.callTool({
      name: "listBankConnections",
      arguments: {},
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      ok: true,
      result: {
        connections: await readJson(client, "banks"),
        accounts: await readJson(client, "bank-accounts"),
      },
    });
    expect(services.plaidItem.getItems).toHaveBeenCalledWith(identity, LEDGER);
    expect(services.plaidItem.getAccountsForLedger).toHaveBeenCalledWith(
      identity,
      LEDGER,
    );
    await close();
  });

  it("reports a refusal from the service as a tool error", async () => {
    const services = fakeServices();
    services.plaidItem.getItems.mockRejectedValue(
      Object.assign(new Error("Not allowed to list bank connections"), {
        category: "FORBIDDEN",
      }),
    );
    const { client, close } = await connect(services);
    const result = await client.callTool({
      name: "listBankConnections",
      arguments: {},
    });
    expect(result.isError).toBe(true);
    await close();
  });
});

describe("listStagedBankTransactions", () => {
  it.each([
    [undefined, "bank-transactions/unsynced"],
    ["pacc_1", "bank-transactions/unsynced?accountId=pacc_1"],
  ])(
    "returns what the unsynced resource returns (accountId %s)",
    async (accountId, path) => {
      const services = fakeServices();
      const { client, close } = await connect(services);
      const result = await client.callTool({
        name: "listStagedBankTransactions",
        arguments: accountId ? { accountId } : {},
      });
      expect(result.structuredContent).toEqual({
        ok: true,
        result: await readJson(client, path),
      });
      expect(
        services.plaidItem.getUnsyncedTransactions,
      ).toHaveBeenNthCalledWith(1, identity, accountId, LEDGER);
      await close();
    },
  );

  it("refuses an argument the resource does not take", async () => {
    const { client, close } = await connect(fakeServices());
    const result = await client.callTool({
      name: "listStagedBankTransactions",
      arguments: { itemId: "pitm_1" },
    });
    expect(result.isError).toBe(true);
    await close();
  });
});

/**
 * Each tool is authorized the way its resource twin is. Bank and key reads are
 * PDP-routed: the transport gate defers to the service's own policy check. A
 * single-row tool therefore carries exactly its resource's PDP action. The
 * two-row `listBankConnections` has no single action at the transport, so the
 * legacy gate holds it to its class (`admin`) before either service runs its
 * own check — never weaker than the resources it reads.
 */
describe("list tools are authorized like their resource twins", () => {
  it.each([["listStagedBankTransactions", "bankUnsyncedTransactions"]])(
    "%s defers to the same PDP action as the %s resource",
    (tool, resource) => {
      const action = authorizationActionForOp(mcpOpId(tool));
      expect(action).toBeDefined();
      expect(action).toBe(authorizationActionForOp(mcpResourceOpId(resource)));
    },
  );

  it("holds listBankConnections to admin, the class of both resources it reads", async () => {
    expect(
      authorizationActionForOp(mcpOpId("listBankConnections")),
    ).toBeUndefined();
    for (const resource of ["bankList", "bankAccounts"]) {
      expect(classifyOp(mcpResourceOpId(resource)).class).toBe("admin");
      expect(authorizationActionForOp(mcpResourceOpId(resource))).toBeDefined();
    }

    const services = fakeServices();
    const server = assembleMcpRegistry(
      {
        ...ctx(services),
        identity: { ...identity, scopes: new Set(["ledger.read"]) },
      } as unknown as McpRequestContext,
      { api: { scopeEnforcement: "enforce" } } as AppConfig,
    );
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1.0.0" });
    await Promise.all([client.connect(a), server.connect(b)]);
    const result = await client.callTool({
      name: "listBankConnections",
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.structuredContent)).toContain("ledger.admin");
    expect(services.plaidItem.getItems).not.toHaveBeenCalled();
    await client.close();
    await server.close();
  });
});
