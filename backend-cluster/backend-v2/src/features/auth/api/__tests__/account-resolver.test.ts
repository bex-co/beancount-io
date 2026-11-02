import "reflect-metadata";
import { validate } from "class-validator";
import { graphql, type GraphQLSchema } from "graphql";
import { buildSchema, registerEnumType } from "type-graphql";
import { AccountResolver, SearchUserInput } from "../account-resolver";
import type { IContext } from "@/server/graphql/context";
import {
  AccountService,
  type IAccountService,
} from "@/features/auth/service/account-service";
import { formatError } from "@/server/graphql/format-error";
import { USERNAME_RULE } from "@/features/auth/utils/username-rule";
import { ReportStatus } from "@/features/auth/utils/report-status";

// type-graphql reads argument metadata from one build per process: a second
// buildSchema in this file resolved every @Args() as undefined, so tests that
// execute GraphQL share one schema and swap the resolver it serves.
let servedResolver: AccountResolver;
let schemaOnce: Promise<GraphQLSchema> | undefined;
function realSchema(resolverToServe: AccountResolver): Promise<GraphQLSchema> {
  servedResolver = resolverToServe;
  registerEnumType(ReportStatus, { name: "ReportStatus" });
  schemaOnce ??= buildSchema({
    resolvers: [AccountResolver],
    container: { get: () => servedResolver },
  });
  return schemaOnce;
}

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
    avatarUrl: "https://www.gravatar.com/avatar/x?size=48",
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
    defaultCurrency: null,
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
      const schema = await realSchema(resolver);

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

    it("returns the service result without moving authorization into the adapter", async () => {
      accountService.findUsersByEmailOrUsername.mockResolvedValue([
        { email: "john@example.com", username: "john" },
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

    it("serializes a username match without an email through the real GraphQL schema", async () => {
      const schema = await realSchema(resolver);
      accountService.findUsersByEmailOrUsername.mockResolvedValue([
        { email: null, username: "john" },
      ]);

      const result = await graphql({
        schema,
        source:
          'query { getUserByExactMatch(keyword: "john") { username email } }',
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
      expect(result.data).toEqual({
        getUserByExactMatch: [{ username: "john", email: null }],
      });
      expect(accountService.findUsersByEmailOrUsername).toHaveBeenCalledWith(
        sessionIdentity,
        "john",
        false,
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

  // A rename outside sign-up's rule reached the git host and failed there as
  // a generic error, or was stored (w0/036). Through the real schema, the
  // real service and the server's error formatter, it is a field-level
  // BAD_USER_INPUT naming the rule, before any account or git work.
  it("refuses a username outside sign-up's rule as a field-level BAD_USER_INPUT", async () => {
    const models = { user: { getById: jest.fn(), updateUsername: jest.fn() } };
    const fava = { getAdminClient: jest.fn() };
    const service = new AccountService(
      models as never,
      {} as never,
      {} as never,
      fava as never,
      {} as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const schema = await realSchema(new AccountResolver(service));

    const result = await graphql({
      schema,
      source: 'mutation { updateUsername(username: "José.Doe") { username } }',
      contextValue: context,
    });

    expect(result.data).toBeNull();
    const [error] = result.errors ?? [];
    const formatted = formatError(error.toJSON(), error);
    expect(formatted.extensions).toMatchObject({
      code: "BAD_USER_INPUT",
      field: "username",
    });
    expect(formatted.message).toBe(USERNAME_RULE);
    expect(models.user.getById).not.toHaveBeenCalled();
    expect(models.user.updateUsername).not.toHaveBeenCalled();
    expect(fava.getAdminClient).not.toHaveBeenCalled();
  });

  it("passes a name inside the rule through to the account", async () => {
    const models = {
      user: {
        getById: jest.fn().mockResolvedValue(null),
        updateUsername: jest.fn(),
      },
    };
    const service = new AccountService(
      models as never,
      {} as never,
      {} as never,
      { getAdminClient: jest.fn() } as never,
      {} as never,
      { authorizeOrThrow: jest.fn().mockResolvedValue(undefined) } as never,
    );
    const schema = await realSchema(new AccountResolver(service));

    const result = await graphql({
      schema,
      source: 'mutation { updateUsername(username: "jose_doe") { username } }',
      contextValue: context,
    });

    // The rule let it through: the service went on to load the account.
    const [error] = result.errors ?? [];
    expect(formatError(error.toJSON(), error).extensions?.code).toBe(
      "NOT_FOUND",
    );
    expect(models.user.getById).toHaveBeenCalled();
  });

  it("passes the profile update through, nulls included, for the service to apply", async () => {
    accountService.updateProfile.mockResolvedValue({
      ...profile,
      firstName: "",
      lastName: "",
    });
    await resolver.updateProfile(context, {
      firstName: null,
      lastName: null,
    });
    expect(accountService.updateProfile).toHaveBeenCalledWith(sessionIdentity, {
      firstName: null,
      lastName: null,
      defaultCurrency: undefined,
    });
  });
});
