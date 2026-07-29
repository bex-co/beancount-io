import { describe, it, expect } from "vitest";
import {
  categorizeAccount,
  extractAccountAtDepth,
  isExcludedAccount,
} from "../account-categorizer";

describe("account-categorizer", () => {
  describe("categorizeAccount", () => {
    it("should categorize Income accounts as source", () => {
      expect(categorizeAccount("Income:Salary")).toBe("source");
      expect(categorizeAccount("Income:Freelance:Consulting")).toBe("source");
    });

    it("should categorize Expenses accounts as operating", () => {
      expect(categorizeAccount("Expenses:Food")).toBe("operating");
      expect(categorizeAccount("Expenses:Housing:Rent")).toBe("operating");
    });

    it("should categorize Assets accounts as investing", () => {
      expect(categorizeAccount("Assets:Investments:Stocks")).toBe("investing");
      expect(categorizeAccount("Assets:Crypto:BTC")).toBe("investing");
    });

    it("should categorize Liabilities accounts as financing", () => {
      expect(categorizeAccount("Liabilities:CreditCard")).toBe("financing");
      expect(categorizeAccount("Liabilities:Loan:Mortgage")).toBe("financing");
    });

    it("should exclude Equity accounts", () => {
      expect(categorizeAccount("Equity:Opening-Balances")).toBe("exclude");
    });
  });

  describe("isExcludedAccount", () => {
    it("should exclude cash-equivalent accounts from investing", () => {
      expect(isExcludedAccount("Assets:US:BofA:Checking")).toBe(true);
      expect(isExcludedAccount("Assets:US:BofA:Savings")).toBe(true);
      expect(isExcludedAccount("Assets:Cash")).toBe(true);
    });

    it("should not exclude investment accounts", () => {
      expect(isExcludedAccount("Assets:Investments:Stocks")).toBe(false);
      expect(isExcludedAccount("Assets:Crypto:BTC")).toBe(false);
    });
  });

  describe("extractAccountAtDepth", () => {
    it("should extract account name at depth 1", () => {
      expect(extractAccountAtDepth("Income:Salary:Gross", 1)).toBe("Income");
      expect(extractAccountAtDepth("Expenses:Food:Restaurant", 1)).toBe(
        "Expenses",
      );
    });

    it("should extract account name at depth 2", () => {
      expect(extractAccountAtDepth("Income:Salary:Gross", 2)).toBe(
        "Income:Salary",
      );
      expect(extractAccountAtDepth("Expenses:Food:Restaurant", 2)).toBe(
        "Expenses:Food",
      );
    });

    it("should extract account name at depth 3", () => {
      expect(extractAccountAtDepth("Income:Salary:Gross", 3)).toBe(
        "Income:Salary:Gross",
      );
      expect(extractAccountAtDepth("Expenses:Food:Restaurant", 3)).toBe(
        "Expenses:Food:Restaurant",
      );
    });

    it("should handle accounts shorter than requested depth", () => {
      expect(extractAccountAtDepth("Income", 2)).toBe("Income");
      expect(extractAccountAtDepth("Expenses:Food", 3)).toBe("Expenses:Food");
    });
  });
});
