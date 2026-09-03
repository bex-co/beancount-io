import "reflect-metadata";
import { systemIdentity } from "@/server/api/identity";

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

jest.mock("../../utils/encryption", () => ({
  decryptToken: jest.fn().mockReturnValue("decrypted-access-token"),
  encryptToken: jest.fn().mockReturnValue("encrypted-access-token"),
}));

jest.mock("@/features/llm/utils/suggest-account-mapping", () => ({
  suggestAccountMapping: jest.fn(),
}));

import { PlaidItemService } from "../plaid-item-service";
import { assertLedgerAccess } from "@/features/ledger/utils/ledger-access-check";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";
import { suggestAccountMapping as mockSuggestAccountMappingLLM } from "@/features/llm/utils/suggest-account-mapping";
import {
  AUTHORIZATION_ACTIONS,
  bankConnectionResource,
  parseBankConnectionResource,
} from "@/server/api/authorization";

const mockAssertLedgerAccess = assertLedgerAccess as jest.Mock;

const mockPlaidItemModel = {
  getById: jest.fn(),
  getByUserId: jest.fn(),
  getByLedgerRepoIdAndUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(),
  updateForBinding: jest.fn(async (db, id, _binding, input) => {
    await mockPlaidItemModel.update(db, id, input);
    return true;
  }),
  deleteForBinding: jest.fn(async (db, id) => {
    await mockPlaidItemModel.delete(db, id);
    return true;
  }),
};
const mockPlaidAccountModel = {
  getById: jest.fn(),
  getByItemId: jest.fn(),
  getEnabledByLedgerRepoIdAndUserId: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  updateForItem: jest.fn(async (db, id, _itemId, input) => {
    await mockPlaidAccountModel.update(db, id, input);
    return true;
  }),
  deleteForItem: jest.fn(async (db, id) => {
    await mockPlaidAccountModel.delete(db, id);
    return true;
  }),
};
const mockPlaidTransactionModel = {
  getUnsyncedByAccountId: jest.fn(),
  getUnsyncedByAccountIds: jest.fn(),
};
const mockUserModel = {};

const mockModels = {
  plaidItem: mockPlaidItemModel,
  plaidAccount: mockPlaidAccountModel,
  plaidTransaction: mockPlaidTransactionModel,
  user: mockUserModel,
} as any;

const mockPlaidClient = {
  createLinkToken: jest.fn(),
  createUpdateModeLinkToken: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  exchangePublicToken: jest.fn(),
  getInstitution: jest.fn(),
  getAccounts: jest.fn(),
} as any;
const mockGetLedger = jest.fn();
const mockGetLedgerByRepoId = jest.fn();
const mockFavaClientFactory = {
  getAdminClient: () => ({
    ledgers: { getLedger: mockGetLedger },
    admin: { getLedgerByRepoId: mockGetLedgerByRepoId },
  }),
} as any;
// Runs the callback against the same executor, so assertions can just look at
// the model mocks without caring whether a write went through `db` or `tx`.
const mockDb: any = {
  transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb(mockDb),
  ),
};
const mockConfig = { blockeden: { accessKey: "key" } } as any;
let authorizedLedgerRepoId = 42;
const mockAuthorization = {
  authorize: jest.fn(),
  authorizeOrThrow: jest.fn(async ({ principal, resource }) => {
    const binding = parseBankConnectionResource(resource);
    if (!binding) {
      return { allowed: true, action: "test", resource };
    }
    const access = await mockAssertLedgerAccess(
      binding.ledgerId,
      principal.userId,
      {
        db: mockDb,
        models: mockModels,
        favaClientFactory: mockFavaClientFactory,
      },
    );
    if (access.permission === "read") throw new ForbiddenError("Forbidden");
    authorizedLedgerRepoId = access.ledgerRepoId;
    return { allowed: true, action: "test", resource };
  }),
} as any;

function makeItem(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "pitm_1",
    userId: "user_owner",
    ledgerRepoId: 42,
    itemId: "ext-item-1",
    accessToken: "encrypted",
    institutionId: "ins_1",
    institutionName: "Test Bank",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("PlaidItemService", () => {
  let service: PlaidItemService;

  beforeEach(() => {
    jest.clearAllMocks();
    authorizedLedgerRepoId = 42;
    mockDb.transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockDb),
    );
    mockAssertLedgerAccess.mockResolvedValue({
      permission: "write",
      ledgerOwnerId: "user_owner",
      ledgerRepoId: 42,
    });
    mockGetLedger.mockImplementation(async () => ({
      data: {
        success: true,
        data: { id: authorizedLedgerRepoId, full_name: "owner/ledger" },
      },
    }));
    mockGetLedgerByRepoId.mockResolvedValue({
      data: { success: true, data: { id: 42, full_name: "owner/ledger" } },
    });
    service = new PlaidItemService(
      mockPlaidClient,
      mockFavaClientFactory,
      mockModels,
      mockDb,
      mockConfig,
      mockAuthorization,
    );
  });

  describe("getItems", () => {
    it("scopes to the ledger via assertLedgerAccess", async () => {
      mockPlaidItemModel.getByLedgerRepoIdAndUserId.mockResolvedValue([
        makeItem(),
      ]);

      const result = await service.getItems(
        systemIdentity("user_owner"),
        "owner/ledger",
      );

      expect(mockAssertLedgerAccess).toHaveBeenCalledWith(
        "owner/ledger",
        "user_owner",
        expect.objectContaining({ db: mockDb, models: mockModels }),
      );
      expect(
        mockPlaidItemModel.getByLedgerRepoIdAndUserId,
      ).toHaveBeenCalledWith(mockDb, 42, "user_owner");
      expect(result).toHaveLength(1);
    });

    it("propagates the ForbiddenError thrown by assertLedgerAccess", async () => {
      mockAssertLedgerAccess.mockRejectedValue(new Error("Forbidden"));

      await expect(
        service.getItems(systemIdentity("user_other"), "owner/ledger"),
      ).rejects.toThrow("Forbidden");
    });
  });

  describe("getAccounts", () => {
    it("verifies the item belongs to the resolved ledgerRepoId", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(
        makeItem({ userId: "user_owner", ledgerRepoId: 42 }),
      );
      mockPlaidAccountModel.getByItemId.mockResolvedValue([]);

      await service.getAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockAssertLedgerAccess).toHaveBeenCalledWith(
        "owner/ledger",
        "user_owner",
        expect.any(Object),
      );
      expect(mockPlaidAccountModel.getByItemId).toHaveBeenCalledWith(
        mockDb,
        "pitm_1",
      );
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(
        makeItem({ userId: "user_owner", ledgerRepoId: 42 }),
      );
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: "user_other",
        ledgerRepoId: 99,
      });

      await expect(
        service.getAccounts(
          systemIdentity("user_other"),
          "pitm_1",
          "other/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(mockPlaidAccountModel.getByItemId).not.toHaveBeenCalled();
    });
  });

  describe("getAccountsForLedger", () => {
    it("scopes to the resolved ledgerRepoId and carries the institution name", async () => {
      const now = new Date();
      mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId.mockResolvedValue(
        [
          {
            id: "pacc_1",
            plaidItemId: "pitm_1",
            accountId: "ext-acc-1",
            accountName: "Checking",
            accountType: "depository",
            accountSubtype: "checking",
            mask: "0000",
            ledgerAccount: "Assets:Chase:Checking",
            currency: "USD",
            enabled: true,
            createdAt: now,
            updatedAt: now,
            institutionName: "Chase",
          },
        ],
      );

      const result = await service.getAccountsForLedger(
        systemIdentity("user_owner"),
        "owner/ledger",
      );

      expect(
        mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId,
      ).toHaveBeenCalledWith(mockDb, 42, "user_owner");
      expect(result).toEqual([
        expect.objectContaining({
          id: "pacc_1",
          plaidItemId: "pitm_1",
          accountName: "Checking",
          mask: "0000",
          institutionName: "Chase",
        }),
      ]);
    });

    it("denies a read-only collaborator without bank-admin authority", async () => {
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });
      mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId.mockResolvedValue(
        [],
      );

      await expect(
        service.getAccountsForLedger(
          systemIdentity("user_reader"),
          "owner/ledger",
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("propagates the error thrown by assertLedgerAccess", async () => {
      mockAssertLedgerAccess.mockRejectedValue(new Error("Forbidden"));

      await expect(
        service.getAccountsForLedger(
          systemIdentity("user_other"),
          "owner/ledger",
        ),
      ).rejects.toThrow("Forbidden");
      expect(
        mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId,
      ).not.toHaveBeenCalled();
    });
  });

  describe("getUnsyncedTransactions", () => {
    function mockAccountAndItem(itemOverrides: Record<string, unknown> = {}) {
      mockPlaidAccountModel.getById.mockResolvedValue({
        id: "pacc_1",
        plaidItemId: "pitm_1",
      });
      mockPlaidItemModel.getById.mockResolvedValue(makeItem(itemOverrides));
    }

    it("verifies the item belongs to the resolved ledgerRepoId", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockPlaidTransactionModel.getUnsyncedByAccountId.mockResolvedValue([]);

      await service.getUnsyncedTransactions(
        systemIdentity("user_owner"),
        "pacc_1",
        "owner/ledger",
      );

      expect(
        mockPlaidTransactionModel.getUnsyncedByAccountId,
      ).toHaveBeenCalledWith(mockDb, "pacc_1");
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: "user_other",
        ledgerRepoId: 99,
      });

      await expect(
        service.getUnsyncedTransactions(
          systemIdentity("user_other"),
          "pacc_1",
          "other/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(
        mockPlaidTransactionModel.getUnsyncedByAccountId,
      ).not.toHaveBeenCalled();
    });

    it("aggregates across every enabled account in the ledger when accountId is omitted", async () => {
      mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId.mockResolvedValue(
        [
          {
            id: "pacc_1",
            accountName: "USD account",
            institutionName: "Wise (US)",
            ledgerAccount: "Assets:Wise:USD",
          },
          {
            id: "pacc_2",
            accountName: "GBP account",
            institutionName: "Wise (US)",
            ledgerAccount: "Assets:Wise:GBP",
          },
        ],
      );
      mockPlaidTransactionModel.getUnsyncedByAccountIds.mockResolvedValue([
        {
          id: "ptxn_1",
          plaidAccountId: "pacc_2",
          transactionId: "tx_1",
          date: new Date(),
          amount: "10.00",
          name: "Coffee",
          isPending: false,
          syncedToLedger: false,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getUnsyncedTransactions(
        systemIdentity("user_owner"),
        undefined,
        "owner/ledger",
      );

      expect(
        mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId,
      ).toHaveBeenCalledWith(mockDb, 42, "user_owner");
      expect(
        mockPlaidTransactionModel.getUnsyncedByAccountIds,
      ).toHaveBeenCalledWith(mockDb, ["pacc_1", "pacc_2"]);
      expect(result).toEqual([
        expect.objectContaining({
          plaidAccountId: "pacc_2",
          accountName: "GBP account",
          institutionName: "Wise (US)",
          ledgerAccount: "Assets:Wise:GBP",
        }),
      ]);
    });

    it("includes transactions from an unmapped (ledgerAccount unset) enabled account when accountId is omitted", async () => {
      mockPlaidAccountModel.getEnabledByLedgerRepoIdAndUserId.mockResolvedValue(
        [
          {
            id: "pacc_1",
            accountName: "Unmapped account",
            institutionName: "New Bank",
            ledgerAccount: undefined,
          },
        ],
      );
      mockPlaidTransactionModel.getUnsyncedByAccountIds.mockResolvedValue([
        {
          id: "ptxn_1",
          plaidAccountId: "pacc_1",
          transactionId: "tx_1",
          date: new Date(),
          amount: "10.00",
          name: "Coffee",
          isPending: false,
          syncedToLedger: false,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getUnsyncedTransactions(
        systemIdentity("user_owner"),
        undefined,
        "owner/ledger",
      );

      expect(result).toEqual([
        expect.objectContaining({
          plaidAccountId: "pacc_1",
          accountName: "Unmapped account",
          institutionName: "New Bank",
          ledgerAccount: undefined,
        }),
      ]);
    });
  });

  describe("createLinkToken", () => {
    it("fails fast when the caller only has read access", async () => {
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });

      await expect(
        service.createLinkToken(systemIdentity("user_other"), "owner/ledger"),
      ).rejects.toThrow(ForbiddenError);
      expect(mockPlaidClient.createLinkToken).not.toHaveBeenCalled();
    });

    it("succeeds when the caller has write access", async () => {
      mockPlaidClient.createLinkToken.mockResolvedValue("link-token-abc");

      const result = await service.createLinkToken(
        systemIdentity("user_owner"),
        "owner/ledger",
      );

      expect(result).toEqual({ linkToken: "link-token-abc" });
    });
  });

  describe("exchangePublicToken", () => {
    beforeEach(() => {
      mockPlaidClient.exchangePublicToken.mockResolvedValue({
        accessToken: "plaid-access-token",
        itemId: "ext-item-1",
      });
      mockPlaidClient.getItem.mockResolvedValue({ institutionId: "ins_1" });
      mockPlaidClient.getInstitution.mockResolvedValue({ name: "Test Bank" });
      mockPlaidClient.getAccounts.mockResolvedValue([]);
      mockPlaidItemModel.getByUserId.mockResolvedValue([]);
      mockPlaidItemModel.create.mockResolvedValue(
        makeItem({ ledgerRepoId: 42 }),
      );
    });

    it("checks ledger write access before exchanging the (one-time-use) public token", async () => {
      mockAssertLedgerAccess.mockRejectedValue(new ForbiddenError("nope"));

      await expect(
        service.exchangePublicToken(
          systemIdentity("user_other"),
          "owner/ledger",
          "public-token",
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockPlaidClient.exchangePublicToken).not.toHaveBeenCalled();
    });

    it("rejects when the caller only has read access to the ledger", async () => {
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });

      await expect(
        service.exchangePublicToken(
          systemIdentity("user_other"),
          "owner/ledger",
          "public-token",
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockPlaidClient.exchangePublicToken).not.toHaveBeenCalled();
    });

    it("persists the resolved ledgerRepoId on the created item", async () => {
      await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(mockPlaidItemModel.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ ledgerRepoId: 42, userId: "user_owner" }),
      );
    });

    it("allows connecting the same institution to a different ledger", async () => {
      mockPlaidItemModel.getByUserId.mockResolvedValue([
        makeItem({ institutionId: "ins_1", ledgerRepoId: 99 }),
      ]);

      const result = await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(result).toBeDefined();
      expect(mockPlaidItemModel.create).toHaveBeenCalled();
    });

    it("rejects a duplicate institution on the same ledger", async () => {
      mockPlaidItemModel.getByUserId.mockResolvedValue([
        makeItem({ institutionId: "ins_1", ledgerRepoId: 42 }),
      ]);

      await expect(
        service.exchangePublicToken(
          systemIdentity("user_owner"),
          "owner/ledger",
          "public-token",
        ),
      ).rejects.toThrow("already have an active connection");
      expect(mockPlaidItemModel.create).not.toHaveBeenCalled();
    });

    it("auto-suggests and persists ledgerAccount mappings for newly created accounts via the LLM util", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        {
          accountId: "ext_acc_1",
          name: "USD account",
          type: "depository",
          subtype: "checking",
          mask: "1234",
        },
        {
          accountId: "ext_acc_2",
          name: "GBP account",
          type: "depository",
          subtype: "checking",
          mask: "5678",
        },
      ]);
      mockPlaidAccountModel.create
        .mockResolvedValueOnce({
          id: "pacc_1",
          accountName: "USD account",
          accountType: "depository",
        })
        .mockResolvedValueOnce({
          id: "pacc_2",
          accountName: "GBP account",
          accountType: "depository",
        });
      mockFavaClientFactory.getPublicApiClient = jest.fn().mockResolvedValue({
        reports: {
          getLedgerAccounts: jest.fn().mockResolvedValue({
            data: {
              success: true,
              data: { "Assets:Cash": { close_date: null } },
            },
          }),
          getLedgerPlugins: jest.fn().mockResolvedValue({
            data: {
              success: true,
              data: ["beancount.plugins.auto_accounts"],
            },
          }),
        },
      });
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: [
          {
            accountId: "pacc_1",
            suggestedAccount: "Assets:Wise:USD",
            confidence: 0.9,
            reasoning: "r1",
          },
          {
            accountId: "pacc_2",
            suggestedAccount: "Assets:Wise:GBP",
            confidence: 0.3,
            reasoning: "r2",
          },
        ],
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      });

      await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(mockSuggestAccountMappingLLM).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          accounts: [
            expect.objectContaining({ accountId: "pacc_1" }),
            expect.objectContaining({ accountId: "pacc_2" }),
          ],
          existingAccounts: ["Assets:Cash"],
          autoAccounts: true,
        }),
      );
      expect(mockPlaidAccountModel.update).toHaveBeenCalledWith(
        mockDb,
        "pacc_1",
        { ledgerAccount: "Assets:Wise:USD" },
      );
      expect(mockPlaidAccountModel.update).toHaveBeenCalledWith(
        mockDb,
        "pacc_2",
        { ledgerAccount: "Assets:Wise:GBP" },
      );
    });

    it("passes autoAccounts: false when the ledger has no auto-accounts plugin", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        { accountId: "ext_acc_1", name: "USD account", type: "depository" },
      ]);
      mockPlaidAccountModel.create.mockResolvedValue({
        id: "pacc_1",
        accountName: "USD account",
        accountType: "depository",
      });
      mockFavaClientFactory.getPublicApiClient = jest.fn().mockResolvedValue({
        reports: {
          getLedgerAccounts: jest.fn().mockResolvedValue({
            data: { success: true, data: {} },
          }),
          getLedgerPlugins: jest.fn().mockResolvedValue({
            data: { success: true, data: [] },
          }),
        },
      });
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: [],
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      });

      await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(mockSuggestAccountMappingLLM).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ autoAccounts: false }),
      );
    });

    it("still succeeds and leaves accounts unmapped when the AI suggestion step fails", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        { accountId: "ext_acc_1", name: "USD account", type: "depository" },
      ]);
      mockPlaidAccountModel.create.mockResolvedValue({
        id: "pacc_1",
        accountName: "USD account",
        accountType: "depository",
      });
      mockFavaClientFactory.getPublicApiClient = jest
        .fn()
        .mockRejectedValue(new Error("fava down"));

      const result = await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(result).toBeDefined();
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
    });

    it("skips the AI mapping step entirely when no accounts are returned from Plaid", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([]);
      mockFavaClientFactory.getPublicApiClient = jest.fn();

      await service.exchangePublicToken(
        systemIdentity("user_owner"),
        "owner/ledger",
        "public-token",
      );

      expect(mockFavaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
      expect(mockSuggestAccountMappingLLM).not.toHaveBeenCalled();
    });
  });

  describe("updateAccountMapping", () => {
    function mockAccountAndItem(itemOverrides: Record<string, unknown> = {}) {
      mockPlaidAccountModel.getById.mockResolvedValue({
        id: "pacc_1",
        plaidItemId: "pitm_1",
      });
      mockPlaidItemModel.getById.mockResolvedValue(makeItem(itemOverrides));
    }

    it("succeeds when the caller has write access and the item matches the ledger", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockPlaidAccountModel.update.mockResolvedValue(undefined);

      const result = await service.updateAccountMapping(
        systemIdentity("user_owner"),
        "pacc_1",
        "Assets:Checking",
        "owner/ledger",
      );

      expect(result).toBe(true);
    });

    it("rejects when the caller only has read access", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });

      await expect(
        service.updateAccountMapping(
          systemIdentity("user_other"),
          "pacc_1",
          "Assets:Checking",
          "owner/ledger",
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 99 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: "user_other",
        ledgerRepoId: 42,
      });

      await expect(
        service.updateAccountMapping(
          systemIdentity("user_other"),
          "pacc_1",
          "Assets:Checking",
          "owner/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
    });
  });

  describe("updateAccountCurrency", () => {
    function mockAccountAndItem(itemOverrides: Record<string, unknown> = {}) {
      mockPlaidAccountModel.getById.mockResolvedValue({
        id: "pacc_1",
        plaidItemId: "pitm_1",
      });
      mockPlaidItemModel.getById.mockResolvedValue(makeItem(itemOverrides));
    }

    it("succeeds when the caller has write access and the item matches the ledger", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockPlaidAccountModel.update.mockResolvedValue(undefined);

      const result = await service.updateAccountCurrency(
        systemIdentity("user_owner"),
        "pacc_1",
        "EUR",
        "owner/ledger",
      );

      expect(result).toBe(true);
      expect(mockPlaidAccountModel.update).toHaveBeenCalledWith(
        expect.anything(),
        "pacc_1",
        { currency: "EUR" },
      );
    });

    it("rejects when the caller only has read access", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });

      await expect(
        service.updateAccountCurrency(
          systemIdentity("user_other"),
          "pacc_1",
          "EUR",
          "owner/ledger",
        ),
      ).rejects.toThrow(ForbiddenError);
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 99 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: "user_other",
        ledgerRepoId: 42,
      });

      await expect(
        service.updateAccountCurrency(
          systemIdentity("user_other"),
          "pacc_1",
          "EUR",
          "owner/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
    });
  });

  describe("suggestCategories", () => {
    function mockAccountAndItem(itemOverrides: Record<string, unknown> = {}) {
      mockPlaidAccountModel.getById.mockResolvedValue({
        id: "pacc_1",
        plaidItemId: "pitm_1",
      });
      mockPlaidItemModel.getById.mockResolvedValue(makeItem(itemOverrides));
      mockPlaidTransactionModel.getUnsyncedByAccountId.mockResolvedValue([]);
    }

    it("chain-verifies against the resolved ledgerRepoId", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 42 });

      const result = await service.suggestCategories(
        systemIdentity("user_owner"),
        "owner/ledger",
        "pacc_1",
      );

      expect(result).toEqual([]);
      expect(mockAuthorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal: expect.objectContaining({ userId: "user_owner" }),
        action: AUTHORIZATION_ACTIONS.BANK_TRANSACTION_CATEGORIES_SUGGEST,
        resource: bankConnectionResource("owner/ledger", "pitm_1"),
      });
    });

    it("denies before reading staged transactions", async () => {
      mockAuthorization.authorizeOrThrow.mockRejectedValueOnce(
        new Error("source unavailable"),
      );

      await expect(
        service.suggestCategories(
          systemIdentity("user_owner"),
          "owner/ledger",
          "pacc_1",
        ),
      ).rejects.toThrow("source unavailable");
      expect(mockPlaidAccountModel.getById).toHaveBeenCalledWith(
        mockDb,
        "pacc_1",
      );
      expect(
        mockPlaidTransactionModel.getUnsyncedByAccountId,
      ).not.toHaveBeenCalled();
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockAccountAndItem({ userId: "user_owner", ledgerRepoId: 99 });
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "write",
        ledgerOwnerId: "user_other",
        ledgerRepoId: 42,
      });

      await expect(
        service.suggestCategories(
          systemIdentity("user_other"),
          "other/ledger",
          "pacc_1",
        ),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("suggestAccountMapping", () => {
    function mockItemAndAccounts(
      accounts: Array<Record<string, unknown>>,
      itemOverrides: Record<string, unknown> = {},
    ) {
      mockPlaidItemModel.getById.mockResolvedValue(
        makeItem({ institutionName: "Wise (US)", ...itemOverrides }),
      );
      mockPlaidAccountModel.getByItemId.mockResolvedValue(accounts);
    }

    it("returns [] without calling Fava/LLM when there are no unmapped accounts", async () => {
      mockItemAndAccounts([
        {
          id: "pacc_1",
          accountName: "USD account",
          ledgerAccount: "Assets:Wise:USD",
        },
      ]);

      const result = await service.suggestAccountMapping(
        systemIdentity("user_owner"),
        "owner/ledger",
        "pitm_1",
      );

      expect(result).toEqual([]);
      expect(mockSuggestAccountMappingLLM).not.toHaveBeenCalled();
    });

    it("denies before reading the Plaid item", async () => {
      mockAuthorization.authorizeOrThrow.mockRejectedValueOnce(
        new Error("source unavailable"),
      );

      await expect(
        service.suggestAccountMapping(
          systemIdentity("user_owner"),
          "owner/ledger",
          "pitm_1",
        ),
      ).rejects.toThrow("source unavailable");
      expect(mockPlaidItemModel.getById).not.toHaveBeenCalled();
      expect(mockSuggestAccountMappingLLM).not.toHaveBeenCalled();
    });

    it("suggests distinct mappings for each unmapped account via the LLM util", async () => {
      mockItemAndAccounts([
        { id: "pacc_1", accountName: "USD account", accountType: "depository" },
        { id: "pacc_2", accountName: "GBP account", accountType: "depository" },
      ]);
      mockFavaClientFactory.getPublicApiClient = jest.fn().mockResolvedValue({
        reports: {
          getLedgerAccounts: jest.fn().mockResolvedValue({
            data: {
              success: true,
              data: { "Assets:Cash": { close_date: null } },
            },
          }),
          getLedgerPlugins: jest.fn().mockResolvedValue({
            data: {
              success: true,
              data: ["beancount.plugins.auto_accounts"],
            },
          }),
        },
      });
      const expectedSuggestions = [
        {
          accountId: "pacc_1",
          suggestedAccount: "Assets:Wise:USD",
          confidence: 0.9,
          reasoning: "r1",
        },
        {
          accountId: "pacc_2",
          suggestedAccount: "Assets:Wise:GBP",
          confidence: 0.9,
          reasoning: "r2",
        },
      ];
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: expectedSuggestions,
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      });

      const result = await service.suggestAccountMapping(
        systemIdentity("user_owner"),
        "owner/ledger",
        "pitm_1",
      );

      expect(mockSuggestAccountMappingLLM).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          institutionName: "Wise (US)",
          accounts: [
            expect.objectContaining({ accountId: "pacc_1" }),
            expect.objectContaining({ accountId: "pacc_2" }),
          ],
          existingAccounts: ["Assets:Cash"],
          autoAccounts: true,
        }),
      );
      expect(result).toEqual(expectedSuggestions);
    });

    it("passes autoAccounts: false when the ledger has no auto-accounts plugin", async () => {
      mockItemAndAccounts([
        { id: "pacc_1", accountName: "USD account", accountType: "depository" },
      ]);
      mockFavaClientFactory.getPublicApiClient = jest.fn().mockResolvedValue({
        reports: {
          getLedgerAccounts: jest.fn().mockResolvedValue({
            data: { success: true, data: {} },
          }),
          getLedgerPlugins: jest.fn().mockResolvedValue({
            data: { success: true, data: [] },
          }),
        },
      });
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: [],
        tokenUsage: { inputTokens: 0, outputTokens: 0 },
      });

      await service.suggestAccountMapping(
        systemIdentity("user_owner"),
        "owner/ledger",
        "pitm_1",
      );

      expect(mockSuggestAccountMappingLLM).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ autoAccounts: false }),
      );
    });

    it("rejects when the item belongs to a different ledger than the one resolved", async () => {
      mockItemAndAccounts([], { ledgerRepoId: 99 });

      await expect(
        service.suggestAccountMapping(
          systemIdentity("user_other"),
          "other/ledger",
          "pitm_1",
        ),
      ).rejects.toThrow(BadUserInputError);
      expect(mockSuggestAccountMappingLLM).not.toHaveBeenCalled();
    });
  });

  describe("createUpdateModeLinkToken", () => {
    beforeEach(() => {
      mockPlaidItemModel.getById.mockResolvedValue(makeItem());
      mockPlaidClient.createUpdateModeLinkToken.mockResolvedValue("link-token");
    });

    it("does not request account selection by default", async () => {
      await service.createUpdateModeLinkToken(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockPlaidClient.createUpdateModeLinkToken).toHaveBeenCalledWith(
        "user_owner",
        "decrypted-access-token",
        { accountSelectionEnabled: false },
      );
    });

    it("requests account selection when asked", async () => {
      await service.createUpdateModeLinkToken(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
        true,
      );

      expect(mockPlaidClient.createUpdateModeLinkToken).toHaveBeenCalledWith(
        "user_owner",
        "decrypted-access-token",
        { accountSelectionEnabled: true },
      );
    });
  });

  describe("reconcileItemAccounts", () => {
    function remoteAccount(accountId: string, name = `Account ${accountId}`) {
      return {
        accountId,
        name,
        type: "depository",
        subtype: "checking",
        mask: "0000",
      };
    }

    function localAccount(accountId: string, id = `pacc_${accountId}`) {
      const now = new Date();
      return {
        id,
        plaidItemId: "pitm_1",
        accountId,
        accountName: `Account ${accountId}`,
        accountType: "depository",
        accountSubtype: "checking",
        mask: "0000",
        ledgerAccount: "Assets:Checking",
        currency: "USD",
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    beforeEach(() => {
      mockPlaidItemModel.getById.mockResolvedValue(makeItem());
      mockPlaidAccountModel.create.mockImplementation(
        async (_db: unknown, input: { accountId: string }) =>
          localAccount(input.accountId),
      );
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: [],
      });
    });

    it("creates rows for accounts Plaid newly shares", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        remoteAccount("acc_1"),
        remoteAccount("acc_2"),
      ]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
      ]);

      const result = await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockPlaidAccountModel.create).toHaveBeenCalledTimes(1);
      expect(mockPlaidAccountModel.create).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ plaidItemId: "pitm_1", accountId: "acc_2" }),
      );
      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        addedCount: 1,
        removedCount: 0,
      });
    });

    it("deletes rows for accounts Plaid no longer shares", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([remoteAccount("acc_1")]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
        localAccount("acc_2"),
      ]);

      const result = await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockPlaidAccountModel.delete).toHaveBeenCalledTimes(1);
      expect(mockPlaidAccountModel.delete).toHaveBeenCalledWith(
        mockDb,
        "pacc_acc_2",
      );
      expect(mockPlaidAccountModel.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        addedCount: 0,
        removedCount: 1,
      });
    });

    it("writes nothing when both sides already agree", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        remoteAccount("acc_1"),
        remoteAccount("acc_2"),
      ]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
        localAccount("acc_2"),
      ]);

      const result = await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockPlaidAccountModel.create).not.toHaveBeenCalled();
      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
      expect(mockPlaidAccountModel.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        addedCount: 0,
        removedCount: 0,
      });
    });

    it("refuses to delete anything when Plaid returns no accounts", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
        localAccount("acc_2"),
      ]);

      await expect(
        service.reconcileItemAccounts(
          systemIdentity("user_owner"),
          "pitm_1",
          "owner/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);

      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it("allows an empty response when nothing is stored yet", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([]);

      const result = await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(result).toEqual({
        success: true,
        addedCount: 0,
        removedCount: 0,
      });
    });

    it("converts a failing accounts read into a user-facing error", async () => {
      mockPlaidClient.getAccounts.mockRejectedValue(
        new Error("ITEM_LOGIN_REQUIRED"),
      );
      mockPlaidAccountModel.getByItemId.mockResolvedValue([]);

      await expect(
        service.reconcileItemAccounts(
          systemIdentity("user_owner"),
          "pitm_1",
          "owner/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);

      expect(mockPlaidAccountModel.delete).not.toHaveBeenCalled();
      expect(mockPlaidAccountModel.create).not.toHaveBeenCalled();
    });

    it("rejects a read-only collaborator", async () => {
      mockAssertLedgerAccess.mockResolvedValue({
        permission: "read",
        ledgerOwnerId: "user_owner",
        ledgerRepoId: 42,
      });

      await expect(
        service.reconcileItemAccounts(
          systemIdentity("user_reader"),
          "pitm_1",
          "owner/ledger",
        ),
      ).rejects.toThrow(ForbiddenError);

      expect(mockPlaidClient.getAccounts).not.toHaveBeenCalled();
    });

    it("rejects an item belonging to a different ledger", async () => {
      mockPlaidItemModel.getById.mockResolvedValue(
        makeItem({ ledgerRepoId: 99 }),
      );

      await expect(
        service.reconcileItemAccounts(
          systemIdentity("user_owner"),
          "pitm_1",
          "owner/ledger",
        ),
      ).rejects.toThrow(BadUserInputError);

      expect(mockPlaidClient.getAccounts).not.toHaveBeenCalled();
    });

    it("runs AI mapping for newly created accounts only", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([
        remoteAccount("acc_1"),
        remoteAccount("acc_2"),
      ]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
      ]);
      (mockSuggestAccountMappingLLM as jest.Mock).mockResolvedValue({
        suggestions: [
          { accountId: "pacc_acc_2", suggestedAccount: "Assets:New" },
        ],
      });

      await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockSuggestAccountMappingLLM).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          institutionName: "Test Bank",
          accounts: [expect.objectContaining({ accountId: "pacc_acc_2" })],
        }),
      );
      expect(mockPlaidAccountModel.update).toHaveBeenCalledWith(
        mockDb,
        "pacc_acc_2",
        { ledgerAccount: "Assets:New" },
      );
    });

    it("skips AI mapping when nothing was created", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([remoteAccount("acc_1")]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([
        localAccount("acc_1"),
        localAccount("acc_2"),
      ]);

      await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(mockSuggestAccountMappingLLM).not.toHaveBeenCalled();
    });

    it("still succeeds when AI mapping fails", async () => {
      mockPlaidClient.getAccounts.mockResolvedValue([remoteAccount("acc_1")]);
      mockPlaidAccountModel.getByItemId.mockResolvedValue([]);
      (mockSuggestAccountMappingLLM as jest.Mock).mockRejectedValue(
        new Error("llm down"),
      );

      const result = await service.reconcileItemAccounts(
        systemIdentity("user_owner"),
        "pitm_1",
        "owner/ledger",
      );

      expect(result).toEqual({
        success: true,
        addedCount: 1,
        removedCount: 0,
      });
    });
  });
});
