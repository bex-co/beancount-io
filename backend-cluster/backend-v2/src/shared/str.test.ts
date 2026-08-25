import {
  getRandomString,
  getLedgerUsername,
  base64UrlEncode,
  base64UrlDecode,
  createLedgerId,
  parseLedgerId,
} from "./str";

describe("str utilities", () => {
  describe("getRandomString", () => {
    it("should generate a string of the specified length", () => {
      const length = 10;
      const result = getRandomString(length);

      expect(result).toHaveLength(length);
    });

    it("should generate a string with only alphanumeric characters", () => {
      const result = getRandomString(20);

      expect(result).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it("should generate different strings on multiple calls", () => {
      const result1 = getRandomString(20);
      const result2 = getRandomString(20);

      // While theoretically possible to be the same, it's extremely unlikely
      expect(result1).not.toBe(result2);
    });

    it("should handle length of 1", () => {
      const result = getRandomString(1);

      expect(result).toHaveLength(1);
      expect(result).toMatch(/^[a-zA-Z0-9]$/);
    });

    it("should handle length of 0", () => {
      const result = getRandomString(0);

      expect(result).toBe("");
    });

    it("does not depend on Math.random", () => {
      const mathRandom = jest
        .spyOn(Math, "random")
        .mockImplementation(() => {
          throw new Error("insecure PRNG called");
        });

      expect(getRandomString(16)).toMatch(/^[a-zA-Z0-9]{16}$/);
      expect(mathRandom).not.toHaveBeenCalled();
      mathRandom.mockRestore();
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects invalid length %s",
      (length) => {
        expect(() => getRandomString(length)).toThrow(RangeError);
      },
    );
  });

  describe("getLedgerUsername", () => {
    it("should extract username from email", () => {
      const result = getLedgerUsername("john.doe@example.com");

      expect(result).toBe("johndoe");
    });

    it("should remove special characters and convert to lowercase", () => {
      const result = getLedgerUsername("John_Doe-123@example.com");

      expect(result).toBe("johndoe123");
    });

    it("should handle email with dots and dashes", () => {
      const result = getLedgerUsername("test.user-name@example.com");

      expect(result).toBe("testusername");
    });

    it("should handle email with numbers", () => {
      const result = getLedgerUsername("user123@example.com");

      expect(result).toBe("user123");
    });

    it("should handle uppercase email", () => {
      const result = getLedgerUsername("TESTUSER@EXAMPLE.COM");

      expect(result).toBe("testuser");
    });

    it("should handle email with only numbers in username", () => {
      const result = getLedgerUsername("12345@example.com");

      expect(result).toBe("12345");
    });
  });

  describe("base64UrlEncode and base64UrlDecode", () => {
    it("should encode and decode a simple string", () => {
      const original = "hello world";
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);

      expect(decoded).toBe(original);
    });

    it("should handle strings with special characters", () => {
      const original = "user/repo-name_123";
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);

      expect(decoded).toBe(original);
    });

    it("should handle empty string", () => {
      const original = "";
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);

      expect(decoded).toBe(original);
    });

    it("should handle unicode characters", () => {
      const original = "hello 世界 🌍";
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);

      expect(decoded).toBe(original);
    });

    it("should produce URL-safe encoding (no + or /)", () => {
      // This string when base64 encoded normally contains + and /
      const original = "subjects?_d=1";
      const encoded = base64UrlEncode(original);

      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(encoded).not.toContain("=");
    });
  });

  describe("createLedgerId and parseLedgerId", () => {
    it("should create a ledger ID as owner/name", () => {
      expect(createLedgerId("john", "my-ledger")).toBe("john/my-ledger");
    });

    it("should create and parse a ledger ID", () => {
      const owner = "john";
      const name = "my-ledger";

      const ledgerId = createLedgerId(owner, name);
      const parsed = parseLedgerId(ledgerId);

      expect(parsed.ledgerOwner).toBe(owner);
      expect(parsed.ledgerName).toBe(name);
    });

    it("should handle owner and name with special characters", () => {
      const owner = "user_123";
      const name = "ledger-2024";

      const ledgerId = createLedgerId(owner, name);
      const parsed = parseLedgerId(ledgerId);

      expect(parsed.ledgerOwner).toBe(owner);
      expect(parsed.ledgerName).toBe(name);
    });

    it("should split on first slash to support names with slashes", () => {
      const parsed = parseLedgerId("owner/my/ledger");

      expect(parsed.ledgerOwner).toBe("owner");
      expect(parsed.ledgerName).toBe("my/ledger");
    });

    it("should throw error when parsing empty ID", () => {
      expect(() => parseLedgerId("")).toThrow("Ledger ID cannot be empty");
    });

    it("should throw error when parsing ID without separator", () => {
      expect(() => parseLedgerId("no-separator-here")).toThrow(
        "Invalid ledger ID: must contain '/' separator",
      );
    });

    it("should throw error when owner is empty", () => {
      expect(() => parseLedgerId("/ledger-name")).toThrow(
        "Invalid ledger ID: owner and name cannot be empty",
      );
    });

    it("should throw error when name is empty", () => {
      expect(() => parseLedgerId("owner/")).toThrow(
        "Invalid ledger ID: owner and name cannot be empty",
      );
    });
  });
});
