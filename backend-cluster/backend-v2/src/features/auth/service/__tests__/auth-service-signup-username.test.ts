import "reflect-metadata";
import {
  fakeRedisAdmission as mockFakeRedisAdmission,
  fakeRedisAdmissionState,
} from "@/foundation/redis/__tests__/fake-redis-counter";
import { AuthService } from "../auth-service";
import { BadUserInputError, ConflictError } from "@/shared/errors";
import { usernameFromEmail } from "@/features/auth/utils/username-rule";
import { PasswordPolicyError } from "@/features/auth/utils/password-policy";
import type { IsPwnedPassword } from "@/features/auth/operations/is-pwned-password";

jest.mock("@/foundation/redis/redis-admission", () => mockFakeRedisAdmission);
beforeEach(() => fakeRedisAdmissionState.reset());

// Sign-up holds a username to the rule renames already follow (w0/036): 1–20
// lowercase letters, digits and underscores. Only the dashboard form checked
// it before, and a sign-up without one took the email's local part as is
// (w0/046).

function createService(taken: string[] = [], selfHost = false) {
  const takenLower = new Set(taken.map((name) => name.toLowerCase()));
  const user = {
    getByMail: jest.fn().mockResolvedValue(null),
    // The real lookup compares lower-cased names.
    getUserByUsername: jest.fn(async (_db: unknown, name: string) =>
      takenLower.has(name.toLowerCase()) ? { id: "someone" } : null,
    ),
    create: jest.fn().mockResolvedValue({ id: "user-1" }),
  };
  const signupOtpSession = {
    createSession: jest.fn().mockResolvedValue({ id: "s-1", otp: "1234" }),
  };
  const jwt = {
    create: jest.fn().mockResolvedValue({ token: "t", expireAt: "x" }),
  };
  const createUser = jest.fn().mockResolvedValue({});
  const sendgrid = { sendMail: jest.fn().mockResolvedValue(undefined) };
  const isPwnedPassword = jest.fn<ReturnType<IsPwnedPassword>, [string]>(
    async () => false,
  );
  const service = new AuthService(
    { user, signupOtpSession, jwt } as any,
    { transaction: (run: (tx: unknown) => unknown) => run({}) } as any,
    sendgrid as any,
    {} as any,
    { getAdminClient: () => ({ admin: { createUser } }) } as any,
    {
      favaApi: { adminUser: "admin", adminPassword: "pw" },
      selfHost,
    } as any,
    isPwnedPassword,
  );
  return {
    service,
    user,
    signupOtpSession,
    createUser,
    sendgrid,
    isPwnedPassword,
  };
}

let emailCounter = 0;
const signUpParams = (username?: string | null) => ({
  // A fresh address per call: sign-up is rate limited per email.
  email: `person${++emailCounter}@example.com`,
  password: "correct horse battery",
  firstName: "Person",
  lastName: "Example",
  username,
  ip: "unknown",
});

describe("createSignUpSession username", () => {
  it.each(["John.Doe", "UPPER", "has space", "a".repeat(21), "dash-ed"])(
    "refuses %j on the username field before sending a code",
    async (username) => {
      const { service, signupOtpSession, sendgrid } = createService();
      const refusal = service.createSignUpSession(signUpParams(username));
      await expect(refusal).rejects.toBeInstanceOf(BadUserInputError);
      await expect(refusal).rejects.toMatchObject({
        metadata: { field: "username" },
      });
      expect(signupOtpSession.createSession).not.toHaveBeenCalled();
      expect(sendgrid.sendMail).not.toHaveBeenCalled();
    },
  );

  it("accepts a username in the rule", async () => {
    const { service, signupOtpSession } = createService();
    await service.createSignUpSession(signUpParams("ana_99"));
    expect(signupOtpSession.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ username: "ana_99" }),
      10,
    );
  });

  it("still lets a sign-up omit the username", async () => {
    const { service, signupOtpSession } = createService();
    await service.createSignUpSession(signUpParams(null));
    expect(signupOtpSession.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ username: null }),
      10,
    );
  });
});

describe("registerUser username", () => {
  const register = (
    service: AuthService,
    email: string,
    username?: string | null,
  ) =>
    service.registerUser({
      email,
      password: "hashed",
      firstName: "Person",
      lastName: "Example",
      username,
      ip: "unknown",
    } as Parameters<AuthService["registerUser"]>[0]);

  it("derives a name in the rule from the email when none was chosen", async () => {
    const { service, user, createUser } = createService();
    await register(service, "John.Doe+tag@example.com");
    expect(user.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ledger_username: "john_doe_tag" }),
    );
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "john_doe_tag" }),
      expect.anything(),
    );
  });

  it("numbers a derived name that someone already has, ignoring case", async () => {
    const { service, createUser } = createService(["John_Doe"]);
    await register(service, "john.doe@example.com");
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "john_doe2" }),
      expect.anything(),
    );
  });

  it("refuses a chosen name outside the rule", async () => {
    const { service, createUser } = createService();
    await expect(
      register(service, "x@example.com", "Bad.Name"),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe("usernameFromEmail", () => {
  const free = async () => false;

  it.each([
    ["john.doe+x@example.com", "john_doe_x"],
    ["ANA@example.com", "ana"],
    ["élodie@example.com", "_lodie"],
    ["a.very.long.local.part.indeed@example.com", "a_very_long_local_pa"],
    ["@example.com", "user"],
  ])("turns %s into %s", async (email, username) => {
    expect(await usernameFromEmail(email, free)).toBe(username);
  });

  it("keeps a numbered name within 20 characters", async () => {
    const taken = new Set(["a_very_long_local_pa", "a_very_long_local_p2"]);
    expect(
      await usernameFromEmail(
        "a.very.long.local.part.indeed@example.com",
        async (name) => taken.has(name),
      ),
    ).toBe("a_very_long_local_p3");
  });
});

// A new password is held to the Kratos-style policy (password-policy.ts)
// before a code is sent or anything is stored.
describe("createSignUpSession password policy", () => {
  it("refuses a breached password before sending a code", async () => {
    const { service, signupOtpSession, sendgrid, isPwnedPassword } =
      createService();
    isPwnedPassword.mockResolvedValueOnce(true);

    const refusal = service.createSignUpSession(signUpParams("ana_99"));
    await expect(refusal).rejects.toBeInstanceOf(PasswordPolicyError);
    await expect(refusal).rejects.toMatchObject({
      metadata: { field: "password", passwordPolicy: "BREACHED" },
    });
    expect(signupOtpSession.createSession).not.toHaveBeenCalled();
    expect(sendgrid.sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ["the email", (email: string) => email.split("@")[0] + "!!"],
    ["the username", () => "ana_99_ana"],
  ])(
    "refuses a password built from %s without a breach lookup",
    async (_what, password) => {
      const { service, signupOtpSession, isPwnedPassword } = createService();
      const params = signUpParams("ana_99");
      const refusal = service.createSignUpSession({
        ...params,
        password: password(params.email),
      });
      await expect(refusal).rejects.toMatchObject({
        metadata: { passwordPolicy: "TOO_SIMILAR" },
      });
      expect(isPwnedPassword).not.toHaveBeenCalled();
      expect(signupOtpSession.createSession).not.toHaveBeenCalled();
    },
  );

  it("refuses a password bcrypt would truncate", async () => {
    const { service, signupOtpSession } = createService();
    const refusal = service.createSignUpSession({
      ...signUpParams(null),
      password: "é".repeat(37), // 74 bytes in 37 characters
    });
    await expect(refusal).rejects.toMatchObject({
      metadata: { passwordPolicy: "MAX_LENGTH" },
    });
    expect(signupOtpSession.createSession).not.toHaveBeenCalled();
  });

  it("does not look a password up for a sign-up refused for something else", async () => {
    const { service, user, isPwnedPassword } = createService();
    user.getByMail.mockResolvedValueOnce({ id: "someone" });
    await expect(
      service.createSignUpSession(signUpParams(null)),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(isPwnedPassword).not.toHaveBeenCalled();
  });
});

describe("createSignUpSession when self-hosted", () => {
  it("creates the session but sends no mail when on", async () => {
    const { service, signupOtpSession, sendgrid } = createService([], true);
    await expect(service.createSignUpSession(signUpParams())).resolves.toBe(
      "s-1",
    );
    expect(signupOtpSession.createSession).toHaveBeenCalledTimes(1);
    expect(sendgrid.sendMail).not.toHaveBeenCalled();
  });

  it("sends the code when off", async () => {
    const { service, sendgrid } = createService();
    await service.createSignUpSession(signUpParams());
    expect(sendgrid.sendMail).toHaveBeenCalledTimes(1);
  });
});
