import "reflect-metadata";
import {
  fakeRedisAdmission as mockFakeRedisAdmission,
  fakeRedisAdmissionState,
} from "@/foundation/redis/__tests__/fake-redis-counter";
import { AuthService } from "../auth-service";
import {
  BadUserInputError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";
import type { SignupOtpSession } from "@/features/auth/data/signup-otp-session-model";

jest.mock("@/foundation/redis/redis-admission", () => mockFakeRedisAdmission);

const session: SignupOtpSession = {
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
const authResponse = {
  token: "signed-jwt",
  expireAt: new Date("2030-01-01"),
};
const verificationPaths = ["verifySignUpOtp", "finishSignupSession"] as const;

function createService() {
  const signupOtpSession = {
    getSessionById: jest.fn(
      async (id: string): Promise<SignupOtpSession | null> => ({
        ...session,
        id,
      }),
    ),
    deleteSessionById: jest.fn(),
  };
  const service = new AuthService(
    { signupOtpSession } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    async () => false,
  );
  const registerUser = jest
    .spyOn(service, "registerUser")
    .mockResolvedValue(authResponse);
  return { service, signupOtpSession, registerUser };
}

beforeEach(() => fakeRedisAdmissionState.reset());
afterEach(() => jest.restoreAllMocks());

it("shares five account attempts across processes, source addresses, and replacement sessions", async () => {
  const first = createService();
  const second = createService();
  for (let index = 0; index < 5; index += 1) {
    const { service } = index % 2 ? first : second;
    await expect(
      service.verifySignUpOtp({
        sessionId: `replacement-${index}`,
        otp: "0000",
        ip: `198.51.100.${index + 1}`,
      }),
    ).rejects.toBeInstanceOf(BadUserInputError);
  }

  await expect(
    second.service.verifySignUpOtp({
      sessionId: "fresh-replacement",
      otp: session.otp,
      ip: "203.0.113.1",
    }),
  ).rejects.toBeInstanceOf(RateLimitedError);
  expect(first.registerUser).not.toHaveBeenCalled();
  expect(second.registerUser).not.toHaveBeenCalled();
  expect(second.signupOtpSession.deleteSessionById).not.toHaveBeenCalled();
});

it("shares the account budget between the current and legacy completion paths", async () => {
  const { service, registerUser } = createService();
  for (let index = 0; index < 5; index += 1) {
    await expect(
      service.verifySignUpOtp({ sessionId: "session-a", otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);
  }

  await expect(
    service.finishSignupSession({ sessionId: "session-b", otp: session.otp }),
  ).rejects.toBeInstanceOf(RateLimitedError);
  expect(registerUser).not.toHaveBeenCalled();
});

it.each(verificationPaths)(
  "%s limits trusted source IP before looking up even nonexistent sessions",
  async (path) => {
    const first = createService();
    const second = createService();
    first.signupOtpSession.getSessionById.mockResolvedValue(null);
    second.signupOtpSession.getSessionById.mockResolvedValue(null);
    for (let index = 0; index < 30; index += 1) {
      const { service } = index % 2 ? first : second;
      await expect(
        service[path]({
          sessionId: `nonexistent-${index}`,
          otp: "0000",
          ip: "198.51.100.7",
        }),
      ).rejects.toBeInstanceOf(BadUserInputError);
    }
    second.signupOtpSession.getSessionById.mockClear();

    await expect(
      second.service[path]({
        sessionId: "another-nonexistent",
        otp: session.otp,
        ip: "198.51.100.7",
      }),
    ).rejects.toBeInstanceOf(RateLimitedError);
    expect(second.signupOtpSession.getSessionById).not.toHaveBeenCalled();

    await expect(
      second.service[path]({
        sessionId: "another-nonexistent",
        otp: "0000",
        ip: "203.0.113.8",
      }),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(second.signupOtpSession.getSessionById).toHaveBeenCalledTimes(1);
  },
);

it("bounds callers with no available source address instead of exempting them", async () => {
  const { service, signupOtpSession } = createService();
  signupOtpSession.getSessionById.mockResolvedValue(null);
  for (let index = 0; index < 30; index += 1) {
    await expect(
      service.verifySignUpOtp({ sessionId: `missing-${index}`, otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);
  }
  signupOtpSession.getSessionById.mockClear();

  await expect(
    service.finishSignupSession({ sessionId: "missing", otp: "0000" }),
  ).rejects.toBeInstanceOf(RateLimitedError);
  expect(signupOtpSession.getSessionById).not.toHaveBeenCalled();
});

it.each(verificationPaths)(
  "%s fails closed before session lookup when admission is unavailable",
  async (path) => {
    const { service, signupOtpSession, registerUser } = createService();
    fakeRedisAdmissionState.down = true;

    await expect(
      service[path]({ sessionId: session.id, otp: session.otp }),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(signupOtpSession.getSessionById).not.toHaveBeenCalled();
    expect(registerUser).not.toHaveBeenCalled();
  },
);

it("admits at most five concurrent OTP guesses across different sessions and sources", async () => {
  const { service, registerUser } = createService();
  const results = await Promise.allSettled(
    Array.from({ length: 25 }, (_, index) =>
      service.verifySignUpOtp({
        sessionId: `replacement-${index}`,
        otp: "0000",
        ip: `198.51.100.${index + 1}`,
      }),
    ),
  );

  const errors = results.map((result) =>
    result.status === "rejected" ? result.reason : undefined,
  );
  expect(
    errors.filter((error) => error instanceof BadUserInputError),
  ).toHaveLength(5);
  expect(
    errors.filter((error) => error instanceof RateLimitedError),
  ).toHaveLength(20);
  expect(registerUser).not.toHaveBeenCalled();
});

it.each(verificationPaths)(
  "%s accepts a valid four-digit code and completes the original signup",
  async (path) => {
    const { service, signupOtpSession, registerUser } = createService();

    await expect(
      service[path]({
        sessionId: session.id,
        otp: session.otp,
        ip: "198.51.100.12",
      }),
    ).resolves.toEqual(authResponse);

    expect(registerUser).toHaveBeenCalledWith({
      email: session.email,
      password: session.password,
      firstName: session.firstName,
      lastName: session.lastName,
      username: null,
      ip: session.ip,
    });
    expect(signupOtpSession.deleteSessionById).toHaveBeenCalledWith(session.id);
  },
);

describe("AUTH_SKIP_EMAIL_VERIFICATION", () => {
  function createSkippingService(skip: boolean) {
    const base = createService();
    const sendMail = jest.fn();
    const signupOtpSession = {
      ...base.signupOtpSession,
      createSession: jest.fn(async () => ({ ...session, id: "created" })),
    };
    const service = new AuthService(
      {
        signupOtpSession,
        user: {
          getByMail: async () => null,
          getUserByUsername: async () => null,
        },
      } as never,
      {} as never,
      { sendMail } as never,
      {} as never,
      {} as never,
      { auth: { skipEmailVerification: skip } } as never,
      async () => false,
    );
    const registerUser = jest
      .spyOn(service, "registerUser")
      .mockResolvedValue(authResponse);
    return { service, sendMail, registerUser, signupOtpSession };
  }

  it.each(verificationPaths)(
    "accepts any code through %s for a valid session when on",
    async (path) => {
      const { service, registerUser } = createSkippingService(true);
      await expect(
        service[path]({
          sessionId: "session-a",
          otp: "not-the-code",
          ip: "198.51.100.9",
        }),
      ).resolves.toEqual(authResponse);
      expect(registerUser).toHaveBeenCalledTimes(1);
    },
  );

  it.each(verificationPaths)(
    "still rejects an unknown session through %s when on",
    async (path) => {
      const { service, signupOtpSession, registerUser } =
        createSkippingService(true);
      signupOtpSession.getSessionById.mockResolvedValueOnce(null);
      await expect(
        service[path]({ sessionId: "nope", otp: "0000", ip: "198.51.100.10" }),
      ).rejects.toBeInstanceOf(BadUserInputError);
      expect(registerUser).not.toHaveBeenCalled();
    },
  );

  it.each(verificationPaths)(
    "still checks the code through %s when off",
    async (path) => {
      const { service, registerUser } = createSkippingService(false);
      await expect(
        service[path]({
          sessionId: "session-a",
          otp: "not-the-code",
          ip: "198.51.100.11",
        }),
      ).rejects.toBeInstanceOf(BadUserInputError);
      expect(registerUser).not.toHaveBeenCalled();
    },
  );
});
