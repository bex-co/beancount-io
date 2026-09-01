import "reflect-metadata";
import { validate } from "class-validator";
import { graphql } from "graphql";
import { buildSchema, registerEnumType } from "type-graphql";
import { AccountResolver, SearchUserInput } from "../account-resolver";
import type { IContext } from "@/server/graphql/context";
import type { IAccountService } from "@/features/auth/service/account-service";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { User } from "@/features/auth/data/user-model";

describe("AccountResolver", () => {
  const sessionIdentity = {
    userId: "user-123",
    method: "session" as const,
    scopes: new Set<string>(),
  };
  let resolver: AccountResolver;
  let context: IContext;
  let accountService: jest.Mocked<IAccountService>;

  const profile = {
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

  beforeEach(() => {
    accountService = {
      getUserProfile: jest.fn(),
      findUsersByEmailOrUsername: jest.fn(),
      updateUsername: jest.fn(),
      updateEmail: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    } as jest.Mocked<IAccountService>;
    context = {
      identity: sessionIdentity,
      userId: sessionIdentity.userId,
      getCurrentIdentity: jest.fn(() => sessionIdentity),
      getCurrentUserId: jest.fn(() => sessionIdentity.userId),
    } as unknown as IContext;
    resolver = new AccountResolver(accountService);
  });

  describe("userProfile", () => {
    it("returns null for an anonymous caller through the real GraphQL schema", async () => {
      registerEnumType(ReportStatus, { name: "ReportStatus" });
      const schema = await buildSchema({
        resolvers: [AccountResolver],
        container: { get: () => resolver },
      });

      const result = await graphql({
        schema,
        source: "query GetCurrentUser { userProfile { id } }",
        contextValue: {
          ...context,
          identity: undefined,
          userId: undefined,
        },
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({ userProfile: null });
      expect(accountService.getUserProfile).not.toHaveBeenCalled();
    });

    it("passes the authenticated self target to the application service", async () => {
      accountService.getUserProfile.mockResolvedValue(profile);
      await expect(resolver.userProfile({}, context)).resolves.toEqual(profile);
      expect(accountService.getUserProfile).toHaveBeenCalledWith(
        sessionIdentity,
        "user-123",
      );
    });

    it("passes an explicit target to the PDP-backed service", async () => {
      accountService.getUserProfile.mockRejectedValue(new Error("denied"));
      await expect(
        resolver.userProfile({ userId: "other-user" }, context),
      ).rejects.toThrow("denied");
      expect(accountService.getUserProfile).toHaveBeenCalledWith(
        sessionIdentity,
        "other-user",
      );
    });

    it("returns null for an anonymous identity probe", async () => {
      context.identity = undefined;
      context.userId = undefined;
      await expect(resolver.userProfile({}, context)).resolves.toBeNull();
      expect(accountService.getUserProfile).not.toHaveBeenCalled();
    });
  });

  it("delegates account deletion once", async () => {
    accountService.deleteAccount.mockResolvedValue(true);
    await expect(resolver.deleteAccount(context)).resolves.toBe(true);
    expect(accountService.deleteAccount).toHaveBeenCalledTimes(1);
    expect(accountService.deleteAccount).toHaveBeenCalledWith(sessionIdentity);
  });

  describe("getUserByExactMatch", () => {
    it.each(["", "a", "ab"])("rejects short keyword %p", async (keyword) => {
      const input = Object.assign(new SearchUserInput(), { keyword });
      const errors = await validate(input);
      expect(errors[0]?.constraints).toHaveProperty("minLength");
    });

    it("rejects a keyword longer than an email can be", async () => {
      const input = Object.assign(new SearchUserInput(), {
        keyword: "a".repeat(321),
      });
      const errors = await validate(input);
      expect(errors[0]?.constraints).toHaveProperty("maxLength");
    });

    it("maps the service result without moving authorization into the adapter", async () => {
      accountService.findUsersByEmailOrUsername.mockResolvedValue([
        {
          id: "user-1",
          email: "john@example.com",
          ledger_username: "john",
        } as User,
      ]);
      const result = await resolver.getUserByExactMatch(context, {
        keyword: "john@example.com",
        includeCurrentUser: true,
      });
      expect(result).toEqual([{ email: "john@example.com", username: "john" }]);
      expect(accountService.findUsersByEmailOrUsername).toHaveBeenCalledWith(
        sessionIdentity,
        "john@example.com",
        true,
      );
    });
  });

  it("delegates username updates and returns the service profile", async () => {
    accountService.updateUsername.mockResolvedValue({
      ...profile,
      username: "newusername",
    });
    await expect(
      resolver.updateUsername(context, { username: "newusername" }),
    ).resolves.toMatchObject({ username: "newusername" });
    expect(accountService.updateUsername).toHaveBeenCalledWith(
      sessionIdentity,
      "newusername",
    );
  });

  it("normalizes nullable profile fields before delegation", async () => {
    accountService.updateProfile.mockResolvedValue({
      ...profile,
      firstName: "",
      lastName: "",
    });
    await resolver.updateProfile(context, {
      firstName: null,
      lastName: null,
    });
    expect(accountService.updateProfile).toHaveBeenCalledWith(
      sessionIdentity,
      "",
      "",
    );
  });
});
