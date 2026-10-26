import { tool } from "ai";
import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { BQL_ROW_COUNT, BQL_TRUNCATED } from "./bql-result-metadata";
import { BQL_SIZE_DESCRIPTION } from "@/features/ledger/utils/bql-size-description";

const toolLogger = logger.child({ module: "tool:bql-query" });

export const description =
  "Execute a BQL (Beancount Query Language) query against the user's ledger and return results. " +
  "BQL: SELECT cols [WHERE expr] [GROUP BY] [ORDER BY] [LIMIT n] | JOURNAL | BALANCES. " +
  "Columns: date, year, month, flag, payee, narration, account, number, currency, cost, change, " +
  "balance, position, tags, links, meta. " +
  "An unaggregated query returns one row per posting, not per transaction, so LIMIT 5 can span 3 transactions; GROUP BY and DISTINCT return one row per group or value. LIMIT bounds the returned rows. " +
  "Output past 1,000 lines or 100 KB is cut and ends with a truncation line; add LIMIT or a narrower WHERE to see the rest. " +
  BQL_SIZE_DESCRIPTION +
  " " +
  "Reference: https://beancount.github.io/docs/beancount_query_language/";

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
  const output = await runToolSafely({
    logger: toolLogger,
    message: "BQL query failed",
    context: { query: input.query },
    execute: async () => {
      // Same verb the GraphQL `queryShellText` resolver calls — authorization
      // and the underlying Fava call are identical for both surfaces
      // (ADR 0006 D1); this tool only shapes the output for the LLM.
      return services.ledgerShell.queryShellText({
        ledgerId,
        identity,
        query: input.query,
      });
    },
  });
  if (!output.ok) return output;
  const { text, truncated } = capBqlText(output.result.text ?? "");
  return Object.defineProperties(
    { ok: true as const, result: text },
    {
      [BQL_ROW_COUNT]: { value: output.result.rowCount },
      [BQL_TRUNCATED]: { value: truncated },
    },
  );
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

/**
 * The most rendered text one `runBqlQuery` call hands back (w23/010).
 *
 * The structured tool caps rows; this one returned the shell's whole table,
 * and one `JOURNAL` over a modest ledger was 5 MB — over a million tokens,
 * which a host either refuses or cuts without telling the agent. Rendered
 * cells can span lines, so lines are not rows; the line ceiling matches the
 * structured row ceiling for ordinary tables, and the byte ceiling bounds wide
 * rows such as `JOURNAL`'s. REST and GraphQL `queryShellText` keep the full
 * text: this is a model-context limit, not a query limit.
 */
const MAX_BQL_TEXT_LINES = MAX_STRUCTURED_BQL_ROWS + 2;
export const MAX_BQL_TEXT_BYTES = 100_000;

/** The text cut at a line boundary under both ceilings, marked when cut. */
export function capBqlText(text: string): { text: string; truncated: boolean } {
  const fullBytes = Buffer.byteLength(text);
  // A final newline ends the last line rather than starting another (w23/005).
  const lines = (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n");
  if (lines.length <= MAX_BQL_TEXT_LINES && fullBytes <= MAX_BQL_TEXT_BYTES) {
    return { text, truncated: false };
  }
  const kept: string[] = [];
  let bytes = 0;
  for (const line of lines.slice(0, MAX_BQL_TEXT_LINES)) {
    const size = Buffer.byteLength(line) + 1;
    if (bytes + size > MAX_BQL_TEXT_BYTES) break;
    kept.push(line);
    bytes += size;
  }
  const marker =
    `[truncated: showing the first ${kept.length} of ${lines.length} lines ` +
    `(${bytes} of ${fullBytes} bytes). Add LIMIT or a narrower WHERE to see ` +
    `the rest, or use runBqlQueryStructured for typed rows.]`;
  return { text: `${kept.join("\n")}\n${marker}\n`, truncated: true };
}

/** Preserve the typed shell representation used by REST and GraphQL. */
export const structuredBqlOutputSchema = toolOutputSchema(
  z.object({
    resultType: z.enum(["table", "text"]),
    rowCount: z
      .number()
      .int()
      .describe(
        "Result rows returned, after LIMIT. An unaggregated query returns one row per posting (not per transaction); GROUP BY and DISTINCT return one row per group or value.",
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
