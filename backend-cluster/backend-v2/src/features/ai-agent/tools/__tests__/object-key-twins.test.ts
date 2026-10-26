import { ErrorCategory } from "@/shared/errors";
import { executeParseReceipt } from "../parse-receipt-tool";
import { createInsertReceiptTransactionTool } from "../insert-receipt-transaction-tool";

// w23/m11/t007: the harness chat tools take the same key twins as the
// MCP/REST/GraphQL surfaces.
describe("harness tool object-key twins", () => {
  const key = "tmp/usr_alice/receipt.pdf";

  it.each(["objectKey", "s3ObjectKey", "receiptObjectKey"])(
    "parseReceipt resolves the %s spelling",
    async (twin) => {
      const parseReceipt = jest.fn(async () => ({ date: "2026-09-01" }));
      const out = await executeParseReceipt(
        {
          llmService: { parseReceipt } as never,
          identity: { userId: "usr_alice" } as never,
          ledgerId: "alice/main",
          platform: "web",
        } as never,
        { [twin]: key } as never,
      );
      expect(out).toEqual({ ok: true, result: { date: "2026-09-01" } });
      expect(parseReceipt).toHaveBeenCalledWith(
        { userId: "usr_alice" },
        key,
        "alice/main",
        "web",
      );
    },
  );

  it("parseReceipt refuses two different keys without calling the service", async () => {
    const parseReceipt = jest.fn(async () => ({}));
    const out = await executeParseReceipt(
      {
        llmService: { parseReceipt } as never,
        identity: {} as never,
        ledgerId: "alice/main",
        platform: "web",
      } as never,
      { objectKey: key, s3ObjectKey: "tmp/usr_alice/other.pdf" } as never,
    );
    expect(out).toEqual({
      ok: false,
      error: expect.stringMatching(/different values/),
      errorCode: ErrorCategory.BAD_USER_INPUT,
    });
    expect(parseReceipt).not.toHaveBeenCalled();
  });

  const insertInput = {
    date: "2026-09-01",
    payee: "Café",
    description: "Breakfast",
    amount: "12.34",
    currency: "USD",
    expenseAccount: "Expenses:Food",
    paymentAccount: "Assets:Cash",
    documentAccount: "Expenses:Food",
  };

  it.each(["objectKey", "s3ObjectKey", "receiptObjectKey"])(
    "insertReceiptTransaction resolves the %s spelling",
    async (twin) => {
      const insertReceiptTransaction = jest.fn(async () => ({
        success: true,
      }));
      const tool = createInsertReceiptTransactionTool({
        services: {} as never,
        identity: { userId: "usr_alice" } as never,
        ledgerId: "alice/main",
        llmService: {} as never,
        ledgerReceiptWorkflow: { insertReceiptTransaction } as never,
      });
      const out = await (
        tool as unknown as {
          execute: (input: Record<string, unknown>) => Promise<unknown>;
        }
      ).execute({ [twin]: key, ...insertInput });
      expect(out).toEqual({ ok: true, result: { success: true } });
      expect(insertReceiptTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ receiptObjectKey: key }),
      );
    },
  );

  it("insertReceiptTransaction refuses a missing key without writing", async () => {
    const insertReceiptTransaction = jest.fn(async () => ({
      success: true,
    }));
    const tool = createInsertReceiptTransactionTool({
      services: {} as never,
      identity: {} as never,
      ledgerId: "alice/main",
      llmService: {} as never,
      ledgerReceiptWorkflow: { insertReceiptTransaction } as never,
    });
    const out = await (
      tool as unknown as {
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      }
    ).execute({ ...insertInput });
    expect(out).toEqual({
      ok: false,
      error: expect.stringMatching(/objectKey is required/),
      errorCode: ErrorCategory.BAD_USER_INPUT,
    });
    expect(insertReceiptTransaction).not.toHaveBeenCalled();
  });
});
