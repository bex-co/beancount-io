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
});
