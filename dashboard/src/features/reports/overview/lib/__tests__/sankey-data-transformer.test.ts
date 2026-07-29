import { describe, it, expect } from "vitest";
import {
  transformToSankeyData,
  aggregateHierarchyBalance,
} from "../sankey-data-transformer";

describe("sankey-data-transformer", () => {
  describe("aggregateHierarchyBalance", () => {
    it("should return balance for leaf nodes", () => {
      const node = {
        account: "Income:Salary",
        balance: { USD: -5000 },
        children: [],
      };

      expect(aggregateHierarchyBalance(node, true)).toBe(5000);
    });

    it("should sum balances from children", () => {
      const node = {
        account: "Income",
        balance: null,
        children: [
          { account: "Income:Salary", balance: { USD: -5000 }, children: [] },
          {
            account: "Income:Freelance",
            balance: { USD: -1500 },
            children: [],
          },
        ],
      };

      expect(aggregateHierarchyBalance(node, true)).toBe(6500);
    });

    it("should handle nested hierarchies", () => {
      const node = {
        account: "Expenses",
        balance: null,
        children: [
          {
            account: "Expenses:Food",
            balance: null,
            children: [
              {
                account: "Expenses:Food:Restaurant",
                balance: { USD: 300 },
                children: [],
              },
              {
                account: "Expenses:Food:Groceries",
                balance: { USD: 500 },
                children: [],
              },
            ],
          },
          {
            account: "Expenses:Transport",
            balance: { USD: 200 },
            children: [],
          },
        ],
      };

      expect(aggregateHierarchyBalance(node)).toBe(1000);
    });
  });

  describe("transformToSankeyData", () => {
    it("should transform hierarchy data to Sankey nodes and links", () => {
      const incomeData = {
        account: "Income",
        balance: null,
        children: [
          { account: "Income:Salary", balance: { USD: -5000 }, children: [] },
          {
            account: "Income:Freelance",
            balance: { USD: -1000 },
            children: [],
          },
        ],
      };

      const expensesData = {
        account: "Expenses",
        balance: null,
        children: [
          { account: "Expenses:Food", balance: { USD: 800 }, children: [] },
          {
            account: "Expenses:Housing",
            balance: { USD: 2000 },
            children: [],
          },
        ],
      };

      const result = transformToSankeyData({
        incomeHierarchyData: incomeData,
        expensesHierarchyData: expensesData,
        assetsHierarchyData: undefined,
        liabilitiesHierarchyData: undefined,
        depth: 2,
      });

      // Should have nodes: Income:Salary, Income:Freelance, Cash Flow, Expenses:Food, Expenses:Housing, Savings
      expect(result.nodes).toHaveLength(6);
      expect(result.nodes.map((n) => n.name)).toContain("Cash Flow");
      expect(result.nodes.map((n) => n.name)).toContain("Income:Salary");
      expect(result.nodes.map((n) => n.name)).toContain("Savings");

      // Should have links from income to Cash Flow, Cash Flow to expenses, Cash Flow to Savings
      expect(result.links.length).toBeGreaterThan(0);

      const cashFlowLinks = result.links.filter(
        (l) => l.target === "Cash Flow",
      );
      expect(cashFlowLinks).toHaveLength(2); // From Income:Salary and Income:Freelance

      const expenseLinks = result.links.filter(
        (l) => l.source === "Cash Flow" && l.target.startsWith("Expenses:"),
      );
      expect(expenseLinks).toHaveLength(2); // To Food and Housing
    });

    it("should exclude cash-equivalent assets from investing category", () => {
      const assetsData = {
        account: "Assets",
        balance: null,
        children: [
          {
            account: "Assets:US:BofA:Checking",
            balance: { USD: 1000 },
            children: [],
          },
          {
            account: "Assets:Investments:Stocks",
            balance: { USD: 5000 },
            children: [],
          },
        ],
      };

      const result = transformToSankeyData({
        incomeHierarchyData: undefined,
        expensesHierarchyData: undefined,
        assetsHierarchyData: assetsData,
        liabilitiesHierarchyData: undefined,
        depth: 2,
      });

      // Should only include Stocks, not Checking
      const assetNodes = result.nodes.filter((n) =>
        n.name.startsWith("Assets:"),
      );
      expect(assetNodes).toHaveLength(1);
      expect(assetNodes[0].name).toBe("Assets:Investments");
    });
  });
});
