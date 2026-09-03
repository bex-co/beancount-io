import crypto from "crypto";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { logger } from "@/shared/logger";
import {
  InternalServerError,
  BadUserInputError,
  DomainError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { lock, LOCK_KEYS } from "@/shared/lock";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  bankConnectionResource,
  type AuthorizationAction,
  type AuthorizationPrincipal,
  type IAuthorizationService,
  type PlaidBackgroundPrincipal,
} from "@/server/api/authorization";
import { operationNotAllowedFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import { createLedgerId, parseLedgerId } from "@/shared/str";
import type { IPlaidClient } from "./plaid-client";
import { decryptToken } from "../utils/encryption";
import type { TransactionToCategorize } from "@/features/llm/types";
import {
  mapToCategorizationFormat,
  buildBeancountTransaction,
} from "../utils/plaid-mapper";
import { reconcileAccounts } from "../utils/reconcile-accounts";
import type { PlaidAccount } from "../data/plaid-account-model";
import type { PlaidTransaction } from "../data/plaid-transaction-model";

const syncLogger = logger.child({ module: "plaid-sync-service" });

export interface PlaidSyncResult {
  success: boolean;
  transactionsFetched: number;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
  message?: string;
  /** Set only by a preview (w3/m8): what a real sync would do, having written nothing. */
  dryRun?: true;
  wouldAdd?: number;
  wouldModify?: number;
  wouldRemove?: number;
  morePagesAvailable?: boolean;
}

/** What a submit did, or would do. A preview runs every check the write does. */
export type PlaidSubmitResult = {
  success: boolean;
  addedCount: number;
  message?: string;
  dryRun?: true;
  wouldAddCount?: number;
  preview?: unknown[];
};

/** What a delete did, or would do. */
export type PlaidDeleteResult = {
  success: boolean;
  deletedCount: number;
  message?: string;
  dryRun?: true;
  wouldDeleteCount?: number;
  preview?: Array<{ transactionId: string; name: string; amount: string }>;
};

export interface IPlaidSyncService {
  syncItemTransactions(
    identity: Identity,
    itemId: string,
    syncType: "manual",
    ledgerId?: string,
    dryRun?: boolean,
  ): Promise<PlaidSyncResult>;
  syncItemTransactionsInBackground(
    principal: PlaidBackgroundPrincipal,
    itemId: string,
  ): Promise<PlaidSyncResult>;
  getUnsyncedTransactionsForCategorization(
    identity: Identity,
    accountId: string,
  ): Promise<TransactionToCategorize[]>;
  submitTransactionsToLedger(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    transactionInputs: Array<{
      transactionId: string;
      targetAccount: string;
      sourceAccount?: string;
    }>,
    filename?: string,
    dryRun?: boolean,
  ): Promise<PlaidSubmitResult>;
  deleteTransactions(
    identity: Identity,
    ledgerId: string,
    transactionIds: string[],
    dryRun?: boolean,
  ): Promise<PlaidDeleteResult>;
}

export class PlaidSyncService implements IPlaidSyncService {
  constructor(
    private readonly plaidClient: IPlaidClient,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly models: Pick<
      IModels,
      | "plaidItem"
      | "plaidAccount"
      | "plaidTransaction"
      | "plaidSyncLog"
      | "user"
    >,
    private readonly db: DbExecutor,
    private readonly authorization: IAuthorizationService,
  ) {}

  private async authorizeBankAction(
    principal: AuthorizationPrincipal,
    action: AuthorizationAction,
    ledgerId: string,
    plaidItemIds: string | readonly string[] = [],
  ): Promise<{ ledgerRepoId: number }> {
    await this.authorization.authorizeOrThrow({
      principal,
      action,
      resource: bankConnectionResource(ledgerId, plaidItemIds),
    });
    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const ledger = await unwrapFavaResponse(
        this.favaClientFactory
          .getAdminClient()
          .ledgers.getLedger(ledgerOwner, ledgerName),
        "resolve authorized bank ledger",
      );
      return { ledgerRepoId: ledger.id };
    } catch (error) {
      syncLogger.error("Authorized bank ledger source unavailable", {
        action,
        ledgerId,
        error,
      });
      throw new ServiceUnavailableError("Bank ledger source");
    }
  }

  private async resolveLedgerId(ledgerRepoId: number): Promise<string> {
    try {
      const ledger = await unwrapFavaResponse(
        this.favaClientFactory
          .getAdminClient()
          .admin.getLedgerByRepoId(ledgerRepoId),
        "resolve bank ledger",
      );
      return ledger.full_name;
    } catch (error) {
      syncLogger.error("Bank ledger binding source unavailable", {
        ledgerRepoId,
        error,
      });
      throw new ServiceUnavailableError("Bank ledger source");
    }
  }

  private async loadAuthorizedTransactionBatch(
    identity: Identity,
    action:
      | typeof AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SUBMIT
      | typeof AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_DELETE,
    ledgerId: string,
    transactionIds: string[],
  ): Promise<{
    transactions: PlaidTransaction[];
    accounts: ReadonlyMap<string, PlaidAccount>;
  }> {
    const transactions = await this.models.plaidTransaction.getByTransactionIds(
      this.db,
      transactionIds,
    );
    if (transactions.length !== transactionIds.length) {
      throw new BadUserInputError("Some transactions not found in database");
    }

    const accounts = new Map<string, PlaidAccount>();
    for (const accountId of new Set(
      transactions.map((transaction) => transaction.plaidAccountId),
    )) {
      const account = await this.models.plaidAccount.getById(
        this.db,
        accountId,
      );
      if (!account) {
        throw new BadUserInputError("Transaction account not found");
      }
      accounts.set(account.id, account);
    }

    const itemIds = [
      ...new Set([...accounts.values()].map((a) => a.plaidItemId)),
    ];
    const { ledgerRepoId } = await this.authorizeBankAction(
      identity,
      action,
      ledgerId,
      itemIds,
    );
    for (const itemId of itemIds) {
      const item = await this.models.plaidItem.getById(this.db, itemId);
      if (
        !item ||
        item.userId !== identity.userId ||
        item.ledgerRepoId !== ledgerRepoId
      ) {
        throw new BadUserInputError("Unauthorized access to transaction");
      }
    }

    return { transactions, accounts };
  }

  async syncItemTransactions(
    identity: Identity,
    itemId: string,
    syncType: "manual",
    ledgerId?: string,
    dryRun = false,
  ): Promise<PlaidSyncResult> {
    let authorizedLedgerId = ledgerId;
    if (!authorizedLedgerId) {
      const item = await this.models.plaidItem.getById(this.db, itemId);
      if (!item) throw new BadUserInputError("Plaid Item not found");
      if (item.userId !== identity.userId) {
        throw new BadUserInputError("Unauthorized access to Plaid Item");
      }
      authorizedLedgerId = await this.resolveLedgerId(item.ledgerRepoId);
    }
    const { ledgerRepoId } = await this.authorizeBankAction(
      identity,
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SYNC,
      authorizedLedgerId,
      itemId,
    );
    const lockKey = LOCK_KEYS.PLAID.syncTransactions(itemId);

    return lock.acquire(lockKey, async () => {
      return this.syncItemTransactionsImpl(
        itemId,
        identity,
        syncType,
        ledgerRepoId,
        dryRun,
      );
    });
  }

  async syncItemTransactionsInBackground(
    principal: PlaidBackgroundPrincipal,
    itemId: string,
  ): Promise<PlaidSyncResult> {
    const locatedItem = await this.models.plaidItem.getById(this.db, itemId);
    if (!locatedItem || locatedItem.userId !== principal.userId) {
      throw new BadUserInputError("Plaid Item not found");
    }
    const ledgerId = await this.resolveLedgerId(locatedItem.ledgerRepoId);
    const { ledgerRepoId } = await this.authorizeBankAction(
      principal,
      AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SYNC,
      ledgerId,
      itemId,
    );
    const syncType =
      principal.provenance === "plaid_webhook" ? "webhook" : "scheduled";
    const lockKey = LOCK_KEYS.PLAID.syncTransactions(itemId);
    return lock.acquire(lockKey, () =>
      this.syncItemTransactionsImpl(
        itemId,
        principal,
        syncType,
        ledgerRepoId,
        false,
      ),
    );
  }

  private async syncItemTransactionsImpl(
    itemId: string,
    principal: AuthorizationPrincipal,
    syncType: "manual" | "webhook" | "scheduled",
    ledgerRepoId: number,
    dryRun = false,
  ): Promise<PlaidSyncResult> {
    // The identity is what authorizes; `userId` is the id the models key on.
    // Derived rather than passed separately so the two can never disagree.
    const { userId } = principal;
    const startedAt = new Date();

    try {
      const item = await this.models.plaidItem.getById(this.db, itemId);
      if (!item) {
        throw new BadUserInputError("Plaid Item not found");
      }
      if (item.userId !== userId || item.ledgerRepoId !== ledgerRepoId) {
        throw new BadUserInputError("Unauthorized access to Plaid Item");
      }
      if (item.status !== "active") {
        throw new BadUserInputError(
          `Cannot sync transactions for Plaid Item with status "${item.status}". Item must be in "active" status.`,
        );
      }

      const accessToken = decryptToken(item.accessToken);

      // Pick up accounts the bank started sharing since the last sync. The
      // browser-side reconcile after a Plaid Link session is the only signal
      // that a user changed their account selection, and it can be lost (closed
      // tab, network error) — without this the new account's transactions would
      // be silently dropped by the enabled-accounts filter below.
      //
      // Additive only: removing accounts destroys their stored transactions, so
      // that stays gated behind an explicit, user-confirmed reconcile.
      try {
        await reconcileAccounts(
          { plaidClient: this.plaidClient, models: this.models, db: this.db },
          { itemId, accessToken, allowDeletes: false },
        );
      } catch (err) {
        syncLogger.warn("Failed to refresh accounts before sync; continuing", {
          itemId,
          error: err,
        });
      }

      const enabledAccounts = await this.models.plaidAccount.getEnabledByItemId(
        this.db,
        itemId,
      );
      const enabledAccountIds = new Set(
        enabledAccounts.map((acc) => acc.accountId),
      );
      const enabledAccountRowIds = new Set(
        enabledAccounts.map((acc) => acc.id),
      );

      syncLogger.debug("Starting transaction sync", {
        itemId,
        userId,
        syncType,
        enabledAccountsCount: enabledAccounts.length,
      });

      let totalFetched = 0;
      let totalAdded = 0;
      let totalModified = 0;
      let totalRemoved = 0;
      let cursor = item.transactionsCursor;
      let hasMore = true;

      // A preview runs on its own path rather than guarding the writes below.
      // The write loop mutates in four places and persists the cursor at the
      // end; a missed guard there would mean a "preview" that actually wrote,
      // which is the one failure a dry run must never have. Separate code
      // cannot miss a guard it does not have.
      //
      // Plaid is still called — a preview of remote data has to ask for it —
      // but nothing here is persisted and the cursor is not advanced, so the
      // real sync that follows returns exactly this.
      if (dryRun) {
        const preview = await this.plaidClient.transactionsSync(
          accessToken,
          cursor,
        );
        const forEnabled = (txs: Array<{ accountId: string }>) =>
          txs.filter((tx) => enabledAccountIds.has(tx.accountId)).length;
        return {
          success: true,
          transactionsFetched:
            preview.added.length +
            preview.modified.length +
            preview.removed.length,
          transactionsAdded: 0,
          transactionsModified: 0,
          transactionsRemoved: 0,
          dryRun: true,
          wouldAdd: forEnabled(preview.added),
          wouldModify: forEnabled(preview.modified),
          wouldRemove: preview.removed.length,
          morePagesAvailable: preview.hasMore,
        };
      }

      while (hasMore) {
        const syncResult = await this.plaidClient.transactionsSync(
          accessToken,
          cursor,
        );

        const addedForEnabled = syncResult.added.filter((tx) =>
          enabledAccountIds.has(tx.accountId),
        );
        const modifiedForEnabled = syncResult.modified.filter((tx) =>
          enabledAccountIds.has(tx.accountId),
        );

        totalFetched +=
          syncResult.added.length +
          syncResult.modified.length +
          syncResult.removed.length;

        for (const tx of addedForEnabled) {
          const accountRecord = enabledAccounts.find(
            (acc) => acc.accountId === tx.accountId,
          );
          if (!accountRecord) continue;

          const existing =
            await this.models.plaidTransaction.getByTransactionId(
              this.db,
              tx.transactionId,
            );
          if (existing) {
            syncLogger.debug("Transaction already exists, skipping", {
              transactionId: tx.transactionId,
            });
            continue;
          }

          await this.models.plaidTransaction.create(this.db, {
            plaidAccountId: accountRecord.id,
            transactionId: tx.transactionId,
            pendingTransactionId: tx.pendingTransactionId ?? undefined,
            date: new Date(tx.date),
            amount: tx.amount.toString(),
            merchantName: tx.merchantName ?? undefined,
            name: tx.name,
            category: tx.category ? JSON.stringify(tx.category) : undefined,
            isPending: tx.isPending,
          });

          totalAdded += 1;
        }

        for (const tx of modifiedForEnabled) {
          const accountRecord = enabledAccounts.find(
            (account) => account.accountId === tx.accountId,
          );
          if (!accountRecord) continue;
          const existing =
            await this.models.plaidTransaction.getByTransactionId(
              this.db,
              tx.transactionId,
            );
          if (!existing) {
            syncLogger.warn("Modified transaction not found in database", {
              transactionId: tx.transactionId,
            });
            continue;
          }

          const updated = await this.models.plaidTransaction.updateForAccount(
            this.db,
            existing.id,
            accountRecord.id,
            {
              date: new Date(tx.date),
              amount: tx.amount.toString(),
              merchantName: tx.merchantName ?? null,
              name: tx.name,
              category: tx.category ? JSON.stringify(tx.category) : null,
              isPending: tx.isPending,
            },
          );

          if (updated) totalModified += 1;
        }

        for (const tx of syncResult.removed) {
          const existing =
            await this.models.plaidTransaction.getByTransactionId(
              this.db,
              tx.transactionId,
            );
          if (existing && enabledAccountRowIds.has(existing.plaidAccountId)) {
            const deleted = await this.models.plaidTransaction.deleteForAccount(
              this.db,
              existing.id,
              existing.plaidAccountId,
            );
            if (!deleted) continue;
            totalRemoved += 1;
          }
        }

        cursor = syncResult.nextCursor;
        hasMore = syncResult.hasMore;
      }

      const itemUpdated = await this.models.plaidItem.updateForBinding(
        this.db,
        itemId,
        { userId, ledgerRepoId },
        {
          transactionsCursor: cursor ?? null,
          status: "active",
          errorCode: null,
          errorMessage: null,
        },
      );
      if (!itemUpdated) {
        throw new BadUserInputError("Unauthorized access to Plaid Item");
      }

      const hasChanges =
        totalAdded > 0 || totalModified > 0 || totalRemoved > 0;
      if (hasChanges) {
        await this.models.plaidSyncLog.create(this.db, {
          userId,
          plaidItemId: itemId,
          syncType,
          startedAt,
          status: "success",
          transactionsFetched: totalFetched,
          transactionsAdded: totalAdded,
          transactionsModified: totalModified,
          transactionsRemoved: totalRemoved,
          completedAt: new Date(),
        });

        syncLogger.debug("Transaction sync completed with changes", {
          itemId,
          userId,
          totalFetched,
          totalAdded,
          totalModified,
          totalRemoved,
        });
      } else {
        syncLogger.debug("Transaction sync completed with no changes", {
          itemId,
          userId,
        });
      }

      return {
        success: true,
        transactionsFetched: totalFetched,
        transactionsAdded: totalAdded,
        transactionsModified: totalModified,
        transactionsRemoved: totalRemoved,
        message: `Synced ${totalAdded} new transactions`,
      };
    } catch (error) {
      syncLogger.error("Transaction sync failed", { itemId, userId, error });

      await this.models.plaidSyncLog.create(this.db, {
        userId,
        plaidItemId: itemId,
        syncType,
        startedAt,
        status: "failed",
        transactionsFetched: 0,
        transactionsAdded: 0,
        transactionsModified: 0,
        transactionsRemoved: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      });

      if (
        error instanceof Error &&
        error.message.includes("ITEM_LOGIN_REQUIRED")
      ) {
        await this.models.plaidItem.updateForBinding(
          this.db,
          itemId,
          { userId, ledgerRepoId },
          {
            status: "requires_reauth",
            errorCode: "ITEM_LOGIN_REQUIRED",
            errorMessage: "Bank credentials need to be updated",
          },
        );
      }

      // Preserve validation/authorization errors (BadUserInputError,
      // ForbiddenError, ...) as-is so they surface with their correct HTTP
      // status instead of being flattened into a 500.
      if (error instanceof DomainError) {
        throw error;
      }

      throw new InternalServerError(
        `Transaction sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getUnsyncedTransactionsForCategorization(
    identity: Identity,
    accountId: string,
  ): Promise<TransactionToCategorize[]> {
    const { userId } = identity;
    const account = await this.models.plaidAccount.getById(this.db, accountId);
    if (!account) {
      throw new BadUserInputError("PlaidAccount not found");
    }

    const item = await this.models.plaidItem.getById(
      this.db,
      account.plaidItemId,
    );
    if (!item || item.userId !== userId) {
      throw new BadUserInputError("Unauthorized access to PlaidAccount");
    }
    const ledgerId = await this.resolveLedgerId(item.ledgerRepoId);
    await this.authorizeBankAction(
      identity,
      AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
      ledgerId,
      item.id,
    );

    const transactions =
      await this.models.plaidTransaction.getUnsyncedByAccountId(
        this.db,
        accountId,
      );

    syncLogger.debug("Fetched unsynced transactions for categorization", {
      count: transactions.length,
      accountId,
    });

    return mapToCategorizationFormat(transactions);
  }

  async submitTransactionsToLedger(
    identity: Identity,
    ledgerOwner: string,
    ledgerName: string,
    transactionInputs: Array<{
      transactionId: string;
      targetAccount: string;
      sourceAccount?: string;
    }>,
    filename?: string,
    dryRun = false,
  ): Promise<PlaidSubmitResult> {
    const { userId } = identity;
    if (transactionInputs.length === 0) {
      throw new BadUserInputError("No transactions provided");
    }

    const transactionIds = transactionInputs.map(
      (input) => input.transactionId,
    );

    const ledgerId = createLedgerId(ledgerOwner, ledgerName);
    const { transactions, accounts } =
      await this.loadAuthorizedTransactionBatch(
        identity,
        AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_SUBMIT,
        ledgerId,
        transactionIds,
      );
    for (const tx of transactions) {
      if (tx.syncedToLedger) {
        throw new BadUserInputError(
          `Transaction ${tx.transactionId} already synced to ledger`,
        );
      }
    }

    const beancountTransactions = [];
    for (const tx of transactions) {
      const input = transactionInputs.find(
        (inp) => inp.transactionId === tx.transactionId,
      );
      if (!input) {
        throw new BadUserInputError(
          `Target account not provided for transaction ${tx.transactionId}`,
        );
      }

      const account = accounts.get(tx.plaidAccountId);
      const sourceAccount = input.sourceAccount || account?.ledgerAccount;
      if (!sourceAccount) {
        throw new BadUserInputError(
          `Account ${tx.plaidAccountId} not mapped to ledger account`,
        );
      }

      beancountTransactions.push(
        buildBeancountTransaction(
          tx,
          sourceAccount,
          input.targetAccount,
          account?.currency ?? "USD",
        ),
      );
    }

    // Everything above is validation and construction — ownership, ledger
    // access, already-synced checks, account mapping — so a preview here is the
    // exact set the write would append, not an estimate of it.
    if (dryRun) {
      return {
        success: true,
        addedCount: 0,
        dryRun: true,
        wouldAddCount: beancountTransactions.length,
        preview: beancountTransactions,
      };
    }

    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );

    // The target file must already exist — we never create one, because a file
    // nothing `include`s would swallow the entries silently.
    if (filename) {
      const existsResponse = await favaApiClient.ledgers.getLedgerFile(
        ledgerOwner,
        ledgerName,
        { path: filename },
      );
      if (!existsResponse.data.success || !existsResponse.data.data) {
        throw new BadUserInputError(
          `Target file "${filename}" not found in ledger`,
        );
      }
    }

    await unwrapFavaResponse(
      favaApiClient.entries.addBulkEntries(ledgerOwner, ledgerName, {
        entries: beancountTransactions.map((item) => ({
          type: "transaction",
          item,
        })),
        // Omitted ⇒ the ledger falls back to main.bean.
        filename,
      }),
      "add transactions to ledger",
      (cause) =>
        operationNotAllowedFromCause("add transactions to ledger", cause),
    );

    const ledgerEntryHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(beancountTransactions))
      .digest("hex");
    const internalIds = transactions.map((tx) => tx.id);
    const marked = await this.models.plaidTransaction.markAsSyncedForAccounts(
      this.db,
      internalIds,
      [...accounts.keys()],
      ledgerEntryHash,
    );
    if (marked !== internalIds.length) {
      throw new InternalServerError(
        "Transactions were written but their authorized sync state changed",
      );
    }

    syncLogger.info("Transactions submitted to ledger", {
      count: beancountTransactions.length,
      ledgerOwner,
      ledgerName,
      filename,
    });

    return {
      success: true,
      addedCount: beancountTransactions.length,
      message: `Added ${beancountTransactions.length} transactions to ledger`,
    };
  }

  async deleteTransactions(
    identity: Identity,
    ledgerId: string,
    transactionIds: string[],
    dryRun = false,
  ): Promise<PlaidDeleteResult> {
    if (transactionIds.length === 0) {
      throw new BadUserInputError("No transactions provided");
    }

    const { transactions, accounts } =
      await this.loadAuthorizedTransactionBatch(
        identity,
        AUTHORIZATION_ACTIONS.BANK_TRANSACTIONS_DELETE,
        ledgerId,
        transactionIds,
      );
    for (const tx of transactions) {
      if (tx.syncedToLedger) {
        throw new BadUserInputError(
          `Transaction ${tx.transactionId} already synced to ledger and cannot be deleted`,
        );
      }
    }

    // Ownership, ledger access and the already-synced refusal have all run, so
    // this lists exactly what the delete would remove.
    if (dryRun) {
      return {
        success: true,
        deletedCount: 0,
        dryRun: true,
        wouldDeleteCount: transactions.length,
        preview: transactions.map((tx) => ({
          transactionId: tx.transactionId,
          name: tx.name,
          amount: String(tx.amount),
        })),
      };
    }

    const internalIds = transactions.map((tx) => tx.id);
    const deleted = await this.models.plaidTransaction.deleteManyForAccounts(
      this.db,
      internalIds,
      [...accounts.keys()],
    );
    if (deleted !== internalIds.length) {
      throw new BadUserInputError("Unauthorized access to transaction");
    }

    syncLogger.info("Transactions deleted", {
      count: internalIds.length,
      ledgerId,
    });

    return {
      success: true,
      deletedCount: internalIds.length,
      message: `Deleted ${internalIds.length} transactions`,
    };
  }
}
