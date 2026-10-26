import { z } from "zod";
import { bankAccountQuery } from "@/features/ledger/api/rest/v1/banks-handler";
import { JOURNAL_FILTER_DESCRIPTION } from "@/features/ledger/utils/journal-filter-description";
import { JOURNAL_KINDS } from "@/features/ledger/utils/journal-kinds";
import { logger } from "@/shared/logger";
import type { ToolContext } from "../tools/types";
import { toolOutputSchema } from "../tools/types";
import { runToolSafely } from "../utils/run-tool";

/**
 * Read-only list tools for hosts that consume tools and not resources
 * (ADR 019 D7). Each wraps exactly the service call of a resource twin and is
 * authorized the same way; the rule they answer is that an identifier a tool
 * needs must be obtainable from some tool's output. Without them, ChatGPT and
 * Copilot's cloud agent cannot reach the ids the bank tools,
 * `getEntryContext`, `updateEntrySource`, and `deleteEntrySource` require.
 */

const toolLogger = logger.child({ module: "tool:list" });

// --- listBankConnections ----------------------------------------------------

export const listBankConnectionsDescription =
  "List linked bank connections (item_id) and their accounts (account_id), the ids the bank sync, import, and connection tools take.";

export const listBankConnectionsInput = z.object({}).strict();

export const listBankConnectionsOutput = toolOutputSchema(
  z.object({
    connections: z.array(z.unknown()),
    accounts: z.array(z.unknown()),
  }),
);

export async function executeListBankConnections(
  ctx: ToolContext,
  _input: z.infer<typeof listBankConnectionsInput>,
) {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Listing bank connections failed",
    context: { tool: "listBankConnections" },
    execute: async () => {
      // The two resource twins' calls (`bankList`, `bankAccounts`), each
      // authorized by its own service exactly as the resource is.
      const [connections, accounts] = await Promise.all([
        services.plaidItem.getItems(identity, ledgerId),
        services.plaidItem.getAccountsForLedger(identity, ledgerId),
      ]);
      return { connections, accounts };
    },
  });
}

// --- listStagedBankTransactions ---------------------------------------------

export const listStagedBankTransactionsDescription =
  "List bank transactions staged for import. Each row's `transactionId` — not its `id` — is what importStagedBankTransactions and discardStagedBankTransactions take; optional accountId filter.";

export const listStagedBankTransactionsInput = bankAccountQuery.strict();

export const listStagedBankTransactionsOutput = toolOutputSchema(
  z.array(z.unknown()),
);

export async function executeListStagedBankTransactions(
  ctx: ToolContext,
  input: z.infer<typeof listStagedBankTransactionsInput>,
) {
  const { services, identity, ledgerId } = ctx;
  const { accountId } = listStagedBankTransactionsInput.parse(input);
  return runToolSafely({
    logger: toolLogger,
    message: "Listing staged bank transactions failed",
    context: { tool: "listStagedBankTransactions" },
    // The `bankUnsyncedTransactions` resource's call, with its account filter.
    execute: () =>
      services.plaidItem.getUnsyncedTransactions(identity, accountId, ledgerId),
  });
}

// --- listLedgerEntries ----------------------------------------------------

/**
 * The journal resource's twin (w6/008): `getEntryContext` and
 * `updateEntrySource` and `deleteEntrySource` take an existing entry's hash, which no tool returned —
 * BQL's `id` is a directive index, and file reads have no entries.
 */
export const listLedgerEntriesDescription =
  "List journal entries, each with the entry_hash getEntryContext, updateEntrySource, and deleteEntrySource take. Narrows by account, filter, time, and directiveTypes; pages with limit and offset; total counts every match. Same data as the journal resource.";

export const listLedgerEntriesInput = z.object({
  account: z.string().optional().describe("Account filter, e.g. Assets:Bank."),
  filter: z.string().optional().describe(JOURNAL_FILTER_DESCRIPTION),
  time: z.string().optional().describe("Time expression, e.g. 2026-08."),
  // The published schema lists the kinds; matching ignores case, so the
  // service, not the schema, refuses an unknown one (w23/006).
  directiveTypes: z
    .array(z.string().meta({ enum: [...JOURNAL_KINDS.directiveTypes] }))
    .optional()
    .describe(
      'Directive types to include, e.g. ["Transaction"]; case does not matter.',
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe("Page size, 1-1000; defaults to 20."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Entries to skip; defaults to 0."),
});

export const listLedgerEntriesOutput = toolOutputSchema(
  z.object({
    total: z.number(),
    data: z.array(z.record(z.string(), z.unknown())),
    is_empty: z.boolean(),
  }),
);

export async function executeListLedgerEntries(
  ctx: ToolContext,
  input: z.infer<typeof listLedgerEntriesInput>,
): Promise<z.infer<typeof listLedgerEntriesOutput>> {
  const { services, identity, ledgerId } = ctx;
  return runToolSafely({
    logger: toolLogger,
    message: "Listing ledger entries failed",
    context: { tool: "listLedgerEntries" },
    execute: () =>
      // The same service call as the `ledgerJournal` resource, REST
      // `journal`, and GraphQL `getLedgerJournal`.
      services.ledgerJournal.getJournal({
        ledgerId,
        identity,
        query: input,
      }),
  });
}
