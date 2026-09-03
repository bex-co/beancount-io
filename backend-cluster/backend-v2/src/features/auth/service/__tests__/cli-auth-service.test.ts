import { CliAuthService } from "../cli-auth-service";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CliAuthSession,
  CliAuthSessionStatus,
  CreateCliAuthSessionInput,
} from "@/features/auth/data/cli-auth-session-model/types";
import { deviceCodeDigest } from "@/features/auth/utils/cli-auth-codes";
import { incrementInWindow } from "@/foundation/redis/redis-counter";
import type { Identity } from "@/server/api/identity";
import {
  BadUserInputError,
  ForbiddenError,
  RateLimitedError,
  ServiceUnavailableError,
} from "@/shared/errors";

jest.mock("@/foundation/redis/redis-counter", () => ({
  incrementInWindow: jest.fn(),
}));

const mockIncrementInWindow = incrementInWindow as jest.MockedFunction<
  typeof incrementInWindow
>;

const DEVICE_CODE = "device-code-under-test";
const USER_CODE = "BCDF-GHJK";

const session = (overrides: Partial<CliAuthSession> = {}): CliAuthSession => ({
  id: "clis_1",
  status: "pending",
  deviceCodeDigest: deviceCodeDigest(DEVICE_CODE),
  userCode: USER_CODE,
  client: { name: "beancount-cli" },
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const browserIdentity: Identity = {
  userId: "user-1",
  method: "session",
  scopes: new Set(),
};

const scopedIdentity = (
  method: "apikey" | "oauth",
  scopes: string[] = ["ledger.write"],
): Identity => ({
  userId: "user-1",
  method,
  scopes: new Set(scopes),
  tokenId: `${method}-1`,
});

describe("CliAuthService", () => {
  let service: CliAuthService;
  let mockCliAuthSession: jest.Mocked<IModels["cliAuthSession"]>;
  let mockJwt: jest.Mocked<IModels["jwt"]>;
  const mockPostgresDb = {} as NodePgDatabase;

  beforeEach(() => {
    jest.clearAllMocks();

    // Every claim and attempt budget is fresh unless a test says otherwise.
    mockIncrementInWindow.mockResolvedValue({ count: 1, resetInMs: 60_000 });

    mockCliAuthSession = {
      createSession: jest.fn(),
      findById: jest.fn(),
      findByDeviceCodeDigest: jest.fn(),
      findByUserCode: jest.fn(),
      authorize: jest.fn(),
      deny: jest.fn(),
      consume: jest.fn(),
    } as unknown as jest.Mocked<IModels["cliAuthSession"]>;

    mockJwt = {
      create: jest.fn(),
      verify: jest.fn(),
      revoke: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    } as unknown as jest.Mocked<IModels["jwt"]>;

    service = new CliAuthService(
      { cliAuthSession: mockCliAuthSession, jwt: mockJwt },
      mockPostgresDb,
    );
  });

  const createdInput = (): CreateCliAuthSessionInput =>
    mockCliAuthSession.createSession.mock.calls[0][0];

  describe("createSession", () => {
    beforeEach(() => {
      mockCliAuthSession.createSession.mockImplementation(async (input) =>
        session({
          deviceCodeDigest: input.deviceCodeDigest,
          userCode: input.userCode,
          client: input.client,
        }),
      );
    });

    it("returns a device code and a separate user code", async () => {
      const result = await service.createSession({ name: "beancount-cli" });

      expect(result.deviceCode).toEqual(expect.any(String));
      expect(result.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(result.deviceCode).not.toBe(result.userCode);
      expect(Number.isNaN(Date.parse(result.expiresAt))).toBe(false);
    });

    it("stores only the digest of the device code, never the code itself", async () => {
      const result = await service.createSession({ name: "beancount-cli" });

      const stored = createdInput();
      expect(stored.deviceCodeDigest).toBe(deviceCodeDigest(result.deviceCode));
      expect(JSON.stringify(stored)).not.toContain(result.deviceCode);
    });

    it("issues a distinct device code and user code per session", async () => {
      const first = await service.createSession({ name: "beancount-cli" });
      const second = await service.createSession({ name: "beancount-cli" });

      expect(first.deviceCode).not.toBe(second.deviceCode);
      expect(first.userCode).not.toBe(second.userCode);
    });

    it("records the reported client and the observed address for the consent screen", async () => {
      await service.createSession(
        {
          name: "beancount-cli",
          version: "0.4.1",
          deviceLabel: "tian-mbp",
          platform: "darwin 25.5.0",
        },
        "203.0.113.7",
      );

      expect(createdInput().client).toEqual({
        name: "beancount-cli",
        version: "0.4.1",
        deviceLabel: "tian-mbp",
        platform: "darwin 25.5.0",
        ipAddress: "203.0.113.7",
      });
    });

    it("bounds and flattens self-reported client text before it reaches a browser", async () => {
      await service.createSession({
        name: `Trusted\nCLI${"!".repeat(200)}`,
        deviceLabel: "  ",
      });

      const { client } = createdInput();
      expect(client.name).not.toContain("\n");
      expect(client.name.length).toBeLessThanOrEqual(40);
      expect(client.deviceLabel).toBeUndefined();
    });

    it("names an unidentified client rather than showing an empty consent screen", async () => {
      await service.createSession({});

      expect(createdInput().client.name).toBe("Unidentified client");
    });
  });

  describe("describeRequest", () => {
    it("returns the requesting device's context without any redeemable value", async () => {
      const stored = session();
      mockCliAuthSession.findByUserCode.mockResolvedValue(stored);

      const view = await service.describeRequest(USER_CODE, browserIdentity);

      expect(view.status).toBe("pending");
      expect(view.client).toEqual(stored.client);
      expect(JSON.stringify(view)).not.toContain(stored.deviceCodeDigest);
      expect(JSON.stringify(view)).not.toContain(stored.id);
    });

    it("accepts the code as typed, hyphens and case notwithstanding", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(session());

      await service.describeRequest(" bcdfghjk ", browserIdentity);

      expect(mockCliAuthSession.findByUserCode).toHaveBeenCalledWith(USER_CODE);
    });

    it("rejects a scoped credential before looking anything up", async () => {
      await expect(
        service.describeRequest(USER_CODE, scopedIdentity("oauth")),
      ).rejects.toThrow(ForbiddenError);

      expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
    });
  });

  describe("authorizeSession", () => {
    it("issues a short-lived JWT and stores it against the session", async () => {
      const expireAt = new Date("2026-01-31T00:00:00.000Z");
      mockCliAuthSession.findByUserCode.mockResolvedValue(session());
      mockJwt.create.mockResolvedValue({ token: "jwt-token", expireAt });

      await service.authorizeSession(USER_CODE, browserIdentity);

      expect(mockJwt.create).toHaveBeenCalledWith(
        mockPostgresDb,
        "user-1",
        30 * 24 * 60,
      );
      expect(mockCliAuthSession.authorize).toHaveBeenCalledWith(
        "clis_1",
        "jwt-token",
        expireAt.toISOString(),
        "user-1",
      );
    });

    it("throws when no session answers to the code", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(null);

      await expect(
        service.authorizeSession(USER_CODE, browserIdentity),
      ).rejects.toThrow(BadUserInputError);
      expect(mockJwt.create).not.toHaveBeenCalled();
      expect(mockCliAuthSession.authorize).not.toHaveBeenCalled();
    });

    it("rejects a malformed code without a lookup, but still spends an attempt", async () => {
      await expect(
        service.authorizeSession("not-a-code", browserIdentity),
      ).rejects.toThrow(BadUserInputError);

      expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
      expect(mockIncrementInWindow).toHaveBeenCalledTimes(1);
    });

    it("throws when the session is no longer pending", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(
        session({ status: "authorized" }),
      );

      await expect(
        service.authorizeSession(USER_CODE, browserIdentity),
      ).rejects.toThrow("already been used");
      expect(mockJwt.create).not.toHaveBeenCalled();
    });

    it("mints one credential when the approval is submitted twice", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(session());
      mockJwt.create.mockResolvedValue({
        token: "jwt-token",
        expireAt: new Date("2026-01-31T00:00:00.000Z"),
      });
      // The second click loses the atomic claim, whichever instance serves it.
      mockIncrementInWindow
        .mockResolvedValueOnce({ count: 1, resetInMs: 60_000 })
        .mockResolvedValueOnce({ count: 1, resetInMs: 60_000 })
        .mockResolvedValueOnce({ count: 2, resetInMs: 60_000 })
        .mockResolvedValueOnce({ count: 2, resetInMs: 60_000 });

      await service.authorizeSession(USER_CODE, browserIdentity);
      await expect(
        service.authorizeSession(USER_CODE, browserIdentity),
      ).rejects.toThrow(BadUserInputError);

      expect(mockJwt.create).toHaveBeenCalledTimes(1);
    });

    it("stops answering after the user-code attempt budget is spent", async () => {
      mockIncrementInWindow.mockResolvedValue({ count: 21, resetInMs: 30_000 });

      await expect(
        service.authorizeSession(USER_CODE, browserIdentity),
      ).rejects.toThrow(RateLimitedError);
      expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
    });

    it("fails closed when the attempt budget cannot be counted", async () => {
      mockIncrementInWindow.mockResolvedValue(undefined);

      await expect(
        service.authorizeSession(USER_CODE, browserIdentity),
      ).rejects.toThrow(ServiceUnavailableError);
      expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
    });

    it.each(["apikey", "oauth"] as const)(
      "rejects a scoped %s credential before minting a JWT",
      async (method) => {
        await expect(
          service.authorizeSession(
            USER_CODE,
            scopedIdentity(method, ["ledger.write", "ledger.admin"]),
          ),
        ).rejects.toThrow(ForbiddenError);

        expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
        expect(mockJwt.create).not.toHaveBeenCalled();
        expect(mockCliAuthSession.authorize).not.toHaveBeenCalled();
      },
    );

    it("rejects a non-interactive identity even if it claims the session method", async () => {
      await expect(
        service.authorizeSession(USER_CODE, {
          ...browserIdentity,
          assurance: { type: "delegated" },
        }),
      ).rejects.toThrow(ForbiddenError);

      expect(mockJwt.create).not.toHaveBeenCalled();
    });
  });

  describe("denySession", () => {
    it("denies a pending session named by its user code", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(session());

      await service.denySession(USER_CODE, browserIdentity);

      expect(mockCliAuthSession.deny).toHaveBeenCalledWith("clis_1");
    });

    it("throws when the session is not pending", async () => {
      mockCliAuthSession.findByUserCode.mockResolvedValue(
        session({ status: "denied" }),
      );

      await expect(
        service.denySession(USER_CODE, browserIdentity),
      ).rejects.toThrow("already been used");
      expect(mockCliAuthSession.deny).not.toHaveBeenCalled();
    });

    it.each(["apikey", "oauth"] as const)(
      "rejects a scoped %s credential",
      async (method) => {
        await expect(
          service.denySession(USER_CODE, scopedIdentity(method)),
        ).rejects.toThrow(ForbiddenError);

        expect(mockCliAuthSession.findByUserCode).not.toHaveBeenCalled();
        expect(mockCliAuthSession.deny).not.toHaveBeenCalled();
      },
    );
  });

  describe("getSessionStatus", () => {
    it.each<CliAuthSessionStatus>([
      "pending",
      "authorized",
      "denied",
      "consumed",
    ])(
      "returns the %s status to the holder of the device code",
      async (status) => {
        mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(
          session({ status }),
        );

        expect(await service.getSessionStatus(DEVICE_CODE)).toBe(status);
        expect(mockCliAuthSession.findByDeviceCodeDigest).toHaveBeenCalledWith(
          deviceCodeDigest(DEVICE_CODE),
        );
      },
    );

    it("returns null when the session is missing (treated as expired)", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(null);

      expect(await service.getSessionStatus(DEVICE_CODE)).toBeNull();
    });

    it("answers null for a device code whose digest does not match the record", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(
        session({ deviceCodeDigest: deviceCodeDigest("some-other-code") }),
      );

      expect(await service.getSessionStatus(DEVICE_CODE)).toBeNull();
    });
  });

  describe("consumeSession", () => {
    const authorized = () =>
      session({
        status: "authorized",
        token: "jwt-token",
        expireAt: "2026-01-31T00:00:00.000Z",
      });

    it("consumes an authorized session and returns its token", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(authorized());
      mockCliAuthSession.consume.mockResolvedValue(authorized());

      const result = await service.consumeSession(DEVICE_CODE);

      expect(result).toEqual({
        token: "jwt-token",
        expireAt: "2026-01-31T00:00:00.000Z",
      });
    });

    it("refuses a caller that does not hold the device code", async () => {
      // The record exists; this caller's code simply is not the one that made it.
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(
        session({
          status: "authorized",
          token: "jwt-token",
          deviceCodeDigest: deviceCodeDigest("attacker-guess"),
        }),
      );

      await expect(service.consumeSession(DEVICE_CODE)).rejects.toThrow(
        BadUserInputError,
      );
      expect(mockCliAuthSession.consume).not.toHaveBeenCalled();
    });

    it("cannot be redeemed with the browser's user code", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(null);

      await expect(service.consumeSession(USER_CODE)).rejects.toThrow(
        BadUserInputError,
      );
      expect(mockCliAuthSession.consume).not.toHaveBeenCalled();
    });

    it("returns the token to exactly one caller when two redeem at once", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(authorized());
      mockCliAuthSession.consume.mockResolvedValue(authorized());
      mockIncrementInWindow
        .mockResolvedValueOnce({ count: 1, resetInMs: 60_000 })
        .mockResolvedValueOnce({ count: 2, resetInMs: 60_000 });

      const [first, second] = await Promise.allSettled([
        service.consumeSession(DEVICE_CODE),
        service.consumeSession(DEVICE_CODE),
      ]);

      expect(first.status).toBe("fulfilled");
      expect(second.status).toBe("rejected");
      expect(mockCliAuthSession.consume).toHaveBeenCalledTimes(1);
    });

    it("throws when the session is not authorized", async () => {
      mockCliAuthSession.findByDeviceCodeDigest.mockResolvedValue(session());

      await expect(service.consumeSession(DEVICE_CODE)).rejects.toThrow(
        BadUserInputError,
      );
      expect(mockCliAuthSession.consume).not.toHaveBeenCalled();
    });
  });
});
