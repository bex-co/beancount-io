import { describe, it, expect } from "vitest";
import {
  decodeLedgerId,
  base64UrlEncode,
  base64UrlDecode,
  base64Encode,
  base64Decode,
  parseLedgerFullName,
  formatLedgerDisplayName,
} from "@/common/lib/utils/encode";

describe("Encode Utility", () => {
  describe("base64UrlEncode", () => {
    it("should encode a simple string", () => {
      const result = base64UrlEncode("hello");
      expect(result).toBe("aGVsbG8");
    });

    it("should replace + with - in base64 output", () => {
      // Characters that produce + in base64
      const input = String.fromCharCode(251, 239); // These bytes produce + in base64
      const result = base64UrlEncode(input);
      expect(result).not.toContain("+");
    });

    it("should replace / with _ in base64 output", () => {
      // Characters that produce / in base64
      const input = String.fromCharCode(255, 239); // These bytes produce / in base64
      const result = base64UrlEncode(input);
      expect(result).not.toContain("/");
    });

    it("should remove padding (=)", () => {
      const result = base64UrlEncode("hello world");
      expect(result).not.toContain("=");
    });

    it("should handle empty string", () => {
      const result = base64UrlEncode("");
      expect(result).toBe("");
    });

    it("should handle special characters", () => {
      const input = "owner/ledger";
      const result = base64UrlEncode(input);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should be URL-safe (no +, /, or =)", () => {
      const testStrings = [
        "hello world",
        "test@example.com",
        "user/path/to/resource",
        "a".repeat(100),
      ];

      testStrings.forEach((str) => {
        const result = base64UrlEncode(str);
        expect(result).not.toContain("+");
        expect(result).not.toContain("/");
        expect(result).not.toContain("=");
      });
    });
  });

  describe("base64UrlDecode", () => {
    it("should decode a simple base64url string", () => {
      const encoded = base64UrlEncode("hello");
      const result = base64UrlDecode(encoded);
      expect(result).toBe("hello");
    });

    it("should handle strings with - (plus replacement)", () => {
      const encoded = "aGVsbG8-d29ybGQ"; // contains -
      const result = base64UrlDecode(encoded);
      expect(result).toBeTruthy();
    });

    it("should handle strings with _ (slash replacement)", () => {
      const encoded = "aGVsbG8_d29ybGQ"; // contains _
      const result = base64UrlDecode(encoded);
      expect(result).toBeTruthy();
    });

    it("should add padding when needed", () => {
      // Test with different padding requirements
      const testCases = [
        base64UrlEncode("a"), // Will need padding
        base64UrlEncode("ab"),
        base64UrlEncode("abc"),
        base64UrlEncode("abcd"),
      ];

      testCases.forEach((encoded) => {
        const decoded = base64UrlDecode(encoded);
        expect(decoded).toBeTruthy();
      });
    });

    it("should round-trip encode/decode", () => {
      const original = "owner/ledger-name_123";
      const encoded = base64UrlEncode(original);
      const decoded = base64UrlDecode(encoded);
      expect(decoded).toBe(original);
    });

    it("should handle empty string", () => {
      const result = base64UrlDecode("");
      expect(result).toBe("");
    });
  });

  describe("decodeLedgerId", () => {
    it("should decode a valid ledger ID correctly", () => {
      const result = decodeLedgerId("owner1/ledger1");

      expect(result).toEqual({
        ledgerOwner: "owner1",
        ledgerName: "ledger1",
      });
    });

    it("should handle different owner and ledger names", () => {
      const result = decodeLedgerId("alice/my-ledger");

      expect(result).toEqual({
        ledgerOwner: "alice",
        ledgerName: "my-ledger",
      });
    });

    it("should handle ledger names with special characters", () => {
      const result = decodeLedgerId("user123/ledger-2024_v1");

      expect(result).toEqual({
        ledgerOwner: "user123",
        ledgerName: "ledger-2024_v1",
      });
    });

    it("should handle long owner and ledger names", () => {
      const longOwner = "verylongownername123456789";
      const longLedger = "verylongledgername987654321";
      const result = decodeLedgerId(`${longOwner}/${longLedger}`);

      expect(result).toEqual({
        ledgerOwner: longOwner,
        ledgerName: longLedger,
      });
    });

    it("should handle owner names with underscores", () => {
      const result = decodeLedgerId("owner_with_underscores/simple-ledger");

      expect(result).toEqual({
        ledgerOwner: "owner_with_underscores",
        ledgerName: "simple-ledger",
      });
    });

    it("should handle ledger names with dots", () => {
      const result = decodeLedgerId("owner/ledger.backup");

      expect(result).toEqual({
        ledgerOwner: "owner",
        ledgerName: "ledger.backup",
      });
    });

    it("should handle numeric owner and ledger names", () => {
      const result = decodeLedgerId("123/456");

      expect(result).toEqual({
        ledgerOwner: "123",
        ledgerName: "456",
      });
    });

    it("should decode consistently for the same input", () => {
      const result1 = decodeLedgerId("testowner/testledger");
      const result2 = decodeLedgerId("testowner/testledger");

      expect(result1).toEqual(result2);
    });

    it("should handle mixed case owner and ledger names", () => {
      const result = decodeLedgerId("OwnerName/LedgerName");

      expect(result).toEqual({
        ledgerOwner: "OwnerName",
        ledgerName: "LedgerName",
      });
    });

    it("should split on forward slash and take first two parts", () => {
      const result = decodeLedgerId("owner/ledger");

      expect(result).toEqual({
        ledgerOwner: "owner",
        ledgerName: "ledger",
      });
    });
  });

  describe("base64Encode (UTF-8 safe)", () => {
    it("should encode a simple ASCII string", () => {
      const result = base64Encode("hello world");
      expect(result).toBe("aGVsbG8gd29ybGQ=");
    });

    it("should handle empty string", () => {
      const result = base64Encode("");
      expect(result).toBe("");
    });

    it("should encode emoji characters", () => {
      const input = "Hello 🍕 World";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      // Should not throw InvalidCharacterError
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode Chinese characters", () => {
      const input = "你好世界";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode Japanese characters", () => {
      const input = "こんにちは";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode Korean characters", () => {
      const input = "안녕하세요";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode mixed UTF-8 characters", () => {
      const input = "Café ☕ 咖啡馆 🍵";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode Beancount transactions with emoji", () => {
      const input = '2024-01-01 * "Lunch 🍕" #food';
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should encode special Unicode symbols", () => {
      const input = "→ ← ↑ ↓ ✓ ✗ ★ ♥ ♦ ♣ ♠";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });

    it("should handle newlines and tabs", () => {
      const input = "line1\nline2\tcolumn";
      const result = base64Encode(input);
      expect(result).toBeTruthy();
    });

    it("should encode multi-line Beancount file with UTF-8", () => {
      const input = `2024-01-01 * "早餐 🍳" #breakfast
  Assets:Cash   -50 CNY
  Expenses:Food  50 CNY

2024-01-02 * "Café ☕" #coffee
  Assets:Cash   -30 CNY
  Expenses:Coffee  30 CNY`;
      const result = base64Encode(input);
      expect(result).toBeTruthy();
      expect(() => base64Encode(input)).not.toThrow();
    });
  });

  describe("base64Decode (UTF-8 safe)", () => {
    it("should decode a simple ASCII string", () => {
      const encoded = base64Encode("hello world");
      const result = base64Decode(encoded);
      expect(result).toBe("hello world");
    });

    it("should handle empty string", () => {
      const result = base64Decode("");
      expect(result).toBe("");
    });

    it("should round-trip encode/decode emoji", () => {
      const original = "Hello 🍕 World";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip encode/decode Chinese characters", () => {
      const original = "你好世界";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip encode/decode Japanese characters", () => {
      const original = "こんにちは";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip encode/decode Korean characters", () => {
      const original = "안녕하세요";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip encode/decode mixed UTF-8", () => {
      const original = "Café ☕ 咖啡馆 🍵";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip Beancount transaction with emoji", () => {
      const original = '2024-01-01 * "Lunch 🍕" #food';
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip special Unicode symbols", () => {
      const original = "→ ← ↑ ↓ ✓ ✗ ★ ♥ ♦ ♣ ♠";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should round-trip multi-line Beancount file with UTF-8", () => {
      const original = `2024-01-01 * "早餐 🍳" #breakfast
  Assets:Cash   -50 CNY
  Expenses:Food  50 CNY

2024-01-02 * "Café ☕" #coffee
  Assets:Cash   -30 CNY
  Expenses:Coffee  30 CNY`;
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should decode standard base64 from Gitea API", () => {
      // Simulate base64 content returned from Gitea
      const original = '2024-01-01 * "Test" #tag\n';
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });

    it("should handle long strings", () => {
      const original = "test ".repeat(1000) + "🎉";
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toBe(original);
    });
  });

  describe("parseLedgerFullName", () => {
    it("should parse a valid fullName with owner and repo", () => {
      const result = parseLedgerFullName("owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should handle fullName with underscores in owner", () => {
      const result = parseLedgerFullName("un_ht7hcm3zq3yb/test");
      expect(result).toEqual({
        owner: "un_ht7hcm3zq3yb",
        repo: "test",
      });
    });

    it("should handle fullName with hyphens in repo", () => {
      const result = parseLedgerFullName("alice/my-ledger-2024");
      expect(result).toEqual({
        owner: "alice",
        repo: "my-ledger-2024",
      });
    });

    it("should handle fullName with underscores in both owner and repo", () => {
      const result = parseLedgerFullName("user_123/ledger_v2");
      expect(result).toEqual({
        owner: "user_123",
        repo: "ledger_v2",
      });
    });

    it("should handle fullName with numbers", () => {
      const result = parseLedgerFullName("user123/ledger456");
      expect(result).toEqual({
        owner: "user123",
        repo: "ledger456",
      });
    });

    it("should handle fullName with long names", () => {
      const longOwner = "verylongownername123456789";
      const longRepo = "verylongledgername987654321";
      const result = parseLedgerFullName(`${longOwner}/${longRepo}`);
      expect(result).toEqual({
        owner: longOwner,
        repo: longRepo,
      });
    });

    it("should handle fullName without slash (edge case)", () => {
      const result = parseLedgerFullName("just-a-name");
      expect(result).toEqual({
        owner: null,
        repo: "just-a-name",
      });
    });

    it("should handle empty string (edge case)", () => {
      const result = parseLedgerFullName("");
      expect(result).toEqual({
        owner: null,
        repo: "",
      });
    });

    it("should handle fullName with multiple slashes (fallback to repo only)", () => {
      const result = parseLedgerFullName("owner/repo/extra");
      expect(result).toEqual({
        owner: null,
        repo: "owner/repo/extra",
      });
    });

    it("should handle fullName with trailing slash (fallback to repo only)", () => {
      const result = parseLedgerFullName("owner/repo/");
      expect(result).toEqual({
        owner: null,
        repo: "owner/repo/",
      });
    });

    it("should handle fullName with special characters in repo", () => {
      const result = parseLedgerFullName("owner/repo.backup");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo.backup",
      });
    });

    it("should handle mixed case owner and repo", () => {
      const result = parseLedgerFullName("OwnerName/LedgerName");
      expect(result).toEqual({
        owner: "OwnerName",
        repo: "LedgerName",
      });
    });
  });

  describe("formatLedgerDisplayName", () => {
    it("should format a valid fullName with owner and repo", () => {
      const result = formatLedgerDisplayName("owner/repo");
      expect(result).toBe("owner / repo");
    });

    it("should format fullName with underscores in owner", () => {
      const result = formatLedgerDisplayName("un_ht7hcm3zq3yb/test");
      expect(result).toBe("un_ht7hcm3zq3yb / test");
    });

    it("should format fullName with hyphens in repo", () => {
      const result = formatLedgerDisplayName("alice/my-ledger-2024");
      expect(result).toBe("alice / my-ledger-2024");
    });

    it("should format fullName with long names", () => {
      const result = formatLedgerDisplayName(
        "verylongownername123456789/verylongledgername987654321",
      );
      expect(result).toBe(
        "verylongownername123456789 / verylongledgername987654321",
      );
    });

    it("should handle fullName without slash (edge case)", () => {
      const result = formatLedgerDisplayName("just-a-name");
      expect(result).toBe("just-a-name");
    });

    it("should handle empty string (edge case)", () => {
      const result = formatLedgerDisplayName("");
      expect(result).toBe("");
    });

    it("should format fullName with numbers", () => {
      const result = formatLedgerDisplayName("user123/ledger456");
      expect(result).toBe("user123 / ledger456");
    });

    it("should format fullName with special characters", () => {
      const result = formatLedgerDisplayName("owner_123/repo.backup");
      expect(result).toBe("owner_123 / repo.backup");
    });

    it("should format mixed case names", () => {
      const result = formatLedgerDisplayName("OwnerName/LedgerName");
      expect(result).toBe("OwnerName / LedgerName");
    });

    it("should add space around slash separator", () => {
      const result = formatLedgerDisplayName("a/b");
      expect(result).toBe("a / b");
      expect(result).toContain(" / ");
    });

    it("should be consistent with parseLedgerFullName output", () => {
      const fullName = "testowner/testledger";
      const parsed = parseLedgerFullName(fullName);
      const formatted = formatLedgerDisplayName(fullName);

      if (parsed.owner && parsed.repo) {
        expect(formatted).toBe(`${parsed.owner} / ${parsed.repo}`);
      }
    });
  });
});
