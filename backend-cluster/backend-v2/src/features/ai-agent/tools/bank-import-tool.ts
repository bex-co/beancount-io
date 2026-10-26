import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import {
  toolOutputSchema,
  writeValidationSchema,
  wroteFileSchema,
} from "./types";
import { runToolSafely } from "../utils/run-tool";
import { resolveBankIdAlias } from "./bank-id-alias";
import {
  readBeanCheckErrors,
  summarizeWrite,
  toWriteValidation,
  withPostWriteValidation,
} from "./write-validation";

const toolLogger = logger.child({ module: "tool:bank" });

/**
 * One MCP tool per bank operation (ADR 019, 2026-10-18; w1/m38), each with
 * only that operation's fields, required where the operation needs them.
 *
 * The operations began as two grouped tools split by op class (ADR 0008 D3):
 * importing transactions is `write` and controlling a connection is `admin`,
 * so a credential that may import cannot sever a bank link. The classes still
 * hold per tool; OpenAI's app directory required the grouping itself to go.
 *
 * Linking a *new* bank has no tool: the operation is a hosted browser widget,
 * so there is no API to expose (ADR 0008 D4).
 */

const dryRunField = z
  .boolean()
  .optional()
  .describe(
    "Validate and report what would change, without changing anything.",
  );

/**
 * The bank-import payload is service-defined per operation, so the schema
 * stays open — but `submit` (the one operation that writes ledger entries)
 * carries the same write outcome as every other write tool (w2/m26), and
 * those fields are published here so `tools/list` advertises them.
 */
const bankImportOutputSchema = toolOutputSchema(
  z
    .object({
      summary: z.string().optional(),
      wrote: z.array(wroteFileSchema).optional(),
      entryHashes: z.array(z.string()).optional(),
      validation: writeValidationSchema.optional(),
    })
    .catchall(z.unknown()),
);
const bankConnectionOutputSchema = toolOutputSchema(z.unknown());

/** Importing transactions is a write; controlling a connection is admin. */
const FAMILIES = {
  import: { failure: "Bank import failed", output: bankImportOutputSchema },
  connection: {
    failure: "Bank connection operation failed",
    output: bankConnectionOutputSchema,
  },
} as const;

type BankCtx = Pick<ToolContext, "services" | "identity" | "ledgerId">;

/**
 * One bank operation: what its tool publishes, and how it runs. The tool's
 * strict schema already refused a missing field or an unsupported `dry_run`
 * before `run` is reached.
 */
function bankOperation<S extends z.ZodObject>(
  operation: string,
  family: keyof typeof FAMILIES,
  schema: S,
  description: string,
  run: (ctx: BankCtx, input: z.output<S>) => Promise<unknown>,
) {
  const { failure, output } = FAMILIES[family];
  return {
    schema: schema as z.ZodObject,
    description,
    outputSchema: output,
    execute: (ctx: BankCtx, input: unknown) => {
      toolLogger.debug("Bank operation", { operation });
      return runToolSafely({
        logger: toolLogger,
        message: failure,
        context: { operation },
        execute: () => run(ctx, schema.parse(input)),
      });
    },
  };
}

// Both spellings accepted (w23/m8/t002); executors resolve to the camelCase
// id before the service so it never sees the alias.
const itemIdFields = {
  itemId: z.string().optional().describe("The linked bank's id."),
  item_id: z.string().optional().describe("Alias of itemId."),
};
const ITEM_ID_NAMES = {
  primary: "itemId",
  legacy: "item_id",
  what: "bank item ids",
} as const;
const accountIdFields = {
  accountId: z.string().optional().describe("The linked bank account's id."),
  account_id: z.string().optional().describe("Alias of accountId."),
};
const ACCOUNT_ID_NAMES = {
  primary: "accountId",
  legacy: "account_id",
  what: "bank account ids",
} as const;
const transactionIdsFields = {
  transactionIds: z
    .array(z.string())
    .min(1)
    .optional()
    .describe(
      "The staged transactions to remove, each by its `transactionId` from listStagedBankTransactions — not its `id`.",
    ),
  transaction_ids: z
    .array(z.string())
    .min(1)
    .optional()
    .describe("Alias of transactionIds."),
};
const TRANSACTION_IDS_NAMES = {
  primary: "transactionIds",
  legacy: "transaction_ids",
  what: "staged transaction lists",
} as const;

const submitInput = z.object({
  transactions: z
    .array(
      z.object({
        transaction_id: z
          .string()
          .describe(
            "The staged row's `transactionId` from listStagedBankTransactions — not its `id`.",
          ),
        target_account: z
          .string()
          .describe("The ledger account to book this against."),
        source_account: z.string().optional(),
      }),
    )
    .min(1)
    .describe("The staged transactions to write."),
  filename: z
    .string()
    .optional()
    .describe("Which ledger file to append to. Must exist."),
  dry_run: dryRunField,
});

export const BANK_OPERATIONS = {
  sync: bankOperation(
    "sync",
    "import",
    z.object({ ...itemIdFields, dry_run: dryRunField }),
    "Pull new transactions from a linked bank into staging; nothing is written to the ledger. dry_run reports what would be pulled.",
    ({ services, identity, ledgerId }, { itemId, item_id, dry_run }) =>
      services.plaidSync.syncItemTransactions(
        identity,
        resolveBankIdAlias(
          { primary: itemId, legacy: item_id },
          ITEM_ID_NAMES,
        ),
        "manual",
        ledgerId,
        dry_run ?? false,
      ),
  ),
  submit: bankOperation(
    "submit",
    "import",
    submitInput,
    "Write staged bank transactions into the ledger as directives, each booked against the given target account. dry_run returns the result and projected validation without committing.",
    submitTransactions,
  ),
  discard: bankOperation(
    "discard",
    "import",
    z.object({ ...transactionIdsFields, dry_run: dryRunField }),
    "Remove staged bank transactions so they are never imported. dry_run reports what would be removed.",
    (
      { services, identity, ledgerId },
      { transactionIds, transaction_ids, dry_run },
    ) =>
      services.plaidSync.deleteTransactions(
        identity,
        ledgerId,
        resolveBankIdAlias(
          { primary: transactionIds, legacy: transaction_ids },
          TRANSACTION_IDS_NAMES,
        ),
        dry_run ?? false,
      ),
  ),
  reconcile: bankOperation(
    "reconcile",
    "connection",
    z.object({ ...itemIdFields, dry_run: dryRunField }),
    "Re-read which accounts a linked bank shares; accounts the bank no longer shares can be deleted along with their staged transactions. dry_run reports the changes without applying them.",
    ({ services, identity, ledgerId }, { itemId, item_id, dry_run }) =>
      services.plaidItem.reconcileItemAccounts(
        identity,
        resolveBankIdAlias(
          { primary: itemId, legacy: item_id },
          ITEM_ID_NAMES,
        ),
        ledgerId,
        dry_run ?? false,
      ),
  ),
  map_account: bankOperation(
    "map_account",
    "connection",
    z.object({
      ...accountIdFields,
      ledger_account: z.string().describe("The ledger account to map it to."),
    }),
    "Point a linked bank account at a ledger account; replaces any existing mapping.",
    (
      { services, identity, ledgerId },
      { accountId, account_id, ledger_account },
    ) =>
      services.plaidItem.updateAccountMapping(
        identity,
        resolveBankIdAlias(
          { primary: accountId, legacy: account_id },
          ACCOUNT_ID_NAMES,
        ),
        ledger_account,
        ledgerId,
      ),
  ),
  set_currency: bankOperation(
    "set_currency",
    "connection",
    z.object({
      ...accountIdFields,
      currency: z.string().describe("The account's currency, e.g. USD."),
    }),
    "Set a linked bank account's currency; replaces the current value.",
    ({ services, identity, ledgerId }, { accountId, account_id, currency }) =>
      services.plaidItem.updateAccountCurrency(
        identity,
        resolveBankIdAlias(
          { primary: accountId, legacy: account_id },
          ACCOUNT_ID_NAMES,
        ),
        currency,
        ledgerId,
      ),
  ),
  refresh: bankOperation(
    "refresh",
    "connection",
    z.object({ ...itemIdFields }),
    "Re-read a linked bank connection's health status from the bank.",
    ({ services, identity, ledgerId }, { itemId, item_id }) =>
      services.plaidItem.refreshItemStatus(
        identity,
        resolveBankIdAlias(
          { primary: itemId, legacy: item_id },
          ITEM_ID_NAMES,
        ),
        ledgerId,
      ),
  ),
  unlink: bankOperation(
    "unlink",
    "connection",
    z.object({ ...itemIdFields, dry_run: dryRunField }),
    "Sever a linked bank connection. Linking a new bank happens in a browser through the bank's own widget, not here. dry_run reports what would be removed.",
    ({ services, identity, ledgerId }, { itemId, item_id, dry_run }) =>
      services.plaidItem.unlinkItem(
        identity,
        resolveBankIdAlias(
          { primary: itemId, legacy: item_id },
          ITEM_ID_NAMES,
        ),
        ledgerId,
        dry_run ?? false,
      ),
  ),
};

/**
 * Writes staged transactions into the ledger, reporting the same write outcome
 * as every other write tool. A dry run projects nothing new, so its validation
 * repeats the ledger's current errors.
 */
async function submitTransactions(
  { services, identity, ledgerId }: BankCtx,
  { transactions, filename, dry_run }: z.output<typeof submitInput>,
) {
  const [owner, name] = ledgerId.split("/");
  const submit = () =>
    services.plaidSync.submitTransactionsToLedger(
      identity,
      owner,
      name,
      transactions.map((t) => ({
        transactionId: t.transaction_id,
        targetAccount: t.target_account,
        sourceAccount: t.source_account,
      })),
      filename,
      dry_run ?? false,
    );
  if (dry_run) {
    const errorsBefore = await readBeanCheckErrors(
      services,
      identity,
      ledgerId,
    );
    const submitted = await submit();
    return {
      ...submitted,
      summary: `Dry run: would submit ${transactions.length} bank transaction(s) — not committed.`,
      wrote: [],
      entryHashes: [],
      validation: toWriteValidation(errorsBefore, errorsBefore),
    };
  }
  const { written, validation } = await withPostWriteValidation(
    services,
    identity,
    ledgerId,
    submit,
  );
  // The file and hashes the write reports, so an agent need not query to find
  // the entries it just added (w5/942).
  const { entryHashes, targetFile, ...submitted } = written;
  return {
    ...submitted,
    summary: summarizeWrite(
      `Submitted ${transactions.length} bank transaction(s)${filename ? ` to ${filename}` : ""}`,
      validation,
    ),
    wrote: targetFile ? [{ path: targetFile }] : [],
    entryHashes: entryHashes ?? [],
    validation,
  };
}
