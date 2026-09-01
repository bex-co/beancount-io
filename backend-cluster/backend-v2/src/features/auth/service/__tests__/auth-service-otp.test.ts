import "reflect-metadata";
import { AuthService } from "../auth-service";
import {
  BadUserInputError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import { incrementInWindow } from "@/foundation/redis/redis-counter";

jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: jest.fn(),
}));

jest.mock("@/shared/lock", () => ({
  lock: { acquire: jest.fn(async (_key, callback) => callback()) },
  LOCK_KEYS: { USER: { register: (email: string) => `register:${email}` } },
}));

jest.mock("@/shared/execute", () => ({ delayRun: jest.fn() }));

const mockIncrementInWindow = incrementInWindow as jest.MockedFunction<
  typeof incrementInWindow
>;

const session = {
  id: "session-a",
  email: "person@example.com",
  password: "hashed-password",
  firstName: "Person",
  lastName: "Example",
  username: null,
  ip: "127.0.0.1",
  withDefaultLedger: false,
  otp: "1234",
  expireAt: new Date(Date.now() + 60_000).toISOString(),
};

function createService() {
  const signupOtpSession = {
    getSessionById: jest.fn().mockImplementation(async (id: string) => ({
      ...session,
      id,
    })),
    deleteSessionById: jest.fn(),
  };

  const service = new AuthService(
    { signupOtpSession } as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  return { service, signupOtpSession };
}

describe("AuthService signup OTP verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIncrementInWindow.mockResolvedValue({
      count: 1,
      resetInMs: 10 * 60 * 1000,
    });
  });

  it("shares the attempt budget across replacement session ids", async () => {
    const { service } = createService();

    await expect(
      service.verifySignUpOtp({ sessionId: "session-a", otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);
    await expect(
      service.verifySignUpOtp({ sessionId: "session-b", otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);

    expect(mockIncrementInWindow).toHaveBeenNthCalledWith(
      1,
      "auth:signup_otp_attempts:email:person@example.com",
      10 * 60 * 1000,
    );
    expect(mockIncrementInWindow).toHaveBeenNthCalledWith(
      2,
      "auth:signup_otp_attempts:email:person@example.com",
      10 * 60 * 1000,
    );
  });

  it("enforces the same budget on the legacy finish path", async () => {
    const { service } = createService();

    await expect(
      service.finishSignupSession({ sessionId: "session-a", otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);

    expect(mockIncrementInWindow).toHaveBeenCalledWith(
      "auth:signup_otp_attempts:email:person@example.com",
      10 * 60 * 1000,
    );
  });

  it("rejects attempts over the shared limit", async () => {
    mockIncrementInWindow.mockResolvedValue({ count: 6, resetInMs: 42_000 });
    const { service } = createService();

    await expect(
      service.verifySignUpOtp({ sessionId: "session-a", otp: "0000" }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("fails closed when the atomic attempt counter is unavailable", async () => {
    mockIncrementInWindow.mockResolvedValue(undefined);
    const { service } = createService();

    await expect(
      service.verifySignUpOtp({ sessionId: "session-a", otp: "0000" }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("accepts a valid four-digit code and completes signup", async () => {
    const { service, signupOtpSession } = createService();
    const authResponse = {
      token: "signed-jwt",
      expireAt: new Date(Date.now() + 60_000),
    };
    jest.spyOn(service, "registerUser").mockResolvedValue(authResponse);

    await expect(
      service.verifySignUpOtp({ sessionId: "session-a", otp: "1234" }),
    ).resolves.toEqual(authResponse);

    expect(service.registerUser).toHaveBeenCalledWith({
      email: session.email,
      password: session.password,
      firstName: session.firstName,
      lastName: session.lastName,
      username: null,
      ip: session.ip,
    });
    expect(signupOtpSession.deleteSessionById).toHaveBeenCalledWith(
      "session-a",
    );
  });

  it("creates an OAuth-bound account without minting a legacy JWT", async () => {
    const jwt = { create: jest.fn(), verify: jest.fn() };
    const signupOtpSession = {
      getSessionById: jest.fn().mockResolvedValue({
        ...session,
        oauthInteractionUid: "dashboard-interaction",
      }),
      deleteSessionById: jest.fn(),
    };
    const user = {
      getByMail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "oauth-user" }),
    };
    const db: { transaction: jest.Mock } = { transaction: jest.fn() };
    db.transaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) => callback(db),
    );
    const favaAdmin = { admin: { createUser: jest.fn() } };
    const service = new AuthService(
      { signupOtpSession, user, jwt } as any,
      db as any,
      { sendMail: jest.fn() } as any,
      {} as any,
      { getAdminClient: () => favaAdmin } as any,
      {
        favaApi: { adminUser: "admin", adminPassword: "password" },
      } as any,
    );

    await expect(
      service.finishDashboardSignup({
        oauthInteractionUid: "dashboard-interaction",
        sessionId: session.id,
        otp: session.otp,
      }),
    ).resolves.toBe("oauth-user");

    expect(user.create).toHaveBeenCalledTimes(1);
    expect(jwt.create).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(signupOtpSession.deleteSessionById).toHaveBeenCalledWith(session.id);
  });

  it("rejects an OTP session copied from another OAuth interaction", async () => {
    const { service, signupOtpSession } = createService();
    signupOtpSession.getSessionById.mockResolvedValue({
      ...session,
      oauthInteractionUid: "other-interaction",
    });

    await expect(
      service.finishDashboardSignup({
        oauthInteractionUid: "dashboard-interaction",
        sessionId: session.id,
        otp: session.otp,
      }),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(mockIncrementInWindow).not.toHaveBeenCalled();
  });

  it("verifies a Dashboard password without minting a legacy JWT", async () => {
    const jwt = { create: jest.fn() };
    const user = {
      getByMail: jest.fn().mockResolvedValue({
        id: "oauth-user",
        isBlocked: false,
      }),
      verifyPassword: jest.fn().mockResolvedValue(true),
    };
    const service = new AuthService(
      { user, jwt } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.authenticateDashboardPassword({
        email: "person@example.com",
        password: "correct horse battery staple",
      }),
    ).resolves.toBe("oauth-user");
    expect(jwt.create).not.toHaveBeenCalled();
  });

  it("consumes a Dashboard magic link without minting a legacy JWT", async () => {
    const jwt = { create: jest.fn() };
    const magicLinkToken = {
      findOneAndDelete: jest.fn().mockResolvedValue({ userId: "oauth-user" }),
    };
    const user = {
      getById: jest.fn().mockResolvedValue({
        id: "oauth-user",
        isBlocked: false,
      }),
    };
    const service = new AuthService(
      { user, jwt, magicLinkToken } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.consumeDashboardMagicLink("single-use-token"),
    ).resolves.toBe("oauth-user");
    expect(jwt.create).not.toHaveBeenCalled();
  });
});
