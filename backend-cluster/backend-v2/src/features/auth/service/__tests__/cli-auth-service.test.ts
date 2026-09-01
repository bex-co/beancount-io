import { CliAuthService } from "../cli-auth-service";
import type { IModels } from "@/foundation/models";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  CliAuthSession,
  CliAuthSessionStatus,
} from "@/features/auth/data/cli-auth-session-model/types";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";

const session = (overrides: Partial<CliAuthSession> = {}): CliAuthSession => ({
  id: "cli-session-1",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const browserIdentity: Identity = {
  userId: "user-1",
  method: "session",
  scopes: new Set(),
  capabilityExempt: true,
};

const scopedIdentity = (
  method: "apikey" | "oauth",
  scopes: string[] = ["ledger.write"],
): Identity => ({
  userId: "user-1",
  method,
  scopes: new Set(scopes),
  tokenId: `${method}-1`,
  capabilityExempt: false,
});

describe("CliAuthService", () => {
  let service: CliAuthService;
  let mockCliAuthSession: jest.Mocked<IModels["cliAuthSession"]>;
  let mockJwt: jest.Mocked<IModels["jwt"]>;
  const mockPostgresDb = {} as NodePgDatabase;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCliAuthSession = {
      createSession: jest.fn(),
      findById: jest.fn(),
      authorize: jest.fn(),
      deny: jest.fn(),
      consume: jest.fn(),
      findOneAndDelete: jest.fn(),
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

  describe("createSession", () => {
    it("returns the new session id and an expiry timestamp", async () => {
      mockCliAuthSession.createSession.mockResolvedValue(session());

      const result = await service.createSession();

      expect(result.sessionId).toBe("cli-session-1");
      expect(typeof result.expiresAt).toBe("string");
      expect(Number.isNaN(Date.parse(result.expiresAt))).toBe(false);
    });
  });

  describe("authorizeSession", () => {
    it("issues a JWT and stores it on a pending session", async () => {
      const expireAt = new Date("2026-01-01T01:00:00.000Z");
      mockCliAuthSession.findById.mockResolvedValue(session());
      mockJwt.create.mockResolvedValue({ token: "jwt-token", expireAt });

      await service.authorizeSession("cli-session-1", browserIdentity);

      expect(mockJwt.create).toHaveBeenCalledWith(mockPostgresDb, "user-1");
      expect(mockCliAuthSession.authorize).toHaveBeenCalledWith(
        "cli-session-1",
        "jwt-token",
        expireAt.toISOString(),
      );
    });

    it("throws when the session does not exist", async () => {
      mockCliAuthSession.findById.mockResolvedValue(null);

      await expect(
        service.authorizeSession("missing", browserIdentity),
      ).rejects.toThrow(BadUserInputError);
      expect(mockJwt.create).not.toHaveBeenCalled();
      expect(mockCliAuthSession.authorize).not.toHaveBeenCalled();
    });

    it("throws when the session is no longer pending", async () => {
      mockCliAuthSession.findById.mockResolvedValue(
        session({ status: "authorized" }),
      );

      await expect(
        service.authorizeSession("cli-session-1", browserIdentity),
      ).rejects.toThrow("already been used");
      expect(mockJwt.create).not.toHaveBeenCalled();
    });

    it.each(["apikey", "oauth"] as const)(
      "rejects a scoped %s credential before minting a JWT",
      async (method) => {
        await expect(
          service.authorizeSession(
            "cli-session-1",
            scopedIdentity(method, ["ledger.write", "ledger.admin"]),
          ),
        ).rejects.toThrow(ForbiddenError);

        expect(mockCliAuthSession.findById).not.toHaveBeenCalled();
        expect(mockJwt.create).not.toHaveBeenCalled();
        expect(mockCliAuthSession.authorize).not.toHaveBeenCalled();
      },
    );

    it("rejects a non-exempt identity even if it claims the session method", async () => {
      await expect(
        service.authorizeSession("cli-session-1", {
          ...browserIdentity,
          capabilityExempt: false,
        }),
      ).rejects.toThrow(ForbiddenError);

      expect(mockJwt.create).not.toHaveBeenCalled();
    });
  });

  describe("denySession", () => {
    it("denies a pending session", async () => {
      mockCliAuthSession.findById.mockResolvedValue(session());

      await service.denySession("cli-session-1", browserIdentity);

      expect(mockCliAuthSession.deny).toHaveBeenCalledWith("cli-session-1");
    });

    it("throws when the session is not pending", async () => {
      mockCliAuthSession.findById.mockResolvedValue(
        session({ status: "denied" }),
      );

      await expect(
        service.denySession("cli-session-1", browserIdentity),
      ).rejects.toThrow("already been used");
      expect(mockCliAuthSession.deny).not.toHaveBeenCalled();
    });

    it.each(["apikey", "oauth"] as const)(
      "rejects a scoped %s credential",
      async (method) => {
        await expect(
          service.denySession("cli-session-1", scopedIdentity(method)),
        ).rejects.toThrow(ForbiddenError);

        expect(mockCliAuthSession.findById).not.toHaveBeenCalled();
        expect(mockCliAuthSession.deny).not.toHaveBeenCalled();
      },
    );
  });

  describe("getSessionStatus", () => {
    it("returns null when the session is missing (treated as expired)", async () => {
      mockCliAuthSession.findById.mockResolvedValue(null);

      expect(await service.getSessionStatus("missing")).toBeNull();
    });

    it.each<CliAuthSessionStatus>([
      "pending",
      "authorized",
      "denied",
      "consumed",
    ])("returns the %s status", async (status) => {
      mockCliAuthSession.findById.mockResolvedValue(session({ status }));

      expect(await service.getSessionStatus("cli-session-1")).toBe(status);
    });
  });

  describe("consumeSession", () => {
    it("consumes an authorized session and returns its token", async () => {
      mockCliAuthSession.findById.mockResolvedValue(
        session({ status: "authorized" }),
      );
      mockCliAuthSession.consume.mockResolvedValue(
        session({
          status: "consumed",
          token: "jwt-token",
          expireAt: "2026-01-01T01:00:00.000Z",
        }),
      );

      const result = await service.consumeSession("cli-session-1");

      expect(result).toEqual({
        token: "jwt-token",
        expireAt: "2026-01-01T01:00:00.000Z",
      });
    });

    it("throws when the session is not authorized", async () => {
      mockCliAuthSession.findById.mockResolvedValue(session());

      await expect(service.consumeSession("cli-session-1")).rejects.toThrow(
        BadUserInputError,
      );
      expect(mockCliAuthSession.consume).not.toHaveBeenCalled();
    });
  });
});
