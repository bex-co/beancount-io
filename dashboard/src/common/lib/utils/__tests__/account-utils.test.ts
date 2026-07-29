import { describe, it, expect } from "vitest";
import { generateAllAccountPaths } from "../account-utils";

describe("Account Utils", () => {
  describe("generateAllAccountPaths", () => {
    it("should generate all partial paths from a single account", () => {
      const accounts = ["Assets:US:BofA:Checking"];
      const result = generateAllAccountPaths(accounts);

      expect(result).toEqual([
        "Assets",
        "Assets:US",
        "Assets:US:BofA",
        "Assets:US:BofA:Checking",
      ]);
    });

    it("should handle multiple accounts with shared prefixes", () => {
      const accounts = [
        "Assets:US:BofA:Checking",
        "Assets:US:BofA:Savings",
        "Assets:US:Chase:Checking",
      ];
      const result = generateAllAccountPaths(accounts);

      expect(result).toEqual([
        "Assets",
        "Assets:US",
        "Assets:US:BofA",
        "Assets:US:Chase",
        "Assets:US:BofA:Checking",
        "Assets:US:BofA:Savings",
        "Assets:US:Chase:Checking",
      ]);
    });

    it("should deduplicate partial paths from multiple accounts", () => {
      const accounts = [
        "Assets:US:BofA:Checking",
        "Assets:US:Chase:Checking",
        "Assets:UK:Barclays:Checking",
      ];
      const result = generateAllAccountPaths(accounts);

      // "Assets" and "Assets:US" should only appear once
      const assetsCount = result.filter((path) => path === "Assets").length;
      const assetsUSCount = result.filter(
        (path) => path === "Assets:US",
      ).length;

      expect(assetsCount).toBe(1);
      expect(assetsUSCount).toBe(1);
    });

    it("should sort paths hierarchically (depth first, then alphabetically)", () => {
      const accounts = [
        "Liabilities:CreditCard",
        "Assets:US:BofA:Checking",
        "Expenses:Food:Restaurants",
        "Income:Salary",
      ];
      const result = generateAllAccountPaths(accounts);

      // All depth-1 paths should come first, sorted alphabetically
      expect(result[0]).toBe("Assets");
      expect(result[1]).toBe("Expenses");
      expect(result[2]).toBe("Income");
      expect(result[3]).toBe("Liabilities");

      // Then depth-2 paths
      expect(result[4]).toBe("Assets:US");
      expect(result[5]).toBe("Expenses:Food");
      expect(result[6]).toBe("Income:Salary");
      expect(result[7]).toBe("Liabilities:CreditCard");
    });

    it("should handle accounts with different depths", () => {
      const accounts = [
        "Assets",
        "Assets:US",
        "Assets:US:BofA:Checking:Primary",
      ];
      const result = generateAllAccountPaths(accounts);

      expect(result).toEqual([
        "Assets",
        "Assets:US",
        "Assets:US:BofA",
        "Assets:US:BofA:Checking",
        "Assets:US:BofA:Checking:Primary",
      ]);
    });

    it("should handle empty array input", () => {
      const result = generateAllAccountPaths([]);

      expect(result).toEqual([]);
    });

    it("should handle single-level accounts (no colons)", () => {
      const accounts = ["Assets", "Liabilities", "Expenses"];
      const result = generateAllAccountPaths(accounts);

      expect(result).toEqual(["Assets", "Expenses", "Liabilities"]);
    });

    it("should handle accounts with same prefix but different suffixes", () => {
      const accounts = [
        "Assets:US:BofA:Checking",
        "Assets:US:BofA:Savings",
        "Assets:US:BofA:Investment",
      ];
      const result = generateAllAccountPaths(accounts);

      // Should include the common prefix only once
      expect(result).toContain("Assets");
      expect(result).toContain("Assets:US");
      expect(result).toContain("Assets:US:BofA");

      // But all three different accounts
      expect(result).toContain("Assets:US:BofA:Checking");
      expect(result).toContain("Assets:US:BofA:Savings");
      expect(result).toContain("Assets:US:BofA:Investment");
    });

    it("should maintain alphabetical sorting within same depth level", () => {
      const accounts = [
        "Expenses:Food",
        "Expenses:Transportation",
        "Expenses:Entertainment",
        "Expenses:Utilities",
      ];
      const result = generateAllAccountPaths(accounts);

      // After the depth-1 "Expenses", check alphabetical order of depth-2
      const depth2Paths = result.filter((path) => path.split(":").length === 2);

      expect(depth2Paths).toEqual([
        "Expenses:Entertainment",
        "Expenses:Food",
        "Expenses:Transportation",
        "Expenses:Utilities",
      ]);
    });

    it("should handle real-world beancount account structure", () => {
      const accounts = [
        "Assets:US:BofA:Checking",
        "Assets:US:BofA:Savings",
        "Assets:US:Vanguard:Cash",
        "Assets:US:Vanguard:VTSAX",
        "Liabilities:US:Chase:CreditCard",
        "Expenses:Home:Rent",
        "Expenses:Food:Groceries",
        "Expenses:Food:Restaurants",
        "Income:US:Company:Salary",
      ];
      const result = generateAllAccountPaths(accounts);

      // Should have all top-level accounts
      expect(result).toContain("Assets");
      expect(result).toContain("Liabilities");
      expect(result).toContain("Expenses");
      expect(result).toContain("Income");

      // Should have partial paths
      expect(result).toContain("Assets:US");
      expect(result).toContain("Assets:US:BofA");
      expect(result).toContain("Assets:US:Vanguard");
      expect(result).toContain("Expenses:Food");

      // Total unique paths should be less than if every account generated unique paths
      // (due to deduplication of shared prefixes)
      expect(result.length).toBeLessThan(accounts.length * 4);
    });
  });
});
