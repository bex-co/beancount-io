import {
  getAccountsAndCurrency,
  groupAccountsByRoot,
} from "../ledger-meta-utils";
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

describe("groupAccountsByRoot", () => {
  describe("basic functionality", () => {
    test("should group accounts under their root segment", () => {
      const result = groupAccountsByRoot([
        "Assets:Bank:Checking",
        "Expenses:Food",
        "Assets:Cash",
      ]);

      expect(result).toEqual([
        { title: "Assets", data: ["Assets:Bank:Checking", "Assets:Cash"] },
        { title: "Expenses", data: ["Expenses:Food"] },
      ]);
    });

    test("should order sections by first occurrence, not alphabetically", () => {
      const result = groupAccountsByRoot([
        "Expenses:Food",
        "Assets:Cash",
        "Income:Salary",
      ]);

      expect(result.map((section) => section.title)).toEqual([
        "Expenses",
        "Assets",
        "Income",
      ]);
    });

    test("should preserve the input order within a section", () => {
      const result = groupAccountsByRoot([
        "Assets:Zulu",
        "Assets:Alpha",
        "Assets:Mike",
      ]);

      expect(result[0].data).toEqual([
        "Assets:Zulu",
        "Assets:Alpha",
        "Assets:Mike",
      ]);
    });

    test("should take only the first segment as the root", () => {
      const result = groupAccountsByRoot([
        "Assets:Bank:Checking:Sub:Deep",
        "Assets:Bank:Savings",
      ]);

      expect(result.length).toBe(1);
      expect(result[0].title).toBe("Assets");
      expect(result[0].data.length).toBe(2);
    });
  });

  describe("edge cases", () => {
    test("should return an empty array for no accounts", () => {
      expect(groupAccountsByRoot([])).toEqual([]);
    });

    test("should handle a single account", () => {
      expect(groupAccountsByRoot(["Assets:Cash"])).toEqual([
        { title: "Assets", data: ["Assets:Cash"] },
      ]);
    });

    test("should treat a colon-free account as its own root", () => {
      expect(groupAccountsByRoot(["Cash", "Assets:Bank"])).toEqual([
        { title: "Cash", data: ["Cash"] },
        { title: "Assets", data: ["Assets:Bank"] },
      ]);
    });

    test("should handle an empty root prefix", () => {
      expect(groupAccountsByRoot([":Orphan"])).toEqual([
        { title: "", data: [":Orphan"] },
      ]);
    });
  });

  describe("real-world structure", () => {
    test("should group a full beancount chart of accounts", () => {
      const result = groupAccountsByRoot([
        "Assets:Bank:Checking",
        "Assets:Bank:Savings",
        "Liabilities:CreditCard:Visa",
        "Income:Salary",
        "Expenses:Food:Groceries",
        "Expenses:Food:Restaurants",
        "Equity:OpeningBalances",
      ]);

      expect(result.map((section) => section.title)).toEqual([
        "Assets",
        "Liabilities",
        "Income",
        "Expenses",
        "Equity",
      ]);
      expect(result[0].data.length).toBe(2);
      expect(result[3].data).toEqual([
        "Expenses:Food:Groceries",
        "Expenses:Food:Restaurants",
      ]);
    });

    test("should place every account in exactly one section", () => {
      const accounts = [
        "Assets:Bank:Checking",
        "Expenses:Food",
        "Income:Salary",
      ];
      const result = groupAccountsByRoot(accounts);
      const grouped = result.reduce(
        (all: string[], section) => all.concat(section.data),
        [],
      );

      expect(grouped.length).toBe(accounts.length);
      expect(grouped).toEqual(accounts);
    });
  });
});

describe("getAccountsAndCurrency — additional edge cases", () => {
  describe("with edge cases", () => {
    test("should handle duplicate account names", () => {
      const mockData = {
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

      const result = getAccountsAndCurrency(mockData as unknown as LedgerMeta);

      // Both should be in the array (duplicates preserved)
      expect(result.assets.length).toBe(2);
    });

    test("should handle mixed case account names", () => {
      const mockData = {
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

      const result = getAccountsAndCurrency(mockData as unknown as LedgerMeta);

      // Should preserve original casing
      expect(result.assets[0]).toBe("ASSETS:Bank");
      expect(result.assets[1]).toBe("assets:Cash");
    });
  });
});
