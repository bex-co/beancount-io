import "reflect-metadata";
import { graphql } from "graphql";
import { buildSchema } from "type-graphql";
import { AuthResolver } from "../auth-resolver";
import { AuthService } from "@/features/auth/service/auth-service";
import { AuthSessionWorkflow } from "@/features/auth/workflow/auth-session-workflow";
import { defaultLedgerTemplate } from "@/features/ledger/utils/ledger-template";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { COOKIE_NAME } from "@/shared/cookie-utils";

jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: jest.fn(async () => ({ count: 1, resetInMs: 60_000 })),
}));
jest.mock("@/shared/execute", () => ({ delayRun: jest.fn() }));

const authResponse = {
  token: "issued-session-token",
  expireAt: new Date("2030-01-01"),
};
let resolver: AuthResolver;
let schemaPromise: ReturnType<typeof buildSchema>;

async function createFixture(withDefaultLedger: boolean) {
  const user = { id: "usr_person", ledger_username: "person" };
  const models = {
    user: {
      getByMail: jest.fn(async () => null),
      create: jest.fn(async () => user),
      getById: jest.fn(async () => user),
    },
    jwt: {
      create: jest.fn(async () => authResponse),
      verify: jest.fn(async () => ({
        userId: user.id,
        issuedAt: 1_700_000_000,
        expiresAt: 1_900_000_000,
      })),
    },
    signupOtpSession: {
      getSessionById: jest.fn(async () => ({
        email: "person@example.com",
        password: "hashed-password",
        firstName: "Person",
        lastName: "Example",
        username: user.ledger_username,
        ip: "127.0.0.1",
        otp: "1234",
        withDefaultLedger,
      })),
      deleteSessionById: jest.fn(),
    },
    paidCustomer: {
      findByUserIdWithActivePeriod: jest.fn(async () => null),
    },
  };
  const db = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({}),
  };
  const createLedger = jest.fn().mockResolvedValue({
    data: {
      success: true,
      data: { full_name: "person/default", name: "default", private: true },
    },
  });
  const favaFactory = {
    getAdminClient: () => ({ admin: { createUser: jest.fn() } }),
    getApiContext: jest.fn(async () => ({
      favaApiClient: {
        ledgers: {
          listLedgers: jest.fn(async () => ({
            data: { success: true, data: [] },
          })),
          createLedger,
        },
      },
    })),
  };
  const service = new AuthService(
    models as never,
    db as never,
    {} as never,
    { listSubscriptions: async () => [] } as never,
    favaFactory as never,
    {
      favaApi: { adminUser: "admin", adminPassword: "" },
      gitea: { hostname: "gitea.example", externalHttpPort: 443, sshPort: 22 },
    } as never,
  );
  const workflow = new AuthSessionWorkflow(
    service,
    { ensureFollowing: jest.fn() },
    models as never,
    db as never,
  );
  resolver = new AuthResolver(service, workflow);
  schemaPromise ??= buildSchema({
    resolvers: [AuthResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const setCookie = jest.fn();

  return {
    createLedger,
    models,
    setCookie,
    verify: () =>
      graphql({
        schema,
        source: `mutation {
          verifySignUpOtp(sessionId: "signup-session", otp: "1234") {
            token
            expireAt
          }
        }`,
        contextValue: {
          config: { env: "test" },
          koaCtx: {
            URL: new URL("https://api.example/graphql"),
            cookies: { set: setCookie },
          },
        },
      }),
  };
}

// Signup is a browser ceremony; GraphQL is its only eligible API surface.
describe("signup default ledger", () => {
  it.each([true, false])(
    "completes signup with a private ledger only when requested (withDefaultLedger=%s)",
    async (withDefaultLedger) => {
      const fixture = await createFixture(withDefaultLedger);

      const result = await fixture.verify();

      expect(result.errors).toBeUndefined();
      expect(result.data?.verifySignUpOtp).toEqual({
        token: authResponse.token,
        expireAt: authResponse.expireAt.toISOString(),
      });
      expect(fixture.setCookie).toHaveBeenCalledWith(
        COOKIE_NAME,
        authResponse.token,
        expect.objectContaining({ httpOnly: true }),
      );
      expect(
        fixture.models.signupOtpSession.deleteSessionById,
      ).toHaveBeenCalledWith("signup-session");
      if (withDefaultLedger) {
        expect(fixture.createLedger).toHaveBeenCalledTimes(1);
        expect(fixture.createLedger).toHaveBeenCalledWith({
          name: "Default",
          description: "Default ledger for the user",
          private: true,
          files: defaultLedgerTemplate,
        });
      } else {
        expect(fixture.createLedger).not.toHaveBeenCalled();
      }
    },
  );

  it("still completes signup if default ledger creation fails", async () => {
    const fixture = await createFixture(true);
    fixture.createLedger.mockRejectedValueOnce(new Error("Ledger unavailable"));

    const result = await fixture.verify();

    expect(result.errors).toBeUndefined();
    expect(result.data?.verifySignUpOtp).toEqual({
      token: authResponse.token,
      expireAt: authResponse.expireAt.toISOString(),
    });
    expect(fixture.createLedger).toHaveBeenCalledTimes(1);
    expect(
      fixture.models.signupOtpSession.deleteSessionById,
    ).toHaveBeenCalledWith("signup-session");
  });
});
