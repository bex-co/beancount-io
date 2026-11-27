import "reflect-metadata";
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

/**
 * Commit `entries` through MCP's `addLedgerEntries`, with the ledger's errors
 * read `before` and `after` the write: the commit result re-diffs them.
 */
async function commit(before: unknown[], after: unknown[]) {
  const addBulkEntries = jest.fn().mockResolvedValue({
    success: true,
    message: "Added 1 entry successfully",
    files: ["main.bean"],
  });
  const getErrors = jest
    .fn()
    .mockResolvedValueOnce(before)
    .mockResolvedValueOnce(after);
  const result = await addLedgerEntries()(
    {
      services: { ledgerData: { getErrors } },
      identity: IDENTITY,
      ledgerEntryService: { addBulkEntries },
    },
    { ledger: LEDGER_ID, entries },
  );
  if (!result.ok) throw new Error("expected ok");
  return result.result;
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
        new UnbalancedTransactionError(
          "Transaction does not balance",
          "5.00 USD",
          0,
        ),
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
      // The text half says the same thing in the words a person would use,
      // then carries the envelope for a client that reads only text.
      const lines = (result.content as { text: string }[])[0].text.split("\n");
      expect(lines.slice(0, -1)).toEqual([
        "UNBALANCED: Transaction does not balance",
        "Hint: residual 5.00 USD; add a posting or pass allowInvalid: true",
      ]);
      expect(JSON.parse(lines.at(-1) ?? "")).toEqual(result.structuredContent);
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
          newErrors: [{ message: "Transaction does not balance (5.00 USD)" }],
          valid: false,
        },
      }),
    );
    expect(String(result.result.summary)).toContain("1 new bean-check error");
  });

  // w31/113: the ledger service accepts an entry above an assertion that
  // already fails, but the commit's re-read quoted a new "got" figure and the
  // result reported the old failure as a new error the preview never named.
  describe("over a balance assertion that already fails", () => {
    const failed = (got: string, lineno: number) => ({
      message: `Balance failed for Assets:Cash: expected 40.00 USD, got ${got}`,
      source: { filename: "main.bean", lineno },
      code: "E2001",
    });

    it("reports no new error when only the reached figure moved", async () => {
      const result = await commit(
        [failed("49.75 USD", 89)],
        [failed("44.75 USD", 93)],
      );
      expect(result.validation).toEqual({
        errorsBefore: 1,
        errorsAfter: 1,
        newErrors: [],
        valid: true,
      });
      expect(String(result.summary)).toBe(
        "Added 1 entry to main.bean. No new bean-check errors.",
      );
    });

    it("still reports an assertion the write made fail", async () => {
      const result = await commit([], [failed("44.75 USD", 93)]);
      expect(result.validation).toMatchObject({
        errorsBefore: 0,
        errorsAfter: 1,
        newErrors: [
          {
            message:
              "Balance failed for Assets:Cash: expected 40.00 USD, got 44.75 USD",
            source: "main.bean:93",
          },
        ],
        valid: false,
      });
    });
  });

  // w31/115: a buy dated before a sale that fails to book changes the lots
  // the error quotes, so the commit's re-read named the old failure as new.
  describe("over a lot error the ledger already has", () => {
    const short = (available: string, lineno: number, requested = "10") => ({
      message: `Not enough units in Assets:Broker: requested ${requested}, available ${available}; not enough to reduce (2026-03-01, "sell-a")`,
      source: { filename: "main.bean", lineno },
      code: "BOOK",
    });
    const ambiguous = (lots: number, lineno: number) => ({
      message: `Ambiguous lot match for HOOL: ${lots} lots match in Assets:Strict (2026-03-01, "sell-s")`,
      source: { filename: "main.bean", lineno },
      code: "BOOK",
    });

    it("reports no new error when only the available figure or lot count moved", async () => {
      const result = await commit(
        [short("5", 20), ambiguous(2, 24)],
        [short("7", 24), ambiguous(3, 28)],
      );
      expect(result.validation).toEqual({
        errorsBefore: 2,
        errorsAfter: 2,
        newErrors: [],
        valid: true,
      });
      expect(String(result.summary)).toBe(
        "Added 1 entry to main.bean. No new bean-check errors.",
      );
    });

    it("still reports a reduction whose requested amount changed", async () => {
      const result = await commit([short("5", 20)], [short("7", 24, "12")]);
      expect(result.validation).toMatchObject({
        newErrors: [
          {
            message: short("7", 24, "12").message,
            source: "main.bean:24",
          },
        ],
        valid: false,
      });
    });
  });
});
