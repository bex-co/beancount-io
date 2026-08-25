import "reflect-metadata";
import { createLedger, CreateLedgerParams } from "../create-ledger";
import { AppConfig } from "@/config/config";
import { FavaApiError, LedgerCreate } from "@/foundation/fava";
import { getUserTier } from "@/features/stripe/operations/get-user-tier";
import { SubscriptionTier } from "@/features/stripe/service/stripe";
import {
  ConflictError,
  NotFoundError,
  ResourceLimitReachedError,
  ServiceUnavailableError,
  UnauthenticatedError,
} from "@/shared/errors";

// Mock the cross-service tier operation; the pure getTierLimits runs for real.
jest.mock("@/features/stripe/operations/get-user-tier");

const mockGetUserTier = getUserTier as jest.Mock;

describe("createLedger operation", () => {
  let deps: Omit<CreateLedgerParams, "ledgerCreate" | "userId">;
  let mockFavaApiClient: {
    ledgers: {
      createLedger: jest.Mock;
      listLedgers: jest.Mock;
    };
  };
  let mockUserModel: { getById: jest.Mock };
  const userId = "user-123";

  const createValidLedgerInput = (): LedgerCreate => ({
    name: "New Ledger",
    description: "Test ledger",
    private: false,
    files: {},
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: FREE tier (maxLedgers: 1 via real getTierLimits)
    mockGetUserTier.mockResolvedValue(SubscriptionTier.FREE);

    mockFavaApiClient = {
      ledgers: {
        createLedger: jest.fn(),
        listLedgers: jest.fn(),
      },
    };

    mockUserModel = {
      getById: jest.fn().mockResolvedValue({
        _id: "user-123",
        ledger_username: "testuser",
        ledger_password: "test-password",
      }),
    };

    deps = {
      favaApiClient: mockFavaApiClient as any,
      models: { user: mockUserModel } as any,
      postgresDb: {} as any,
      stripe: {} as any,
      config: {
        gitea: {
          hostname: "gitea.example.com",
          httpPort: 3000,
          sshPort: 2222,
        },
      } as unknown as AppConfig,
    };
  });

  describe("createLedger", () => {
    it("should create ledger successfully when under tier limit", async () => {
      const mockCreatedLedger = {
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
            permissions: {
              admin: true,
              pull: true,
              push: true,
            },
          },
        },
      };

      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockResolvedValue(
        mockCreatedLedger,
      );

      const input = createValidLedgerInput();
      const result = await createLedger({
        ...deps,
        ledgerCreate: input,
        userId,
      });

      expect(result.name).toBe("new-ledger");
      expect(result.fullName).toBe("testuser/new-ledger");
      expect(result.description).toBe("Test ledger");
      expect(mockFavaApiClient.ledgers.createLedger).toHaveBeenCalledWith(
        input,
      );
    });

    it("should throw error when list ledgers fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: false, data: null },
      });

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(ServiceUnavailableError);
    });

    it("should preserve an authentication failure while listing ledgers", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockRejectedValue(
        new FavaApiError("Missing authorization header", 401, {
          success: false,
          error: "Missing authorization header",
        }),
      );

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(UnauthenticatedError);
    });

    it("should throw error when user not found", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockUserModel.getById.mockResolvedValue(null);

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(NotFoundError);
      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(/User.*not found/);
    });

    it("should throw error when tier limit is exceeded", async () => {
      // FREE tier allows 1 ledger; user already has 1
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [{ name: "existing-ledger", full_name: "testuser/existing" }],
        },
      });

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(ResourceLimitReachedError);
    });

    it("should throw error when create ledger API fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockResolvedValue({
        data: { success: false, data: null },
      });

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toThrow(ServiceUnavailableError);
    });

    it("should translate a duplicate ledger name into a structured conflict", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockRejectedValue(
        new FavaApiError(
          "A ledger with the name 'existing-ledger' already exists.",
          400,
          {
            success: false,
            error:
              "A ledger with the name 'existing-ledger' already exists. Please choose a different name.",
          },
        ),
      );

      try {
        await createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictError);
        const conflict = error as ConflictError;
        expect(conflict.category).toBe("CONFLICT");
        expect(conflict.metadata).toEqual({
          resource: "Ledger",
          reason: "Name already exists",
          reasonCode: "LEDGER_NAME_ALREADY_EXISTS",
          field: "name",
        });
      }
    });

    it("should recognize the ledger service's machine-readable duplicate code", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });
      mockFavaApiClient.ledgers.createLedger.mockRejectedValue(
        new FavaApiError("Ledger name conflict", 400, {
          success: false,
          error: "Ledger name conflict",
          code: "ledger_name_already_exists",
        }),
      );

      await expect(
        createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        }),
      ).rejects.toMatchObject({
        category: "CONFLICT",
        metadata: {
          reasonCode: "LEDGER_NAME_ALREADY_EXISTS",
          field: "name",
        },
      });
    });

    it("should correctly filter user's own ledgers from all ledgers", async () => {
      // GROWTH tier (maxLedgers: 20) so 1 own ledger is under the limit
      mockGetUserTier.mockResolvedValue(SubscriptionTier.GROWTH);

      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [
            { name: "ledger1", full_name: "testuser/ledger1" },
            { name: "ledger2", full_name: "otheruser/ledger2" },
          ],
        },
      });
      mockFavaApiClient.ledgers.createLedger.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 2,
            name: "new-ledger",
            full_name: "testuser/new-ledger",
            description: "Test ledger",
            private: false,
            empty: true,
            size: 0,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            permissions: { admin: true, pull: true, push: true },
          },
        },
      });

      // Succeeds because user only has 1 own ledger (not 2)
      await createLedger({
        ...deps,
        ledgerCreate: createValidLedgerInput(),
        userId,
      });

      expect(mockFavaApiClient.ledgers.createLedger).toHaveBeenCalled();
    });

    it("should throw resource limit error with correct metadata", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [{ name: "existing-ledger", full_name: "testuser/existing" }],
        },
      });

      try {
        await createLedger({
          ...deps,
          ledgerCreate: createValidLedgerInput(),
          userId,
        });
        fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResourceLimitReachedError);

        const domainError = error as ResourceLimitReachedError;
        expect(domainError.metadata).toEqual({
          resource: "Ledger",
          limit: 1,
          current: 1,
        });
        expect(domainError.category).toBe("RESOURCE_LIMIT_REACHED");
      }
    });
  });
});
