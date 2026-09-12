import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { MCP_TOOLS } from "../mcp-tools";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { UnbalancedTransactionError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";
import type { Identity } from "@/server/api/identity";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const LEDGER_ID = "alice/personal";

const entries = [
  {
    type: "transaction",
    entry: {
      date: "2026-03-06",
      flag: "*",
      postings: [
        {
          account: "Expenses:Food",
          units: { number: "10.00", currency: "USD" },
        },
        {
          account: "Assets:Cash",
          units: { number: "-5.00", currency: "USD" },
        },
      ],
    },
  },
];

function context(ledgerEntryService: unknown) {
  return {
    services: {
      ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
    } as any,
    identity: IDENTITY,
    ledgerEntryService,
  } as any;
}

type Execute = (ctx: any, input: any) => Promise<any>;
function addLedgerEntries(): Execute {
  const tool = MCP_TOOLS.find((t) => t.name === "addLedgerEntries");
  if (!tool) throw new Error("addLedgerEntries tool missing");
  return tool.execute as Execute;
}

describe("addLedgerEntries", () => {
  /**
   * Through the real registry rather than the bare `execute`, because the
   * envelope is the boundary's job now (w2/m28:t003): the tool throws its
   * domain error and every tool's refusal is shaped in one place. Calling
   * `execute` directly would prove only that the throw happens.
   */
  it("refuses an unbalanced transaction with UNBALANCED and the residual", async () => {
    const addBulkEntries = jest
      .fn()
      .mockRejectedValue(
        new UnbalancedTransactionError("Transaction does not balance", "5.00 USD", 0),
      );
    const server = assembleMcpRegistry(
      {
        ...context({ addBulkEntries }),
        identity: { ...IDENTITY, ledgerScope: LEDGER_ID },
      } as unknown as McpRequestContext,
      { api: { scopeEnforcement: "shadow" } } as AppConfig,
    );
    const client = new Client({ name: "add-entries", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), server.connect(b)]);
    try {
      const result = await client.callTool({
        name: "addLedgerEntries",
        arguments: { ledger: LEDGER_ID, entries },
      });

      expect(addBulkEntries).toHaveBeenCalled();
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toEqual({
        ok: false,
        error: {
          code: "UNBALANCED",
          message: "Transaction does not balance",
          hint: "residual 5.00 USD; add a posting or pass allowInvalid: true",
        },
      });
      // The text half says the same thing, in the words a person would use.
      expect((result.content as { text: string }[])[0].text).toBe(
        "UNBALANCED: Transaction does not balance\nHint: residual 5.00 USD; add a posting or pass allowInvalid: true",
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("writes with allowInvalid and reports the residual as a new error", async () => {
    const addBulkEntries = jest.fn().mockResolvedValue({
      success: true,
      message: "Added 1 entry successfully",
      files: ["main.bean"],
    });
    const getErrors = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { message: "Transaction does not balance (5.00 USD)", source: null },
      ]);
    const ctx = {
      services: { ledgerData: { getErrors } },
      identity: IDENTITY,
      ledgerEntryService: { addBulkEntries },
    } as any;
    const result = await addLedgerEntries()(ctx, {
      ledger: LEDGER_ID,
      allowInvalid: true,
      entries,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.result).toEqual(
      expect.objectContaining({
        wrote: [{ path: "main.bean" }],
        validation: {
          errorsBefore: 0,
          errorsAfter: 1,
          newErrors: [
            { message: "Transaction does not balance (5.00 USD)" },
          ],
        },
      }),
    );
    expect(String(result.result.summary)).toContain("1 new bean-check error");
  });
});
