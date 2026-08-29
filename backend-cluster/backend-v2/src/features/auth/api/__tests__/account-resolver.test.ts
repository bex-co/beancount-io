import "reflect-metadata";
import { validate } from "class-validator";
import { AccountResolver, SearchUserInput } from "../account-resolver";
import type { IContext } from "@/server/graphql/context";
import type { IAccountWorkflow } from "@/features/auth/workflow/account-workflow";
import { ReportStatus } from "@/features/auth/utils/report-status";
import type { User } from "@/features/auth/data/user-model";
import {
  authorizationRequest,
  type AuthorizationRequest,
} from "@/server/api/authorization";

describe("AccountResolver", () => {
  const sessionIdentity = {
    userId: "user-123",
    method: "session" as const,
    scopes: new Set<string>(),
    capabilityExempt: true,
  };
  let resolver: AccountResolver;
  let context: IContext;
  let request: AuthorizationRequest;
  let workflow: jest.Mocked<IAccountWorkflow>;

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
    workflow = {
      getUserProfile: jest.fn(),
      findUsersByEmailOrUsername: jest.fn(),
      updateUsername: jest.fn(),
      updateProfile: jest.fn(),
      deleteAccount: jest.fn(),
    } as jest.Mocked<IAccountWorkflow>;
    request = authorizationRequest(sessionIdentity);
    context = {
      identity: sessionIdentity,
      userId: sessionIdentity.userId,
      getCurrentIdentity: jest.fn(() => sessionIdentity),
      getAuthorizationRequest: jest.fn(() => request),
      getCurrentUserId: jest.fn(() => sessionIdentity.userId),
    } as unknown as IContext;
    resolver = new AccountResolver(workflow);
  });

  describe("userProfile", () => {
    it("passes the authenticated self target to the workflow", async () => {
      workflow.getUserProfile.mockResolvedValue(profile);
      await expect(resolver.userProfile({}, context)).resolves.toEqual(profile);
      expect(workflow.getUserProfile).toHaveBeenCalledWith(request, "user-123");
    });

    it("passes an explicit target to the PDP-backed workflow", async () => {
      workflow.getUserProfile.mockRejectedValue(new Error("denied"));
      await expect(
        resolver.userProfile({ userId: "other-user" }, context),
      ).rejects.toThrow("denied");
      expect(workflow.getUserProfile).toHaveBeenCalledWith(
        request,
        "other-user",
      );
    });

    it("preserves the anonymous nullable contract", async () => {
      context.identity = undefined;
      await expect(resolver.userProfile({}, context)).resolves.toBeNull();
      expect(workflow.getUserProfile).not.toHaveBeenCalled();
    });
  });

  it("delegates account deletion once", async () => {
    workflow.deleteAccount.mockResolvedValue(true);
    await expect(resolver.deleteAccount(context)).resolves.toBe(true);
    expect(workflow.deleteAccount).toHaveBeenCalledTimes(1);
    expect(workflow.deleteAccount).toHaveBeenCalledWith(request);
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

    it("maps the workflow result without moving authorization into the adapter", async () => {
      workflow.findUsersByEmailOrUsername.mockResolvedValue([
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
      expect(workflow.findUsersByEmailOrUsername).toHaveBeenCalledWith(
        request,
        "john@example.com",
        true,
      );
    });
  });

  it("delegates username updates and returns the workflow profile", async () => {
    workflow.updateUsername.mockResolvedValue({
      ...profile,
      username: "newusername",
    });
    await expect(
      resolver.updateUsername(context, { username: "newusername" }),
    ).resolves.toMatchObject({ username: "newusername" });
    expect(workflow.updateUsername).toHaveBeenCalledWith(
      request,
      "newusername",
    );
  });

  it("normalizes nullable profile fields before delegation", async () => {
    workflow.updateProfile.mockResolvedValue({
      ...profile,
      firstName: "",
      lastName: "",
    });
    await resolver.updateProfile(context, {
      firstName: null,
      lastName: null,
    });
    expect(workflow.updateProfile).toHaveBeenCalledWith(request, "", "");
  });
});
