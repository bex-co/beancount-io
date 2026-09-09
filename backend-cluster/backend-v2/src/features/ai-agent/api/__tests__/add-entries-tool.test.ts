import { MCP_TOOLS } from "../mcp-tools";
import { UnbalancedTransactionError } from "@/shared/errors";
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
  it("refuses an unbalanced transaction with UNBALANCED and the residual", async () => {
    const addBulkEntries = jest
      .fn()
      .mockRejectedValue(
        new UnbalancedTransactionError("Transaction does not balance", "5.00 USD", 0),
      );
    const result = await addLedgerEntries()(context({ addBulkEntries }), {
      ledger: LEDGER_ID,
      entries,
    });

    expect(addBulkEntries).toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        code: "UNBALANCED",
        message: "Transaction does not balance",
        hint: "residual 5.00 USD; add a posting or pass allowInvalid: true",
      },
    });
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
