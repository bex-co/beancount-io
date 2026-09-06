import "reflect-metadata";
import {
  AuthSessionWorkflow,
  type IAuthSessionWorkflow,
} from "../auth-session-workflow";
import {
  AuthService,
  type IAuthService,
} from "@/features/auth/service/auth-service";
import { UserProfileService } from "@/features/gitea/user-profile/service/user-profile-service";
import { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import {
  AuthorizationService,
  SourceBackedRelationshipEvaluator,
} from "@/server/api/authorization";
import {
  BadUserInputError,
  ForbiddenError,
  NotFoundError,
} from "@/shared/errors";

jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: jest.fn(async () => ({ count: 1, resetInMs: 60_000 })),
}));
jest.mock("@/shared/execute", () => ({ delayRun: jest.fn() }));

const credentials = { email: "person@example.com", password: "password123" };
const signup = { sessionId: "signup-session", otp: "1234" };
const authResponse = {
  token: "issued-session-token",
  expireAt: new Date("2030-01-01"),
};

function createFixture() {
  const user = {
    id: "usr_person",
    email: credentials.email,
    ledger_username: "person",
    isBlocked: false,
  };
  let following = false;
  let transactionCommitted = false;
  const fetch = jest.fn(async (_url: string, init: RequestInit) => {
    if (init.method === "GET") {
      return new Response(null, { status: following ? 204 : 404 });
    }
    following = true;
    return new Response(null, { status: 204 });
  });
  const client = new GiteaApi({
    baseUrl: "https://gitea.example/api/v1",
    customFetch: fetch as unknown as typeof globalThis.fetch,
  });
  const giteaFactory = {
    getUserApiClient: jest.fn(async () => client),
  };
  const models = {
    user: {
      getByMail: jest.fn(async () => user as typeof user | null),
      getById: jest.fn(async () => user as typeof user | null),
      verifyPassword: jest.fn(async () => true),
      create: jest.fn(async () => user),
    },
    jwt: {
      create: jest.fn(async () => authResponse),
      verify: jest.fn(async () => user.id as string | null),
      revoke: jest.fn(),
    },
    magicLinkToken: {
      findOneAndDelete: jest.fn(async () => ({ userId: user.id })),
    },
    signupOtpSession: {
      getSessionById: jest.fn(async () => ({
        ...credentials,
        firstName: "Person",
        lastName: "Example",
        username: user.ledger_username,
        ip: "127.0.0.1",
        otp: signup.otp,
        withDefaultLedger: false,
      })),
      deleteSessionById: jest.fn(),
    },
  };
  const db = {
    transaction: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const result = await callback({});
        transactionCommitted = true;
        return result;
      },
    ),
  };
  const createGiteaUser = jest.fn(async () => undefined);
  const favaFactory = {
    getAdminClient: () => ({ admin: { createUser: createGiteaUser } }),
  };
  const authService: IAuthService = new AuthService(
    models as never,
    db as never,
    {} as never,
    {} as never,
    favaFactory as never,
    { favaApi: { adminUser: "admin", adminPassword: "" } } as never,
  );
  // Exercise the real credential and exact-self policies with the real services.
  const authorization = new AuthorizationService(
    new SourceBackedRelationshipEvaluator(
      db as never,
      models as never,
      giteaFactory as never,
      favaFactory as never,
    ),
    jest.fn(),
  );
  const workflow: IAuthSessionWorkflow = new AuthSessionWorkflow(
    authService,
    new UserProfileService(
      giteaFactory as never,
      models as never,
      db as never,
      authorization,
    ),
    models as never,
    db as never,
  );

  return {
    workflow,
    authService,
    user,
    models,
    db,
    fetch,
    giteaFactory,
    createGiteaUser,
    isFollowing: () => following,
    isCommitted: () => transactionCommitted,
    setFollowing: (value: boolean) => {
      following = value;
    },
  };
}

type Fixture = ReturnType<typeof createFixture>;
const authPaths = ["signup", "password", "one-time link"] as const;

function authenticate(fixture: Fixture, path: (typeof authPaths)[number]) {
  if (path === "signup") {
    fixture.models.user.getByMail.mockResolvedValueOnce(null);
    return fixture.workflow.verifySignUpOtp(signup);
  }
  if (path === "one-time link") {
    return fixture.workflow.signInWithMagicLinkToken({ token: "one-time" });
  }
  return fixture.workflow.loginUser(credentials);
}

describe("AuthSessionWorkflow default community follow", () => {
  it.each(authPaths)("follows open_ledger after %s", async (path) => {
    const fixture = createFixture();

    await expect(authenticate(fixture, path)).resolves.toEqual(authResponse);

    expect(fixture.isFollowing()).toBe(true);
    expect(fixture.models.jwt.verify).toHaveBeenCalledWith(
      fixture.db,
      authResponse.token,
    );
    expect(fixture.giteaFactory.getUserApiClient).toHaveBeenCalledWith(
      fixture.user.id,
    );
    expect(fixture.fetch.mock.calls.map(([, init]) => init.method)).toEqual([
      "GET",
      "PUT",
    ]);
    expect(
      fixture.fetch.mock.calls.every(
        ([url]) =>
          url === "https://gitea.example/api/v1/user/following/open_ledger",
      ),
    ).toBe(true);
  });

  it("waits until signup provisioning and the transaction have finished", async () => {
    const fixture = createFixture();
    fixture.giteaFactory.getUserApiClient.mockImplementation(async () => {
      expect(fixture.isCommitted()).toBe(true);
      expect(fixture.createGiteaUser).toHaveBeenCalledTimes(1);
      expect(
        fixture.models.signupOtpSession.deleteSessionById,
      ).toHaveBeenCalledWith(signup.sessionId);
      return new GiteaApi({
        customFetch: fixture.fetch as unknown as typeof globalThis.fetch,
      });
    });

    await authenticate(fixture, "signup");

    expect(fixture.isFollowing()).toBe(true);
  });

  it("skips existing followers and retries a missing follow on a later sign-in", async () => {
    const fixture = createFixture();
    fixture.setFollowing(true);
    await authenticate(fixture, "password");
    expect(fixture.fetch.mock.calls.map(([, init]) => init.method)).toEqual([
      "GET",
    ]);

    fixture.setFollowing(false);
    await authenticate(fixture, "password");
    await authenticate(fixture, "password");
    expect(fixture.isFollowing()).toBe(true);
    expect(fixture.fetch.mock.calls.map(([, init]) => init.method)).toEqual([
      "GET",
      "GET",
      "PUT",
      "GET",
    ]);
  });

  it.each(["open_ledger", "Open_Ledger"])(
    "does not make %s follow itself",
    async (username) => {
      const fixture = createFixture();
      fixture.user.ledger_username = username;

      await expect(authenticate(fixture, "password")).resolves.toEqual(
        authResponse,
      );

      expect(fixture.fetch).not.toHaveBeenCalled();
    },
  );

  it.each(authPaths)(
    "allows %s during an outage and retries at the next sign-in",
    async (path) => {
      const fixture = createFixture();
      fixture.fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));

      await expect(authenticate(fixture, path)).resolves.toEqual(authResponse);
      expect(fixture.isFollowing()).toBe(false);
      expect(fixture.fetch).toHaveBeenCalledTimes(1);

      await authenticate(fixture, "password");
      expect(fixture.isFollowing()).toBe(true);
    },
  );

  it.each([404, 503])(
    "allows sign-in if the follow write returns %s",
    async (status) => {
      const fixture = createFixture();
      fixture.fetch
        .mockResolvedValueOnce(new Response(null, { status: 404 }))
        .mockResolvedValueOnce(new Response(null, { status }));

      await expect(authenticate(fixture, "password")).resolves.toEqual(
        authResponse,
      );
      expect(fixture.isFollowing()).toBe(false);
    },
  );

  it("completes sign-in when the follow request times out", async () => {
    const fixture = createFixture();
    const controller = new AbortController();
    const timeout = jest
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(controller.signal);
    fixture.fetch.mockImplementationOnce(async (_url, init) => {
      queueMicrotask(() => controller.abort());
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener(
          "abort",
          () => reject(init.signal!.reason),
          { once: true },
        );
      });
    });
    try {
      await expect(authenticate(fixture, "password")).resolves.toEqual(
        authResponse,
      );
      expect(fixture.isFollowing()).toBe(false);
      expect(timeout).toHaveBeenCalledWith(2_000);
    } finally {
      timeout.mockRestore();
    }
  });

  it("does not follow after a signup transaction fails to commit", async () => {
    const fixture = createFixture();
    fixture.db.transaction.mockImplementationOnce(async (callback) => {
      await callback({});
      throw new Error("commit failed");
    });

    await expect(authenticate(fixture, "signup")).rejects.toThrow();

    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(fixture.models.jwt.verify).not.toHaveBeenCalled();
  });

  it("does not follow when signup provisioning fails", async () => {
    const fixture = createFixture();
    fixture.createGiteaUser.mockRejectedValueOnce(
      new Error("provisioning failed"),
    );

    await expect(authenticate(fixture, "signup")).rejects.toThrow();

    expect(fixture.fetch).not.toHaveBeenCalled();
  });

  it.each(["bad password", "unknown user", "blocked user"])(
    "does not follow for %s",
    async (failure) => {
      const fixture = createFixture();
      if (failure === "bad password")
        fixture.models.user.verifyPassword.mockResolvedValueOnce(false);
      if (failure === "unknown user")
        fixture.models.user.getByMail.mockResolvedValueOnce(null);
      if (failure === "blocked user") fixture.user.isBlocked = true;

      await expect(authenticate(fixture, "password")).rejects.toBeInstanceOf(
        failure === "blocked user" ? ForbiddenError : BadUserInputError,
      );

      expect(fixture.fetch).not.toHaveBeenCalled();
      expect(fixture.models.jwt.create).not.toHaveBeenCalled();
    },
  );

  it("does not follow after an invalid signup OTP", async () => {
    const fixture = createFixture();

    await expect(
      fixture.workflow.verifySignUpOtp({ ...signup, otp: "0000" }),
    ).rejects.toBeInstanceOf(BadUserInputError);

    expect(fixture.fetch).not.toHaveBeenCalled();
    expect(fixture.models.user.create).not.toHaveBeenCalled();
  });

  it("does not follow a missing user after a one-time link", async () => {
    const fixture = createFixture();
    fixture.models.user.getById.mockResolvedValueOnce(null);

    await expect(authenticate(fixture, "one-time link")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    expect(fixture.fetch).not.toHaveBeenCalled();
  });

  it("does not follow if the newly issued session no longer verifies", async () => {
    const fixture = createFixture();
    fixture.models.jwt.verify.mockResolvedValueOnce(null);

    await expect(authenticate(fixture, "password")).resolves.toEqual(
      authResponse,
    );

    expect(fixture.fetch).not.toHaveBeenCalled();
  });

  it("does not follow on token refresh", async () => {
    const fixture = createFixture();

    await fixture.authService.refreshToken(fixture.user.id, "old-token");

    expect(fixture.fetch).not.toHaveBeenCalled();
  });
});
