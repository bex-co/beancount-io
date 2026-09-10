import { z } from "zod";
import { logger } from "@/shared/logger";
import { parseLedgerId } from "@/shared/str";
import type { ToolContext } from "./types";
import type { McpRequestContext } from "../api/mcp-context";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:ledger-context" });

/**
 * The four reads every audit agent needed first (w2/m27:t003).
 *
 * Each wraps the same service call as its resource twin, so the parity tests
 * keep one list and two adapters (ADR 0008 D5) — a read becomes a tool here
 * only because agent runs showed it is the first thing an agent looks for and
 * clients do not surface the resource (ADR 0008 D2 exception).
 */

// --- listLedgers --------------------------------------------------------

export const listLedgersDescription =
  "List the ledgers this credential can reach. A pinned credential returns its one ledger; an unpinned credential must call this first and pass `ledger: owner/name` afterwards.";

export const listLedgersInputSchema = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("1-based page number, defaults to 1."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Page size, at most 100."),
});

export const listLedgersOutputSchema = toolOutputSchema(
  z.array(z.unknown()),
);

export async function executeListLedgers(
  ctx: Pick<McpRequestContext, "ledgerWorkflow" | "identity">,
  input: { page?: number; limit?: number },
): Promise<z.infer<typeof listLedgersOutputSchema>> {
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to list ledgers",
    execute: () =>
      // The same workflow call as the `accessibleLedgers` resource twin, so
      // the pin restriction applies identically on both primitives.
      ctx.ledgerWorkflow.listLedgers({
        identity: ctx.identity,
        args: { page: input.page, limit: input.limit },
      }),
  });
}

// --- checkLedger ----------------------------------------------------------

export const checkLedgerDescription =
  "Check one ledger's validity in one call: bean-check errors with file and line, entry counts per directive type, and the latest commit. Call after any write instead of re-reading files.";

export const checkLedgerInputSchema = z.object({});

export const checkLedgerOutputSchema = toolOutputSchema(
  z.object({
    errors: z.array(z.unknown()),
    entriesCount: z.array(z.unknown()),
    latestCommit: z.unknown(),
  }),
);

export async function executeCheckLedger(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
): Promise<z.infer<typeof checkLedgerOutputSchema>> {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to check ledger",
    context: { ledgerId },
    execute: async () => {
      // One service call per resource twin, in parallel: the `errors`,
      // `entries-count`, and `latest-commit` reads an agent would otherwise
      // make as three round trips.
      const [errors, entriesCount, latestCommit] = await Promise.all([
        services.ledgerData.getErrors({ ledgerId, identity }),
        services.ledgerData.getEntriesCountPerType({ ledgerId, identity }),
        services.ledgerRepo.getLatestCommit({ ledgerId, identity }),
      ]);
      return { errors, entriesCount, latestCommit };
    },
  });
}

// --- getLedgerContext -----------------------------------------------------

export const getLedgerContextDescription =
  "Read a ledger's working vocabulary in one call: attributes, open accounts, currencies, payees, years, and source files. Counts accompany truncated lists so a large ledger does not flood context.";

export const getLedgerContextInputSchema = z.object({
  payeeLimit: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("How many payees to return; defaults to 50."),
});

export const getLedgerContextOutputSchema = toolOutputSchema(
  z.object({
    attributes: z.unknown(),
    accounts: z.array(z.string()),
    currencies: z.array(z.string()),
    payees: z.array(z.string()),
    payeeCount: z.number().int(),
    years: z.array(z.string()),
    sourceFiles: z.array(z.string()),
    sourceFileCount: z.number().int(),
  }),
);

export async function executeGetLedgerContext(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { payeeLimit?: number },
): Promise<z.infer<typeof getLedgerContextOutputSchema>> {
  const { services, identity, ledgerId } = ctx;
  const payeeLimit = input.payeeLimit ?? 50;
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to read ledger context",
    context: { ledgerId },
    execute: async () => {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const [attributes, accounts, currencies, payees, years, sourceFiles] =
        await Promise.all([
          services.ledgerData.getAttributes({ ledgerId, identity }),
          services.ledgerAccount.getAccounts(
            ledgerOwner,
            ledgerName,
            "open",
            identity,
          ),
          services.ledgerData.getCurrencies({ ledgerId, identity }),
          services.ledgerData.getPayees({ ledgerId, identity }),
          services.ledgerData.getYears({ ledgerId, identity }),
          services.ledgerData.getSourceFiles({ ledgerId, identity }),
        ]);
      return {
        attributes,
        accounts,
        currencies,
        payees: payees.slice(0, payeeLimit),
        payeeCount: payees.length,
        years,
        sourceFiles,
        sourceFileCount: sourceFiles.length,
      };
    },
  });
}

// --- getEntryContext ------------------------------------------------------

export const getEntryContextDescription =
  "Read the source context around one entry, addressed by its hash — what to read before editing it. Same data as the entry-context resource.";

export const getEntryContextInputSchema = z.object({
  entryHash: z.string().describe("The entry's hash."),
});

export const getEntryContextOutputSchema = toolOutputSchema(z.unknown());

export async function executeGetEntryContext(
  ctx: Pick<ToolContext, "services" | "identity" | "ledgerId">,
  input: { entryHash: string },
): Promise<z.infer<typeof getEntryContextOutputSchema>> {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Failed to read entry context",
    context: { ledgerId },
    execute: () =>
      // The same service call as the `ledgerEntryContext` resource twin.
      services.ledgerJournal.getContext({
        ledgerId,
        identity,
        entryHash: input.entryHash,
      }),
  });
}
