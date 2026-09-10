import { describe, it, expect } from "vitest";
import { getSankeyNodeColor, getSankeyColorScheme } from "../sankey-colors";
import {
  SANKEY_CASH_NODE,
  SANKEY_HUB_NODE,
  type SankeyNode,
} from "../sankey-data-transformer";

function account(name: string): SankeyNode {
  return { name, kind: "account" };
}

describe("sankey-colors", () => {
  describe("getSankeyColorScheme", () => {
    it("should return light theme colors", () => {
      const colors = getSankeyColorScheme(false);

      expect(colors.income).toBeDefined();
      expect(colors.cashFlow).toBeDefined();
      expect(colors.expenses).toBeDefined();
      expect(colors.investing).toBeDefined();
      expect(colors.financing).toBeDefined();
      expect(colors.cash).toBeDefined();
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
      const color = getSankeyNodeColor(account("Income:Salary"), false);
      expect(color).toBe(getSankeyColorScheme(false).income);
    });

    it("should return expenses color for Expenses accounts", () => {
      const color = getSankeyNodeColor(account("Expenses:Food"), false);
      expect(color).toBe(getSankeyColorScheme(false).expenses);
    });

    it("should return investing color for Assets accounts", () => {
      const color = getSankeyNodeColor(account("Assets:Investments"), false);
      expect(color).toBe(getSankeyColorScheme(false).investing);
    });

    it("should return financing color for Liabilities accounts", () => {
      const color = getSankeyNodeColor(
        account("Liabilities:CreditCard"),
        false,
      );
      expect(color).toBe(getSankeyColorScheme(false).financing);
    });

    it("should return financing color for Equity accounts", () => {
      const color = getSankeyNodeColor(
        account("Equity:Opening-Balances"),
        false,
      );
      expect(color).toBe(getSankeyColorScheme(false).financing);
    });

    it("should color the hub node by kind, not by its label", () => {
      const color = getSankeyNodeColor(
        { name: SANKEY_HUB_NODE, kind: "hub" },
        false,
      );
      expect(color).toBe(getSankeyColorScheme(false).cashFlow);
    });

    it("should color the cash node by kind, not by its label", () => {
      const color = getSankeyNodeColor(
        { name: SANKEY_CASH_NODE, kind: "cash" },
        false,
      );
      expect(color).toBe(getSankeyColorScheme(false).cash);
    });
  });
});
