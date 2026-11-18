import "reflect-metadata";
import {
  fakeRedisAdmission as mockFakeRedisAdmission,
  fakeRedisAdmissionState,
} from "@/foundation/redis/__tests__/fake-redis-counter";
import { AuthService } from "../auth-service";
import { ErrorCategory, ForbiddenError } from "@/shared/errors";
import type { IsPwnedPassword } from "@/features/auth/operations/is-pwned-password";
import { createLedger } from "@/features/ledger/operations/create-ledger";

jest.mock("@/foundation/redis/redis-admission", () => mockFakeRedisAdmission);
jest.mock("@/features/ledger/operations/create-ledger", () => ({
  createLedger: jest.fn().mockResolvedValue(undefined),
}));

// A self-hosted server (SELF_HOST) has no email verification and no plan
// limits, so it takes sign-ups only until its first account exists. A managed
// deployment never asks how many accounts it has.

const original = process.env.SELF_HOST;
beforeEach(() => {
  fakeRedisAdmissionState.reset();
});
afterEach(() => {
  if (original === undefined) delete process.env.SELF_HOST;
  else process.env.SELF_HOST = original;
});

function createService(existingAccounts = 0) {
  let accounts = existingAccounts;
  const user = {
    getByMail: jest.fn().mockResolvedValue(null),
    getById: jest.fn(async (_db: unknown, id: string) => ({
      id,
      isBlocked: true,
    })),
    getUserByUsername: jest.fn().mockResolvedValue(null),
    countUsers: jest.fn(async () => accounts),
    // The account exists once create resolves, a turn later than it began.
    create: jest.fn(async () => {
      await new Promise((resolve) => setImmediate(resolve));
      accounts += 1;
      return { id: `user-${accounts}` };
    }),
  };
  const signupOtpSession = {
    createSession: jest.fn().mockResolvedValue({ id: "s-1", otp: "1234" }),
  };
  const jwt = {
    create: jest.fn().mockResolvedValue({ token: "t", expireAt: "x" }),
    verify: jest.fn(async () => ({ userId: `user-${accounts}` })),
    revoke: jest.fn().mockResolvedValue(undefined),
  };
  const oidcIdentity = { link: jest.fn().mockResolvedValue(true) };
  const createUser = jest.fn().mockResolvedValue({});
  const sendgrid = { sendMail: jest.fn().mockResolvedValue(undefined) };
  const isPwnedPassword = jest.fn<ReturnType<IsPwnedPassword>, [string]>(
    async () => false,
  );
  const service = new AuthService(
    { user, signupOtpSession, jwt, oidcIdentity } as any,
    { transaction: (run: (tx: unknown) => unknown) => run({}) } as any,
    sendgrid as any,
    {} as any,
    {
      getAdminClient: () => ({ admin: { createUser } }),
      getApiContext: async () => ({ favaApiClient: {} }),
    } as any,
    { favaApi: { adminUser: "admin", adminPassword: "pw" } } as any,
    isPwnedPassword,
  );
  return {
    service,
    user,
    signupOtpSession,
    createUser,
    sendgrid,
    oidcIdentity,
    jwt,
  };
}

let emailCounter = 0;
const nextEmail = () => `person${++emailCounter}@example.com`;
const sessionParams = () => ({
  email: nextEmail(),
  password: "correct horse battery",
  firstName: "Person",
  lastName: "Example",
  ip: "unknown",
});
const register = (service: AuthService, email = nextEmail()) =>
  service.registerUser({
    email,
    password: "hashed",
    firstName: "Person",
    lastName: "Example",
    ip: "unknown",
  } as Parameters<AuthService["registerUser"]>[0]);

describe("isSignUpOpen", () => {
  it("is open on a self-host with no account yet", async () => {
    process.env.SELF_HOST = "true";
    expect(await createService(0).service.isSignUpOpen()).toBe(true);
  });

  it("is closed on a self-host that has an account", async () => {
    process.env.SELF_HOST = "true";
    expect(await createService(1).service.isSignUpOpen()).toBe(false);
  });

  it.each(["TRUE", "1", "yes"])(
    "reads SELF_HOST=%p the same way",
    async (v) => {
      process.env.SELF_HOST = v;
      expect(await createService(3).service.isSignUpOpen()).toBe(false);
    },
  );

  it.each([undefined, "", "false", "ture"])(
    "is always open, and never counts accounts, when SELF_HOST is %p",
    async (value) => {
      if (value === undefined) delete process.env.SELF_HOST;
      else process.env.SELF_HOST = value;
      const { service, user } = createService(100);
      expect(await service.isSignUpOpen()).toBe(true);
      expect(user.countUsers).not.toHaveBeenCalled();
    },
  );
});

describe("createSignUpSession on a self-host that has an account", () => {
  it("refuses before storing a session or spending a budget", async () => {
    process.env.SELF_HOST = "true";
    const { service, signupOtpSession, sendgrid } = createService(1);

    const refusal = service.createSignUpSession(sessionParams());

    await expect(refusal).rejects.toBeInstanceOf(ForbiddenError);
    await expect(refusal).rejects.toMatchObject({
      category: ErrorCategory.FORBIDDEN,
    });
    expect(signupOtpSession.createSession).not.toHaveBeenCalled();
    expect(sendgrid.sendMail).not.toHaveBeenCalled();
  });

  it("still accepts the first sign-up", async () => {
    process.env.SELF_HOST = "true";
    const { service, signupOtpSession } = createService(0);
    await service.createSignUpSession({ ...sessionParams(), sendCode: false });
    expect(signupOtpSession.createSession).toHaveBeenCalledTimes(1);
  });

  it("does not look at the account count on a managed deployment", async () => {
    delete process.env.SELF_HOST;
    const { service, user, signupOtpSession } = createService(50);
    await service.createSignUpSession(sessionParams());
    expect(user.countUsers).not.toHaveBeenCalled();
    expect(signupOtpSession.createSession).toHaveBeenCalledTimes(1);
  });
});

describe("registerUser on a self-host", () => {
  it("creates nothing once an account exists", async () => {
    process.env.SELF_HOST = "true";
    const { service, user, createUser } = createService(1);

    await expect(register(service)).rejects.toBeInstanceOf(ForbiddenError);

    expect(user.create).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("still creates an account for a new OIDC sign-in", async () => {
    process.env.SELF_HOST = "true";
    const { service, user, oidcIdentity, jwt } = createService(1);
    const oidc = { issuer: "https://id.example.com", sub: "abc" };

    const userId = await service.registerOidcUser({
      email: nextEmail(),
      firstName: "Person",
      lastName: "Example",
      ip: "unknown",
      oidcIdentity: oidc,
    });

    expect(userId).toBe("user-2");
    expect(createLedger).toHaveBeenCalledTimes(1);
    expect(jwt.revoke).toHaveBeenCalledWith(expect.anything(), "t");

    expect(user.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ password: null }),
    );
    expect(oidcIdentity.link).toHaveBeenCalledWith(expect.anything(), {
      ...oidc,
      userId: "user-2",
    });
  });

  it("lets exactly one of two simultaneous first sign-ups through", async () => {
    process.env.SELF_HOST = "true";
    const { service, user } = createService(0);

    const results = await Promise.allSettled([
      register(service),
      register(service),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const refused = results.find((r) => r.status === "rejected");
    expect((refused as PromiseRejectedResult).reason).toBeInstanceOf(
      ForbiddenError,
    );
    expect(user.create).toHaveBeenCalledTimes(1);
  });

  it("keeps registering as many accounts as asked on a managed deployment", async () => {
    delete process.env.SELF_HOST;
    const { service, user } = createService(10);

    await Promise.all([register(service), register(service)]);

    expect(user.create).toHaveBeenCalledTimes(2);
    expect(user.countUsers).not.toHaveBeenCalled();
  });
});

// What the managed service says and sends must not change with ADR029: only a
// self-hosted stack names its operator instead of beancount.io.
describe("what an account is told and sent", () => {
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

  it("on the managed service: the welcome mail links beancount.io", async () => {
    delete process.env.SELF_HOST;
    const { service, sendgrid } = createService(3);

    await register(service, "managed@example.com");
    await settle();

    expect(sendgrid.sendMail).toHaveBeenCalledTimes(1);
    const mail = sendgrid.sendMail.mock.calls[0][0];
    expect(mail.to).toBe("managed@example.com");
    expect(mail.subject).toBe("Welcome to Beancount.io!");
    expect(mail.text).toContain("https://beancount.io/ledger");
  });

  it("on the managed service: a blocked account is sent to beancount.io/tg", async () => {
    delete process.env.SELF_HOST;
    const { service } = createService(3);

    await expect(service.refreshToken("user-1", "t")).rejects.toThrow(
      "User is banned. If you need help, please contact https://beancount.io/tg.",
    );
  });

  it("on a self-host that cannot send mail: no welcome mail, and the operator is named", async () => {
    process.env.SELF_HOST = "true";
    const { service, sendgrid } = createService(0);

    await register(service);
    await settle();
    expect(sendgrid.sendMail).not.toHaveBeenCalled();

    await expect(service.refreshToken("user-1", "t")).rejects.toThrow(
      "contact the person who runs this server",
    );
  });
});
