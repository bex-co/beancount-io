import "reflect-metadata";
import { EmailTokenRedisModel } from "../redis-impl";

const mockCache = {
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(undefined),
} as any;

describe("EmailTokenRedisModel", () => {
  let model: EmailTokenRedisModel;

  beforeEach(() => {
    model = new EmailTokenRedisModel({ cache: mockCache, expMins: 30 });
    jest.clearAllMocks();
  });

  describe("regenerateToken", () => {
    it("should create a token with TTL", async () => {
      // No existing tokens for user
      mockCache.get.mockResolvedValue(null);

      const result = await model.regenerateToken("user1");

      expect(result.userId).toBe("user1");
      expect(result.token).toBeTruthy();
      expect(result.expireAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // cache.set called with TTL (30 mins = 1800000ms)
      expect(mockCache.set).toHaveBeenCalledWith(
        `auth:email_token:token:${result.token}`,
        JSON.stringify(result),
        30 * 60 * 1000,
      );
    });

    it("should delete existing tokens before creating new one", async () => {
      // Existing token for the user
      const existingToken = "old-token-uuid";
      mockCache.get
        .mockResolvedValueOnce(JSON.stringify([existingToken])) // deleteByUserId: get user key
        .mockResolvedValueOnce(null); // regenerateToken: get user key after delete

      await model.regenerateToken("user1");

      // Should have deleted the old token key
      expect(mockCache.del).toHaveBeenCalledWith(
        `auth:email_token:token:${existingToken}`,
      );
      // Should have deleted the user mapping key
      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:user:user1");
    });

    it("should store both the token key and user mapping key", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.regenerateToken("user1");

      const tokenKey = `auth:email_token:token:${result.token}`;
      const userKey = "auth:email_token:user:user1";

      expect(mockCache.set).toHaveBeenCalledWith(
        tokenKey,
        JSON.stringify(result),
        expect.any(Number),
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        userKey,
        expect.any(String),
        expect.any(Number),
      );
    });
  });

  describe("findOneAndDelete", () => {
    it("should return null if token not found", async () => {
      mockCache.get.mockResolvedValue(null);

      const result = await model.findOneAndDelete("nonexistent");

      expect(result).toBeNull();
      expect(mockCache.del).not.toHaveBeenCalled();
    });

    it("should return the token data and delete it", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = {
        token: "tok1",
        userId: "user1",
        expireAt: futureDate,
      };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData)) // get tokenKey
        .mockResolvedValueOnce(JSON.stringify(["tok1"])); // get userKey

      const result = await model.findOneAndDelete("tok1");

      expect(result).toEqual(tokenData);
      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:token:tok1");
    });

    it("should remove the token from user mapping when other tokens remain (and set TTL)", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = {
        token: "tok1",
        userId: "user1",
        expireAt: futureDate,
      };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData)) // get tokenKey
        .mockResolvedValueOnce(JSON.stringify(["tok1", "tok2"])); // get userKey (two tokens)

      await model.findOneAndDelete("tok1");

      // Should update user mapping with TTL (the bug fix)
      const setCall = mockCache.set.mock.calls.find(
        (c: any[]) => c[0] === "auth:email_token:user:user1",
      );
      expect(setCall).toBeDefined();
      expect(setCall[1]).toBe(JSON.stringify(["tok2"]));
      expect(setCall[2]).toBeGreaterThan(0);
    });

    it("should delete user mapping key when no tokens remain", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = {
        token: "tok1",
        userId: "user1",
        expireAt: futureDate,
      };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData)) // get tokenKey
        .mockResolvedValueOnce(JSON.stringify(["tok1"])); // get userKey (only one token)

      await model.findOneAndDelete("tok1");

      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:user:user1");
      // Should NOT call set for userKey
      const setForUserKey = mockCache.set.mock.calls.find(
        (c: any[]) => c[0] === "auth:email_token:user:user1",
      );
      expect(setForUserKey).toBeUndefined();
    });

    it("should delete user mapping when filtered list is empty", async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const tokenData = {
        token: "tok1",
        userId: "user1",
        expireAt: futureDate,
      };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData))
        .mockResolvedValueOnce(JSON.stringify(["tok1"]));

      await model.findOneAndDelete("tok1");

      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:user:user1");
    });

    it("should call del on userKey (not set) when TTL has already expired", async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const tokenData = { token: "tok1", userId: "user1", expireAt: pastDate };

      mockCache.get
        .mockResolvedValueOnce(JSON.stringify(tokenData))
        .mockResolvedValueOnce(JSON.stringify(["tok1", "tok2"]));

      await model.findOneAndDelete("tok1");

      // When remainingTtlMs <= 0, should delete instead of set
      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:user:user1");
      const setForUserKey = mockCache.set.mock.calls.find(
        (c: any[]) => c[0] === "auth:email_token:user:user1",
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
        token: "tok1",
        userId: "user1",
        expireAt: new Date(Date.now() + 60000).toISOString(),
      };
      mockCache.get.mockResolvedValueOnce(JSON.stringify(tokenData));

      const result = await model.findOne("tok1");

      expect(result).toEqual(tokenData);
      expect(mockCache.del).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe("deleteByUserId", () => {
    it("should do nothing if no tokens exist for user", async () => {
      mockCache.get.mockResolvedValue(null);

      await model.deleteByUserId("user1");

      expect(mockCache.del).not.toHaveBeenCalled();
    });

    it("should delete all tokens for user", async () => {
      mockCache.get.mockResolvedValueOnce(JSON.stringify(["tok1", "tok2"]));

      await model.deleteByUserId("user1");

      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:token:tok1");
      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:token:tok2");
      expect(mockCache.del).toHaveBeenCalledWith("auth:email_token:user:user1");
    });
  });
});
