import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:bql-query" });

export const description =
  "Execute a BQL (Beancount Query Language) query against the user's ledger and return results. " +
  "BQL: SELECT cols [WHERE expr] [GROUP BY] [ORDER BY] [LIMIT n] | JOURNAL | BALANCES. " +
  "Columns: date, flag, payee, narration, account, number, currency, cost, change, balance, position.";

export const bqlQueryInputSchema = z.object({
  query: z.string().describe("The BQL query to execute"),
});

export const bqlQueryOutputSchema = toolOutputSchema(z.string());
export type BqlQueryOutput = z.infer<typeof bqlQueryOutputSchema>;

export async function executeBqlQuery(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { query: string },
): Promise<BqlQueryOutput> {
  const { services, identity, ledgerId } = ctx;
  toolLogger.debug("Executing BQL query", { query: input.query });
  return runToolSafely({
    logger: toolLogger,
    message: "BQL query failed",
    context: { query: input.query },
    execute: async () => {
      // Same verb the GraphQL `queryShellText` resolver calls — authorization
      // and the underlying Fava call are identical for both surfaces
      // (ADR 0006 D1); this tool only shapes the output for the LLM.
      const { text } = await services.ledgerShell.queryShellText({
        ledgerId,
        identity,
        query: input.query,
      });
      return text ?? "";
    },
  });
}

export function createBqlQueryTool(ctx: ToolContext) {
  return tool({
    description,
    inputSchema: bqlQueryInputSchema,
    outputSchema: bqlQueryOutputSchema,
    execute: (input) =>
      executeBqlQuery(
        { services: ctx.services, identity: ctx.identity, ledgerId: ctx.ledgerId },
        input,
      ),
  });
}
