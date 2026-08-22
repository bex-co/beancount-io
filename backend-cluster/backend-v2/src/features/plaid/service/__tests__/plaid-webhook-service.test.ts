import { PlaidWebhookService } from "../plaid-webhook-service";
import type { IPlaidSyncService } from "../plaid-sync-service";

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

const mockPlaidItemModel = {
  getByItemId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPlaidAccountModel = {
  getByAccountId: jest.fn(),
  delete: jest.fn(),
};

const mockModels = {
  plaidItem: mockPlaidItemModel,
  plaidAccount: mockPlaidAccountModel,
} as any;
const mockDb = {} as any;

function buildMockSyncService(): jest.Mocked<IPlaidSyncService> {
  return {
    syncItemTransactions: jest.fn(),
    getUnsyncedTransactionsForCategorization: jest.fn(),
    submitTransactionsToLedger: jest.fn(),
    deleteTransactions: jest.fn(),
  };
}

describe("PlaidWebhookService", () => {
  let webhookService: PlaidWebhookService;
  let mockSyncService: jest.Mocked<IPlaidSyncService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSyncService = buildMockSyncService();
    mockSyncService.syncItemTransactions.mockResolvedValue({
      success: true,
      transactionsFetched: 0,
      transactionsAdded: 0,
      transactionsModified: 0,
      transactionsRemoved: 0,
    });
    webhookService = new PlaidWebhookService(
      mockModels,
      mockDb,
      mockSyncService,
    );
  });

  describe("handleEvent - TRANSACTIONS webhooks", () => {
    const mockItem = { id: "pitm_1", userId: "user_1" };

    beforeEach(() => {
      mockPlaidItemModel.getByItemId.mockResolvedValue(mockItem);
    });

    it("should trigger sync for SYNC_UPDATES_AVAILABLE", async () => {
      await webhookService.handleEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "plaid-item-ext-id",
      });

      expect(mockPlaidItemModel.getByItemId).toHaveBeenCalledWith(
        mockDb,
        "plaid-item-ext-id",
      );
      // syncItemTransactions is fire-and-forget; flush all pending microtasks
      await new Promise((resolve) => setImmediate(resolve));
      expect(mockSyncService.syncItemTransactions).toHaveBeenCalledWith(
        "user_1",
        "pitm_1",
        "webhook",
      );
    });

    it("should trigger sync for DEFAULT_UPDATE", async () => {
      await webhookService.handleEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "DEFAULT_UPDATE",
        item_id: "plaid-item-ext-id",
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockSyncService.syncItemTransactions).toHaveBeenCalled();
    });

    it("should trigger sync for TRANSACTIONS_REMOVED", async () => {
      await webhookService.handleEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "TRANSACTIONS_REMOVED",
        item_id: "plaid-item-ext-id",
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockSyncService.syncItemTransactions).toHaveBeenCalled();
    });

    it("should log warning for unknown TRANSACTIONS code", async () => {
      await webhookService.handleEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "UNKNOWN_CODE",
        item_id: "plaid-item-ext-id",
      });

      expect(mockSyncService.syncItemTransactions).not.toHaveBeenCalled();
    });
  });

  describe("handleEvent - ITEM webhooks", () => {
    const mockItem = { id: "pitm_1", userId: "user_1" };

    beforeEach(() => {
      mockPlaidItemModel.getByItemId.mockResolvedValue(mockItem);
      mockPlaidItemModel.update.mockResolvedValue(undefined);
      mockPlaidItemModel.delete.mockResolvedValue(undefined);
    });

    it("should update item status with error for ITEM/ERROR", async () => {
      await webhookService.handleEvent({
        webhook_type: "ITEM",
        webhook_code: "ERROR",
        item_id: "plaid-item-ext-id",
        rawBody: JSON.stringify({
          error: {
            error_code: "ITEM_LOGIN_REQUIRED",
            error_message: "Login required",
          },
        }),
      });

      expect(mockPlaidItemModel.update).toHaveBeenCalledWith(
        mockDb,
        "pitm_1",
        expect.objectContaining({
          status: "requires_reauth",
          errorCode: "ITEM_LOGIN_REQUIRED",
        }),
      );
    });

    it("should update item to requires_reauth for PENDING_EXPIRATION", async () => {
      await webhookService.handleEvent({
        webhook_type: "ITEM",
        webhook_code: "PENDING_EXPIRATION",
        item_id: "plaid-item-ext-id",
      });

      expect(mockPlaidItemModel.update).toHaveBeenCalledWith(
        mockDb,
        "pitm_1",
        expect.objectContaining({ status: "requires_reauth" }),
      );
    });

    it("should update item to active for LOGIN_REPAIRED", async () => {
      await webhookService.handleEvent({
        webhook_type: "ITEM",
        webhook_code: "LOGIN_REPAIRED",
        item_id: "plaid-item-ext-id",
      });

      expect(mockPlaidItemModel.update).toHaveBeenCalledWith(
        mockDb,
        "pitm_1",
        expect.objectContaining({
          status: "active",
          errorCode: null,
          errorMessage: null,
        }),
      );
    });

    it("should delete item for USER_PERMISSION_REVOKED", async () => {
      await webhookService.handleEvent({
        webhook_type: "ITEM",
        webhook_code: "USER_PERMISSION_REVOKED",
        item_id: "plaid-item-ext-id",
      });

      expect(mockPlaidItemModel.delete).toHaveBeenCalledWith(mockDb, "pitm_1");
      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
    });

    describe("USER_ACCOUNT_REVOKED", () => {
      // This code is account-scoped. Deleting the Item would take every other
      // account under the same bank — and all of their transactions — with it,
      // so every case here asserts the Item survives.
      const revokedAccount = {
        id: "pacc_1",
        plaidItemId: "pitm_1",
        accountId: "acc_ext_1",
        accountName: "Plaid Checking",
        mask: "0000",
        ledgerAccount: "Assets:US:BofA:Checking",
      };

      function fireRevoked(rawBody?: string) {
        return webhookService.handleEvent({
          webhook_type: "ITEM",
          webhook_code: "USER_ACCOUNT_REVOKED",
          item_id: "plaid-item-ext-id",
          rawBody,
        });
      }

      it("deletes only the revoked account and leaves the Item intact", async () => {
        mockPlaidAccountModel.getByAccountId.mockResolvedValue(revokedAccount);

        await fireRevoked(JSON.stringify({ account_id: "acc_ext_1" }));

        expect(mockPlaidAccountModel.getByAccountId).toHaveBeenCalledWith(
          mockDb,
          "acc_ext_1",
        );
        expect(mockPlaidAccountModel.delete).toHaveBeenCalledWith(
          mockDb,
          "pacc_1",
        );
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });

      it("does nothing when the payload carries no account_id", async () => {
        await fireRevoked(JSON.stringify({ user_id: "usr_1" }));

        expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });

      it("does nothing when there is no rawBody at all", async () => {
        await fireRevoked(undefined);

        expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });

      it("does nothing when rawBody is malformed JSON", async () => {
        await fireRevoked("{not json");

        expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });

      it("is a no-op when the account is already gone", async () => {
        mockPlaidAccountModel.getByAccountId.mockResolvedValue(null);

        await expect(
          fireRevoked(JSON.stringify({ account_id: "acc_ext_1" })),
        ).resolves.toBeUndefined();

        expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });

      it("refuses to delete an account belonging to a different Item", async () => {
        mockPlaidAccountModel.getByAccountId.mockResolvedValue({
          ...revokedAccount,
          plaidItemId: "pitm_other",
        });

        await fireRevoked(JSON.stringify({ account_id: "acc_ext_1" }));

        expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
        expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
      });
    });

    it("should log warning for unknown ITEM code", async () => {
      await webhookService.handleEvent({
        webhook_type: "ITEM",
        webhook_code: "SOME_UNKNOWN_CODE",
        item_id: "plaid-item-ext-id",
      });

      expect(mockPlaidItemModel.update).not.toHaveBeenCalled();
      expect(mockPlaidItemModel.delete).not.toHaveBeenCalled();
    });
  });

  describe("handleEvent - unknown webhook type", () => {
    it("should log warning for unknown type", async () => {
      await webhookService.handleEvent({
        webhook_type: "ASSETS",
        webhook_code: "PRODUCT_READY",
        item_id: "plaid-item-ext-id",
      });
      // Should not throw
    });
  });

  describe("handleEvent - unknown item_id", () => {
    it("should log warning and return early when item not found", async () => {
      mockPlaidItemModel.getByItemId.mockResolvedValue(null);

      await webhookService.handleEvent({
        webhook_type: "TRANSACTIONS",
        webhook_code: "SYNC_UPDATES_AVAILABLE",
        item_id: "unknown-item-id",
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(mockSyncService.syncItemTransactions).not.toHaveBeenCalled();
    });
  });
});
