import "reflect-metadata";
import { LedgerWorkflow } from "../ledger-workflow";
import {
  InternalServerError,
  BadUserInputError,
  OperationNotAllowedError,
} from "@/shared/errors";
import { Ledger } from "@/features/ledger/api/resolvers/ledger-resolver.types";
import { LedgerTemplate } from "../ledger-workflow.types";
import {
  defaultLedgerTemplate,
  ledgerWithMultipleFilesTemplate,
} from "@/features/ledger/utils/ledger-template";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  userResource,
} from "@/server/api/authorization";

jest.mock("@/features/plaid/utils/encryption", () => ({
  decryptToken: jest.fn().mockReturnValue("decrypted-access-token"),
}));

interface MockFavaApiClient {
  ledgers: {
    createLedger: jest.Mock;
    listLedgers: jest.Mock;
    listUserLedgers: jest.Mock;
    searchLedgers: jest.Mock;
    updateLedger: jest.Mock;
    deleteLedger: jest.Mock;
    getLedger: jest.Mock;
    createLedgerFile: jest.Mock;
    updateLedgerFile: jest.Mock;
    deleteLedgerFile: jest.Mock;
    getLedgerFile: jest.Mock;
    getLedgerDirContent: jest.Mock;
    changeLedgerFiles: jest.Mock;
  };
  reports: {
    getLedgerAttributes: jest.Mock;
    getLedgerOptions: jest.Mock;
    getLedgerFavaOptions: jest.Mock;
  };
}

const USER_ID = "user-123";
const IDENTITY = {
  userId: USER_ID,
  method: "session",
  scopes: new Set<string>(),
} as const;

describe("LedgerWorkflow", () => {
  let workflow: LedgerWorkflow;
  let mockFavaApiClient: MockFavaApiClient;
  let favaClientFactory: {
    getApiContext: jest.Mock;
    getPublicApiClient: jest.Mock;
  };
  let giteaClientFactory: { getUserApiClient: jest.Mock };
  let plaidClient: { removeItem: jest.Mock };
  let stripe: { listSubscriptions: jest.Mock };
  let ledgerDataService: { getEntriesCountPerType: jest.Mock };
  let models: {
    user: { getById: jest.Mock };
    paidCustomer: {
      findByUserIdWithActivePeriod: jest.Mock;
      findByUserId: jest.Mock;
    };
    plaidItem: {
      getByLedgerRepoId: jest.Mock;
      deleteByLedgerRepoId: jest.Mock;
    };
  };
  let db: { transaction: jest.Mock };
  let authorization: { authorizeOrThrow: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockFavaApiClient = {
      ledgers: {
        createLedger: jest.fn(),
        listLedgers: jest.fn(),
        listUserLedgers: jest.fn(),
        searchLedgers: jest.fn(),
        updateLedger: jest.fn(),
        deleteLedger: jest.fn(),
        getLedger: jest.fn(),
        createLedgerFile: jest.fn(),
        updateLedgerFile: jest.fn(),
        deleteLedgerFile: jest.fn(),
        getLedgerFile: jest.fn(),
        getLedgerDirContent: jest.fn(),
        changeLedgerFiles: jest.fn(),
      },
      reports: {
        getLedgerAttributes: jest.fn(),
        getLedgerOptions: jest.fn(),
        getLedgerFavaOptions: jest.fn(),
      },
    };

    favaClientFactory = {
      getApiContext: jest.fn().mockResolvedValue({
        favaApiClient: mockFavaApiClient,
        favaUser: { username: "testuser", password: "test-password" },
      }),
      getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
    };
    giteaClientFactory = { getUserApiClient: jest.fn() };
    plaidClient = { removeItem: jest.fn().mockResolvedValue(undefined) };
    stripe = { listSubscriptions: jest.fn().mockResolvedValue([]) };
    ledgerDataService = { getEntriesCountPerType: jest.fn() };
    models = {
      user: {
        getById: jest.fn().mockResolvedValue({
          id: USER_ID,
          ledger_username: "testuser",
          ledger_password: "test-password",
        }),
      },
      paidCustomer: {
        findByUserIdWithActivePeriod: jest.fn().mockResolvedValue(null),
        findByUserId: jest.fn().mockResolvedValue([]),
      },
      plaidItem: {
        getByLedgerRepoId: jest.fn().mockResolvedValue([]),
        deleteByLedgerRepoId: jest.fn().mockResolvedValue(undefined),
      },
    };
    db = { transaction: jest.fn((callback) => callback({})) };
    authorization = {
      authorizeOrThrow: jest.fn().mockResolvedValue({ allowed: true }),
    };

    const config = { gitea: { hostName: "gitea", httpPort: 3000 } };

    workflow = new LedgerWorkflow(
      favaClientFactory as never,
      giteaClientFactory as never,
      plaidClient as never,
      stripe as never,
      ledgerDataService as never,
      models as never,
      db as never,
      config as never,
      authorization as never,
    );
  });

  describe("updateLedger", () => {
    const ledgerId = "testuser/test-ledger";

    it("authorizes before provisioning a Fava client", async () => {
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(
        workflow.updateLedger({
          identity: IDENTITY,
          ledgerId,
          input: { name: "new-name" },
        }),
      ).rejects.toThrow("denied");
      expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal: IDENTITY,
        action: AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_UPDATE,
        resource: ledgerResource(ledgerId),
      });
      expect(favaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
      expect(mockFavaApiClient.ledgers.updateLedger).not.toHaveBeenCalled();
    });

    it("should update ledger with name change and return new ledger ID", async () => {
      mockFavaApiClient.ledgers.updateLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 1,
            name: "my-new-ledger",
            full_name: "testuser/my-new-ledger",
            description: "Updated description",
            private: true,
            empty: false,
            size: 2048,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
        },
      });

      const result = await workflow.updateLedger({
        identity: IDENTITY,
        ledgerId,
        input: {
          name: "My New Ledger",
          description: "Updated description",
          private: true,
        },
      });

      expect(mockFavaApiClient.ledgers.updateLedger).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        {
          name: "My New Ledger",
          description: "Updated description",
          private: true,
        },
      );
      expect(result.id).toBe("testuser/my-new-ledger");
      expect(result.name).toBe("my-new-ledger");
      expect(result.fullName).toBe("testuser/my-new-ledger");
      expect(result.private).toBe(true);
    });

    it("should throw error when update fails", async () => {
      mockFavaApiClient.ledgers.updateLedger.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.updateLedger({
          identity: IDENTITY,
          ledgerId,
          input: { name: "New Name" },
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it("should throw error when response data is null", async () => {
      mockFavaApiClient.ledgers.updateLedger.mockResolvedValue({
        data: { success: true, data: null },
      });

      await expect(
        workflow.updateLedger({
          identity: IDENTITY,
          ledgerId,
          input: { description: "Test" },
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it("should correctly parse ledger ID and call API with owner and name", async () => {
      mockFavaApiClient.ledgers.updateLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 2,
            name: "another-ledger",
            full_name: "anotheruser/another-ledger",
            description: null,
            private: false,
            empty: true,
            size: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
      });

      await workflow.updateLedger({
        identity: IDENTITY,
        ledgerId: "anotheruser/another-ledger",
        input: { description: "Test" },
      });

      expect(mockFavaApiClient.ledgers.updateLedger).toHaveBeenCalledWith(
        "anotheruser",
        "another-ledger",
        expect.any(Object),
      );
    });
  });

  describe("createLedger", () => {
    it("authorizes before locking, quota reads, or ledger creation", async () => {
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(
        workflow.createLedger({
          identity: IDENTITY,
          input: { name: "new-ledger" },
        }),
      ).rejects.toThrow("denied");
      expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal: IDENTITY,
        action: AUTHORIZATION_ACTIONS.LEDGER_CREATE,
        resource: userResource(USER_ID),
      });
      expect(favaClientFactory.getApiContext).not.toHaveBeenCalled();
      expect(models.paidCustomer.findByUserId).not.toHaveBeenCalled();
      expect(mockFavaApiClient.ledgers.createLedger).not.toHaveBeenCalled();
    });

    it("should create ledger and return correct data", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 1,
            name: "new-ledger",
            full_name: "testuser/new-ledger",
            description: "Test ledger",
            private: false,
            empty: true,
            size: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
      });

      const result = await workflow.createLedger({
        identity: IDENTITY,
        input: {
          name: "New Ledger",
          description: "Test ledger",
          private: false,
        },
      });

      expect(result.id).toBe("testuser/new-ledger");
      expect(result.name).toBe("new-ledger");
      expect(result.fullName).toBe("testuser/new-ledger");
      expect(mockFavaApiClient.ledgers.createLedger).toHaveBeenCalledWith(
        expect.objectContaining({ files: defaultLedgerTemplate }),
      );
    });

    it("should create a ledger from the selected sample template", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 1,
            name: "sample-ledger",
            full_name: "testuser/sample-ledger",
            description: null,
            private: true,
            empty: false,
            size: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
      });

      await workflow.createLedger({
        identity: IDENTITY,
        input: {
          name: "sample-ledger",
          private: true,
          template: LedgerTemplate.SAMPLE,
        },
      });

      expect(mockFavaApiClient.ledgers.createLedger).toHaveBeenCalledWith(
        expect.objectContaining({ files: ledgerWithMultipleFilesTemplate }),
      );
    });
  });

  describe("deleteLedger", () => {
    const ledgerId = "testuser/test-ledger";
    const LEDGER_REPO_ID = 42;

    it("authorizes before repository lookup, Plaid cleanup, or a transaction", async () => {
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(
        workflow.deleteLedger({ identity: IDENTITY, ledgerId }),
      ).rejects.toThrow("denied");
      expect(authorization.authorizeOrThrow).toHaveBeenCalledWith({
        principal: IDENTITY,
        action: AUTHORIZATION_ACTIONS.LEDGER_ADMINISTRATION_DELETE,
        resource: ledgerResource(ledgerId),
      });
      expect(favaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
      expect(models.plaidItem.getByLedgerRepoId).not.toHaveBeenCalled();
      expect(plaidClient.removeItem).not.toHaveBeenCalled();
      expect(db.transaction).not.toHaveBeenCalled();
      expect(mockFavaApiClient.ledgers.deleteLedger).not.toHaveBeenCalled();
    });

    const mockGetLedgerSuccess = () => {
      mockFavaApiClient.ledgers.getLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: LEDGER_REPO_ID,
            name: "test-ledger",
            full_name: ledgerId,
            description: null,
            empty: false,
            private: false,
            size: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        },
      });
    };

    it("should delete ledger and return ledger ID", async () => {
      mockGetLedgerSuccess();
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: true },
      });

      const result = await workflow.deleteLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(mockFavaApiClient.ledgers.getLedger).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
      expect(mockFavaApiClient.ledgers.deleteLedger).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
      expect(models.plaidItem.deleteByLedgerRepoId).toHaveBeenCalledWith(
        expect.any(Object),
        LEDGER_REPO_ID,
      );
      expect(result.ledgerId).toBe(ledgerId);
    });

    it("should throw error when delete fails", async () => {
      mockGetLedgerSuccess();
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.deleteLedger({ identity: IDENTITY, ledgerId }),
      ).rejects.toThrow(InternalServerError);
    });

    it("should revoke and delete local Plaid items scoped to the ledger before deleting the repo", async () => {
      mockGetLedgerSuccess();
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: true },
      });
      models.plaidItem.getByLedgerRepoId.mockResolvedValue([
        { id: "pitm_1", accessToken: "enc-1" },
        { id: "pitm_2", accessToken: "enc-2" },
      ]);

      const result = await workflow.deleteLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(models.plaidItem.getByLedgerRepoId).toHaveBeenCalledWith(
        expect.any(Object),
        LEDGER_REPO_ID,
      );
      expect(plaidClient.removeItem).toHaveBeenCalledTimes(2);
      expect(plaidClient.removeItem).toHaveBeenCalledWith(
        "decrypted-access-token",
      );
      expect(models.plaidItem.deleteByLedgerRepoId).toHaveBeenCalledWith(
        expect.any(Object),
        LEDGER_REPO_ID,
      );
      expect(result.ledgerId).toBe(ledgerId);
    });

    it("should tolerate a Plaid removeItem failure and still complete the deletion", async () => {
      mockGetLedgerSuccess();
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: true },
      });
      models.plaidItem.getByLedgerRepoId.mockResolvedValue([
        { id: "pitm_1", accessToken: "enc-1" },
        { id: "pitm_2", accessToken: "enc-2" },
      ]);
      plaidClient.removeItem
        .mockRejectedValueOnce(new Error("already removed"))
        .mockResolvedValueOnce(undefined);

      const result = await workflow.deleteLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(models.plaidItem.deleteByLedgerRepoId).toHaveBeenCalledWith(
        expect.any(Object),
        LEDGER_REPO_ID,
      );
      expect(result.ledgerId).toBe(ledgerId);
    });

    it("should short-circuit cleanly when there are no Plaid items for the ledger", async () => {
      mockGetLedgerSuccess();
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: true },
      });
      models.plaidItem.getByLedgerRepoId.mockResolvedValue([]);

      const result = await workflow.deleteLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(plaidClient.removeItem).not.toHaveBeenCalled();
      expect(models.plaidItem.deleteByLedgerRepoId).toHaveBeenCalledWith(
        expect.any(Object),
        LEDGER_REPO_ID,
      );
      expect(result.ledgerId).toBe(ledgerId);
    });

    it("should skip Plaid cleanup but still delete the Gitea repo when ledgerRepoId cannot be resolved", async () => {
      mockFavaApiClient.ledgers.getLedger.mockResolvedValue({
        data: { success: false },
      });
      mockFavaApiClient.ledgers.deleteLedger.mockResolvedValue({
        data: { success: true },
      });

      const result = await workflow.deleteLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(models.plaidItem.getByLedgerRepoId).not.toHaveBeenCalled();
      expect(models.plaidItem.deleteByLedgerRepoId).not.toHaveBeenCalled();
      expect(mockFavaApiClient.ledgers.deleteLedger).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
      expect(result.ledgerId).toBe(ledgerId);
    });
  });

  describe("listLedgers", () => {
    it("should return list of ledgers", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              id: 1,
              name: "ledger-1",
              full_name: "testuser/ledger-1",
              description: "First ledger",
              private: false,
              empty: false,
              size: 1024,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-02T00:00:00Z",
            },
            {
              id: 2,
              name: "ledger-2",
              full_name: "testuser/ledger-2",
              description: "Second ledger",
              private: true,
              empty: true,
              size: 0,
              created_at: "2024-01-03T00:00:00Z",
              updated_at: "2024-01-03T00:00:00Z",
            },
          ],
        },
      });

      const result = await workflow.listLedgers({
        userId: USER_ID,
        args: { page: 1, limit: 10 },
      });

      expect(mockFavaApiClient.ledgers.listLedgers).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("testuser/ledger-1");
      expect(result[1].id).toBe("testuser/ledger-2");
    });

    it("should throw error when list fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.listLedgers({ userId: USER_ID, args: {} }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("listUserOwnedLedgers", () => {
    it("should return list of user owned ledgers", async () => {
      mockFavaApiClient.ledgers.listUserLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              id: 1,
              name: "my-ledger",
              full_name: "testuser/my-ledger",
              description: "My personal ledger",
              private: false,
              empty: false,
              size: 2048,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-02T00:00:00Z",
            },
          ],
        },
      });

      const result = await workflow.listUserOwnedLedgers({
        userId: USER_ID,
        args: { page: 1, limit: 10 },
      });

      expect(mockFavaApiClient.ledgers.listUserLedgers).toHaveBeenCalledWith(
        "testuser",
        { page: 1, limit: 10 },
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("testuser/my-ledger");
    });

    it("should throw error when list user ledgers fails", async () => {
      mockFavaApiClient.ledgers.listUserLedgers.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.listUserOwnedLedgers({ userId: USER_ID, args: {} }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("listUserOwnedLedgersWithDirectiveCounts", () => {
    it("sums directive counts, skips empty ledgers, and nulls out failed ones", async () => {
      mockFavaApiClient.ledgers.listUserLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              id: 1,
              name: "active-ledger",
              full_name: "testuser/active-ledger",
              description: null,
              private: true,
              empty: false,
              size: 2048,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-02T00:00:00Z",
            },
            {
              id: 2,
              name: "empty-ledger",
              full_name: "testuser/empty-ledger",
              description: null,
              private: false,
              empty: true,
              size: 0,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-02T00:00:00Z",
            },
            {
              id: 3,
              name: "broken-ledger",
              full_name: "testuser/broken-ledger",
              description: null,
              private: false,
              empty: false,
              size: 512,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-02T00:00:00Z",
            },
          ],
        },
      });

      ledgerDataService.getEntriesCountPerType.mockImplementation(
        ({ ledgerId }: { ledgerId: string }) => {
          if (ledgerId === "testuser/active-ledger") {
            return Promise.resolve([
              { type: "Transaction", number: 40 },
              { type: "Open", number: 2 },
            ]);
          }
          return Promise.reject(new Error("fava parse error"));
        },
      );

      const result = await workflow.listUserOwnedLedgersWithDirectiveCounts({
        userId: USER_ID,
      });

      expect(ledgerDataService.getEntriesCountPerType).toHaveBeenCalledTimes(2);
      expect(ledgerDataService.getEntriesCountPerType).not.toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId: "testuser/empty-ledger" }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: "testuser/active-ledger",
          empty: false,
          directiveCount: 42,
        }),
        expect.objectContaining({
          id: "testuser/empty-ledger",
          empty: true,
          directiveCount: 0,
        }),
        expect.objectContaining({
          id: "testuser/broken-ledger",
          empty: false,
          directiveCount: null,
        }),
      ]);
    });
  });

  describe("searchLedgers", () => {
    it("should return search results", async () => {
      mockFavaApiClient.ledgers.searchLedgers.mockResolvedValue({
        data: {
          success: true,
          data: {
            data: [
              {
                id: 1,
                name: "matching-ledger",
                full_name: "testuser/matching-ledger",
                description: "Matching description",
                private: false,
                empty: false,
                size: 1024,
                created_at: "2024-01-01T00:00:00Z",
                updated_at: "2024-01-02T00:00:00Z",
              },
            ],
          },
        },
      });

      const result = await workflow.searchLedgers({
        userId: USER_ID,
        args: { q: "matching", page: 1, limit: 10 },
      });

      expect(mockFavaApiClient.ledgers.searchLedgers).toHaveBeenCalledWith({
        q: "matching",
        page: 1,
        limit: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("testuser/matching-ledger");
    });

    it("should return empty array when no data found", async () => {
      mockFavaApiClient.ledgers.searchLedgers.mockResolvedValue({
        data: { success: true, data: { data: null } },
      });

      const result = await workflow.searchLedgers({
        userId: USER_ID,
        args: { q: "nomatch" },
      });

      expect(result).toEqual([]);
    });

    it("should throw error when search fails", async () => {
      mockFavaApiClient.ledgers.searchLedgers.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.searchLedgers({ userId: USER_ID, args: { q: "test" } }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedger", () => {
    const ledgerId = "testuser/test-ledger";

    it("should return a single ledger", async () => {
      mockFavaApiClient.ledgers.getLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 1,
            name: "test-ledger",
            full_name: "testuser/test-ledger",
            description: "Test description",
            private: false,
            empty: false,
            size: 2048,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
          },
        },
      });

      const result = await workflow.getLedger({ ledgerId, userId: USER_ID });

      expect(mockFavaApiClient.ledgers.getLedger).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
      expect(result.id).toBe(ledgerId);
      expect(result.name).toBe("test-ledger");
    });

    it("should throw error when get fails", async () => {
      mockFavaApiClient.ledgers.getLedger.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedger({ ledgerId, userId: USER_ID }),
      ).rejects.toThrow(InternalServerError);
    });

    it("should strip permissions when no userId provided", async () => {
      mockFavaApiClient.ledgers.getLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 1,
            name: "test-ledger",
            full_name: "testuser/test-ledger",
            description: null,
            private: false,
            empty: false,
            size: 1024,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            permissions: { admin: true, pull: true, push: true },
          },
        },
      });

      const result = await workflow.getLedger({ ledgerId });

      expect(result.permissions).toBeUndefined();
    });
  });

  describe("createLedgerFile", () => {
    const ledgerId = "testuser/test-ledger";

    it("should create a new ledger file", async () => {
      mockFavaApiClient.ledgers.createLedgerFile.mockResolvedValue({
        data: {
          success: true,
          data: {
            path: "accounts.bean",
            content: "; Accounts file\n",
            sha: "abc123",
            encoding: "base64",
          },
        },
      });

      const result = await workflow.createLedgerFile({
        userId: USER_ID,
        ledgerId,
        input: {
          path: "accounts.bean",
          content: "; Accounts file\n",
          message: "Add accounts file",
        },
        platform: "web",
      });

      expect(mockFavaApiClient.ledgers.createLedgerFile).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        {
          path: "accounts.bean",
          content: "; Accounts file\n",
          message: "Add accounts file",
        },
        // Web writes carry no exemption; a mobile write would pass the
        // x-directive-limit-exempt header here instead.
        {},
      );
      expect(result.path).toBe("accounts.bean");
    });

    it("should throw error when create file fails", async () => {
      mockFavaApiClient.ledgers.createLedgerFile.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.createLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { path: "test.bean", content: "test" },
          platform: "web",
        }),
      ).rejects.toThrow(OperationNotAllowedError);
    });
  });

  describe("updateLedgerFile", () => {
    const ledgerId = "testuser/test-ledger";

    it("should update an existing ledger file", async () => {
      mockFavaApiClient.ledgers.updateLedgerFile.mockResolvedValue({
        data: {
          success: true,
          data: {
            path: "accounts.bean",
            content: "; Updated accounts file\n",
            sha: "def456",
            encoding: "base64",
          },
        },
      });

      const result = await workflow.updateLedgerFile({
        userId: USER_ID,
        ledgerId,
        input: {
          path: "accounts.bean",
          content: "; Updated accounts file\n",
          sha: "abc123",
          message: "Update accounts",
        },
        platform: "web",
      });

      expect(mockFavaApiClient.ledgers.updateLedgerFile).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        {
          path: "accounts.bean",
          content: "; Updated accounts file\n",
          sha: "abc123",
          message: "Update accounts",
        },
        {},
      );
      expect(result.path).toBe("accounts.bean");
      expect(result.sha).toBe("def456");
    });

    it("should throw error when update file fails", async () => {
      mockFavaApiClient.ledgers.updateLedgerFile.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.updateLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { path: "test.bean", content: "test", sha: "abc123" },
          platform: "web",
        }),
      ).rejects.toThrow(OperationNotAllowedError);
    });
  });

  describe("deleteLedgerFile", () => {
    const ledgerId = "testuser/test-ledger";

    it("should delete a ledger file", async () => {
      mockFavaApiClient.ledgers.deleteLedgerFile.mockResolvedValue({
        data: { success: true },
      });

      const result = await workflow.deleteLedgerFile({
        userId: USER_ID,
        ledgerId,
        input: {
          path: "accounts.bean",
          sha: "abc123",
          message: "Delete accounts",
        },
      });

      expect(mockFavaApiClient.ledgers.deleteLedgerFile).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        { path: "accounts.bean", sha: "abc123", message: "Delete accounts" },
      );
      expect(result.path).toBe("accounts.bean");
    });

    it("should throw error when path is empty", async () => {
      await expect(
        workflow.deleteLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { path: "", sha: "abc123" },
        }),
      ).rejects.toThrow(BadUserInputError);
    });

    it("should throw error when trying to delete main.bean", async () => {
      await expect(
        workflow.deleteLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { path: "main.bean", sha: "abc123" },
        }),
      ).rejects.toThrow(BadUserInputError);
    });

    it("should throw error when delete file fails", async () => {
      mockFavaApiClient.ledgers.deleteLedgerFile.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.deleteLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { path: "test.bean", sha: "abc123" },
        }),
      ).rejects.toThrow(OperationNotAllowedError);
    });
  });

  describe("getLedgerFile", () => {
    const ledgerId = "testuser/test-ledger";

    it("should get file content", async () => {
      mockFavaApiClient.ledgers.getLedgerFile.mockResolvedValue({
        data: {
          success: true,
          data: {
            path: "main.bean",
            content: "2024-01-01 * Opening\n",
            sha: "abc123",
            encoding: "base64",
          },
        },
      });

      const result = await workflow.getLedgerFile({
        ledgerId,
        userId: USER_ID,
        args: { path: "main.bean" },
      });

      expect(mockFavaApiClient.ledgers.getLedgerFile).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        { path: "main.bean" },
      );
      expect(result?.path).toBe("main.bean");
      expect(result?.content).toBe("2024-01-01 * Opening\n");
    });

    it("should throw error when get file fails", async () => {
      mockFavaApiClient.ledgers.getLedgerFile.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedgerFile({
          ledgerId,
          userId: USER_ID,
          args: { path: "test.bean" },
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it("rejects traversal before provisioning a ledger client", async () => {
      await expect(
        workflow.getLedgerFile({
          ledgerId,
          userId: USER_ID,
          args: { path: "../../private/main.bean" },
        }),
      ).rejects.toThrow(BadUserInputError);
      expect(favaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
    });
  });

  describe("getLedgerDirContent", () => {
    const ledgerId = "testuser/test-ledger";

    it("should get directory content", async () => {
      mockFavaApiClient.ledgers.getLedgerDirContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            { path: "main.bean", content: null, sha: "abc123", encoding: null },
            {
              path: "accounts.bean",
              content: null,
              sha: "def456",
              encoding: null,
            },
          ],
        },
      });

      const result = await workflow.getLedgerDirContent({
        ledgerId,
        userId: USER_ID,
        args: { dirPath: "reports" },
      });

      expect(
        mockFavaApiClient.ledgers.getLedgerDirContent,
      ).toHaveBeenCalledWith("testuser", "test-ledger", {
        dir_path: "reports",
      });
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("main.bean");
      expect(result[1].path).toBe("accounts.bean");
    });

    it("should throw error when get dir content fails", async () => {
      mockFavaApiClient.ledgers.getLedgerDirContent.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedgerDirContent({ ledgerId, userId: USER_ID, args: {} }),
      ).rejects.toThrow(InternalServerError);
    });

    it("rejects a traversal directory before provisioning a ledger client", async () => {
      await expect(
        workflow.getLedgerDirContent({
          ledgerId,
          userId: USER_ID,
          args: { dirPath: "../private" },
        }),
      ).rejects.toThrow(BadUserInputError);
      expect(favaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
    });
  });

  describe("renameLedgerFile", () => {
    const ledgerId = "testuser/test-ledger";

    it("should rename a ledger file", async () => {
      mockFavaApiClient.ledgers.changeLedgerFiles.mockResolvedValue({
        data: { success: true },
      });

      const result = await workflow.renameLedgerFile({
        userId: USER_ID,
        ledgerId,
        input: {
          oldPath: "old.bean",
          newPath: "new.bean",
          message: "Rename file",
        },
      });

      expect(mockFavaApiClient.ledgers.changeLedgerFiles).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        {
          files: [
            { operation: "create", path: "new.bean", from_path: "old.bean" },
          ],
          message: "Rename file",
        },
      );
      expect(result.oldPath).toBe("old.bean");
      expect(result.newPath).toBe("new.bean");
    });

    it("should throw error when rename fails", async () => {
      mockFavaApiClient.ledgers.changeLedgerFiles.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.renameLedgerFile({
          userId: USER_ID,
          ledgerId,
          input: { oldPath: "old.bean", newPath: "new.bean" },
        }),
      ).rejects.toThrow(OperationNotAllowedError);
    });
  });

  describe("getLedgerAttributes", () => {
    const ledgerId = "testuser/test-ledger";

    it("should return ledger attributes", async () => {
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: {
          success: true,
          data: {
            accounts: ["Assets:Bank", "Expenses:Food"],
            tags: ["tag1", "tag2"],
            years: [2023, 2024],
            links: ["link1"],
            payees: ["Payee1", "Payee2"],
            currencies: ["USD", "EUR"],
          },
        },
      });

      const result = await workflow.getLedgerAttributes({
        ledgerId,
        userId: USER_ID,
      });

      expect(
        mockFavaApiClient.reports.getLedgerAttributes,
      ).toHaveBeenCalledWith("testuser", "test-ledger");
      expect(result.accounts).toEqual(["Assets:Bank", "Expenses:Food"]);
      expect(result.tags).toEqual(["tag1", "tag2"]);
      expect(result.years).toEqual([2023, 2024]);
    });

    it("should throw error when get attributes fails", async () => {
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedgerAttributes({ ledgerId, userId: USER_ID }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerOptions", () => {
    const ledgerId = "testuser/test-ledger";

    it("should return ledger options", async () => {
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            title: "My Ledger",
            name_assets: "Assets",
            name_equity: "Equity",
            name_expenses: "Expenses",
            name_income: "Income",
            name_liabilities: "Liabilities",
            account_current_conversions: "Equity:Conversions:Current",
            account_current_earnings: "Equity:Earnings:Current",
            render_commas: false,
            operating_currency: ["USD"],
          },
        },
      });

      const result = await workflow.getLedgerOptions({
        ledgerId,
        userId: USER_ID,
      });

      expect(mockFavaApiClient.reports.getLedgerOptions).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
      expect(result.title).toBe("My Ledger");
      expect(result.nameAssets).toBe("Assets");
      expect(result.renderCommas).toBe(false);
      expect(result.operatingCurrency).toEqual(["USD"]);
    });

    it("should throw error when get options fails", async () => {
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedgerOptions({ ledgerId, userId: USER_ID }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerFavaOptions", () => {
    const ledgerId = "testuser/test-ledger";

    it("should map fava options from snake_case to camelCase", async () => {
      mockFavaApiClient.reports.getLedgerFavaOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            account_journal_include_children: true,
            auto_reload: false,
            collapse_pattern: ["^Assets:.*:.*$"],
            conversion_currencies: ["USD", "EUR"],
            currency_column: 61,
            default_page: "income_statement/",
            fiscal_year_end: { month: 12, day: 31 },
            indent: 2,
            invert_income_liabilities_equity: false,
            language: "en",
            locale: "en_US",
            show_accounts_with_zero_balance: true,
            show_accounts_with_zero_transactions: true,
            show_closed_accounts: false,
            sidebar_show_queries: 5,
            unrealized: "Unrealized",
            upcoming_events: 7,
            uptodate_indicator_grey_lookback_days: 60,
            use_external_editor: false,
          },
        },
      });

      const result = await workflow.getLedgerFavaOptions({
        ledgerId,
        userId: USER_ID,
      });

      expect(
        mockFavaApiClient.reports.getLedgerFavaOptions,
      ).toHaveBeenCalledWith("testuser", "test-ledger");
      expect(result.accountJournalIncludeChildren).toBe(true);
      expect(result.collapsePattern).toEqual(["^Assets:.*:.*$"]);
      expect(result.fiscalYearEnd).toEqual({ month: 12, day: 31 });
      expect(result.language).toBe("en");
      expect(result.locale).toBe("en_US");
    });

    it("should handle null language and locale", async () => {
      mockFavaApiClient.reports.getLedgerFavaOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            account_journal_include_children: true,
            auto_reload: false,
            collapse_pattern: [],
            conversion_currencies: [],
            currency_column: 61,
            default_page: "income_statement/",
            fiscal_year_end: { month: 12, day: 31 },
            indent: 2,
            invert_income_liabilities_equity: false,
            language: null,
            locale: null,
            show_accounts_with_zero_balance: true,
            show_accounts_with_zero_transactions: true,
            show_closed_accounts: false,
            sidebar_show_queries: 5,
            unrealized: "Unrealized",
            upcoming_events: 7,
            uptodate_indicator_grey_lookback_days: 60,
            use_external_editor: false,
          },
        },
      });

      const result = await workflow.getLedgerFavaOptions({
        ledgerId,
        userId: USER_ID,
      });

      expect(result.language).toBeNull();
      expect(result.locale).toBeNull();
    });

    it("should throw error when get fava options fails", async () => {
      mockFavaApiClient.reports.getLedgerFavaOptions.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        workflow.getLedgerFavaOptions({ ledgerId, userId: USER_ID }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("starLedger", () => {
    const ledgerId = "testuser/test-ledger";

    it("should star a ledger successfully", async () => {
      const giteaClient = {
        user: {
          userCurrentPutStar: jest.fn().mockResolvedValue({ status: 204 }),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.starLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(giteaClient.user.userCurrentPutStar).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        { format: "json" },
      );
      expect(result.success).toBe(true);
      expect(result.isStarred).toBe(true);
    });

    it("should return failure when starring throws an error", async () => {
      const giteaClient = {
        user: {
          userCurrentPutStar: jest
            .fn()
            .mockRejectedValue(new Error("Network error")),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.starLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(result.success).toBe(false);
      expect(result.isStarred).toBe(false);
    });

    it("does not provision a Gitea writer when authorization denies", async () => {
      authorization.authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(
        workflow.starLedger({ identity: IDENTITY, ledgerId }),
      ).rejects.toThrow("denied");
      expect(giteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
    });

    it("preserves the failure response for an invalid ledger id", async () => {
      await expect(
        workflow.starLedger({ identity: IDENTITY, ledgerId: "invalid" }),
      ).resolves.toEqual({
        success: false,
        isStarred: false,
        message: "Failed to star ledger",
      });
      expect(authorization.authorizeOrThrow).not.toHaveBeenCalled();
      expect(giteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
    });
  });

  describe("unstarLedger", () => {
    const ledgerId = "testuser/test-ledger";

    it("should unstar a ledger successfully", async () => {
      const giteaClient = {
        user: {
          userCurrentDeleteStar: jest.fn().mockResolvedValue({ status: 204 }),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.unstarLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(giteaClient.user.userCurrentDeleteStar).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        { format: "json" },
      );
      expect(result.success).toBe(true);
      expect(result.isStarred).toBe(false);
    });

    it("should return failure when unstarring throws an error", async () => {
      const giteaClient = {
        user: {
          userCurrentDeleteStar: jest
            .fn()
            .mockRejectedValue(new Error("Network error")),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.unstarLedger({
        identity: IDENTITY,
        ledgerId,
      });

      expect(result.success).toBe(false);
      expect(result.isStarred).toBe(true);
    });
  });

  describe("isLedgerStarred", () => {
    const mockLedger: Ledger = {
      id: "testuser/test-ledger",
      name: "test-ledger",
      fullName: "testuser/test-ledger",
      description: "Test ledger",
      private: false,
    } as unknown as Ledger;

    it("should return true when ledger is starred (204)", async () => {
      const giteaClient = {
        user: {
          userCurrentCheckStarring: jest
            .fn()
            .mockResolvedValue({ status: 204 }),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.isLedgerStarred({
        ledgerId: mockLedger.id,
        identity: IDENTITY,
      });

      expect(result).toBe(true);
      expect(giteaClient.user.userCurrentCheckStarring).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        { format: "json" },
      );
    });

    it("should return false when ledger is not starred (404)", async () => {
      const giteaClient = {
        user: {
          userCurrentCheckStarring: jest
            .fn()
            .mockResolvedValue({ status: 404 }),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.isLedgerStarred({
        ledgerId: mockLedger.id,
        identity: IDENTITY,
      });

      expect(result).toBe(false);
    });

    it("should return undefined when user is not authenticated", async () => {
      const result = await workflow.isLedgerStarred({
        ledgerId: mockLedger.id,
        identity: undefined,
      });

      expect(result).toBeUndefined();
      expect(giteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
    });

    it("should return false when gitea client throws an error", async () => {
      const giteaClient = {
        user: {
          userCurrentCheckStarring: jest
            .fn()
            .mockRejectedValue(new Error("Not found")),
        },
      };
      giteaClientFactory.getUserApiClient.mockResolvedValue(giteaClient);

      const result = await workflow.isLedgerStarred({
        ledgerId: mockLedger.id,
        identity: IDENTITY,
      });

      expect(result).toBe(false);
    });

    it("preserves false for an invalid ledger id without source work", async () => {
      await expect(
        workflow.isLedgerStarred({
          ledgerId: "invalid",
          identity: IDENTITY,
        }),
      ).resolves.toBe(false);
      expect(authorization.authorizeOrThrow).not.toHaveBeenCalled();
      expect(giteaClientFactory.getUserApiClient).not.toHaveBeenCalled();
    });
  });
});
