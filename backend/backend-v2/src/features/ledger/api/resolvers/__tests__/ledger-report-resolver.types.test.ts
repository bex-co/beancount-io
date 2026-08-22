import "reflect-metadata";
import {
  LedgerAttributes,
  LedgerOptions,
} from "../ledger-report-resolver.types";

describe("ledger-report-resolver.types", () => {
  describe("LedgerAttributes", () => {
    it("should create a LedgerAttributes object with all array fields", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = ["Assets:Bank", "Expenses:Food"];
      attributes.tags = ["tag1", "tag2"];
      attributes.years = ["2023", "2024"];
      attributes.links = ["link1", "link2"];
      attributes.payees = ["Payee1", "Payee2"];
      attributes.currencies = ["USD", "EUR"];

      expect(attributes.accounts).toEqual(["Assets:Bank", "Expenses:Food"]);
      expect(attributes.tags).toEqual(["tag1", "tag2"]);
      expect(attributes.years).toEqual(["2023", "2024"]);
      expect(attributes.links).toEqual(["link1", "link2"]);
      expect(attributes.payees).toEqual(["Payee1", "Payee2"]);
      expect(attributes.currencies).toEqual(["USD", "EUR"]);
    });

    it("should handle empty arrays", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = [];
      attributes.tags = [];
      attributes.years = [];
      attributes.links = [];
      attributes.payees = [];
      attributes.currencies = [];

      expect(attributes.accounts).toEqual([]);
      expect(attributes.tags).toEqual([]);
      expect(attributes.years).toEqual([]);
      expect(attributes.links).toEqual([]);
      expect(attributes.payees).toEqual([]);
      expect(attributes.currencies).toEqual([]);
    });

    it("should handle single-item arrays", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = ["Assets:Cash"];
      attributes.tags = ["personal"];
      attributes.years = ["2024"];
      attributes.links = ["ref-001"];
      attributes.payees = ["Supermarket"];
      attributes.currencies = ["USD"];

      expect(attributes.accounts).toHaveLength(1);
      expect(attributes.tags).toHaveLength(1);
      expect(attributes.years).toHaveLength(1);
      expect(attributes.links).toHaveLength(1);
      expect(attributes.payees).toHaveLength(1);
      expect(attributes.currencies).toHaveLength(1);
    });

    it("should handle deeply nested account names", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = [
        "Assets:US:BofA:Checking",
        "Assets:US:Chase:Savings",
        "Expenses:Food:Groceries:Organic",
        "Income:Salary:Bonus:Annual",
      ];
      attributes.tags = [];
      attributes.years = [];
      attributes.links = [];
      attributes.payees = [];
      attributes.currencies = [];

      expect(attributes.accounts).toContain("Assets:US:BofA:Checking");
      expect(attributes.accounts).toContain("Expenses:Food:Groceries:Organic");
    });

    it("should handle special characters in payees", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = [];
      attributes.tags = [];
      attributes.years = [];
      attributes.links = [];
      attributes.payees = [
        "Company Inc.",
        "O'Reilly Media",
        "José's Restaurant",
        "Müller & Co.",
      ];
      attributes.currencies = [];

      expect(attributes.payees).toContain("O'Reilly Media");
      expect(attributes.payees).toContain("José's Restaurant");
      expect(attributes.payees).toContain("Müller & Co.");
    });

    it("should handle various currency codes", () => {
      const attributes = new LedgerAttributes();
      attributes.accounts = [];
      attributes.tags = [];
      attributes.years = [];
      attributes.links = [];
      attributes.payees = [];
      attributes.currencies = ["USD", "EUR", "GBP", "JPY", "CNY", "BTC", "ETH"];

      expect(attributes.currencies).toContain("USD");
      expect(attributes.currencies).toContain("BTC");
      expect(attributes.currencies).toHaveLength(7);
    });
  });

  describe("LedgerOptions", () => {
    it("should create a LedgerOptions object with all required fields", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Assets";
      options.nameEquity = "Equity";
      options.nameExpenses = "Expenses";
      options.nameIncome = "Income";
      options.nameLiabilities = "Liabilities";
      options.operatingCurrency = ["USD"];

      expect(options.nameAssets).toBe("Assets");
      expect(options.nameEquity).toBe("Equity");
      expect(options.nameExpenses).toBe("Expenses");
      expect(options.nameIncome).toBe("Income");
      expect(options.nameLiabilities).toBe("Liabilities");
      expect(options.operatingCurrency).toEqual(["USD"]);
    });

    it("should handle multiple operating currencies", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Assets";
      options.nameEquity = "Equity";
      options.nameExpenses = "Expenses";
      options.nameIncome = "Income";
      options.nameLiabilities = "Liabilities";
      options.operatingCurrency = ["USD", "EUR", "GBP"];

      expect(options.operatingCurrency).toEqual(["USD", "EUR", "GBP"]);
      expect(options.operatingCurrency).toHaveLength(3);
    });

    it("should handle non-English account type names", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Activo";
      options.nameEquity = "Capital";
      options.nameExpenses = "Gastos";
      options.nameIncome = "Ingresos";
      options.nameLiabilities = "Pasivo";
      options.operatingCurrency = ["EUR"];

      expect(options.nameAssets).toBe("Activo");
      expect(options.nameEquity).toBe("Capital");
      expect(options.nameExpenses).toBe("Gastos");
      expect(options.nameIncome).toBe("Ingresos");
      expect(options.nameLiabilities).toBe("Pasivo");
    });

    it("should handle German account type names", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Vermögenswerte";
      options.nameEquity = "Eigenkapital";
      options.nameExpenses = "Aufwendungen";
      options.nameIncome = "Erträge";
      options.nameLiabilities = "Verbindlichkeiten";
      options.operatingCurrency = ["EUR"];

      expect(options.nameAssets).toBe("Vermögenswerte");
      expect(options.nameLiabilities).toBe("Verbindlichkeiten");
    });

    it("should handle empty operating currency array", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Assets";
      options.nameEquity = "Equity";
      options.nameExpenses = "Expenses";
      options.nameIncome = "Income";
      options.nameLiabilities = "Liabilities";
      options.operatingCurrency = [];

      expect(options.operatingCurrency).toEqual([]);
    });

    it("should handle cryptocurrency as operating currency", () => {
      const options = new LedgerOptions();
      options.nameAssets = "Assets";
      options.nameEquity = "Equity";
      options.nameExpenses = "Expenses";
      options.nameIncome = "Income";
      options.nameLiabilities = "Liabilities";
      options.operatingCurrency = ["BTC", "ETH"];

      expect(options.operatingCurrency).toContain("BTC");
      expect(options.operatingCurrency).toContain("ETH");
    });
  });
});
