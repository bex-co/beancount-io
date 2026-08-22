import { LOCK_KEYS } from "./lock-keys";

describe("LOCK_KEYS", () => {
  describe("INFRA", () => {
    it("should have postgres initialization key", () => {
      expect(LOCK_KEYS.INFRA.INIT_POSTGRES).toBe("infra:init:postgres");
    });

    it("should have redis initialization key", () => {
      expect(LOCK_KEYS.INFRA.INIT_REDIS).toBe("infra:init:redis");
    });
  });

  describe("USER", () => {
    it("should generate register lock key with email", () => {
      const email = "test@example.com";
      expect(LOCK_KEYS.USER.register(email)).toBe(`user:register:${email}`);
    });

    it("should generate update username lock key with userId", () => {
      const userId = "user-123";
      expect(LOCK_KEYS.USER.updateUsername(userId)).toBe(
        `user:update-username:${userId}`,
      );
    });

    it("should generate unique keys for different users", () => {
      const key1 = LOCK_KEYS.USER.updateUsername("user-1");
      const key2 = LOCK_KEYS.USER.updateUsername("user-2");
      expect(key1).not.toBe(key2);
    });

    it("should generate update email lock key with userId", () => {
      const userId = "user-123";
      expect(LOCK_KEYS.USER.updateEmail(userId)).toBe(
        `user:update-email:${userId}`,
      );
    });
  });

  describe("API_KEY", () => {
    it("should generate create API key lock key with userId", () => {
      const userId = "user-123";
      expect(LOCK_KEYS.API_KEY.create(userId)).toBe(`api-key:create:${userId}`);
    });

    it("should generate unique keys for different users", () => {
      const key1 = LOCK_KEYS.API_KEY.create("user-1");
      const key2 = LOCK_KEYS.API_KEY.create("user-2");
      expect(key1).not.toBe(key2);
    });
  });

  describe("LEDGER", () => {
    it("should generate create ledger lock key with userId", () => {
      const userId = "user-123";
      expect(LOCK_KEYS.LEDGER.create(userId)).toBe(`ledger:create:${userId}`);
    });

    it("should generate unique keys for different users", () => {
      const key1 = LOCK_KEYS.LEDGER.create("user-1");
      const key2 = LOCK_KEYS.LEDGER.create("user-2");
      expect(key1).not.toBe(key2);
    });
  });

  describe("key collision prevention", () => {
    it("should not collide between different namespaces", () => {
      const userId = "user-123";
      const userKey = LOCK_KEYS.USER.updateUsername(userId);
      const apiKeyKey = LOCK_KEYS.API_KEY.create(userId);
      const ledgerKey = LOCK_KEYS.LEDGER.create(userId);

      expect(userKey).not.toBe(apiKeyKey);
      expect(userKey).not.toBe(ledgerKey);
      expect(apiKeyKey).not.toBe(ledgerKey);
    });

    it("should not collide with infrastructure keys even with matching identifiers", () => {
      // If a userId happens to be "init", it shouldn't collide with infra keys
      const userId = "init";
      const userKey = LOCK_KEYS.USER.updateUsername(userId);
      const ledgerKey = LOCK_KEYS.LEDGER.create(userId);

      expect(userKey).not.toBe(LOCK_KEYS.INFRA.INIT_POSTGRES);
      expect(userKey).not.toBe(LOCK_KEYS.INFRA.INIT_REDIS);
      expect(ledgerKey).not.toBe(LOCK_KEYS.INFRA.INIT_POSTGRES);
      expect(ledgerKey).not.toBe(LOCK_KEYS.INFRA.INIT_REDIS);
    });

    it("should follow consistent namespace:action:identifier pattern", () => {
      const patterns = [
        LOCK_KEYS.INFRA.INIT_POSTGRES,
        LOCK_KEYS.INFRA.INIT_REDIS,
        LOCK_KEYS.USER.register("test@example.com"),
        LOCK_KEYS.USER.updateUsername("user-123"),
        LOCK_KEYS.API_KEY.create("user-123"),
        LOCK_KEYS.LEDGER.create("user-123"),
      ];

      patterns.forEach((pattern) => {
        // Should have exactly 2 colons (namespace:action:identifier)
        const colonCount = (pattern.match(/:/g) || []).length;
        expect(colonCount).toBe(2);

        // Should not have trailing colons
        expect(pattern.endsWith(":")).toBe(false);

        // Should not have consecutive colons
        expect(pattern.includes("::")).toBe(false);
      });
    });
  });
});
