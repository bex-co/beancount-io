import { z } from "zod";
import { logger } from "@/shared/logger";
import type { ToolContext } from "./types";
import { toolOutputSchema } from "./types";
import { runToolSafely } from "../utils/run-tool";

const toolLogger = logger.child({ module: "tool:bank" });

/**
 * The bank verbs, split along the line their op classes already draw
 * (ADR 0008 D3).
 *
 * This began as one eight-verb tool and the op-class registry refused it: the
 * single tool id would have been classified `write` by `syncPlaidTransactions`
 * and `admin` by `refreshPlaidItemStatus`. That is D3 enforcing itself —
 * grouping is legitimate when members share a shape **and an authorization
 * class**, and that grouping had only the first.
 *
 * The split is not a concession. A credential that may import transactions
 * should not thereby be able to sever the bank connection, and one tool would
 * have made those the same permission.
 *
 * Linking a *new* bank appears in neither: the operation is a hosted browser
 * widget, so there is no API to expose (ADR 0008 D4).
 */

const dryRunField = z
  .boolean()
  .optional()
  .describe(
    "Validate and report what would change, without changing anything.",
  );

// --- import workflow (write class) ------------------------------------------

export const importDescription =
  "Move bank transactions into the ledger. `sync` pulls new transactions from a linked bank into staging; `submit` writes staged ones into the ledger as directives; `discard` removes staged ones. " +
  "All three accept dry_run, which runs every check and reports exactly what would happen without doing it.";

export const bankImportInputSchema = z.object({
  operation: z
    .enum(["sync", "submit", "discard"])
    .describe("What to do with staged bank transactions."),
  item_id: z
    .string()
    .optional()
    .describe("The linked bank's id. Required by `sync`."),
  transactions: z
    .array(
      z.object({
        transaction_id: z.string(),
        target_account: z
          .string()
          .describe("The ledger account to book this against."),
        source_account: z.string().optional(),
      }),
    )
    .optional()
    .describe("Required by `submit`: which staged transactions to write."),
  transaction_ids: z
    .array(z.string())
    .optional()
    .describe("Required by `discard`."),
  filename: z
    .string()
    .optional()
    .describe("For `submit`: which ledger file to append to. Must exist."),
  dry_run: dryRunField,
});

export const bankImportOutputSchema = toolOutputSchema(z.unknown());

// --- connection control plane (admin class) ---------------------------------

export const connectionDescription =
  "Manage a linked bank connection. `reconcile` re-reads which accounts it shares; `map_account` points one at a ledger account; `set_currency` sets its currency; `refresh` re-reads connection health; `unlink` severs it. " +
  "Linking a NEW bank is not here — that happens in a browser through the bank's own widget. " +
  "`reconcile` and `unlink` accept dry_run; the others change one field or read a status, so there is nothing to preview.";

export const bankConnectionInputSchema = z.object({
  operation: z
    .enum(["reconcile", "map_account", "set_currency", "refresh", "unlink"])
    .describe("What to do to the connection."),
  item_id: z
    .string()
    .optional()
    .describe("Required by `reconcile`, `refresh`, `unlink`."),
  account_id: z
    .string()
    .optional()
    .describe("Required by `map_account` and `set_currency`."),
  ledger_account: z.string().optional().describe("Required by `map_account`."),
  currency: z.string().optional().describe("Required by `set_currency`."),
  dry_run: dryRunField,
});

export const bankConnectionOutputSchema = toolOutputSchema(z.unknown());

type ImportInput = z.infer<typeof bankImportInputSchema>;
type ConnectionInput = z.infer<typeof bankConnectionInputSchema>;
type BankCtx = Pick<ToolContext, "services" | "identity" | "ledgerId">;

/**
 * A required argument, refused by name.
 *
 * Without this a missing `item_id` reaches the service as `undefined` and comes
 * back as "Item not found" — which sends a model looking for the wrong problem.
 */
function required<T>(value: T | undefined, key: string, operation: string): T {
  if (value === undefined || value === null) {
    throw new Error(`\`${key}\` is required for operation "${operation}"`);
  }
  return value;
}

export async function executeBankImport(ctx: BankCtx, input: ImportInput) {
  const { services, identity, ledgerId } = ctx;
  const dryRun = input.dry_run ?? false;
  toolLogger.debug("Bank import", { operation: input.operation, dryRun });

  return runToolSafely({
    logger: toolLogger,
    message: "Bank import failed",
    context: { operation: input.operation },
    execute: async () => {
      switch (input.operation) {
        case "sync":
          return services.plaidSync.syncItemTransactions(
            identity,
            required(input.item_id, "item_id", "sync"),
            "manual",
            ledgerId,
            dryRun,
          );
        case "submit": {
          const [owner, name] = ledgerId.split("/");
          return services.plaidSync.submitTransactionsToLedger(
            identity,
            owner,
            name,
            required(input.transactions, "transactions", "submit").map((t) => ({
              transactionId: t.transaction_id,
              targetAccount: t.target_account,
              sourceAccount: t.source_account,
            })),
            input.filename,
            dryRun,
          );
        }
        case "discard":
          return services.plaidSync.deleteTransactions(
            identity,
            ledgerId,
            required(input.transaction_ids, "transaction_ids", "discard"),
            dryRun,
          );
      }
    },
  });
}

export async function executeBankConnection(
  ctx: BankCtx,
  input: ConnectionInput,
) {
  const { services, identity, ledgerId } = ctx;
  const dryRun = input.dry_run ?? false;
  toolLogger.debug("Bank connection", { operation: input.operation, dryRun });

  return runToolSafely({
    logger: toolLogger,
    message: "Bank connection operation failed",
    context: { operation: input.operation },
    execute: async () => {
      switch (input.operation) {
        case "reconcile":
          return services.plaidItem.reconcileItemAccounts(
            identity,
            required(input.item_id, "item_id", "reconcile"),
            ledgerId,
            dryRun,
          );
        case "unlink":
          return services.plaidItem.unlinkItem(
            identity,
            required(input.item_id, "item_id", "unlink"),
            ledgerId,
            dryRun,
          );
        case "refresh":
          return services.plaidItem.refreshItemStatus(
            identity,
            required(input.item_id, "item_id", "refresh"),
            ledgerId,
          );
        case "map_account":
          return services.plaidItem.updateAccountMapping(
            identity,
            required(input.account_id, "account_id", "map_account"),
            required(input.ledger_account, "ledger_account", "map_account"),
            ledgerId,
          );
        case "set_currency":
          return services.plaidItem.updateAccountCurrency(
            identity,
            required(input.account_id, "account_id", "set_currency"),
            required(input.currency, "currency", "set_currency"),
            ledgerId,
          );
      }
    },
  });
}
