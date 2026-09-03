import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:parse-receipt" });

const description =
  "Parse a receipt or invoice file that has been uploaded to S3. " +
  "Extracts structured transaction data (date, payee, description, amount) and recommends " +
  "the most likely expense and payment accounts from the user's ledger. " +
  "The caller must own the temporary upload and have read access to the ledger contents and assets. " +
  "Only call this tool when the file is clearly a receipt, invoice, or purchase document. " +
  "Use the S3 object key from the [Uploaded file references] section of the message.";

const parseReceiptInputSchema = z.object({
  objectKey: z
    .string()
    .describe("S3 object key of the uploaded receipt file (starts with tmp/)"),
});

const parseReceiptOutputSchema = toolOutputSchema(
  z.object({
    date: z
      .string()
      .nullable()
      .describe(
        "Transaction date in YYYY-MM-DD format, or null if no date was visible on the receipt",
      ),
    payee: z.string(),
    description: z.string(),
    amount: z.number().describe("Transaction amount (positive)"),
    sourceAccount: z
      .string()
      .optional()
      .describe("Recommended payment account (Assets or Liabilities)"),
    targetAccount: z
      .string()
      .optional()
      .describe("Recommended expense account (Expenses:*)"),
  }),
);

export type ParseReceiptOutput = z.infer<typeof parseReceiptOutputSchema>;

async function executeParseReceipt(
  ctx: Pick<ToolContext, "llmService" | "identity" | "ledgerId">,
  input: z.infer<typeof parseReceiptInputSchema>,
): Promise<ParseReceiptOutput> {
  const { llmService, identity, ledgerId } = ctx;
  // The caller's real identity goes in whole: `llmService.parseReceipt`
  // asserts the ledger scope itself, so this tool cannot be the surface that
  // forgets to.
  toolLogger.debug("Parsing receipt", { objectKey: input.objectKey });

  return runToolSafely({
    logger: toolLogger,
    message: "Failed to parse receipt",
    context: { objectKey: input.objectKey },
    execute: async () => {
      const result = await llmService.parseReceipt(
        identity,
        input.objectKey,
        ledgerId,
      );
      return result;
    },
  });
}

export function createParseReceiptTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: parseReceiptInputSchema,
    outputSchema: parseReceiptOutputSchema,
    execute: (input) => executeParseReceipt(ctx, input),
  });
}
