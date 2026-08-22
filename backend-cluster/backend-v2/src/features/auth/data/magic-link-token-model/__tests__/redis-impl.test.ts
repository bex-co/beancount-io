import "reflect-metadata";
import { MagicLinkTokenRedisModel } from "../redis-impl";

const mockCache = {
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
      mockCache.get
        .mockResolvedValueOnce(JSON.stringify([existingId])) // get userKey (existing tokens)
        .mockResolvedValueOnce(null); // not used since userKey is reset

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
    it("should return null if not found", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.findOneAndDelete("nonexistent");

      expect(result).toBeNull();
      expect(mockCache.del).not.toHaveBeenCalled();
    });

    it("should return token data and delete it", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = { id: "id1", userId: "user1", expireAt: futureDate };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData)) // get tokenKey
        .mockResolvedValueOnce(JSON.stringify(["id1"])); // get userKey

      const result = await model.findOneAndDelete("id1");

      expect(result).toEqual(tokenData);
      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:magic_link_token:id:id1",
      );
    });

    it("should remove token from user mapping when other tokens remain (and set TTL)", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = { id: "id1", userId: "user1", expireAt: futureDate };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData))
        .mockResolvedValueOnce(JSON.stringify(["id1", "id2"]));

      await model.findOneAndDelete("id1");

      // Should call set with TTL (the bug fix)
      const setCall = mockCache.set.mock.calls.find(
        (c: any[]) => c[0] === "auth:magic_link_token:user:user1",
      );
      expect(setCall).toBeDefined();
      expect(setCall[1]).toBe(JSON.stringify(["id2"]));
      expect(setCall[2]).toBeGreaterThan(0);
    });

    it("should delete user mapping when no tokens remain", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = { id: "id1", userId: "user1", expireAt: futureDate };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData))
        .mockResolvedValueOnce(JSON.stringify(["id1"]));

      await model.findOneAndDelete("id1");

      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:magic_link_token:user:user1",
      );
    });

    it("should delete user mapping (not set) when TTL has expired", async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const tokenData = { id: "id1", userId: "user1", expireAt: pastDate };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData))
        .mockResolvedValueOnce(JSON.stringify(["id1", "id2"]));

      await model.findOneAndDelete("id1");

      expect(mockCache.del).toHaveBeenCalledWith(
        "auth:magic_link_token:user:user1",
      );
      const setForUserKey = mockCache.set.mock.calls.find(
        (c: any[]) => c[0] === "auth:magic_link_token:user:user1",
      );
      expect(setForUserKey).toBeUndefined();
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
