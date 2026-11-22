import "reflect-metadata";
import { ServiceUnavailableError } from "@/shared/errors";
import { MagicLinkTokenRedisModel } from "../redis-impl";

const keyvStore = {
  get: jest.fn(),
  delete: jest.fn(),
};

const mockCache = {
  stores: [keyvStore],
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
} as any;

describe("MagicLinkTokenRedisModel", () => {
  let model: MagicLinkTokenRedisModel;

  beforeEach(() => {
    model = new MagicLinkTokenRedisModel({ cache: mockCache });
    jest.clearAllMocks();
  });

  describe("regenerateToken", () => {
    it("should create a token with default expMins (5)", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.regenerateToken("user1");

      expect(result.userId).toBe("user1");
      expect(result.id).toBeTruthy();
      expect(result.expireAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Default 5 min TTL = 300000ms
      expect(mockCache.set).toHaveBeenCalledWith(
        `auth:magic_link_token:id:${result.id}`,
        JSON.stringify(result),
        5 * 60 * 1000,
      );
    });

    it("should create a token with custom expMins", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.regenerateToken("user1", 15);

      expect(mockCache.set).toHaveBeenCalledWith(
        `auth:magic_link_token:id:${result.id}`,
        JSON.stringify(result),
        15 * 60 * 1000,
      );
    });

    it("should delete existing tokens before creating new one", async () => {
      const existingId = "existing-token-id";
      mockCache.get.mockResolvedValueOnce(JSON.stringify([existingId]));

      await model.regenerateToken("user1");

      expect(mockCache.del).toHaveBeenCalledWith(
        `auth:magic_link_token:id:${existingId}`,
      );
      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:magic_link_token:user:user1",
      );
    });
  });

  describe("findOneAndDelete", () => {
    const tokenData = {
      id: "id1",
      userId: "user1",
      expireAt: "2026-11-22T10:00:00.000Z",
    };

    it("returns null when the token is absent", async () => {
      keyvStore.get.mockResolvedValueOnce(undefined);

      await expect(model.findOneAndDelete("nonexistent")).resolves.toBeNull();
      expect(keyvStore.delete).not.toHaveBeenCalled();
    });

    it("returns the token only if deletion succeeds and leaves the user index alone", async () => {
      keyvStore.get.mockResolvedValueOnce(JSON.stringify(tokenData));
      keyvStore.delete.mockResolvedValueOnce(true);

      await expect(model.findOneAndDelete("id1")).resolves.toEqual(tokenData);
      expect(keyvStore.delete).toHaveBeenCalledWith(
        "auth:magic_link_token:id:id1",
      );
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.del).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("returns null if deletion reports the key is already gone", async () => {
      keyvStore.get.mockResolvedValueOnce(JSON.stringify(tokenData));
      keyvStore.delete.mockResolvedValueOnce(false);

      await expect(model.findOneAndDelete("id1")).resolves.toBeNull();
    });

    it("fails closed without exposing driver command values", async () => {
      keyvStore.get.mockResolvedValueOnce(JSON.stringify(tokenData));
      keyvStore.delete.mockRejectedValueOnce(new Error("Redis: private-token"));

      const redemption = model.findOneAndDelete("id1");
      await expect(redemption).rejects.toBeInstanceOf(ServiceUnavailableError);
      await expect(redemption).rejects.not.toThrow("private-token");
    });
  });

  describe("findOne", () => {
    it("should return null if not found", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.findOne("nonexistent");

      expect(result).toBeNull();
    });

    it("should return token data without deleting", async () => {
      const tokenData = {
        id: "id1",
        userId: "user1",
        expireAt: new Date(Date.now() + 60000).toISOString(),
      };
      mockCache.get.mockResolvedValueOnce(JSON.stringify(tokenData));

      const result = await model.findOne("id1");

      expect(result).toEqual(tokenData);
      expect(mockCache.del).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });
});
