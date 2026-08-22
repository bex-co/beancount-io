import "reflect-metadata";
import { JwtPostgresModel } from "../postgres-impl";

jest.mock("@/features/auth/utils/jwt-crypto-utils", () => ({
  signJwt: jest.fn(),
  verifyJwt: jest.fn(),
}));

import { signJwt, verifyJwt } from "@/features/auth/utils/jwt-crypto-utils";

const mockSignJwt = signJwt as jest.MockedFunction<typeof signJwt>;
const mockVerifyJwt = verifyJwt as jest.MockedFunction<typeof verifyJwt>;

const mockDb = {
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
} as any;

describe("JwtPostgresModel", () => {
  let model: JwtPostgresModel;

  beforeEach(() => {
    model = new JwtPostgresModel({
      secret: "test-secret",
      expMins: 7 * 24 * 60,
    });
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should insert a JWT record and return signed token with expiry", async () => {
      const now = new Date();
      const mockRecord = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user1",
        expireAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createAt: now,
        updateAt: now,
      };

      mockDb.returning.mockResolvedValue([mockRecord]);
      mockSignJwt.mockResolvedValue("signed-jwt-token");

      const result = await model.create(mockDb, "user1");

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user1",
          expireAt: expect.any(Date),
          createAt: expect.any(Date),
          updateAt: expect.any(Date),
        }),
      );
      expect(result.token).toBe("signed-jwt-token");
      expect(result.expireAt).toEqual(mockRecord.expireAt);
    });

    it("should use UUID for the JWT ID", async () => {
      const mockRecord = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user1",
        expireAt: new Date(),
        createAt: new Date(),
        updateAt: new Date(),
      };

      mockDb.returning.mockResolvedValue([mockRecord]);
      mockSignJwt.mockResolvedValue("signed-jwt-token");

      await model.create(mockDb, "user1");

      const valuesCall = mockDb.values.mock.calls[0][0];
      // UUID format check
      expect(valuesCall.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("revoke", () => {
    it("should do nothing if token is invalid (verifyJwt returns null)", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      await model.revoke(mockDb, "invalid-token");

      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("should delete the JWT record if token is valid", async () => {
      mockVerifyJwt.mockResolvedValue({
        jti: "jwt-id-123",
        sub: "user1",
        exp: 9999999999,
        iat: 1000000000,
      });

      await model.revoke(mockDb, "valid-token");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("verify", () => {
    it("should return null if JWT signature is invalid", async () => {
      mockVerifyJwt.mockResolvedValue(null);

      const result = await model.verify(mockDb, "bad-token");

      expect(result).toBeNull();
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it("should return null if JWT not found in database", async () => {
      mockVerifyJwt.mockResolvedValue({
        jti: "jwt-id-123",
        sub: "user1",
        exp: 9999999999,
        iat: 1000000000,
      });

      mockDb.limit.mockResolvedValue([]); // Not found in DB

      const result = await model.verify(mockDb, "valid-sig-not-in-db");

      expect(result).toBeNull();
    });

    it("should return userId if JWT is valid and found in database", async () => {
      mockVerifyJwt.mockResolvedValue({
        jti: "jwt-id-123",
        sub: "user1",
        exp: 9999999999,
        iat: 1000000000,
      });

      mockDb.limit.mockResolvedValue([{ id: "jwt-id-123", userId: "user1" }]);

      const result = await model.verify(mockDb, "valid-token");

      expect(result).toBe("user1");
    });
  });

  describe("deleteByUserId", () => {
    it("should delete all JWTs for a user", async () => {
      await model.deleteByUserId(mockDb, "user1");

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("deleteExpired", () => {
    it("should delete all expired JWTs", async () => {
      await model.deleteExpired(mockDb);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
    });
  });
});
