import { type DbExecutor } from "@/drizzle/drizzle";
import { type IModels } from "@/foundation/models";
import { BadUserInputError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { type IPlaidClient } from "../service/plaid-client";
import { type PlaidAccount } from "../data/plaid-account-model/types";

const reconcileLogger = logger.child({ module: "plaid-reconcile-accounts" });

export interface ReconcileAccountsDeps {
  plaidClient: Pick<IPlaidClient, "getAccounts">;
  models: Pick<IModels, "plaidAccount">;
  db: DbExecutor;
}

export interface ReconcileAccountsParams {
  itemId: string;
  accessToken: string;
  /**
   * Whether accounts Plaid no longer shares may be deleted.
   *
   * Deleting cascades to the account's `plaid_transactions` rows and is
   * irreversible, so only pass `true` from a path that runs immediately after
   * the user confirmed their selection in Plaid's own Account Select pane.
   * Unattended callers (transaction sync, webhooks, cron) must pass `false`:
   * adding is always safe to retry, removing is not.
   */
  allowDeletes: boolean;
  /**
   * Compute the diff and return it without writing anything.
   *
   * A separate flag rather than a caller-side "read then decide": the diff is
   * derived from a live Plaid response and our stored rows, so anything
   * recomputed outside this function could disagree with what the write would
   * actually do.
   */
  dryRun?: boolean;
}

export interface ReconcileAccountsResult {
  addedAccounts: PlaidAccount[];
  removedCount: number;
  /** Accounts Plaid no longer shares that were left in place because `allowDeletes` was false. */
  staleCount: number;
  /** Set only by a preview: the diff that a real reconcile would act on. */
  dryRun?: true;
  wouldAdd?: Array<{ accountId: string; accountName: string; mask?: string }>;
  wouldDelete?: Array<{
    accountId: string;
    accountName: string;
    ledgerAccount?: string;
  }>;
}

/**
 * Diff the accounts Plaid currently shares for an Item against what we store,
 * and apply the difference.
 *
 * Shared by `PlaidItemService.reconcileItemAccounts` (the user-confirmed path,
 * which deletes) and `PlaidSyncService.syncItemTransactions` (which only adds,
 * so a dropped client-side reconcile self-heals on the next sync).
 */
export async function reconcileAccounts(
  deps: ReconcileAccountsDeps,
  params: ReconcileAccountsParams,
): Promise<ReconcileAccountsResult> {
  const { plaidClient, models, db } = deps;
  const { itemId, accessToken, allowDeletes, dryRun = false } = params;

  const remoteAccounts = await plaidClient.getAccounts(accessToken);
  const localAccounts = await models.plaidAccount.getByItemId(db, itemId);

  // Guard the blast radius: deleting is irreversible, so never let a single
  // anomalous empty response wipe out every account and its transactions.
  if (remoteAccounts.length === 0 && localAccounts.length > 0) {
    reconcileLogger.error(
      "Plaid returned zero accounts; refusing to reconcile",
      { itemId, localAccountsCount: localAccounts.length },
    );
    throw new BadUserInputError(
      "Your bank returned no accounts. Nothing was changed; please try again later.",
    );
  }

  // Keyed on Plaid's account_id, not our own pacc_ primary key.
  const remoteIds = new Set(remoteAccounts.map((a) => a.accountId));
  const localIds = new Set(localAccounts.map((a) => a.accountId));

  const toCreate = remoteAccounts.filter((a) => !localIds.has(a.accountId));
  const stale = localAccounts.filter((a) => !remoteIds.has(a.accountId));
  const toDelete = allowDeletes ? stale : [];

  if (toDelete.length > 0) {
    // Hard deletes cascade to plaid_transactions, so leave a trail.
    reconcileLogger.info("Deleting Plaid accounts no longer shared", {
      itemId,
      accounts: toDelete.map((a) => ({
        id: a.id,
        accountId: a.accountId,
        accountName: a.accountName,
        mask: a.mask,
        ledgerAccount: a.ledgerAccount,
      })),
    });
  } else if (stale.length > 0) {
    reconcileLogger.info(
      "Plaid no longer shares some stored accounts; leaving them in place",
      { itemId, staleCount: stale.length },
    );
  }

  if (toCreate.length === 0 && toDelete.length === 0) {
    return { addedAccounts: [], removedCount: 0, staleCount: stale.length };
  }

  // The diff above is the whole decision — what Plaid shares, what we store,
  // and which of the difference `allowDeletes` permits acting on. Returning it
  // here is an exact preview, not an estimate, because the write below acts on
  // these very lists (w3/m8).
  if (dryRun) {
    return {
      addedAccounts: [],
      removedCount: 0,
      staleCount: stale.length,
      dryRun: true,
      wouldAdd: toCreate.map((a) => ({
        accountId: a.accountId,
        accountName: a.name,
        mask: a.mask ?? undefined,
      })),
      wouldDelete: toDelete.map((a) => ({
        accountId: a.accountId,
        accountName: a.accountName,
        ledgerAccount: a.ledgerAccount ?? undefined,
      })),
    };
  }

  const addedAccounts: PlaidAccount[] = [];
  await db.transaction(async (tx) => {
    for (const account of toCreate) {
      try {
        addedAccounts.push(
          await models.plaidAccount.create(tx, {
            plaidItemId: itemId,
            accountId: account.accountId,
            accountName: account.name,
            accountType: account.type,
            accountSubtype: account.subtype ?? undefined,
            mask: account.mask ?? undefined,
          }),
        );
      } catch (err) {
        // plaid_accounts.account_id is globally unique rather than unique per
        // item. Plaid derives account_id per Item so a collision should be
        // impossible, but one bad row must not abort the whole reconcile.
        if (isUniqueViolation(err)) {
          reconcileLogger.error("Plaid account_id collision during reconcile", {
            itemId,
            accountId: account.accountId,
          });
          continue;
        }
        throw err;
      }
    }
    for (const account of toDelete) {
      await models.plaidAccount.deleteForItem(tx, account.id, itemId);
    }
  });

  return {
    addedAccounts,
    removedCount: toDelete.length,
    staleCount: stale.length,
  };
}

/** Postgres unique-violation SQLSTATE, surfaced by `pg` as `error.code`. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}
