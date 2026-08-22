import { PlaidSyncService } from "../plaid-sync-service";
import { assertLedgerAccess } from "@/features/ledger/utils/ledger-access-check";
import { buildBeancountTransaction } from "../../utils/plaid-mapper";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";

// Mock logger
jest.mock("@/shared/logger", () => ({
  logger: {
    child: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

jest.mock("@/features/ledger/utils/ledger-access-check");

const mockAssertLedgerAccess = assertLedgerAccess as jest.Mock;

// Mock lock
jest.mock("@/shared/lock", () => ({
  lock: {
    acquire: jest
      .fn()
      .mockImplementation((_key: string, fn: () => unknown) => fn()),
  },
  LOCK_KEYS: {
    PLAID: {
      syncTransactions: (itemId: string) => `plaid:sync-transactions:${itemId}`,
    },
  },
}));

// Mock encryption
jest.mock("../../utils/encryption", () => ({
  decryptToken: jest.fn().mockReturnValue("decrypted-access-token"),
  encryptToken: jest.fn().mockReturnValue("encrypted-access-token"),
}));

// Mock plaid-mapper
jest.mock("../../utils/plaid-mapper", () => ({
  mapToCategorizationFormat: jest
    .fn()
    .mockImplementation((txs: Array<{ name: string }>) =>
      txs.map((tx, i) => ({ rowIndex: i, description: tx.name })),
    ),
  buildBeancountTransaction: jest.fn().mockReturnValue({
    date: "2024-01-15",
    narration: "Coffee Shop",
    postings: [],
  }),
}));

const mockPlaidClient = {
  transactionsSync: jest.fn(),
  getAccounts: jest.fn(),
};

const mockFavaApiClient = {
  reports: { getLedgerAccounts: jest.fn() },
  entries: { addBulkEntries: jest.fn() },
  ledgers: { getLedgerFile: jest.fn() },
};

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const mockPlaidItemModel = {
  getById: jest.fn(),
  update: jest.fn(),
};
const mockPlaidAccountModel = {
  getById: jest.fn(),
  getByItemId: jest.fn(),
  getEnabledByItemId: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};
const mockPlaidTransactionModel = {
  getByTransactionId: jest.fn(),
  getByTransactionIds: jest.fn(),
  getUnsyncedByAccountId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  markAsSynced: jest.fn(),
};
const mockPlaidSyncLogModel = {
  create: jest.fn(),
};
const mockUserModel = {};

const mockModels = {
  plaidItem: mockPlaidItemModel,
  plaidAccount: mockPlaidAccountModel,
  plaidTransaction: mockPlaidTransactionModel,
  plaidSyncLog: mockPlaidSyncLogModel,
  user: mockUserModel,
} as any;

const mockDb: any = {
  transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(mockDb),
  ),
};

describe("PlaidSyncService", () => {
  let service: PlaidSyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb),
    );
    // The pre-sync account refresh is additive-only and best-effort; default it
    // to "nothing changed" so existing cases exercise the transaction path.
    mockPlaidClient.getAccounts.mockResolvedValue([]);
    mockPlaidAccountModel.getByItemId.mockResolvedValue([]);
    mockAssertLedgerAccess.mockResolvedValue({
      permission: "write",
      ledgerOwnerId: "user_test",
      ledgerRepoId: 42,
    });
    service = new PlaidSyncService(
      mockPlaidClient as any,
      mockFavaClientFactory as any,
      mockModels,
      mockDb,
    );
  });

  describe("syncItemTransactions", () => {
    const itemId = "pitm_test123";
    const userId = "user_test";

    const mockItem = {
      id: itemId,
      userId,
      itemId: "plaid-item-ext-id",
      accessToken: "salt:iv:tag:ciphertext",
      status: "active",
      transactionsCursor: null,
      institutionId: "ins_123",
      institutionName: "Test Bank",
      errorCode: null,
      errorMessage: null,
    };

    const mockEnabledAccounts = [
      {
        id: "pacc_1",
        accountId: "account-ext-1",
        plaidItemId: itemId,
        ledgerAccount: "Assets:Checking",
        enabled: true,
      },
    ];

    it("picks up accounts the bank started sharing, but never deletes any", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockPlaidAccountModel.getEnabledByItemId.mockResolvedValue(
        mockEnabledAccounts,
      );
      // Plaid shares a brand new account, and no longer shares a stored one.
      mockPlaidClient.getAccounts.mockResolvedValue([
        {
          accountId: "account-ext-new",
          name: "New Checking",
          type: "depository",
          subtype: "checking",
          mask: "9999",
        },
      ]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        {
          id: "pacc_gone",
          plaidItemId: itemId,
          accountId: "account-ext-gone",
          accountName: "Closed Card",
          accountType: "credit",
          currency: "USD",
          enabled: true,
        },
      ]);
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        added: [],
        modified: [],
        removed: [],
        nextCursor: "cursor_v2",
        hasMore: false,
      });

      await service.syncItemTransactions(userId, itemId, "manual");

      expect(mockPlaidAccountModel.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ accountId: "account-ext-new" }),
      );
      // Destructive reconcile stays gated behind the user-confirmed path.
      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    });

    it("still syncs transactions when the account refresh fails", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockPlaidAccountModel.getEnabledByItemId.mockResolvedValue(
        mockEnabledAccounts,
      );
      mockPlaidClient.getAccounts.mockRejectedValue(new Error("plaid down"));
      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        added: [],
        modified: [],
        removed: [],
        nextCursor: "cursor_v2",
        hasMore: false,
      });

      const result = await service.syncItemTransactions(
        userId,
        itemId,
        "manual",
      );

      expect(result.success).toBe(true);
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalled();
    });

    it("should sync transactions successfully (add/modify/remove)", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockPlaidAccountModel.getEnabledByItemId.mockResolvedValue(
        mockEnabledAccounts,
      );

      const addedTx = {
        transactionId: "tx_added_1",
        accountId: "account-ext-1",
        date: "2024-01-15",
        amount: 12.5,
        merchantName: "Coffee Shop",
        name: "Coffee Shop",
        category: ["Food"],
        isPending: false,
        pendingTransactionId: null,
      };
      const modifiedTx = {
        transactionId: "tx_modified_1",
        accountId: "account-ext-1",
        date: "2024-01-14",
        amount: 25.0,
        merchantName: "Gas Station",
        name: "Gas Station",
        category: ["Transport"],
        isPending: false,
      };
      const removedTx = { transactionId: "tx_removed_1" };

      mockPlaidClient.transactionsSync.mockResolvedValueOnce({
        added: [addedTx],
        modified: [modifiedTx],
        removed: [removedTx],
        nextCursor: "cursor_v2",
        hasMore: false,
      });

      mockPlaidTransactionModel.getByTransactionId
        .mockResolvedValueOnce(null) // added tx: doesn't exist → create
        .mockResolvedValueOnce({ id: "ptxn_modified_1" }) // modified tx: exists → update
        .mockResolvedValueOnce({ id: "ptxn_removed_1" }); // removed tx: exists → delete

      mockPlaidTransactionModel.create.mockResolvedValue({ id: "ptxn_new_1" });
      mockPlaidTransactionModel.update.mockResolvedValue(undefined);
      mockPlaidTransactionModel.delete.mockResolvedValue(undefined);
      mockPlaidItemModel.update.mockResolvedValue(undefined);
      mockPlaidSyncLogModel.create.mockResolvedValue({ id: "log_1" });

      const result = await service.syncItemTransactions(
        userId,
        itemId,
        "manual",
      );

      expect(result.success).toBe(true);
      expect(result.transactionsAdded).toBe(1);
      expect(result.transactionsModified).toBe(1);
      expect(result.transactionsRemoved).toBe(1);
      expect(mockPlaidItemModel.update).toHaveBeenCalledWith(
        mockDb,
        itemId,
        expect.objectContaining({ transactionsCursor: "cursor_v2" }),
      );
      expect(mockPlaidSyncLogModel.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ status: "success" }),
      );
    });

    it("should throw when item is not found", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(null);
      mockPlaidSyncLogModel.create.mockResolvedValue({ id: "log_1" });

      await expect(
        service.syncItemTransactions(userId, itemId, "manual"),
      ).rejects.toThrow("Plaid Item not found");
    });

    it("should throw when user is unauthorized", async () => {
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
      });
      mockPlaidSyncLogModel.create.mockResolvedValue({ id: "log_1" });

      await expect(
        service.syncItemTransactions(userId, itemId, "manual"),
      ).rejects.toThrow("Unauthorized access to Plaid Item");
    });

    it("should throw when item is not active", async () => {
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        status: "requires_reauth",
      });
      mockPlaidSyncLogModel.create.mockResolvedValue({ id: "log_1" });

      await expect(
        service.syncItemTransactions(userId, itemId, "manual"),
      ).rejects.toThrow(
        'Cannot sync transactions for Plaid Item with status "requires_reauth"',
      );
    });

    it("should scope via assertLedgerAccess when ledgerId is provided and the item matches", async () => {
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
        ledgerRepoId: 42,
      });
      mockPlaidAccountModel.getEnabledByItemId.mockResolvedValue([]);
      mockPlaidClient.transactionsSync.mockResolvedValue({
        added: [],
        modified: [],
        removed: [],
        nextCursor: "cursor_v2",
        hasMore: false,
      });
      mockPlaidItemModel.update.mockResolvedValue(undefined);

      const result = await service.syncItemTransactions(
        userId,
        itemId,
        "manual",
        "owner/ledger",
      );

      expect(mockAssertLedgerAccess).toHaveBeenCalledWith(
        "owner/ledger",
        userId,
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });

    it("should reject when ledgerId is provided but the item belongs to a different ledger", async () => {
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
        ledgerRepoId: 99,
      });

      await expect(
        service.syncItemTransactions(userId, itemId, "manual", "owner/ledger"),
      ).rejects.toThrow("Unauthorized access to Plaid Item");
    });

    it("should reject when ledgerId is provided but permission is read-only", async () => {
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        ledgerRepoId: 42,
      });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: userId,
        ledgerRepoId: 42,
      });

      await expect(
        service.syncItemTransactions(userId, itemId, "manual", "owner/ledger"),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("getUnsyncedTransactionsForCategorization", () => {
    const userId = "user_test";
    const accountId = "pacc_1";

    const mockAccount = {
      id: accountId,
      plaidItemId: "pitm_test123",
      accountId: "account-ext-1",
    };
    const mockItem = { id: "pitm_test123", userId };

    it("should return mapped transactions", async () => {
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);

      const mockTransactions = [
        {
          id: "ptxn_1",
          transactionId: "tx_1",
          name: "Coffee Shop",
          amount: "12.50",
          date: new Date("2024-01-15"),
        },
      ];
      mockPlaidTransactionModel.getUnsyncedByAccountId.mockResolvedValue(
        mockTransactions,
      );

      const result = await service.getUnsyncedTransactionsForCategorization(
        userId,
        accountId,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        rowIndex: 0,
        description: "Coffee Shop",
      });
    });

    it("should return empty array when no unsynced transactions", async () => {
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockPlaidTransactionModel.getUnsyncedByAccountId.mockResolvedValue([]);

      const result = await service.getUnsyncedTransactionsForCategorization(
        userId,
        accountId,
      );

      expect(result).toEqual([]);
    });

    it("should throw when account is not found", async () => {
      mockPlaidAccountModel.getById.mockResolvedValue(null);

      await expect(
        service.getUnsyncedTransactionsForCategorization(userId, accountId),
      ).rejects.toThrow("PlaidAccount not found");
    });

    it("should throw when user is unauthorized", async () => {
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
      });

      await expect(
        service.getUnsyncedTransactionsForCategorization(userId, accountId),
      ).rejects.toThrow("Unauthorized access to PlaidAccount");
    });
  });

  describe("submitTransactionsToLedger", () => {
    const userId = "user_test";
    const ledgerOwner = "testuser";
    const ledgerName = "personal";

    const mockAccount = {
      id: "pacc_1",
      plaidItemId: "pitm_1",
      accountId: "account-ext-1",
      ledgerAccount: "Assets:Checking",
    };
    const mockItem = { id: "pitm_1", userId, ledgerRepoId: 42 };

    const txInputs = [
      { transactionId: "tx_1", targetAccount: "Expenses:Food" },
    ];

    const mockTransactions = [
      {
        id: "ptxn_1",
        transactionId: "tx_1",
        plaidAccountId: "pacc_1",
        syncedToLedger: false,
        date: new Date("2024-01-15"),
        amount: "12.50",
        name: "Coffee Shop",
      },
    ];

    it("should submit transactions to ledger successfully", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      const result = await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(result.success).toBe(true);
      expect(result.addedCount).toBe(1);
      expect(mockPlaidTransactionModel.markAsSynced).toHaveBeenCalledWith(
        mockDb,
        ["ptxn_1"],
        expect.any(String),
      );
    });

    it("should throw when no transactions provided", async () => {
      await expect(
        service.submitTransactionsToLedger(userId, ledgerOwner, ledgerName, []),
      ).rejects.toThrow("No transactions provided");
    });

    it("should throw when some transactions not found", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue([]);

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
        ),
      ).rejects.toThrow("Some transactions not found in database");
    });

    it("should throw when transaction already synced", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue([
        { ...mockTransactions[0], syncedToLedger: true },
      ]);
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
        ),
      ).rejects.toThrow("already synced to ledger");
    });

    it("should throw when ledger account not mapped", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById
        .mockResolvedValueOnce(mockAccount) // ownership check
        .mockResolvedValueOnce({ ...mockAccount, ledgerAccount: null }); // building tx
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
        ),
      ).rejects.toThrow("not mapped to ledger account");
    });

    it("should use the explicit sourceAccount override instead of the account's mapping", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        [
          {
            transactionId: "tx_1",
            targetAccount: "Expenses:Food",
            sourceAccount: "Assets:Wise:USD",
          },
        ],
      );

      expect(buildBeancountTransaction).toHaveBeenCalledWith(
        mockTransactions[0],
        "Assets:Wise:USD",
        "Expenses:Food",
        "USD",
      );
    });

    it("should use the account's stored currency when building the transaction", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue({
        ...mockAccount,
        currency: "EUR",
      });
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(buildBeancountTransaction).toHaveBeenCalledWith(
        mockTransactions[0],
        "Assets:Checking",
        "Expenses:Food",
        "EUR",
      );
    });

    it("should fall back to USD when the account has no currency set", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(buildBeancountTransaction).toHaveBeenCalledWith(
        mockTransactions[0],
        "Assets:Checking",
        "Expenses:Food",
        "USD",
      );
    });

    it("should forward an existing target filename to the ledger", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.ledgers.getLedgerFile.mockResolvedValue({
        data: { success: true, data: { path: "books/2026.bean" } },
      });
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
        "books/2026.bean",
      );

      expect(mockFavaApiClient.ledgers.getLedgerFile).toHaveBeenCalledWith(
        ledgerOwner,
        ledgerName,
        { path: "books/2026.bean" },
      );
      expect(mockFavaApiClient.entries.addBulkEntries).toHaveBeenCalledWith(
        ledgerOwner,
        ledgerName,
        expect.objectContaining({ filename: "books/2026.bean" }),
      );
    });

    it("should leave filename undefined when none is given, so the ledger defaults to main.bean", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(mockFavaApiClient.ledgers.getLedgerFile).not.toHaveBeenCalled();
      expect(mockFavaApiClient.entries.addBulkEntries).toHaveBeenCalledWith(
        ledgerOwner,
        ledgerName,
        expect.objectContaining({ filename: undefined }),
      );
    });

    it("should reject a target filename that does not exist without writing anything", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.ledgers.getLedgerFile.mockResolvedValue({
        data: { success: true, data: null },
      });

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
          "does-not-exist.bean",
        ),
      ).rejects.toThrow(BadUserInputError);

      expect(mockFavaApiClient.entries.addBulkEntries).not.toHaveBeenCalled();
      expect(mockPlaidTransactionModel.markAsSynced).not.toHaveBeenCalled();
    });

    it("should succeed with a sourceAccount override even when the account itself is unmapped", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue({
        ...mockAccount,
        ledgerAccount: null,
      });
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      const result = await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        [
          {
            transactionId: "tx_1",
            targetAccount: "Expenses:Food",
            sourceAccount: "Assets:Wise:USD",
          },
        ],
      );

      expect(result.success).toBe(true);
    });

    it("should call assertLedgerAccess with the constructed ledgerId", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(mockAssertLedgerAccess).toHaveBeenCalledWith(
        "testuser/personal",
        userId,
        expect.any(Object),
      );
    });

    it("should throw ForbiddenError when the caller only has read access", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: userId,
        ledgerRepoId: 42,
      });

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("should chain-verify against the resolved ledgerRepoId regardless of item.userId", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
        ledgerRepoId: 99,
      });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: userId,
        ledgerRepoId: 42,
      });

      await expect(
        service.submitTransactionsToLedger(
          userId,
          ledgerOwner,
          ledgerName,
          txInputs,
        ),
      ).rejects.toThrow("Unauthorized access to transaction");
    });

    it("should succeed when the item's ledgerRepoId matches, regardless of userId", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        userId: "other-user",
        ledgerRepoId: 42,
      });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: userId,
        ledgerRepoId: 42,
      });
      mockFavaApiClient.entries.addBulkEntries.mockResolvedValue({
        data: { success: true },
      });
      mockPlaidTransactionModel.markAsSynced.mockResolvedValue(undefined);

      const result = await service.submitTransactionsToLedger(
        userId,
        ledgerOwner,
        ledgerName,
        txInputs,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("deleteTransactions", () => {
    const userId = "user_test";
    const ledgerId = "testuser/personal";

    const mockAccount = {
      id: "pacc_1",
      plaidItemId: "pitm_1",
      accountId: "account-ext-1",
      ledgerAccount: "Assets:Checking",
    };
    const mockItem = { id: "pitm_1", userId, ledgerRepoId: 42 };

    const transactionIds = ["tx_1"];

    const mockTransactions = [
      {
        id: "ptxn_1",
        transactionId: "tx_1",
        plaidAccountId: "pacc_1",
        syncedToLedger: false,
        date: new Date("2024-01-15"),
        amount: "12.50",
        name: "Coffee Shop",
      },
    ];

    it("should delete transactions successfully", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);
      mockPlaidTransactionModel.deleteMany.mockResolvedValue(undefined);

      const result = await service.deleteTransactions(
        userId,
        ledgerId,
        transactionIds,
      );

      expect(result).toEqual({
        success: true,
        deletedCount: 1,
        message: "Deleted 1 transactions",
      });
      expect(mockPlaidTransactionModel.deleteMany).toHaveBeenCalledWith(
        mockDb,
        ["ptxn_1"],
      );
    });

    it("should throw when no transaction ids provided", async () => {
      await expect(
        service.deleteTransactions(userId, ledgerId, []),
      ).rejects.toThrow("No transactions provided");
    });

    it("should throw when some transactions not found", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue([]);

      await expect(
        service.deleteTransactions(userId, ledgerId, transactionIds),
      ).rejects.toThrow("Some transactions not found in database");
    });

    it("should throw when transaction already synced to ledger", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue([
        { ...mockTransactions[0], syncedToLedger: true },
      ]);
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue(mockItem);

      await expect(
        service.deleteTransactions(userId, ledgerId, transactionIds),
      ).rejects.toThrow("already synced to ledger and cannot be deleted");
    });

    it("should throw when transaction belongs to a different ledger", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockPlaidAccountModel.getById.mockResolvedValue(mockAccount);
      mockPlaidItemModel.getById.mockResolvedValue({
        ...mockItem,
        ledgerRepoId: 99,
      });

      await expect(
        service.deleteTransactions(userId, ledgerId, transactionIds),
      ).rejects.toThrow("Unauthorized access to transaction");
    });

    it("should throw ForbiddenError when the caller only has read access", async () => {
      mockPlaidTransactionModel.getByTransactionIds.mockResolvedValue(
        mockTransactions,
      );
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: userId,
        ledgerRepoId: 42,
      });

      await expect(
        service.deleteTransactions(userId, ledgerId, transactionIds),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
