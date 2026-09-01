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

import { PlaidQueryResolver } from "../plaid-resolver.query";
import { BadUserInputError } from "@/shared/errors";
import type { IContext } from "@/server/graphql/context";
import type { IPlaidItemService } from "@/features/plaid/service/plaid-item-service";

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
    loaders: {
      plaidSyncLogsByItemId: { load: jest.fn() },
    },
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

describe("PlaidQueryResolver", () => {
  let resolver: PlaidQueryResolver;
  let ctx: IContext;
  let mockPlaidItemService: jest.Mocked<IPlaidItemService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlaidItemService = buildMockPlaidItemService();
    resolver = new PlaidQueryResolver(mockPlaidItemService);
    ctx = buildMockContext();
  });

  describe("getPlaidItems", () => {
    it("should delegate to plaidItemService.getItems with userId", async () => {
      const now = new Date();
      const expected = [
        {
          id: "pitm_1",
          itemId: "ext-item-1",
          institutionId: "ins_1",
          institutionName: "Test Bank",
          status: "active",
          errorCode: undefined,
          errorMessage: undefined,
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockPlaidItemService.getItems.mockResolvedValue(expected);

      const result = await resolver.getPlaidItems("owner/ledger", ctx);

      expect(mockPlaidItemService.getItems).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "owner/ledger",
      );
      expect(result).toBe(expected);
    });
  });

  describe("getPlaidItem", () => {
    const now = new Date();
    const mockItem = {
      id: "pitm_1",
      itemId: "ext-item-1",
      institutionId: "ins_1",
      institutionName: "Test Bank",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    it("should delegate to plaidItemService.getItem with userId and id", async () => {
      mockPlaidItemService.getItem.mockResolvedValue(mockItem);

      const result = await resolver.getPlaidItem("pitm_1", ctx);

      expect(mockPlaidItemService.getItem).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
      );
      expect(result).toBe(mockItem);
    });

    it("should propagate BadUserInputError from service", async () => {
      mockPlaidItemService.getItem.mockRejectedValue(
        new BadUserInputError("Plaid Item not found"),
      );

      await expect(resolver.getPlaidItem("pitm_missing", ctx)).rejects.toThrow(
        BadUserInputError,
      );
    });
  });

  describe("getPlaidAccounts", () => {
    it("should delegate to plaidItemService.getAccounts", async () => {
      const now = new Date();
      const expected = [
        {
          id: "pacc_1",
          plaidItemId: "pitm_1",
          accountId: "ext-acc-1",
          accountName: "Checking",
          accountType: "depository",
          currency: "USD",
          enabled: true,
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockPlaidItemService.getAccounts.mockResolvedValue(expected);

      const result = await resolver.getPlaidAccounts(
        "pitm_1",
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.getAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pitm_1",
        "owner/ledger",
      );
      expect(result).toBe(expected);
    });
  });

  describe("getPlaidAccountsForLedger", () => {
    it("should delegate to plaidItemService.getAccountsForLedger", async () => {
      const now = new Date();
      const expected = [
        {
          id: "pacc_1",
          plaidItemId: "pitm_1",
          accountId: "ext-acc-1",
          accountName: "Checking",
          accountType: "depository",
          currency: "USD",
          enabled: true,
          institutionName: "Chase",
          createdAt: now,
          updatedAt: now,
        },
      ];
      mockPlaidItemService.getAccountsForLedger.mockResolvedValue(expected);

      const result = await resolver.getPlaidAccountsForLedger(
        "owner/ledger",
        ctx,
      );

      expect(mockPlaidItemService.getAccountsForLedger).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "owner/ledger",
      );
      expect(result).toBe(expected);
    });
  });

  describe("getUnsyncedPlaidTransactions", () => {
    it("should delegate to plaidItemService.getUnsyncedTransactions for a specific account", async () => {
      const now = new Date();
      const expected = [
        {
          id: "ptxn_1",
          plaidAccountId: "pacc_1",
          transactionId: "tx_1",
          date: now,
          amount: "12.50",
          name: "Coffee Shop",
          isPending: false,
          syncedToLedger: false,
          createdAt: now,
          accountName: "Checking",
          institutionName: "Test Bank",
        },
      ];
      mockPlaidItemService.getUnsyncedTransactions.mockResolvedValue(expected);

      const result = await resolver.getUnsyncedPlaidTransactions(
        "owner/ledger",
        "pacc_1",
        ctx,
      );

      expect(mockPlaidItemService.getUnsyncedTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "pacc_1",
        "owner/ledger",
      );
      expect(result).toBe(expected);
    });

    it("should delegate with accountId undefined for a ledger-wide fetch", async () => {
      mockPlaidItemService.getUnsyncedTransactions.mockResolvedValue([]);

      await resolver.getUnsyncedPlaidTransactions(
        "owner/ledger",
        undefined,
        ctx,
      );

      expect(mockPlaidItemService.getUnsyncedTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        undefined,
        "owner/ledger",
      );
    });
  });

  describe("suggestPlaidTransactionCategories", () => {
    it("should delegate to plaidItemService.suggestCategories", async () => {
      const expected = [
        {
          rowIndex: 0,
          targetAccount: "Expenses:Food",
          source: "ai" as const,
        },
      ] as any;
      mockPlaidItemService.suggestCategories.mockResolvedValue(expected);

      const result = await resolver.suggestPlaidTransactionCategories(
        "testuser/personal",
        "pacc_1",
        ctx,
      );

      expect(mockPlaidItemService.suggestCategories).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "testuser/personal",
        "pacc_1",
      );
      expect(result).toBe(expected);
    });
  });

  describe("suggestPlaidAccountMapping", () => {
    it("should delegate to plaidItemService.suggestAccountMapping", async () => {
      const expected = [
        {
          accountId: "pacc_1",
          suggestedAccount: "Assets:Wise:USD",
          confidence: 0.9,
          reasoning: "Matches the USD sub-account by name",
        },
      ];
      mockPlaidItemService.suggestAccountMapping.mockResolvedValue(expected);

      const result = await resolver.suggestPlaidAccountMapping(
        "testuser/personal",
        "pitm_1",
        ctx,
      );

      expect(mockPlaidItemService.suggestAccountMapping).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_test" }),
        "testuser/personal",
        "pitm_1",
      );
      expect(result).toBe(expected);
    });
  });

  describe("lastSync field resolver", () => {
    it("should return last sync info when logs exist", async () => {
      const now = new Date();
      const mockLogs = [
        {
          status: "success",
          completedAt: now,
          startedAt: new Date(now.getTime() - 5000),
          transactionsAdded: 3,
          errorMessage: null,
        },
      ];
      (ctx.loaders.plaidSyncLogsByItemId.load as jest.Mock).mockResolvedValue(
        mockLogs,
      );

      const result = await resolver.lastSync({ id: "pitm_1" } as any, ctx);

      expect(result).not.toBeNull();
      expect(result!.status).toBe("success");
      expect(result!.transactionsAdded).toBe(3);
    });

    it("should return null when no logs", async () => {
      (ctx.loaders.plaidSyncLogsByItemId.load as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await resolver.lastSync({ id: "pitm_1" } as any, ctx);

      expect(result).toBeNull();
    });
  });
});
