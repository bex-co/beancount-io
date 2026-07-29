import { describe, it, expect } from "vitest";
import { getSankeyNodeColor, getSankeyColorScheme } from "../sankey-colors";

describe("sankey-colors", () => {
  describe("getSankeyColorScheme", () => {
    it("should return light theme colors", () => {
      const colors = getSankeyColorScheme(false);

      expect(colors.income).toBeDefined();
      expect(colors.cashFlow).toBeDefined();
      expect(colors.expenses).toBeDefined();
      expect(colors.investing).toBeDefined();
      expect(colors.financing).toBeDefined();
      expect(colors.savings).toBeDefined();
    });

    it("should return dark theme colors", () => {
      const colors = getSankeyColorScheme(true);

      expect(colors.income).toBeDefined();
      expect(colors.cashFlow).toBeDefined();
      // Dark theme should have lighter colors
      expect(colors.income).not.toBe(getSankeyColorScheme(false).income);
    });
  });

  describe("getSankeyNodeColor", () => {
    it("should return income color for Income accounts", () => {
      const color = getSankeyNodeColor("Income:Salary", false);
      expect(color).toBe(getSankeyColorScheme(false).income);
    });

    it("should return expenses color for Expenses accounts", () => {
      const color = getSankeyNodeColor("Expenses:Food", false);
      expect(color).toBe(getSankeyColorScheme(false).expenses);
    });

    it("should return investing color for Assets accounts", () => {
      const color = getSankeyNodeColor("Assets:Investments", false);
      expect(color).toBe(getSankeyColorScheme(false).investing);
    });

    it("should return financing color for Liabilities accounts", () => {
      const color = getSankeyNodeColor("Liabilities:CreditCard", false);
      expect(color).toBe(getSankeyColorScheme(false).financing);
    });

    it("should return cashFlow color for Cash Flow node", () => {
      const color = getSankeyNodeColor("Cash Flow", false);
      expect(color).toBe(getSankeyColorScheme(false).cashFlow);
    });

    it("should return savings color for Savings node", () => {
      const color = getSankeyNodeColor("Savings", false);
      expect(color).toBe(getSankeyColorScheme(false).savings);
    });
  });
});
