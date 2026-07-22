import { getAccountsAndCurrency, handleOptions } from "../ledger-meta-utils";
import { LedgerMeta } from "@/generated-graphql/graphql";

// Helper to create minimal test data matching GraphQL types
type TestLedgerMeta = {
  accounts: string[];
  options: {
    name_assets: string;
    name_expenses: string;
    name_income: string;
    name_liabilities: string;
    name_equity: string;
    operating_currency: string[];
  };
};

describe("getAccountsAndCurrency", () => {
  describe("with valid data", () => {
    test("should extract and sort accounts and currencies", () => {
      const testData: TestLedgerMeta = {
        accounts: [
          "Assets:Bank:Checking",
          "Expenses:Food",
          "Income:Salary",
          "Liabilities:CreditCard",
          "Equity:OpeningBalances",
        ],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD", "EUR"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      expect(result.currencies).toEqual(["USD", "EUR"]);
      expect(result.assets.length).toBe(5);
      expect(result.expenses.length).toBe(5);
    });

    test("should sort 'from' accounts (assets) with correct priority order", () => {
      const testData: TestLedgerMeta = {
        accounts: [
          "Equity:OpeningBalances",
          "Expenses:Food",
          "Income:Salary",
          "Liabilities:CreditCard",
          "Assets:Bank:Checking",
        ],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // Assets should come first, then Liabilities, Income, Expenses, Equity
      expect(result.assets[0]).toBe("Assets:Bank:Checking");
      expect(result.assets[1]).toBe("Liabilities:CreditCard");
      expect(result.assets[2]).toBe("Income:Salary");
      expect(result.assets[3]).toBe("Expenses:Food");
      expect(result.assets[4]).toBe("Equity:OpeningBalances");
    });

    test("should sort 'to' accounts (expenses) with correct priority order", () => {
      const testData: TestLedgerMeta = {
        accounts: [
          "Equity:OpeningBalances",
          "Assets:Bank:Checking",
          "Income:Salary",
          "Liabilities:CreditCard",
          "Expenses:Food",
        ],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // Expenses should come first, then Assets, Income, Liabilities, Equity
      expect(result.expenses[0]).toBe("Expenses:Food");
      expect(result.expenses[1]).toBe("Assets:Bank:Checking");
      expect(result.expenses[2]).toBe("Income:Salary");
      expect(result.expenses[3]).toBe("Liabilities:CreditCard");
      expect(result.expenses[4]).toBe("Equity:OpeningBalances");
    });

    test("should handle multiple accounts of the same type", () => {
      const testData: TestLedgerMeta = {
        accounts: [
          "Assets:Bank:Checking",
          "Assets:Bank:Savings",
          "Assets:Cash",
          "Expenses:Food",
          "Expenses:Transport",
        ],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // All Assets accounts should come before Expenses
      expect(result.assets[0].startsWith("Assets")).toBe(true);
      expect(result.assets[1].startsWith("Assets")).toBe(true);
      expect(result.assets[2].startsWith("Assets")).toBe(true);
      expect(result.assets[3].startsWith("Expenses")).toBe(true);
      expect(result.assets[4].startsWith("Expenses")).toBe(true);
    });

    test("should handle accounts that don't match any category", () => {
      const testData: TestLedgerMeta = {
        accounts: ["Assets:Bank", "UnknownCategory:Account", "Expenses:Food"],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // Unknown accounts should be sorted to the end (order 5)
      expect(result.assets.length).toBe(3);
      expect(result.assets[2]).toBe("UnknownCategory:Account");
    });

    test("should handle multiple currencies", () => {
      const testData: TestLedgerMeta = {
        accounts: ["Assets:Bank"],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD", "EUR", "GBP", "JPY"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      expect(result.currencies).toEqual(["USD", "EUR", "GBP", "JPY"]);
    });

    test("should preserve original account data by creating new arrays", () => {
      const testData: TestLedgerMeta = {
        accounts: ["Assets:Bank", "Expenses:Food"],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // Modifying result should not affect original data
      result.assets.push("NewAccount");
      expect(testData.accounts.length).toBe(2);
    });
  });

  describe("with edge cases", () => {
    test("should handle undefined data", () => {
      const result = getAccountsAndCurrency(undefined);

      expect(result.assets).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.currencies).toEqual([]);
    });

    test("should handle empty accounts array", () => {
      const testData: TestLedgerMeta = {
        accounts: [],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      expect(result.assets).toEqual([]);
      expect(result.expenses).toEqual([]);
      expect(result.currencies).toEqual(["USD"]);
    });

    test("should handle empty currencies array", () => {
      const testData: TestLedgerMeta = {
        accounts: ["Assets:Bank"],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: [],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      expect(result.currencies).toEqual([]);
    });

    test("should handle single account", () => {
      const testData: TestLedgerMeta = {
        accounts: ["Assets:Bank"],
        options: {
          name_assets: "Assets",
          name_expenses: "Expenses",
          name_income: "Income",
          name_liabilities: "Liabilities",
          name_equity: "Equity",
          operating_currency: ["USD"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      expect(result.assets).toEqual(["Assets:Bank"]);
      expect(result.expenses).toEqual(["Assets:Bank"]);
    });
  });

  describe("with custom account names", () => {
    test("should handle non-standard account category names", () => {
      const testData: TestLedgerMeta = {
        accounts: [
          "Vermögen:Bank",
          "Ausgaben:Essen",
          "Einkommen:Gehalt",
          "Verbindlichkeiten:Kreditkarte",
          "Eigenkapital:Eröffnungsbilanz",
        ],
        options: {
          name_assets: "Vermögen",
          name_expenses: "Ausgaben",
          name_income: "Einkommen",
          name_liabilities: "Verbindlichkeiten",
          name_equity: "Eigenkapital",
          operating_currency: ["EUR"],
        },
      };

      const result = getAccountsAndCurrency(testData as unknown as LedgerMeta);

      // Should use custom names for sorting
      expect(result.assets[0]).toBe("Vermögen:Bank");
      expect(result.expenses[0]).toBe("Ausgaben:Essen");
      expect(result.currencies).toEqual(["EUR"]);
    });
  });
});

describe("handleOptions", () => {
  describe("basic functionality", () => {
    test("should create tabs from simple options without colons", () => {
      const options = ["Apple", "Banana", "Cherry"];
      const result = handleOptions(options);

      expect(result.length).toBe(4); // "All" tab + 3 individual tabs
      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual(["Apple", "Banana", "Cherry"]);
      expect(result[1].title).toBe("Apple");
      expect(result[1].options).toEqual(["Apple"]);
    });

    test("should group options by prefix when using colons", () => {
      const options = [
        "Assets:Bank:Checking",
        "Assets:Bank:Savings",
        "Assets:Cash",
        "Expenses:Food",
        "Expenses:Transport",
      ];
      const result = handleOptions(options);

      expect(result.length).toBe(3); // "All", "Assets", "Expenses"
      expect(result[0].title).toBe("All");
      expect(result[0].options.length).toBe(5);

      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab !== undefined).toBe(true);
      expect(assetsTab?.options).toEqual([
        "Assets:Bank:Checking",
        "Assets:Bank:Savings",
        "Assets:Cash",
      ]);

      const expensesTab = result.find((tab) => tab.title === "Expenses");
      expect(expensesTab !== undefined).toBe(true);
      expect(expensesTab?.options).toEqual([
        "Expenses:Food",
        "Expenses:Transport",
      ]);
    });

    test("should maintain order of first occurrence for tabs", () => {
      const options = [
        "Expenses:Food",
        "Assets:Bank",
        "Expenses:Transport",
        "Assets:Cash",
      ];
      const result = handleOptions(options);

      // "All" is always first, then tabs should be in order of first appearance
      expect(result[0].title).toBe("All");
      expect(result[1].title).toBe("Expenses");
      expect(result[2].title).toBe("Assets");
    });
  });

  describe("edge cases", () => {
    test("should handle empty options array", () => {
      const options: string[] = [];
      const result = handleOptions(options);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual([]);
    });

    test("should handle single option", () => {
      const options = ["Assets:Bank"];
      const result = handleOptions(options);

      expect(result.length).toBe(2);
      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual(["Assets:Bank"]);
      expect(result[1].title).toBe("Assets");
      expect(result[1].options).toEqual(["Assets:Bank"]);
    });

    test("should handle options with multiple colons", () => {
      const options = [
        "Assets:Bank:US:Checking",
        "Assets:Bank:UK:Savings",
        "Expenses:Food:Groceries",
      ];
      const result = handleOptions(options);

      // Should split only on the first colon
      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab?.options).toEqual([
        "Assets:Bank:US:Checking",
        "Assets:Bank:UK:Savings",
      ]);
    });

    test("should handle options with no colons", () => {
      const options = ["SingleWord", "AnotherWord"];
      const result = handleOptions(options);

      // Each option without colon becomes its own tab
      expect(result.length).toBe(3); // "All" + 2 individual tabs
      expect(
        result.find((tab) => tab.title === "SingleWord") !== undefined,
      ).toBe(true);
      expect(
        result.find((tab) => tab.title === "AnotherWord") !== undefined,
      ).toBe(true);
    });

    test("should handle options with empty string prefix", () => {
      const options = [":SomethingAfterColon"];
      const result = handleOptions(options);

      // Empty prefix becomes its own category
      expect(result.length).toBe(2);
      const emptyPrefixTab = result.find((tab) => tab.title === "");
      expect(emptyPrefixTab !== undefined).toBe(true);
      expect(emptyPrefixTab?.options).toEqual([":SomethingAfterColon"]);
    });

    test("should handle mixed options with and without colons", () => {
      const options = [
        "Assets:Bank",
        "SimpleOption",
        "Assets:Cash",
        "AnotherSimple",
      ];
      const result = handleOptions(options);

      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab?.options).toEqual(["Assets:Bank", "Assets:Cash"]);

      const simpleTab1 = result.find((tab) => tab.title === "SimpleOption");
      expect(simpleTab1?.options).toEqual(["SimpleOption"]);

      const simpleTab2 = result.find((tab) => tab.title === "AnotherSimple");
      expect(simpleTab2?.options).toEqual(["AnotherSimple"]);
    });
  });

  describe("return type", () => {
    test("should return array of OptionTab objects", () => {
      const options = ["Assets:Bank"];
      const result = handleOptions(options);

      result.forEach((tab) => {
        expect("title" in tab).toBe(true);
        expect("options" in tab).toBe(true);
        expect(typeof tab.title).toBe("string");
        expect(Array.isArray(tab.options)).toBe(true);
      });
    });

    test("All tab should always contain all options", () => {
      const options = [
        "Assets:Bank",
        "Expenses:Food",
        "Income:Salary",
        "SimpleOption",
      ];
      const result = handleOptions(options);

      expect(result[0].title).toBe("All");
      expect(result[0].options).toEqual(options);
    });
  });

  describe("complex scenarios", () => {
    test("should handle real-world beancount account structure", () => {
      const options = [
        "Assets:Bank:BofA:Checking",
        "Assets:Bank:BofA:Savings",
        "Assets:Bank:Chase:Checking",
        "Liabilities:CreditCard:Visa",
        "Liabilities:CreditCard:Mastercard",
        "Expenses:Food:Groceries",
        "Expenses:Food:Restaurants",
        "Expenses:Transport:Gas",
        "Income:Salary:Company1",
        "Income:Bonus",
      ];
      const result = handleOptions(options);

      // Should have "All" + "Assets" + "Liabilities" + "Expenses" + "Income"
      expect(result.length).toBe(5);

      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab?.options.length).toBe(3);

      const expensesTab = result.find((tab) => tab.title === "Expenses");
      expect(expensesTab?.options.length).toBe(3);

      const incomeTab = result.find((tab) => tab.title === "Income");
      expect(incomeTab?.options.length).toBe(2);
    });

    test("should preserve original options array order within each tab", () => {
      const options = [
        "Assets:Cash",
        "Assets:Bank",
        "Assets:Investment",
        "Expenses:Food",
      ];
      const result = handleOptions(options);

      const assetsTab = result.find((tab) => tab.title === "Assets");
      expect(assetsTab?.options).toEqual([
        "Assets:Cash",
        "Assets:Bank",
        "Assets:Investment",
      ]);
    });
  });
});
