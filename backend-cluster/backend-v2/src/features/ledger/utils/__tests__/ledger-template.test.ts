import {
  simpleLedgerTemplate,
  ledgerWithMultipleFilesTemplate,
  defaultLedgerTemplate,
} from "../ledger-template";

describe("ledger templates", () => {
  describe("simpleLedgerTemplate", () => {
    it("should have a main.bean file", () => {
      expect(simpleLedgerTemplate["main.bean"]).toBeDefined();
    });

    it("should contain title option", () => {
      expect(simpleLedgerTemplate["main.bean"]).toContain('option "title"');
    });

    it("should contain operating currency option", () => {
      expect(simpleLedgerTemplate["main.bean"]).toContain(
        'option "operating_currency" "USD"',
      );
    });

    it("should contain basic account openings", () => {
      const mainBean = simpleLedgerTemplate["main.bean"];
      expect(mainBean).toContain("1970-01-01 open Assets:Cash");
      expect(mainBean).toContain("1970-01-01 open Income:Paycheck");
      expect(mainBean).toContain("1970-01-01 open Expenses:Housing");
      expect(mainBean).toContain("1970-01-01 open Liabilities:CreditCard");
      expect(mainBean).toContain("1970-01-01 open Equity:Initial");
    });

    it("should contain an example transaction", () => {
      expect(simpleLedgerTemplate["main.bean"]).toContain(
        '2021-10-11 * "Example Payee" "Example Memo"',
      );
    });

    it("should only have one file", () => {
      expect(Object.keys(simpleLedgerTemplate)).toHaveLength(1);
    });
  });

  describe("ledgerWithMultipleFilesTemplate", () => {
    it("should have a main.bean file", () => {
      expect(ledgerWithMultipleFilesTemplate["main.bean"]).toBeDefined();
    });

    it("should contain title option", () => {
      expect(ledgerWithMultipleFilesTemplate["main.bean"]).toContain(
        'option "title"',
      );
    });

    it("should contain operating currency option", () => {
      expect(ledgerWithMultipleFilesTemplate["main.bean"]).toContain(
        'option "operating_currency" "USD"',
      );
    });

    it("should contain banking accounts", () => {
      const mainBean = ledgerWithMultipleFilesTemplate["main.bean"];
      expect(mainBean).toContain("Assets:US:BofA:Checking");
    });

    it("should contain expense categories", () => {
      const mainBean = ledgerWithMultipleFilesTemplate["main.bean"];
      expect(mainBean).toContain("Expenses:Food:Groceries");
      expect(mainBean).toContain("Expenses:Food:Restaurant");
    });

    it("should contain transactions", () => {
      const mainBean = ledgerWithMultipleFilesTemplate["main.bean"];
      // Check for some transaction patterns
      expect(mainBean).toMatch(/\d{4}-\d{2}-\d{2} \* "[^"]+"/);
    });

    it("should include prices.bean reference", () => {
      const mainBean = ledgerWithMultipleFilesTemplate["main.bean"];
      expect(mainBean).toContain('include "./prices.bean"');
    });
  });

  describe("defaultLedgerTemplate", () => {
    it("should be the same as simpleLedgerTemplate", () => {
      expect(defaultLedgerTemplate).toBe(simpleLedgerTemplate);
    });

    it("should have a main.bean file", () => {
      expect(defaultLedgerTemplate["main.bean"]).toBeDefined();
    });
  });

  describe("template validity", () => {
    it("all templates should have string values", () => {
      for (const [filename, content] of Object.entries(simpleLedgerTemplate)) {
        expect(typeof filename).toBe("string");
        expect(typeof content).toBe("string");
      }

      for (const [filename, content] of Object.entries(
        ledgerWithMultipleFilesTemplate,
      )) {
        expect(typeof filename).toBe("string");
        expect(typeof content).toBe("string");
      }
    });

    it("all template files should have .bean extension", () => {
      for (const filename of Object.keys(simpleLedgerTemplate)) {
        expect(filename.endsWith(".bean")).toBe(true);
      }

      for (const filename of Object.keys(ledgerWithMultipleFilesTemplate)) {
        expect(filename.endsWith(".bean")).toBe(true);
      }
    });

    it("all templates should be non-empty", () => {
      for (const content of Object.values(simpleLedgerTemplate)) {
        expect(content.trim().length).toBeGreaterThan(0);
      }

      for (const content of Object.values(ledgerWithMultipleFilesTemplate)) {
        expect(content.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
