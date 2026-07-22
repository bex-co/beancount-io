import { LedgerMeta } from "@/generated-graphql/graphql";
import { getAccountsAndCurrency, handleOptions } from "../../ledger-meta-utils";

describe("use-ledger-meta helper functions", () => {
  describe("getAccountsAndCurrency", () => {
    it("should handle undefined ledger metadata", () => {
      const result = getAccountsAndCurrency(undefined);

      expect(result.assets).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.currencies).toEqual([]);
    });

    it("should organize accounts by type and sort them correctly", () => {
      const mockData: LedgerMeta = {
        accounts: [
          "Expenses:Food:Groceries",
          "Assets:Bank:Checking",
          "Expenses:Transport:Gas",
          "Assets:Bank:Savings",
          "Income:Salary",
          "Liabilities:CreditCard",
          "Equity:OpeningBalances",
        ],
        currencies: ["USD", "EUR"],
        errors: 0,
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD", "EUR"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // Verify assets are sorted with "from" order (Assets first)
      expect(result.assets.length).toBe(7);
      expect(result.assets[0].startsWith("Assets")).toBe(true);
      expect(result.assets[1].startsWith("Assets")).toBe(true);

      // Verify expenses are sorted with "to" order (Expenses first)
      expect(result.expenses.length).toBe(7);
      expect(result.expenses[0].startsWith("Expenses")).toBe(true);
      expect(result.expenses[1].startsWith("Expenses")).toBe(true);

      // Verify currencies
      expect(result.currencies).toEqual(["USD", "EUR"]);
    });
    it("should sort accounts with custom from-order (assets first)", () => {
      const mockData: LedgerMeta = {
        accounts: [
          "Equity:OpeningBalances",
          "Expenses:Food",
          "Income:Salary",
          "Liabilities:Card",
          "Assets:Bank",
        ],
        currencies: ["USD"],
        errors: 0,
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // For "from" ordering: Assets(0), Liabilities(1), Income(2), Expenses(3), Equity(4)
      expect(result.assets[0]).toBe("Assets:Bank");
      expect(result.assets[1]).toBe("Liabilities:Card");
      expect(result.assets[2]).toBe("Income:Salary");
      expect(result.assets[3]).toBe("Expenses:Food");
      expect(result.assets[4]).toBe("Equity:OpeningBalances");
    });

    it("should sort accounts with custom to-order (expenses first)", () => {
      const mockData: LedgerMeta = {
        accounts: [
          "Equity:OpeningBalances",
          "Income:Salary",
          "Liabilities:Card",
          "Assets:Bank",
          "Expenses:Food",
        ],
        currencies: ["USD"],
        errors: 0,
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // For "to" ordering: Expenses(0), Assets(1), Income(2), Liabilities(3), Equity(4)
      expect(result.expenses[0]).toBe("Expenses:Food");
      expect(result.expenses[1]).toBe("Assets:Bank");
      expect(result.expenses[2]).toBe("Income:Salary");
      expect(result.expenses[3]).toBe("Liabilities:Card");
      expect(result.expenses[4]).toBe("Equity:OpeningBalances");
    });
  });

  describe("handleOptions", () => {
    it("should create tabs with 'All' as first tab", () => {
      const options = ["Assets:Bank:Checking", "Assets:Cash"];
      const result = handleOptions(options);

      expect(result.length > 0).toBe(true);
      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual(options);
    });

    it("should group accounts by prefix", () => {
      const options = [
        "Assets:Bank:Checking",
        "Assets:Cash",
        "Expenses:Food",
        "Expenses:Transport",
      ];
      const result = handleOptions(options);

      // Should have tabs: All, Assets, Expenses
      expect(result.length).toBe(3);
      expect(result[0].title).toBe("All");
      expect(result[1].title).toBe("Assets");
      expect(result[2].title).toBe("Expenses");

      // Verify Assets tab contains all Assets accounts
      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab !== undefined).toBe(true);
      expect(assetsTab?.options.length).toBe(2);
      expect(assetsTab?.options.includes("Assets:Bank:Checking")).toBe(true);
      expect(assetsTab?.options.includes("Assets:Cash")).toBe(true);

      // Verify Expenses tab contains all Expenses accounts
      const expensesTab = result.find((tab) => tab.title === "Expenses");
      expect(expensesTab !== undefined).toBe(true);
      expect(expensesTab?.options.length).toBe(2);
      expect(expensesTab?.options.includes("Expenses:Food")).toBe(true);
      expect(expensesTab?.options.includes("Expenses:Transport")).toBe(true);
    });

    it("should handle single account type", () => {
      const options = ["Assets:Bank:Checking"];
      const result = handleOptions(options);

      expect(result.length).toBe(2); // All + Assets
      expect(result[0].title).toBe("All");
      expect(result[1].title).toBe("Assets");
    });

    it("should handle accounts without colons", () => {
      const options = ["Assets"];
      const result = handleOptions(options);

      expect(result.length).toBe(2); // All + Assets
      expect(result[0].title).toBe("All");
      expect(result[1].title).toBe("Assets");
    });

    it("should handle empty options array", () => {
      const options: string[] = [];
      const result = handleOptions(options);

      // Should still create an 'All' tab
      expect(result.length).toBe(1);
      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual([]);
    });

    it("should handle multiple accounts with same prefix", () => {
      const options = [
        "Assets:Bank:Checking",
        "Assets:Bank:Savings",
        "Assets:Cash",
      ];
      const result = handleOptions(options);

      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab?.options.length).toBe(3);
    });

    it("should handle complex account hierarchies", () => {
      const options = [
        "Assets:Bank:Checking:SubAccount",
        "Expenses:Food:Groceries:Organic",
      ];
      const result = handleOptions(options);

      expect(result.length).toBe(3); // All, Assets, Expenses
      expect(result[1].title).toBe("Assets");
      expect(result[2].title).toBe("Expenses");
    });
  });

  describe("edge cases", () => {
    it("should handle accounts with unknown prefix", () => {
      const mockData: LedgerMeta = {
        accounts: ["Unknown:Account"],
        currencies: ["USD"],
        errors: 0,
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // Should still be in the array at the end (default order 5)
      expect(result.assets.length).toBe(1);
      expect(result.assets[0]).toBe("Unknown:Account");
    });

    it("should handle duplicate account names", () => {
      const mockData: LedgerMeta = {
        accounts: ["Assets:Bank", "Assets:Bank"],
        currencies: ["USD"],
        errors: 0,
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // Both should be in the array (duplicates preserved)
      expect(result.assets.length).toBe(2);
    });

    it("should handle very long account names", () => {
      const longAccount =
        "Assets:Bank:Checking:SubAccount:Details:More:Information";
      const result = handleOptions([longAccount]);

      expect(result.length).toBe(2); // All + Assets
      expect(result[1].title).toBe("Assets");
      expect(result[1].options.includes(longAccount)).toBe(true);
    });

    it("should handle special characters in account names", () => {
      const account = "Assets:Bank-Account_123";
      const result = handleOptions([account]);

      expect(result.length).toBe(2);
      expect(result[1].title).toBe("Assets");
      expect(result[1].options.includes(account)).toBe(true);
    });

    it("should handle mixed case account names", () => {
      const mockData: LedgerMeta = {
        accounts: ["ASSETS:Bank", "assets:Cash"],
        currencies: ["USD"],
        errors: 0,
        options: {
          name_assets: "ASSETS",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(mockData);

      // Should preserve original casing
      expect(result.assets[0]).toBe("ASSETS:Bank");
      expect(result.assets[1]).toBe("assets:Cash");
    });
  });
});
