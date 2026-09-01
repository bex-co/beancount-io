import "reflect-metadata";

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

import { PlaidMutationResolver } from "../plaid-resolver.mutation";
import { ConflictError, ForbiddenError } from "@/shared/errors";
import type { IContext } from "@/server/graphql/context";
import type { IPlaidItemService } from "@/features/plaid/service/plaid-item-service";
import type { IPlaidSyncService } from "@/features/plaid/service/plaid-sync-service";

function buildMockContext(userId = "user_test"): IContext {
  return {
    userId,
    token: "mock-token",
    reqHeaders: {},
    getCurrentUserId: jest.fn().mockReturnValue(userId),
    getCurrentIdentity: jest.fn().mockReturnValue({
      userId,
      method: "session",
      scopes: new Set(),
    }),
  } as unknown as IContext;
}

function buildMockPlaidItemService(): jest.Mocked<IPlaidItemService> {
  return {
    getItems: jest.fn(),
    getItem: jest.fn(),
    getAccounts: jest.fn(),
    getAccountsForLedger: jest.fn(),
    getUnsyncedTransactions: jest.fn(),
    suggestCategories: jest.fn(),
    suggestAccountMapping: jest.fn(),
    createLinkToken: jest.fn(),
    createUpdateModeLinkToken: jest.fn(),
    reconcileItemAccounts: jest.fn(),
    exchangePublicToken: jest.fn(),
    updateAccountMapping: jest.fn(),
    updateAccountCurrency: jest.fn(),
    refreshItemStatus: jest.fn(),
    unlinkItem: jest.fn(),
  };
}

function buildMockPlaidSyncService(): jest.Mocked<IPlaidSyncService> {
  return {
    syncItemTransactions: jest.fn(),
    getUnsyncedTransactionsForCategorization: jest.fn(),
    submitTransactionsToLedger: jest.fn(),
    deleteTransactions: jest.fn(),
  };
}

const now = new Date();

const mockItemResult = {
  id: "pitm_1",
  itemId: "ext-item-1",
  institutionId: "ins_1",
  institutionName: "Test Bank",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

describe("PlaidMutationResolver", () => {
  let resolver: PlaidMutationResolver;
  let ctx: IContext;
  let mockPlaidItemService: jest.Mocked<IPlaidItemService>;
  let mockPlaidSyncService: jest.Mocked<IPlaidSyncService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlaidItemService = buildMockPlaidItemService();
    mockPlaidSyncService = buildMockPlaidSyncService();
    resolver = new PlaidMutationResolver(
      mockPlaidItemService,
      mockPlaidSyncService,
    );
    ctx = buildMockContext();
  });

  describe("createPlaidLinkToken", () => {
    it("should delegate to plaidItemService.createLinkToken", async () => {
      mockPlaidItemService.createLinkToken.mockResolvedValue({
        linkToken: "link-token-abc",
      });

      const result = await resolver.createPlaidLinkToken("owner/ledger", ctx);

      expect(mockPlaidItemService.createLinkToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "owner/ledger",
      );
      expect(result.linkToken).toBe("link-token-abc");
    });
  });

  describe("createPlaidUpdateModeLinkToken", () => {
    it("should delegate to plaidItemService.createUpdateModeLinkToken", async () => {
      mockPlaidItemService.createUpdateModeLinkToken.mockResolvedValue({
        linkToken: "update-link-token",
      });

      const result = await resolver.createPlaidUpdateModeLinkToken(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(
        mockPlaidItemService.createUpdateModeLinkToken,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
        undefined,
      );
      expect(result.linkToken).toBe("update-link-token");
    });

    it("should forward the accountSelection flag", async () => {
      mockPlaidItemService.createUpdateModeLinkToken.mockResolvedValue({
        linkToken: "update-link-token",
      });

      await resolver.createPlaidUpdateModeLinkToken(
        "pitm_1",
        "owner/ledger",
        ctx,
        true,
      );

      expect(
        mockPlaidItemService.createUpdateModeLinkToken,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
        true,
      );
    });
  });

  describe("reconcilePlaidAccounts", () => {
    it("should delegate to plaidItemService.reconcileItemAccounts", async () => {
      mockPlaidItemService.reconcileItemAccounts.mockResolvedValue({
        success: true,
        addedCount: 2,
        removedCount: 1,
      });

      const result = await resolver.reconcilePlaidAccounts(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.reconcileItemAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
      );
      expect(result).toEqual({
        success: true,
        addedCount: 2,
        removedCount: 1,
      });
    });
  });

  describe("exchangePlaidPublicToken", () => {
    it("should delegate to plaidItemService.exchangePublicToken", async () => {
      mockPlaidItemService.exchangePublicToken.mockResolvedValue(
        mockItemResult,
      );

      const result = await resolver.exchangePlaidPublicToken(
        "owner/ledger",
        "public-token",
        ctx,
      );

      expect(mockPlaidItemService.exchangePublicToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "owner/ledger",
        "public-token",
      );
      expect(result.id).toBe("pitm_1");
    });

    it("should propagate ConflictError from service", async () => {
      mockPlaidItemService.exchangePublicToken.mockRejectedValue(
        new ConflictError("Institution", "Already connected"),
      );

      await expect(
        resolver.exchangePlaidPublicToken("owner/ledger", "public-token", ctx),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("updatePlaidAccountMapping", () => {
    it("should delegate to plaidItemService.updateAccountMapping", async () => {
      mockPlaidItemService.updateAccountMapping.mockResolvedValue(true);

      const result = await resolver.updatePlaidAccountMapping(
        "pacc_1",
        "Assets:Checking",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.updateAccountMapping).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pacc_1",
        "Assets:Checking",
        "owner/ledger",
      );
      expect(result).toBe(true);
    });
  });

  describe("updatePlaidAccountCurrency", () => {
    it("should delegate to plaidItemService.updateAccountCurrency", async () => {
      mockPlaidItemService.updateAccountCurrency.mockResolvedValue(true);

      const result = await resolver.updatePlaidAccountCurrency(
        "pacc_1",
        "EUR",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.updateAccountCurrency).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pacc_1",
        "EUR",
        "owner/ledger",
      );
      expect(result).toBe(true);
    });
  });

  describe("refreshPlaidItemStatus", () => {
    it("should delegate to plaidItemService.refreshItemStatus", async () => {
      mockPlaidItemService.refreshItemStatus.mockResolvedValue(mockItemResult);

      const result = await resolver.refreshPlaidItemStatus(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.refreshItemStatus).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
      );
      expect(result).toBe(mockItemResult);
    });
  });

  describe("unlinkPlaidItem", () => {
    it("should delegate to plaidItemService.unlinkItem", async () => {
      mockPlaidItemService.unlinkItem.mockResolvedValue({
        dryRun: false,
        unlinked: true,
      });

      const result = await resolver.unlinkPlaidItem(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.unlinkItem).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
      );
      expect(result).toBe(true);
    });
  });

  describe("syncPlaidTransactions", () => {
    it("should delegate to plaidSyncService.syncItemTransactions", async () => {
      const expected = {
        success: true,
        transactionsFetched: 5,
        transactionsAdded: 3,
        transactionsModified: 1,
        transactionsRemoved: 1,
        message: "Synced 3 new transactions",
      };
      mockPlaidSyncService.syncItemTransactions.mockResolvedValue(expected);

      const result = await resolver.syncPlaidTransactions(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidSyncService.syncItemTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "manual",
        "owner/ledger",
      );
      expect(result).toBe(expected);
    });
  });

  describe("submitPlaidTransactionsToLedger", () => {
    it("should delegate to plaidSyncService.submitTransactionsToLedger with parsed ledgerId", async () => {
      const expected = {
        success: true,
        addedCount: 2,
        message: "Added 2 transactions",
      };
      mockPlaidSyncService.submitTransactionsToLedger.mockResolvedValue(
        expected,
      );

      const transactions = [
        { transactionId: "tx_1", targetAccount: "Expenses:Food" },
      ];
      const result = await resolver.submitPlaidTransactionsToLedger(
        "testuser/personal",
        transactions,
        ctx,
      );

      expect(
        mockPlaidSyncService.submitTransactionsToLedger,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "testuser",
        "personal",
        transactions,
        undefined,
      );
      expect(result).toBe(expected);
    });

    it("should forward the target filename to plaidSyncService", async () => {
      mockPlaidSyncService.submitTransactionsToLedger.mockResolvedValue({
        success: true,
        addedCount: 1,
      });

      const transactions = [
        { transactionId: "tx_1", targetAccount: "Expenses:Food" },
      ];
      await resolver.submitPlaidTransactionsToLedger(
        "testuser/personal",
        transactions,
        ctx,
        "books/2026.bean",
      );

      expect(
        mockPlaidSyncService.submitTransactionsToLedger,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "testuser",
        "personal",
        transactions,
        "books/2026.bean",
      );
    });
  });

  describe("deletePlaidTransactions", () => {
    it("should delegate to plaidSyncService.deleteTransactions", async () => {
      const expected = {
        success: true,
        deletedCount: 2,
        message: "Deleted 2 transactions",
      };
      mockPlaidSyncService.deleteTransactions.mockResolvedValue(expected);

      const transactionIds = ["tx_1", "tx_2"];
      const result = await resolver.deletePlaidTransactions(
        "testuser/personal",
        transactionIds,
        ctx,
      );

      expect(mockPlaidSyncService.deleteTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "testuser/personal",
        transactionIds,
      );
      expect(result).toBe(expected);
    });
  });

  describe("ledgerScope enforcement (regression)", () => {
    // An OAuth grant pinned to one ledger must not reach any OTHER ledger
    // through these mutations, even when the underlying user happens to be a
    // collaborator there — ledgerId here is a plain caller-supplied argument,
    // unrelated to what the grant is actually scoped to. Every mutation takes
    // ledgerId, so every one of them is covered.
    function scopedCtx(ledgerId: string): IContext {
      return {
        ...buildMockContext(),
        getCurrentIdentity: jest.fn().mockReturnValue({
          userId: "user_test",
          method: "oauth",
          ledgerScope: ledgerId,
          scopes: new Set(["ledger.write"]),
        }),
      } as unknown as IContext;
    }

    const PINNED = "alice/ledgerA";
    const OTHER = "alice/ledgerB";

    it.each([
      [
        "createPlaidLinkToken",
        () => resolver.createPlaidLinkToken(OTHER, scopedCtx(PINNED)),
      ],
      [
        "createPlaidUpdateModeLinkToken",
        () =>
          resolver.createPlaidUpdateModeLinkToken(
            "item_1",
            OTHER,
            scopedCtx(PINNED),
            false,
          ),
      ],
      [
        "reconcilePlaidAccounts",
        () =>
          resolver.reconcilePlaidAccounts("item_1", OTHER, scopedCtx(PINNED)),
      ],
      [
        "exchangePlaidPublicToken",
        () =>
          resolver.exchangePlaidPublicToken(
            OTHER,
            "public-token",
            scopedCtx(PINNED),
          ),
      ],
      [
        "updatePlaidAccountMapping",
        () =>
          resolver.updatePlaidAccountMapping(
            "account_1",
            "Expenses:Food",
            OTHER,
            scopedCtx(PINNED),
          ),
      ],
      [
        "updatePlaidAccountCurrency",
        () =>
          resolver.updatePlaidAccountCurrency(
            "account_1",
            "USD",
            OTHER,
            scopedCtx(PINNED),
          ),
      ],
      [
        "refreshPlaidItemStatus",
        () =>
          resolver.refreshPlaidItemStatus("item_1", OTHER, scopedCtx(PINNED)),
      ],
      [
        "unlinkPlaidItem",
        () => resolver.unlinkPlaidItem("item_1", OTHER, scopedCtx(PINNED)),
      ],
      [
        "syncPlaidTransactions",
        () =>
          resolver.syncPlaidTransactions("item_1", OTHER, scopedCtx(PINNED)),
      ],
      [
        "submitPlaidTransactionsToLedger",
        () =>
          resolver.submitPlaidTransactionsToLedger(
            OTHER,
            [],
            scopedCtx(PINNED),
            undefined,
          ),
      ],
      [
        "deletePlaidTransactions",
        () =>
          resolver.deletePlaidTransactions(OTHER, ["tx_1"], scopedCtx(PINNED)),
      ],
    ])(
      "%s rejects a ledgerId outside the grant's pinned ledger",
      async (_name, call) => {
        await expect(call()).rejects.toThrow(ForbiddenError);
        expect(mockPlaidItemService.createLinkToken).not.toHaveBeenCalled();
        expect(
          mockPlaidItemService.createUpdateModeLinkToken,
        ).not.toHaveBeenCalled();
        expect(
          mockPlaidItemService.reconcileItemAccounts,
        ).not.toHaveBeenCalled();
        expect(mockPlaidItemService.exchangePublicToken).not.toHaveBeenCalled();
        expect(
          mockPlaidItemService.updateAccountMapping,
        ).not.toHaveBeenCalled();
        expect(
          mockPlaidItemService.updateAccountCurrency,
        ).not.toHaveBeenCalled();
        expect(mockPlaidItemService.refreshItemStatus).not.toHaveBeenCalled();
        expect(mockPlaidItemService.unlinkItem).not.toHaveBeenCalled();
        expect(
          mockPlaidSyncService.syncItemTransactions,
        ).not.toHaveBeenCalled();
        expect(
          mockPlaidSyncService.submitTransactionsToLedger,
        ).not.toHaveBeenCalled();
        expect(mockPlaidSyncService.deleteTransactions).not.toHaveBeenCalled();
      },
    );

    it("still allows the mutation when ledgerId matches the grant's pinned ledger", async () => {
      mockPlaidItemService.createLinkToken.mockResolvedValue({
        linkToken: "tok",
      });
      await expect(
        resolver.createPlaidLinkToken(PINNED, scopedCtx(PINNED)),
      ).resolves.toEqual({ linkToken: "tok" });
    });
  });
});
