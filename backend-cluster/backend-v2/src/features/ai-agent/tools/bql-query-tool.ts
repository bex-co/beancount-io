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
  "Columns: date, year, month, flag, payee, narration, account, number, currency, cost, change, " +
  "balance, position, tags, links, meta. " +
  "Rows are postings, not transactions: LIMIT 5 can return 3 transactions.";

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

/**
 * Most rows one structured BQL call will hand back (w2/m28:t001).
 *
 * A `SELECT` with no `LIMIT` over a real ledger is tens of thousands of
 * postings, and the whole table arrives in the model's context whether it
 * needed the tail or not. The cap is a documented ceiling rather than a
 * silent slice: `truncated` says it happened and `rowCount` says how many
 * rows came back, so an agent can narrow the query instead of believing it
 * has seen everything.
 */
export const MAX_STRUCTURED_BQL_ROWS = 1000;

/** Preserve the typed shell representation used by REST and GraphQL. */
export const structuredBqlOutputSchema = toolOutputSchema(
  z.object({
    resultType: z.enum(["table", "text"]),
    rowCount: z
      .number()
      .int()
      .describe(
        "Rows returned. BQL rows are postings, so this counts postings, not transactions.",
      ),
    truncated: z
      .boolean()
      .describe(
        `True when the result hit the ${MAX_STRUCTURED_BQL_ROWS}-row ceiling and rows were dropped. Add a LIMIT or a narrower WHERE to see a complete result.`,
      ),
    table: z
      .object({
        types: z.array(z.object({ name: z.string(), dtype: z.string() })),
        rows: z.array(
          z.array(
            z.union([
              z.string(),
              z.number(),
              z.boolean(),
              z.null(),
              z.record(z.string(), z.unknown()),
            ]),
          ),
        ),
        t: z.string().optional(),
      })
      .optional(),
    text: z
      .object({ contents: z.string(), t: z.string().optional() })
      .optional(),
  }),
);

export async function executeStructuredBqlQuery(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { query: string },
): Promise<z.infer<typeof structuredBqlOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Structured BQL query failed",
    execute: async () => {
      const result = await ctx.services.ledgerShell.queryShell({
        identity: ctx.identity,
        ledgerId: ctx.ledgerId,
        query: input.query,
      });
      const rows = result.table?.rows ?? [];
      const kept = rows.slice(0, MAX_STRUCTURED_BQL_ROWS);
      return {
        ...result,
        rowCount: kept.length,
        truncated: rows.length > kept.length,
        ...(result.table && { table: { ...result.table, rows: kept } }),
      };
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
        {
          services: ctx.services,
          identity: ctx.identity,
          ledgerId: ctx.ledgerId,
        },
        input,
      ),
  });
}
