import { z } from "@/shared/zod-openapi-setup";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "@/server/rest/v1-route";
import { UnauthenticatedError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";

/**
 * The bank-import family: everything a customer does with a bank that is
 * already linked (w3/m8).
 *
 * Deliberately absent: the Plaid Link ceremony — `createLinkToken`,
 * `createUpdateModeLinkToken`, `exchangePublicToken`. Those are not endpoints
 * we declined to publish, they are a hosted browser widget; there is no API to
 * expose for them (ADR 0008 D4). A customer links a bank once in a browser and
 * everything after it is here.
 *
 * `dry_run=true` is offered on the five verbs that can genuinely preview
 * something — the three import-workflow writes, plus unlink and reconcile. It
 * is deliberately absent from the account-config updates and the status
 * refresh: a preview that only echoes its input back teaches a caller to trust
 * a check that never had a chance to catch the mistake.
 */

const itemPath = ledgerPathSchema.extend({
  itemId: z.string().openapi({ description: "The linked bank's item id" }),
});
const accountPath = ledgerPathSchema.extend({
  accountId: z.string().openapi({ description: "The bank account's id" }),
});
const dryRunQuery = z.object({
  dry_run: z.coerce.boolean().optional().openapi({
    description:
      "Validate and report what would change, without changing anything.",
  }),
});
const json = (description: string) => ({
  description,
  content: { "application/json": { schema: z.unknown() } },
});

/**
 * The caller, as a value the Plaid services will accept.
 *
 * Every v1 route sits behind the identity gate, so this is always present — but
 * the Plaid services take `Identity` non-optionally where the ledger services
 * take `Identity | undefined`, and fifteen bare `!` assertions would be one
 * unexamined claim repeated fifteen times. Stated once, and it throws rather
 * than handing `undefined` to something that would report it as "item not
 * found" — sending a caller after the wrong problem.
 */
function callerOf(identity: Identity | undefined): Identity {
  if (!identity) {
    throw new UnauthenticatedError(
      "This endpoint requires an authenticated caller",
    );
  }
  return identity;
}

const V1 = "/api-gateway/v1/ledgers/{owner}/{name}";

export const BANK_ROUTES = [
  // --- reads ---------------------------------------------------------------
  v1Route({
    method: "get",
    path: `${V1}/banks`,
    summary: "List linked banks",
    description: "Every bank connection linked to this ledger.",
    params: ledgerPathSchema,
    responses: { 200: json("Linked banks") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.getItems(
        callerOf(identity),
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "get",
    path: `${V1}/banks/{itemId}`,
    summary: "Get one linked bank",
    description: "Status and institution details for a single bank connection.",
    params: itemPath,
    responses: { 200: json("The bank connection") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.getItem(callerOf(identity), params.itemId),
  }),
  v1Route({
    method: "get",
    path: `${V1}/banks/{itemId}/accounts`,
    summary: "List a bank's accounts",
    description: "The accounts this bank connection shares.",
    params: itemPath,
    responses: { 200: json("Bank accounts") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.getAccounts(
        callerOf(identity),
        params.itemId,
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "get",
    path: `${V1}/bank-accounts`,
    summary: "List every bank account on the ledger",
    description:
      "Accounts across all linked banks, with their institution and ledger-account mapping.",
    params: ledgerPathSchema,
    responses: { 200: json("Bank accounts") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.getAccountsForLedger(
        callerOf(identity),
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "get",
    path: `${V1}/bank-transactions/unsynced`,
    summary: "List transactions not yet in the ledger",
    description:
      "Transactions pulled from the bank that have not been written into the ledger.",
    params: ledgerPathSchema,
    query: z.object({
      accountId: z.string().optional().openapi({
        description: "Restrict to one bank account",
      }),
    }),
    responses: { 200: json("Unsynced transactions") },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.plaidItem.getUnsyncedTransactions(
        callerOf(identity),
        query.accountId,
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "get",
    path: `${V1}/bank-transactions/suggested-categories`,
    summary: "Suggest a ledger account per unsynced transaction",
    description:
      "Category suggestions drawn from the ledger's own history — what an importer should propose before asking.",
    params: ledgerPathSchema,
    query: z.object({ accountId: z.string().optional() }),
    responses: { 200: json("Category suggestions") },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.plaidItem.suggestCategories(
        callerOf(identity),
        ledgerIdOf(params),
        query.accountId,
      ),
  }),
  v1Route({
    method: "get",
    path: `${V1}/banks/{itemId}/suggested-mapping`,
    summary: "Suggest a ledger account per bank account",
    description:
      "Which ledger account each of this bank's accounts most likely corresponds to.",
    params: itemPath,
    responses: { 200: json("Account mapping suggestions") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.suggestAccountMapping(
        callerOf(identity),
        ledgerIdOf(params),
        params.itemId,
      ),
  }),

  // --- writes --------------------------------------------------------------
  v1Route({
    method: "post",
    path: `${V1}/banks/{itemId}/sync`,
    summary: "Pull new transactions from the bank",
    description:
      "Fetches transactions from the bank into the staging area. `dry_run=true` reports what would arrive without storing it or advancing the sync cursor, so the real sync that follows returns the same thing.",
    params: itemPath,
    query: dryRunQuery,
    responses: { 200: json("Sync result, or a preview of one") },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.plaidSync.syncItemTransactions(
        callerOf(identity),
        params.itemId,
        "manual",
        ledgerIdOf(params),
        query.dry_run,
      ),
  }),
  v1Route({
    method: "post",
    path: `${V1}/bank-transactions/submit`,
    summary: "Write staged transactions into the ledger",
    description:
      "Appends the named transactions as beancount directives. `dry_run=true` runs every check and returns the exact entries that would be written.",
    params: ledgerPathSchema,
    query: dryRunQuery,
    body: z
      .object({
        transactions: z
          .array(
            z.object({
              transactionId: z.string(),
              targetAccount: z.string().openapi({
                description: "The ledger account to book this against",
                example: "Expenses:Groceries",
              }),
              sourceAccount: z.string().optional(),
            }),
          )
          .min(1),
        filename: z.string().optional().openapi({
          description: "Which ledger file to append to; must already exist",
        }),
      })
      .openapi("BankTransactionSubmission"),
    responses: { 200: json("Submission result, or a preview of one") },
    handler: async ({ layers }, { identity, params, body, query }) => {
      const [owner, name] = ledgerIdOf(params).split("/");
      return layers.services.plaidSync.submitTransactionsToLedger(
        callerOf(identity),
        owner,
        name,
        body.transactions,
        body.filename,
        query.dry_run,
      );
    },
  }),
  v1Route({
    method: "delete",
    path: `${V1}/bank-transactions`,
    summary: "Discard staged transactions",
    description:
      "Removes transactions from the staging area. Already-written ones are refused. `dry_run=true` lists exactly what would go.",
    params: ledgerPathSchema,
    query: dryRunQuery,
    body: z
      .object({ transactionIds: z.array(z.string()).min(1) })
      .openapi("BankTransactionDiscard"),
    responses: { 200: json("Deletion result, or a preview of one") },
    handler: async ({ layers }, { identity, params, body, query }) =>
      layers.services.plaidSync.deleteTransactions(
        callerOf(identity),
        ledgerIdOf(params),
        body.transactionIds,
        query.dry_run,
      ),
  }),
  v1Route({
    method: "post",
    path: `${V1}/banks/{itemId}/reconcile`,
    summary: "Re-read which accounts the bank shares",
    description:
      "Adds accounts the bank now shares and removes ones it no longer does. `dry_run=true` returns that diff without applying it.",
    params: itemPath,
    query: dryRunQuery,
    responses: { 200: json("Reconcile result, or a preview of one") },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.plaidItem.reconcileItemAccounts(
        callerOf(identity),
        params.itemId,
        ledgerIdOf(params),
        query.dry_run,
      ),
  }),
  v1Route({
    method: "delete",
    path: `${V1}/banks/{itemId}`,
    summary: "Unlink a bank",
    description:
      "Severs the bank connection. `dry_run=true` reports what would be severed — the institution and every account — without doing it.",
    params: itemPath,
    query: dryRunQuery,
    responses: { 200: json("Unlink result, or a preview of one") },
    handler: async ({ layers }, { identity, params, query }) =>
      layers.services.plaidItem.unlinkItem(
        callerOf(identity),
        params.itemId,
        ledgerIdOf(params),
        query.dry_run,
      ),
  }),
  v1Route({
    method: "post",
    path: `${V1}/banks/{itemId}/refresh`,
    summary: "Refresh a bank's connection status",
    description:
      "Re-reads the connection's health from the bank. No `dry_run`: there is nothing to preview — it reports status rather than changing your data.",
    params: itemPath,
    responses: { 200: json("The refreshed connection") },
    handler: async ({ layers }, { identity, params }) =>
      layers.services.plaidItem.refreshItemStatus(
        callerOf(identity),
        params.itemId,
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "put",
    path: `${V1}/bank-accounts/{accountId}/mapping`,
    summary: "Map a bank account to a ledger account",
    description:
      "Sets which ledger account this bank account's transactions book against. No `dry_run`: the preview would only echo the value you sent.",
    params: accountPath,
    body: z.object({ ledgerAccount: z.string() }).openapi("BankAccountMapping"),
    responses: { 200: json("Whether the mapping changed") },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.services.plaidItem.updateAccountMapping(
        callerOf(identity),
        params.accountId,
        body.ledgerAccount,
        ledgerIdOf(params),
      ),
  }),
  v1Route({
    method: "put",
    path: `${V1}/bank-accounts/{accountId}/currency`,
    summary: "Set a bank account's currency",
    description:
      "Sets the currency its transactions are booked in. No `dry_run`, for the same reason as the mapping above.",
    params: accountPath,
    body: z.object({ currency: z.string() }).openapi("BankAccountCurrency"),
    responses: { 200: json("Whether the currency changed") },
    handler: async ({ layers }, { identity, params, body }) =>
      layers.services.plaidItem.updateAccountCurrency(
        callerOf(identity),
        params.accountId,
        body.currency,
        ledgerIdOf(params),
      ),
  }),
] as const;
