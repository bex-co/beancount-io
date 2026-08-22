import "reflect-metadata";
import { AccountResolver } from "../account-resolver";
import { IContext } from "@/server/graphql/context";
import type { IAccountService } from "@/features/auth/service/account-service";
import { UnauthenticatedError } from "@/shared/errors";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { User } from "@/features/auth/data/user-model";

describe("AccountResolver", () => {
  let resolver: AccountResolver;
  let mockContext: IContext;
  let mockAccountService: jest.Mocked<IAccountService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccountService = {
      getUserProfile: jest.fn(),
      deleteAccount: jest.fn(),
      updateUsername: jest.fn(),
      updateProfile: jest.fn(),
      findUsersByEmailOrUsername: jest.fn(),
    } as unknown as jest.Mocked<IAccountService>;

    mockContext = {
      userId: "user-123",
      token: "mock-token",
      reqHeaders: {
        "x-forwarded-for": "127.0.0.1",
      },
      config: { env: "development" },
      koaCtx: {
        cookies: { set: jest.fn(), get: jest.fn() },
        URL: new URL("http://localhost:4104"),
      } as any,
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
    } as unknown as IContext;

    resolver = new AccountResolver(mockAccountService);
  });

  describe("userProfile", () => {
    it("should return user profile for authenticated user", async () => {
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        emailReportStatus: ReportStatus.OFF,
        username: "johndoe",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      };

      mockAccountService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await resolver.userProfile({}, mockContext);

      expect(result).toEqual(mockProfile);
      expect(mockAccountService.getUserProfile).toHaveBeenCalledWith(
        "user-123",
      );
    });

    it("should return null if user not found", async () => {
      mockAccountService.getUserProfile.mockResolvedValue(null);

      const result = await resolver.userProfile({}, mockContext);

      expect(result).toBeNull();
    });

    it("should throw error if userId does not match context userId", async () => {
      await expect(
        resolver.userProfile({ userId: "other-user" }, mockContext),
      ).rejects.toThrow(UnauthenticatedError);
      await expect(
        resolver.userProfile({ userId: "other-user" }, mockContext),
      ).rejects.toThrow("Not authorized user");
    });

    it("should return null if userId is empty", async () => {
      mockContext.userId = "";

      const result = await resolver.userProfile({}, mockContext);

      expect(result).toBeNull();
    });

    it("should allow querying own profile with explicit userId", async () => {
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        emailReportStatus: ReportStatus.OFF,
        username: "johndoe",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      };

      mockAccountService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await resolver.userProfile(
        { userId: "user-123" },
        mockContext,
      );

      expect(result).toEqual(mockProfile);
    });
  });

  describe("deleteAccount", () => {
    it("should delete user account", async () => {
      mockAccountService.deleteAccount.mockResolvedValue(true);

      const result = await resolver.deleteAccount(mockContext);

      expect(result).toBe(true);
      expect(mockAccountService.deleteAccount).toHaveBeenCalledWith("user-123");
    });

    it("should return false if delete fails", async () => {
      mockAccountService.deleteAccount.mockResolvedValue(false);

      const result = await resolver.deleteAccount(mockContext);

      expect(result).toBe(false);
    });
  });

  describe("getUserByExactMatch", () => {
    it("should get users by exact keyword match", async () => {
      const args = { keyword: "john@example.com" };
      const mockUsers = [
        { id: "user-1", email: "john@example.com", ledger_username: "john" },
      ];

      mockAccountService.findUsersByEmailOrUsername.mockResolvedValue(
        mockUsers as unknown as User[],
      );

      const result = await resolver.getUserByExactMatch(mockContext, args);

      expect(result).toEqual([{ email: "john@example.com", username: "john" }]);
      expect(
        mockAccountService.findUsersByEmailOrUsername,
      ).toHaveBeenCalledWith("john@example.com", "user-123");
    });

    it("should return empty array if no exact match found", async () => {
      const args = { keyword: "nonexistent@example.com" };

      mockAccountService.findUsersByEmailOrUsername.mockResolvedValue([]);

      const result = await resolver.getUserByExactMatch(mockContext, args);

      expect(result).toEqual([]);
    });

    it("should include current user when includeCurrentUser is true", async () => {
      const args = { keyword: "john@example.com", includeCurrentUser: true };
      const mockUsers = [
        {
          id: "user-1",
          email: "john@example.com",
          ledger_username: "testuser",
        },
      ];

      mockAccountService.findUsersByEmailOrUsername.mockResolvedValue(
        mockUsers as unknown as User[],
      );

      const result = await resolver.getUserByExactMatch(mockContext, args);

      expect(result).toEqual([
        { email: "john@example.com", username: "testuser" },
      ]);
      // excludeUserId is undefined when includeCurrentUser is true
      expect(
        mockAccountService.findUsersByEmailOrUsername,
      ).toHaveBeenCalledWith("john@example.com", undefined);
    });

    it("should exclude current user when includeCurrentUser is not set", async () => {
      const args = { keyword: "john@example.com" };
      const mockUsers = [
        {
          id: "user-2",
          email: "jane@example.com",
          ledger_username: "janeuser",
        },
      ];

      mockAccountService.findUsersByEmailOrUsername.mockResolvedValue(
        mockUsers as unknown as User[],
      );

      const result = await resolver.getUserByExactMatch(mockContext, args);

      expect(result).toEqual([
        { email: "jane@example.com", username: "janeuser" },
      ]);
      expect(
        mockAccountService.findUsersByEmailOrUsername,
      ).toHaveBeenCalledWith("john@example.com", "user-123");
    });

    it("should apply rate limiting and throw error when exceeded", async () => {
      const rateLimitTestContext = {
        ...mockContext,
        userId: "rate-limit-test-user-unique-id-2",
        getCurrentUserId: jest
          .fn()
          .mockReturnValue("rate-limit-test-user-unique-id-2"),
      };
      const args = { keyword: "test@example.com" };

      mockAccountService.findUsersByEmailOrUsername.mockResolvedValue([]);

      for (let i = 0; i < 20; i += 1) {
        await resolver.getUserByExactMatch(rateLimitTestContext, args);
      }

      await expect(
        resolver.getUserByExactMatch(rateLimitTestContext, args),
      ).rejects.toThrow("Too many user lookup requests");
    });
  });

  describe("updateUsername", () => {
    it("should update username and return updated profile", async () => {
      const args = { username: "newusername" };
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        emailReportStatus: ReportStatus.OFF,
        username: "newusername",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      };

      mockAccountService.updateUsername.mockResolvedValue(undefined);
      mockAccountService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await resolver.updateUsername(mockContext, args);

      expect(result).toEqual(mockProfile);
      expect(mockAccountService.updateUsername).toHaveBeenCalledWith(
        "user-123",
        "newusername",
      );
      expect(mockAccountService.getUserProfile).toHaveBeenCalledWith(
        "user-123",
      );
    });

    it("should return null if user not found after update", async () => {
      const args = { username: "newusername" };

      mockAccountService.updateUsername.mockResolvedValue(undefined);
      mockAccountService.getUserProfile.mockResolvedValue(null);

      const result = await resolver.updateUsername(mockContext, args);

      expect(result).toBeNull();
    });
  });

  describe("updateProfile", () => {
    it("should update profile and return updated user", async () => {
      const args = { firstName: "John", lastName: "Doe" };
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        locale: "en",
        firstName: "John",
        lastName: "Doe",
        emailReportStatus: ReportStatus.OFF,
        username: "johndoe",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      };

      mockAccountService.updateProfile.mockResolvedValue(true);
      mockAccountService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await resolver.updateProfile(mockContext, args);

      expect(result).toEqual(mockProfile);
      expect(mockAccountService.updateProfile).toHaveBeenCalledWith(
        "user-123",
        "John",
        "Doe",
      );
      expect(mockAccountService.getUserProfile).toHaveBeenCalledWith(
        "user-123",
      );
    });

    it("should handle null firstName and lastName", async () => {
      const args = { firstName: null, lastName: null };
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        locale: "en",
        firstName: "",
        lastName: "",
        emailReportStatus: ReportStatus.OFF,
        username: "johndoe",
        tier: "FREE",
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 1,
          maxDirectives: 1000,
        },
        hasEverSubscribed: false,
      };

      mockAccountService.updateProfile.mockResolvedValue(true);
      mockAccountService.getUserProfile.mockResolvedValue(mockProfile);

      const result = await resolver.updateProfile(mockContext, args);

      expect(result).toEqual(mockProfile);
      expect(mockAccountService.updateProfile).toHaveBeenCalledWith(
        "user-123",
        "",
        "",
      );
    });

    it("should return null if user not found after update", async () => {
      const args = { firstName: "John", lastName: "Doe" };

      mockAccountService.updateProfile.mockResolvedValue(true);
      mockAccountService.getUserProfile.mockResolvedValue(null);

      const result = await resolver.updateProfile(mockContext, args);

      expect(result).toBeNull();
    });
  });
});
