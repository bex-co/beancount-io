import { type DbExecutor } from "@/drizzle/drizzle";
import { type IModels } from "@/foundation/models";
import { type IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { type AppConfig } from "@/config/config";
import { BadUserInputError, ConflictError } from "@/shared/errors";
import { unwrapFavaResponse } from "@/foundation/fava";
import { parseLedgerId } from "@/shared/str";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import { trustedIdentity } from "@/server/api/identity";
import { logger } from "@/shared/logger";
import { type IPlaidClient } from "./plaid-client";
import { encryptToken, decryptToken } from "../utils/encryption";
import { mapToCategorizationFormat } from "../utils/plaid-mapper";
import { reconcileAccounts } from "../utils/reconcile-accounts";
import { LLMClient } from "@/features/llm/utils/llm-client";
import { categorizeTransactions } from "@/features/llm/utils/categorize-transactions";
import { suggestAccountMapping as suggestAccountMappingWithLLM } from "@/features/llm/utils/suggest-account-mapping";
import type { CategorySuggestion } from "@/features/llm/api/ai-categorization-resolver.types";
import type { PlaidAccountMappingSuggestion } from "../api/resolvers/plaid-resolver.types";
import type { PlaidTransaction } from "../data/plaid-transaction-model/types";
import type { PlaidAccount } from "../data/plaid-account-model/types";

const itemServiceLogger = logger.child({ module: "plaid-item-service" });

export interface PlaidItemResult {
  id: string;
  itemId: string;
  institutionId: string;
  institutionName: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaidAccountResult {
  id: string;
  plaidItemId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
  ledgerAccount?: string;
  currency: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * An account plus the institution it belongs to. Used by ledger-wide pickers,
 * which need to group accounts by bank without a second query per Item.
 */
export interface PlaidAccountWithInstitutionResult extends PlaidAccountResult {
  institutionName: string;
}

export interface PlaidTransactionResult {
  id: string;
  plaidAccountId: string;
  transactionId: string;
  date: Date;
  amount: string;
  merchantName?: string;
  name: string;
  category?: string;
  isPending: boolean;
  syncedToLedger: boolean;
  createdAt: Date;
  accountName: string;
  institutionName: string;
  ledgerAccount?: string;
}

export interface PlaidAccountReconcileResult {
  success: boolean;
  addedCount: number;
  removedCount: number;
}

export interface IPlaidItemService {
  getItems(userId: string, ledgerId: string): Promise<PlaidItemResult[]>;
  getItem(userId: string, id: string): Promise<PlaidItemResult>;
  getAccounts(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidAccountResult[]>;
  getAccountsForLedger(
    userId: string,
    ledgerId: string,
  ): Promise<PlaidAccountWithInstitutionResult[]>;
  getUnsyncedTransactions(
    userId: string,
    accountId: string | undefined,
    ledgerId: string,
  ): Promise<PlaidTransactionResult[]>;
  suggestCategories(
    userId: string,
    ledgerId: string,
    accountId?: string,
  ): Promise<CategorySuggestion[]>;
  suggestAccountMapping(
    userId: string,
    ledgerId: string,
    itemId: string,
  ): Promise<PlaidAccountMappingSuggestion[]>;
  createLinkToken(
    userId: string,
    ledgerId: string,
  ): Promise<{ linkToken: string }>;
  createUpdateModeLinkToken(
    userId: string,
    itemId: string,
    ledgerId: string,
    accountSelection?: boolean,
  ): Promise<{ linkToken: string }>;
  reconcileItemAccounts(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidAccountReconcileResult>;
  exchangePublicToken(
    userId: string,
    ledgerId: string,
    publicToken: string,
  ): Promise<PlaidItemResult>;
  updateAccountMapping(
    userId: string,
    accountId: string,
    ledgerAccount: string,
    ledgerId: string,
  ): Promise<boolean>;
  updateAccountCurrency(
    userId: string,
    accountId: string,
    currency: string,
    ledgerId: string,
  ): Promise<boolean>;
  refreshItemStatus(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidItemResult>;
  unlinkItem(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<boolean>;
}

export class PlaidItemService implements IPlaidItemService {
  constructor(
    private readonly plaidClient: IPlaidClient,
    private readonly favaClientFactory: IFavaClientFactory,
    private readonly models: Pick<
      IModels,
      "plaidItem" | "plaidAccount" | "plaidTransaction" | "user"
    >,
    private readonly db: DbExecutor,
    private readonly config: Pick<AppConfig, "blockeden">,
  ) {}

  private assertLedgerAccess(ledgerId: string, userId: string) {
    return authorizeLedger(trustedIdentity(userId), ledgerId, "read", {
      models: this.models,
      db: this.db,
      favaClientFactory: this.favaClientFactory,
    });
  }

  /** Item-management mutations require at least write tier — a read-only collaborator may not. */
  private assertLedgerWriteAccess(ledgerId: string, userId: string) {
    return authorizeLedger(trustedIdentity(userId), ledgerId, "write", {
      models: this.models,
      db: this.db,
      favaClientFactory: this.favaClientFactory,
    });
  }

  async getItems(userId: string, ledgerId: string): Promise<PlaidItemResult[]> {
    const { ledgerRepoId } = await this.assertLedgerAccess(ledgerId, userId);
    const items = await this.models.plaidItem.getByLedgerRepoId(
      this.db,
      ledgerRepoId,
    );
    return items.map(toItemResult);
  }

  async getItem(userId: string, id: string): Promise<PlaidItemResult> {
    const item = await this.models.plaidItem.getById(this.db, id);
    if (!item) {
      throw new BadUserInputError("Plaid Item not found");
    }
    if (item.userId !== userId) {
      throw new BadUserInputError("Unauthorized access to Plaid Item");
    }
    return toItemResult(item);
  }

  async getAccounts(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidAccountResult[]> {
    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerAccess(ledgerId, userId);
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }
    const accounts = await this.models.plaidAccount.getByItemId(
      this.db,
      itemId,
    );
    return accounts.map(toAccountResult);
  }

  /**
   * Every account in the ledger, each carrying its institution name.
   *
   * Deliberately backed by the same `getEnabledByLedgerRepoId` call that
   * `getUnsyncedTransactionsForScope` uses for its ledger-wide branch, so an
   * account can never show up in the review queue while being missing from a
   * picker built off this query.
   */
  async getAccountsForLedger(
    userId: string,
    ledgerId: string,
  ): Promise<PlaidAccountWithInstitutionResult[]> {
    const { ledgerRepoId } = await this.assertLedgerAccess(ledgerId, userId);
    const accounts = await this.models.plaidAccount.getEnabledByLedgerRepoId(
      this.db,
      ledgerRepoId,
    );
    return accounts.map((account) => ({
      ...toAccountResult(account),
      institutionName: account.institutionName,
    }));
  }

  /** Shared by getUnsyncedTransactions/suggestCategories so both see the same
   * transaction order for a given scope — the frontend maps AI suggestions
   * back onto rows purely by array index. */
  private async getUnsyncedTransactionsForScope(
    userId: string,
    ledgerId: string,
    accountId?: string,
  ): Promise<{
    transactions: PlaidTransaction[];
    accountsById: Map<
      string,
      { accountName: string; institutionName: string; ledgerAccount?: string }
    >;
  }> {
    const { ledgerRepoId } = await this.assertLedgerAccess(ledgerId, userId);

    if (accountId) {
      const account = await this.models.plaidAccount.getById(
        this.db,
        accountId,
      );
      if (!account) {
        throw new BadUserInputError("Account not found");
      }
      const item = await this.models.plaidItem.getById(
        this.db,
        account.plaidItemId,
      );
      if (!item || item.ledgerRepoId !== ledgerRepoId) {
        throw new BadUserInputError("Unauthorized access to account");
      }
      const transactions =
        await this.models.plaidTransaction.getUnsyncedByAccountId(
          this.db,
          accountId,
        );
      return {
        transactions,
        accountsById: new Map([
          [
            account.id,
            {
              accountName: account.accountName,
              institutionName: item.institutionName,
              ledgerAccount: account.ledgerAccount,
            },
          ],
        ]),
      };
    }

    const accounts = await this.models.plaidAccount.getEnabledByLedgerRepoId(
      this.db,
      ledgerRepoId,
    );
    const transactions =
      await this.models.plaidTransaction.getUnsyncedByAccountIds(
        this.db,
        accounts.map((a) => a.id),
      );
    const accountsById = new Map(
      accounts.map((a) => [
        a.id,
        {
          accountName: a.accountName,
          institutionName: a.institutionName,
          ledgerAccount: a.ledgerAccount,
        },
      ]),
    );
    return { transactions, accountsById };
  }

  private async getOpenLedgerAccounts(
    ledgerId: string,
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
  ): Promise<string[]> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const accounts = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerAccounts(ledgerOwner, ledgerName),
      "fetch ledger accounts",
    );
    return Object.entries(accounts ?? {})
      .filter(([, data]) => data.close_date == null)
      .map(([account]) => account);
  }

  /** Whether the ledger has a Beancount plugin that auto-declares accounts —
   * only then may the LLM suggest a brand-new account instead of being
   * restricted to the user's existing accounts. Mirrors the check in
   * `LLMService` (`categorizeTransactions`'s `autoAccounts` flag). */
  private async getAutoAccountsEnabled(
    ledgerId: string,
    userId: string,
    ledgerOwner: string,
    ledgerName: string,
  ): Promise<boolean> {
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      userId,
    );
    const ledgerPlugins = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerPlugins(ledgerOwner, ledgerName),
      "fetch ledger plugins",
    );
    const autoAccountsPlugins = [
      "beancount.plugins.auto_accounts",
      "beancount.plugins.auto",
    ];
    return autoAccountsPlugins.some((plugin) => ledgerPlugins.includes(plugin));
  }

  async getUnsyncedTransactions(
    userId: string,
    accountId: string | undefined,
    ledgerId: string,
  ): Promise<PlaidTransactionResult[]> {
    const { transactions, accountsById } =
      await this.getUnsyncedTransactionsForScope(userId, ledgerId, accountId);

    return transactions.map((tx) => {
      const account = accountsById.get(tx.plaidAccountId);
      return {
        id: tx.id,
        plaidAccountId: tx.plaidAccountId,
        transactionId: tx.transactionId,
        date: tx.date,
        amount: tx.amount,
        merchantName: tx.merchantName,
        name: tx.name,
        category: tx.category,
        isPending: tx.isPending,
        syncedToLedger: tx.syncedToLedger,
        createdAt: tx.createdAt,
        accountName: account?.accountName ?? "",
        institutionName: account?.institutionName ?? "",
        ledgerAccount: account?.ledgerAccount,
      };
    });
  }

  async suggestCategories(
    userId: string,
    ledgerId: string,
    accountId?: string,
  ): Promise<CategorySuggestion[]> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const { transactions } = await this.getUnsyncedTransactionsForScope(
      userId,
      ledgerId,
      accountId,
    );

    if (transactions.length === 0) {
      return [];
    }

    const txsForCategorization = mapToCategorizationFormat(transactions);
    const existingAccounts = await this.getOpenLedgerAccounts(
      ledgerId,
      userId,
      ledgerOwner,
      ledgerName,
    );

    itemServiceLogger.info("AI categorization requested", {
      userId,
      ledgerId,
      accountId,
    });

    const { suggestions } = await categorizeTransactions(
      new LLMClient(this.config.blockeden.accessKey),
      {
        transactions: txsForCategorization,
        existingAccounts,
        autoAccounts: false,
      },
    );

    itemServiceLogger.info("AI categorization completed", {
      userId,
      accountId,
      suggestionsCount: suggestions.length,
    });

    return suggestions.map((suggestion) => ({
      ...suggestion,
      source: "ai" as const,
    }));
  }

  async suggestAccountMapping(
    userId: string,
    ledgerId: string,
    itemId: string,
  ): Promise<PlaidAccountMappingSuggestion[]> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerAccess(ledgerId, userId);
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }

    const accounts = await this.models.plaidAccount.getByItemId(
      this.db,
      itemId,
    );
    const unmappedAccounts = accounts.filter((a) => !a.ledgerAccount);
    if (unmappedAccounts.length === 0) {
      return [];
    }

    const existingAccounts = await this.getOpenLedgerAccounts(
      ledgerId,
      userId,
      ledgerOwner,
      ledgerName,
    );
    const autoAccounts = await this.getAutoAccountsEnabled(
      ledgerId,
      userId,
      ledgerOwner,
      ledgerName,
    );

    itemServiceLogger.info("AI account mapping suggestion requested", {
      userId,
      ledgerId,
      itemId,
    });

    const { suggestions } = await suggestAccountMappingWithLLM(
      new LLMClient(this.config.blockeden.accessKey),
      {
        institutionName: item.institutionName,
        accounts: unmappedAccounts.map((a) => ({
          accountId: a.id,
          accountName: a.accountName,
          accountType: a.accountType,
          accountSubtype: a.accountSubtype,
          mask: a.mask,
        })),
        existingAccounts,
        autoAccounts,
      },
    );

    itemServiceLogger.info("AI account mapping suggestion completed", {
      userId,
      itemId,
      suggestionsCount: suggestions.length,
    });

    return suggestions;
  }

  async createLinkToken(
    userId: string,
    ledgerId: string,
  ): Promise<{ linkToken: string }> {
    await this.assertLedgerWriteAccess(ledgerId, userId);
    const linkToken = await this.plaidClient.createLinkToken(userId);
    itemServiceLogger.info("Link token created", { userId });
    return { linkToken };
  }

  async createUpdateModeLinkToken(
    userId: string,
    itemId: string,
    ledgerId: string,
    accountSelection?: boolean,
  ): Promise<{ linkToken: string }> {
    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }
    const accessToken = decryptToken(item.accessToken);
    const linkToken = await this.plaidClient.createUpdateModeLinkToken(
      userId,
      accessToken,
      { accountSelectionEnabled: !!accountSelection },
    );
    itemServiceLogger.info("Update mode link token created", {
      userId,
      itemId,
      status: item.status,
      accountSelection: !!accountSelection,
    });
    return { linkToken };
  }

  /**
   * Re-read the accounts Plaid shares for an Item and reconcile them against
   * what we store: create rows for newly shared accounts, delete rows for
   * accounts Plaid no longer shares.
   *
   * Deletion cascades to the account's `plaid_transactions` rows, which is
   * irreversible — so this must only ever run immediately after the user has
   * completed a Plaid Link update-mode session. That Account Select pane is the
   * user's explicit confirmation of which accounts they want; never call this
   * from a webhook, a cron job, or any other unattended path.
   */
  async reconcileItemAccounts(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidAccountReconcileResult> {
    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }

    const accessToken = decryptToken(item.accessToken);

    let result;
    try {
      result = await reconcileAccounts(
        {
          plaidClient: this.plaidClient,
          models: this.models,
          db: this.db,
        },
        { itemId, accessToken, allowDeletes: true },
      );
    } catch (err) {
      if (err instanceof BadUserInputError) {
        throw err;
      }
      // Plaid rejects /accounts/get with ITEM_LOGIN_REQUIRED on a broken Item.
      // Surface something actionable instead of a 500.
      itemServiceLogger.warn("Failed to reconcile accounts", {
        userId,
        itemId,
        error: err,
      });
      throw new BadUserInputError(
        "Could not read accounts from your bank. Reconnect this bank and try again.",
      );
    }

    itemServiceLogger.info("Plaid accounts reconciled", {
      userId,
      itemId,
      addedCount: result.addedAccounts.length,
      removedCount: result.removedCount,
    });

    // Best-effort, and deliberately outside the write transaction — a slow or
    // failing LLM call must not hold a lock or fail the reconcile.
    if (result.addedAccounts.length > 0) {
      await this.autoMapAccounts(
        userId,
        ledgerId,
        itemId,
        item.institutionName,
        result.addedAccounts,
      );
    }

    return {
      success: true,
      addedCount: result.addedAccounts.length,
      removedCount: result.removedCount,
    };
  }

  /**
   * Ask the LLM for a ledger account per newly discovered Plaid account and
   * persist whatever it returns. Never throws — accounts simply stay unmapped
   * and the user maps them by hand.
   */
  private async autoMapAccounts(
    userId: string,
    ledgerId: string,
    itemId: string,
    institutionName: string,
    accounts: PlaidAccount[],
  ): Promise<void> {
    try {
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const existingAccounts = await this.getOpenLedgerAccounts(
        ledgerId,
        userId,
        ledgerOwner,
        ledgerName,
      );
      const autoAccounts = await this.getAutoAccountsEnabled(
        ledgerId,
        userId,
        ledgerOwner,
        ledgerName,
      );

      itemServiceLogger.info("AI account mapping suggestion requested", {
        userId,
        itemId,
      });

      const { suggestions } = await suggestAccountMappingWithLLM(
        new LLMClient(this.config.blockeden.accessKey),
        {
          institutionName,
          accounts: accounts.map((a) => ({
            accountId: a.id,
            accountName: a.accountName,
            accountType: a.accountType,
            accountSubtype: a.accountSubtype,
            mask: a.mask,
          })),
          existingAccounts,
          autoAccounts,
        },
      );

      for (const suggestion of suggestions) {
        await this.models.plaidAccount.update(this.db, suggestion.accountId, {
          ledgerAccount: suggestion.suggestedAccount,
        });
      }

      itemServiceLogger.info("AI account mapping suggestion completed", {
        userId,
        itemId,
        suggestionsCount: suggestions.length,
      });
    } catch (err) {
      itemServiceLogger.warn(
        "Failed to auto-suggest account mapping, accounts remain unmapped",
        { itemId, error: err },
      );
    }
  }

  async exchangePublicToken(
    userId: string,
    ledgerId: string,
    publicToken: string,
  ): Promise<PlaidItemResult> {
    // Checked before burning the (one-time-use) publicToken with Plaid, so a
    // rejected request doesn't waste it.
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );

    const { accessToken, itemId } =
      await this.plaidClient.exchangePublicToken(publicToken);

    const itemDetails = await this.plaidClient.getItem(accessToken);

    let institutionName = "Unknown";
    if (itemDetails.institutionId) {
      try {
        const institution = await this.plaidClient.getInstitution(
          itemDetails.institutionId,
        );
        institutionName = institution.name;
      } catch (err) {
        itemServiceLogger.warn("Failed to get institution name", {
          institutionId: itemDetails.institutionId,
          error: err,
        });
      }
    }

    const existingItems = await this.models.plaidItem.getByUserId(
      this.db,
      userId,
    );
    const existingActiveItem = existingItems.find(
      (item) =>
        item.institutionId === itemDetails.institutionId &&
        item.ledgerRepoId === ledgerRepoId,
    );
    if (existingActiveItem) {
      itemServiceLogger.warn(
        "Attempted to create duplicate institution connection",
        {
          userId,
          ledgerRepoId,
          institutionId: itemDetails.institutionId,
          institutionName,
          existingItemId: existingActiveItem.id,
        },
      );
      throw new ConflictError(
        "Institution",
        `You already have an active connection to ${institutionName}. Please unlink the existing connection before creating a new one.`,
      );
    }

    const encryptedToken = encryptToken(accessToken);
    const item = await this.models.plaidItem.create(this.db, {
      userId,
      ledgerRepoId,
      itemId,
      accessToken: encryptedToken,
      institutionId: itemDetails.institutionId || "unknown",
      institutionName,
    });

    const accounts = await this.plaidClient.getAccounts(accessToken);
    const createdAccounts = [];
    for (const account of accounts) {
      createdAccounts.push(
        await this.models.plaidAccount.create(this.db, {
          plaidItemId: item.id,
          accountId: account.accountId,
          accountName: account.name,
          accountType: account.type,
          accountSubtype: account.subtype ?? undefined,
          mask: account.mask ?? undefined,
        }),
      );
    }

    itemServiceLogger.info("Plaid Item created", {
      userId,
      itemId,
      institutionName,
      accountsCount: accounts.length,
    });

    if (createdAccounts.length > 0) {
      await this.autoMapAccounts(
        userId,
        ledgerId,
        item.id,
        institutionName,
        createdAccounts,
      );
    }

    return toItemResult(item);
  }

  async updateAccountMapping(
    userId: string,
    accountId: string,
    ledgerAccount: string,
    ledgerId: string,
  ): Promise<boolean> {
    const account = await this.models.plaidAccount.getById(this.db, accountId);
    if (!account) {
      throw new BadUserInputError("Account not found");
    }
    const item = await this.models.plaidItem.getById(
      this.db,
      account.plaidItemId,
    );
    if (!item) {
      throw new BadUserInputError("Unauthorized access to account");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to account");
    }
    await this.models.plaidAccount.update(this.db, accountId, {
      ledgerAccount,
    });
    itemServiceLogger.info("Account mapping updated", {
      userId,
      accountId,
      ledgerAccount,
    });
    return true;
  }

  async updateAccountCurrency(
    userId: string,
    accountId: string,
    currency: string,
    ledgerId: string,
  ): Promise<boolean> {
    const account = await this.models.plaidAccount.getById(this.db, accountId);
    if (!account) {
      throw new BadUserInputError("Account not found");
    }
    const item = await this.models.plaidItem.getById(
      this.db,
      account.plaidItemId,
    );
    if (!item) {
      throw new BadUserInputError("Unauthorized access to account");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to account");
    }
    await this.models.plaidAccount.update(this.db, accountId, {
      currency,
    });
    itemServiceLogger.info("Account currency updated", {
      userId,
      accountId,
      currency,
    });
    return true;
  }

  async refreshItemStatus(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<PlaidItemResult> {
    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }
    const accessToken = decryptToken(item.accessToken);
    const itemDetails = await this.plaidClient.getItem(accessToken);

    const updateData: {
      status: "active" | "requires_reauth" | "disabled";
      errorCode: string | null;
      errorMessage: string | null;
    } = {
      status: itemDetails.error ? "requires_reauth" : "active",
      errorCode: itemDetails.error?.errorCode ?? null,
      errorMessage: itemDetails.error?.errorMessage ?? null,
    };
    await this.models.plaidItem.update(this.db, itemId, updateData);

    itemServiceLogger.info("Item status refreshed from Plaid", {
      userId,
      itemId,
      oldStatus: item.status,
      newStatus: updateData.status,
    });

    const updatedItem = await this.models.plaidItem.getById(this.db, itemId);
    if (!updatedItem) {
      throw new BadUserInputError("Failed to fetch updated item");
    }
    return toItemResult(updatedItem);
  }

  async unlinkItem(
    userId: string,
    itemId: string,
    ledgerId: string,
  ): Promise<boolean> {
    const item = await this.models.plaidItem.getById(this.db, itemId);
    if (!item) {
      throw new BadUserInputError("Item not found");
    }
    const { ledgerRepoId } = await this.assertLedgerWriteAccess(
      ledgerId,
      userId,
    );
    if (item.ledgerRepoId !== ledgerRepoId) {
      throw new BadUserInputError("Unauthorized access to Item");
    }
    const accessToken = decryptToken(item.accessToken);
    try {
      await this.plaidClient.removeItem(accessToken);
    } catch (err) {
      itemServiceLogger.warn(
        "Failed to remove Item from Plaid (may already be removed)",
        { itemId, error: err },
      );
    }
    await this.models.plaidItem.delete(this.db, itemId);
    itemServiceLogger.info("Plaid Item unlinked", { userId, itemId });
    return true;
  }
}

function toItemResult(item: {
  id: string;
  itemId: string;
  institutionId: string;
  institutionName: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}): PlaidItemResult {
  return {
    id: item.id,
    itemId: item.itemId,
    institutionId: item.institutionId,
    institutionName: item.institutionName,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toAccountResult(account: {
  id: string;
  plaidItemId: string;
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype?: string;
  mask?: string;
  ledgerAccount?: string;
  currency: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PlaidAccountResult {
  return {
    id: account.id,
    plaidItemId: account.plaidItemId,
    accountId: account.accountId,
    accountName: account.accountName,
    accountType: account.accountType,
    accountSubtype: account.accountSubtype,
    mask: account.mask,
    ledgerAccount: account.ledgerAccount,
    currency: account.currency,
    enabled: account.enabled,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
