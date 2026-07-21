import { getAccountRoot, pickAccountRoot } from "../index";

describe("account-root", () => {
  describe("getAccountRoot", () => {
    it("should resolve all five Beancount roots", () => {
      expect(getAccountRoot("Assets:Bank:Checking")).toBe("assets");
      expect(getAccountRoot("Liabilities:CreditCard:Visa")).toBe("liabilities");
      expect(getAccountRoot("Equity:Opening-Balances")).toBe("equity");
      expect(getAccountRoot("Income:Salary")).toBe("income");
      expect(getAccountRoot("Expenses:Food:Restaurant")).toBe("expenses");
    });

    it("should be case-insensitive", () => {
      expect(getAccountRoot("EXPENSES:Food")).toBe("expenses");
      expect(getAccountRoot("expenses:Food")).toBe("expenses");
    });

    it("should resolve a single-segment account name", () => {
      expect(getAccountRoot("Assets")).toBe("assets");
    });

    it("should return null for unknown roots", () => {
      expect(getAccountRoot("资产:银行")).toBe(null);
      expect(getAccountRoot("Whatever:Food")).toBe(null);
    });

    it("should return null for empty input", () => {
      expect(getAccountRoot("")).toBe(null);
    });
  });

  describe("pickAccountRoot", () => {
    it("should prefer expenses over the funding account", () => {
      expect(
        pickAccountRoot(["Assets:Bank:Checking", "Expenses:Food:Restaurant"]),
      ).toBe("expenses");
    });

    it("should prefer income over the receiving account", () => {
      expect(pickAccountRoot(["Assets:Bank:Checking", "Income:Salary"])).toBe(
        "income",
      );
    });

    it("should prefer expenses over income when both are present", () => {
      expect(
        pickAccountRoot(["Income:Refunds", "Expenses:Food", "Assets:Bank"]),
      ).toBe("expenses");
    });

    it("should fall through to assets for an asset-to-asset transfer", () => {
      expect(
        pickAccountRoot([
          "Assets:Bank:Checking",
          "Assets:Investments:Vanguard",
        ]),
      ).toBe("assets");
    });

    it("should prefer liabilities over assets for a card payment", () => {
      expect(
        pickAccountRoot(["Assets:Bank:Checking", "Liabilities:CreditCard"]),
      ).toBe("liabilities");
    });

    it("should ignore accounts that do not resolve", () => {
      expect(pickAccountRoot(["Whatever:Thing", "Expenses:Food"])).toBe(
        "expenses",
      );
    });

    it("should return null when nothing resolves", () => {
      expect(pickAccountRoot([])).toBe(null);
      expect(pickAccountRoot(["Whatever:Thing"])).toBe(null);
    });
  });
});
