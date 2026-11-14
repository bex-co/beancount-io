import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import { NewLedgerErrorsError } from "@/shared/errors";
import type { McpRequestContext } from "../mcp-context";

/**
 * A client that hands the model only `content` must still see the data.
 *
 * claude.ai's connector reads the text block, and the text block used to stop
 * at a summary once a payload passed 400 characters: an agent got `42 items`
 * from `listStagedBankTransactions` and `listBankConnections: ok`, so it had
 * no `transactionId` to import or discard and no connection `id` to refresh.
 * These run the real MCP handler, so they hold whatever assembles the text.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const LEDGER = "alice/main";

const staged = Array.from({ length: 42 }, (_, i) => ({
  id: `pbtx_${i}`,
  transactionId: `txn_${i}`,
  plaidAccountId: "pacc_1",
  date: "2026-11-08",
  name: `PAYEE ${i}`,
  amount: 12.34 + i,
}));

const fakeServices = () => ({
  plaidItem: {
    getItems: jest
      .fn()
      .mockResolvedValue([{ id: "pitm_1", institutionName: "First Bank" }]),
    getAccountsForLedger: jest.fn().mockResolvedValue([
      { id: "pacc_1", itemId: "pitm_1", name: "Checking", mask: "0001" },
      { id: "pacc_2", itemId: "pitm_1", name: "Savings", mask: "0002" },
    ]),
    getUnsyncedTransactions: jest.fn().mockResolvedValue(staged),
  },
  plaidSync: {
    submitTransactionsToLedger: jest
      .fn()
      .mockRejectedValue(
        new NewLedgerErrorsError(
          "entries",
          1,
          "Invalid reference to unknown account 'Expenses:Uncategorized' (main.bean:12)",
        ),
      ),
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

async function call(name: string, args: Record<string, unknown> = {}) {
  const server = assembleMcpRegistry(ctx(fakeServices()), config);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "text-only", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

/** The one text block, split into its lead line(s) and the parsed last line. */
function textOf(result: Awaited<ReturnType<typeof call>>) {
  const blocks = result.content as Array<{ type: string; text?: string }>;
  expect(blocks).toHaveLength(1);
  expect(blocks[0].type).toBe("text");
  const lines = (blocks[0].text ?? "").split("\n");
  return {
    text: blocks[0].text ?? "",
    lead: lines.slice(0, -1),
    carried: JSON.parse(lines.at(-1) ?? "") as unknown,
  };
}

describe("MCP text block carries what structuredContent carries", () => {
  it("lists every staged transaction's id, date, payee and amount", async () => {
    const result = await call("listStagedBankTransactions");
    const { text, lead, carried } = textOf(result);
    expect(lead).toEqual(["42 items"]);
    expect(carried).toEqual(result.structuredContent);
    expect(carried).toEqual({ ok: true, result: staged });
    for (const row of staged) {
      expect(text).toContain(`"transactionId":"${row.transactionId}"`);
    }
  });

  it("lists the connection and account ids the bank tools take", async () => {
    const result = await call("listBankConnections");
    const { text, lead, carried } = textOf(result);
    expect(lead).toEqual(["listBankConnections: ok"]);
    expect(carried).toEqual(result.structuredContent);
    for (const id of ["pitm_1", "pacc_1", "pacc_2"]) {
      expect(text).toContain(`"id":"${id}"`);
    }
  });

  it("carries a refusal's newLedgerErrors after its readable lines", async () => {
    const result = await call("importStagedBankTransactions", {
      transactions: [
        { transactionId: "txn_0", targetAccount: "Expenses:Uncategorized" },
      ],
    });
    expect(result.isError).toBe(true);
    const { lead, carried } = textOf(result);
    expect(lead[0]).toMatch(/^VALIDATION_FAILED: /);
    expect(lead[1]).toMatch(/^Hint: /);
    expect(carried).toEqual(result.structuredContent);
    expect(carried).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        newLedgerErrors:
          "Invalid reference to unknown account 'Expenses:Uncategorized' (main.bean:12)",
      },
    });
  });
});
