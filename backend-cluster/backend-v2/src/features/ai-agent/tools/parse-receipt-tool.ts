import { receiptParseResult } from "@/features/llm/api/receipt-parse-route";
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

export const parseReceiptInputSchema = z
  .object({
    objectKey: z
      .string()
      .describe(
        "S3 object key of the uploaded receipt file (starts with tmp/)",
      ),
  })
  .strict();

export const parseReceiptOutputSchema = toolOutputSchema(receiptParseResult);

export type ParseReceiptOutput = z.infer<typeof parseReceiptOutputSchema>;

export async function executeParseReceipt(
  ctx: Pick<ToolContext, "llmService" | "identity" | "ledgerId">,
  input: z.infer<typeof parseReceiptInputSchema>,
): Promise<ParseReceiptOutput> {
  const { llmService, identity, ledgerId } = ctx;
  // The caller's real identity goes in whole: `llmService.parseReceipt`
  // asserts the ledger scope itself, so this tool cannot be the surface that
  // forgets to.

  return runToolSafely({
    logger: toolLogger,
    message: "Failed to parse receipt",
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
