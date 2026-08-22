import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";

const toolLogger = logger.child({ module: "tool:insert-receipt-transaction" });

export const description =
  "Insert a receipt-linked transaction into the ledger. " +
  "Only call this tool after the user has reviewed and confirmed the transaction details. " +
  "The receipt file is permanently stored and linked to the transaction entry.";

export const insertReceiptTransactionInputSchema = z.object({
  receiptObjectKey: z
    .string()
    .describe("S3 object key of the receipt file (starts with tmp/)"),
  date: z
    .string()
    .nullable()
    .describe(
      "Transaction date in YYYY-MM-DD format, or null to default to today's date",
    ),
  payee: z.string().describe("Payee name"),
  description: z.string().describe("Transaction narration/description"),
  amount: z
    .string()
    .describe("Transaction amount as a decimal string (e.g. '25.50')"),
  currency: z.string().describe("Currency code (e.g. 'USD', 'EUR')"),
  expenseAccount: z
    .string()
    .describe("Expense account to debit (e.g. 'Expenses:Food:Dining')"),
  paymentAccount: z
    .string()
    .describe(
      "Payment account to credit (e.g. 'Assets:Checking' or 'Liabilities:CreditCard')",
    ),
  documentAccount: z
    .string()
    .describe(
      "Account to attach the receipt document to (e.g. 'Expenses:Food:Dining')",
    ),
});

export const insertReceiptTransactionOutputSchema = toolOutputSchema(
  z.object({ success: z.boolean() }),
);

export type InsertReceiptTransactionOutput = z.infer<
  typeof insertReceiptTransactionOutputSchema
>;

export async function executeInsertReceiptTransaction(
  ctx: Pick<ToolContext, "ledgerReceiptWorkflow" | "identity" | "ledgerId">,
  input: z.infer<typeof insertReceiptTransactionInputSchema>,
): Promise<InsertReceiptTransactionOutput> {
  const { ledgerReceiptWorkflow, identity, ledgerId } = ctx;
  // ledgerReceiptWorkflow.insertReceiptTransaction has no authorizeLedger seam
  // of its own — same reasoning as parse-receipt-tool.ts.
  assertLedgerScope(identity, ledgerId);
  // Default to today when the receipt had no visible date, so we never write a
  // blank/invalid Beancount entry.
  const date = input.date || new Date().toISOString().slice(0, 10);
  toolLogger.debug("Inserting receipt transaction", {
    date,
    payee: input.payee,
  });

  return runToolSafely({
    logger: toolLogger,
    message: "Failed to insert receipt transaction",
    context: { date, payee: input.payee },
    execute: async () => {
      const result = await ledgerReceiptWorkflow.insertReceiptTransaction({
        ledgerId,
        receiptObjectKey: input.receiptObjectKey,
        input: {
          date,
          payee: input.payee,
          description: input.description,
          postings: [
            {
              account: input.expenseAccount,
              amountNumber: input.amount,
              amountCurrency: input.currency,
            },
            {
              account: input.paymentAccount,
              amountNumber: `-${input.amount}`,
              amountCurrency: input.currency,
            },
          ],
          documentAccount: input.documentAccount,
        },
        userId: identity.userId,
      });
      return result;
    },
  });
}

export function createInsertReceiptTransactionTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: insertReceiptTransactionInputSchema,
    outputSchema: insertReceiptTransactionOutputSchema,
    needsApproval: true,
    execute: (input) => executeInsertReceiptTransaction(ctx, input),
  });
}
