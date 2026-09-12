import { z } from "zod";
import { logger } from "@/shared/logger";
import { parseLedgerId } from "@/shared/str";
import { MAX_APPENDED_DIRECTIVES } from "@/features/ledger/service/ledger-entry-service";
import {
  type McpRequestContext,
  ledgerSelection,
  resolveMcpLedger,
} from "../api/mcp-context";
import { toolOutputSchema, withWriteOutcome } from "./types";
import { runToolSafely } from "../utils/run-tool";
import { summarizeWrite } from "./write-validation";

const toolLogger = logger.child({ module: "tool:append-ledger-text" });

export const appendLedgerTextDescription =
  "Append Beancount directive text as you would write it into a file; postings indented under " +
  "their transaction. Routes each directive to its file by type and date (path overrides) and " +
  `inserts it in date order. Max ${MAX_APPENDED_DIRECTIVES} directives. Non-directive text, and ` +
  "text introducing new bean-check errors (UNBALANCED when a transaction does not balance), are " +
  "refused unless allowInvalid. dry_run returns the diff and projected errors without " +
  "committing. Use this, not editLedgerFiles, to add directives.";

/**
 * The tool's input, built from the REST body so the two dialects of one
 * capability cannot drift (w2/m28:t005). `dry_run` keeps MCP's existing
 * snake-case spelling — it is what `editLedgerFiles` already publishes, and an
 * agent using both should not have to remember which one is which.
 */
export const appendLedgerTextInputSchema = z
  .object({
    text: z
      .string()
      .describe('e.g. `2026-01-02 * "Cafe" ""` plus indented postings.'),
    path: z.string().optional().describe("Target file; omit to auto-route."),
    dry_run: z.boolean().optional().default(false),
    allowInvalid: z.boolean().optional().default(false),
    ledger: ledgerSelection,
  })
  .strict();

export const appendLedgerTextOutputSchema = toolOutputSchema(
  withWriteOutcome({
    dry_run: z.boolean(),
    count: z.number().int().describe("Directives parsed out of the text"),
    diff: z
      .array(z.object({ path: z.string(), diff: z.string() }))
      .describe("Unified diff per file; dry runs only"),
    appendedUnsorted: z
      .array(z.string())
      .describe("Files not in date order, so these went at the end"),
  }),
);

export async function executeAppendLedgerText(
  context: McpRequestContext,
  input: unknown,
): Promise<z.infer<typeof appendLedgerTextOutputSchema>> {
  const args = appendLedgerTextInputSchema.parse(input);
  const ledgerId = resolveMcpLedger(context, args.ledger);
  const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
  return runToolSafely({
    logger: toolLogger,
    message: "Appending directive text failed",
    context: { ledgerId },
    execute: async () => {
      const result = await context.ledgerEntryService.appendDirectiveText(
        context.identity,
        ledgerOwner,
        ledgerName,
        {
          text: args.text,
          path: args.path,
          dryRun: args.dry_run,
          allowInvalid: args.allowInvalid,
        },
      );
      const validation = {
        errorsBefore: result.errorsBefore,
        errorsAfter: result.errorsAfter,
        newErrors: [...result.newErrors],
      };
      const unsorted =
        result.appendedUnsorted.length > 0
          ? ` (appended at the end of ${result.appendedUnsorted.join(", ")}: its directives are not in date order)`
          : "";
      return {
        summary: summarizeWrite(`${result.message}${unsorted}`, validation),
        dry_run: result.dryRun,
        count: result.count,
        diff: [...result.diff],
        appendedUnsorted: [...result.appendedUnsorted],
        wrote: [...result.wrote],
        // Directive text is addressed by file and line, not by entry hash —
        // the hash is assigned by the ledger when it reloads, and inventing
        // one here would be a value the caller could not use.
        entryHashes: [],
        validation,
      };
    },
  });
}
