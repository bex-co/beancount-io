import { describe, it, expect } from "vitest";
import {
  holdingsStatement,
  holdingsStatementByAccount,
  holdingsStatementByCurrency,
  holdingsStatementByCostCurrency,
} from "../holdings-statement";

describe("Holdings Statement SQL Queries", () => {
  describe("holdingsStatement", () => {
    it("should be a non-empty string", () => {
      expect(typeof holdingsStatement).toBe("string");
      expect(holdingsStatement.length).toBeGreaterThan(0);
    });

    it("should select account column", () => {
      expect(holdingsStatement).toContain("account");
    });

    it("should select units column", () => {
      expect(holdingsStatement).toContain("units(sum(position)) as units");
    });

    it("should select cost column", () => {
      expect(holdingsStatement).toContain("cost_number as cost");
    });

    it("should select price column", () => {
      expect(holdingsStatement).toContain(
        "first(getprice(currency, cost_currency)) as price",
      );
    });

    it("should select book_value column", () => {
      expect(holdingsStatement).toContain("cost(sum(position)) as book_value");
    });

    it("should select market_value column", () => {
      expect(holdingsStatement).toContain(
        "value(sum(position)) as market_value",
      );
    });

    it("should calculate unrealized_profit_pct", () => {
      expect(holdingsStatement).toContain("unrealized_profit_pct");
    });

    it("should select acquisition_date column", () => {
      expect(holdingsStatement).toContain("cost_date as acquisition_date");
    });

    it("should filter for asset and liability accounts", () => {
      expect(holdingsStatement).toContain(
        'WHERE account_sortkey(account) ~ "^[01]"',
      );
    });

    it("should group by required fields", () => {
      expect(holdingsStatement).toContain("GROUP BY");
      expect(holdingsStatement).toContain("account");
      expect(holdingsStatement).toContain("cost_date");
      expect(holdingsStatement).toContain("currency");
      expect(holdingsStatement).toContain("cost_currency");
    });

    it("should order results", () => {
      expect(holdingsStatement).toContain(
        "ORDER BY account_sortkey(account), currency, cost_date",
      );
    });
  });

  describe("holdingsStatementByAccount", () => {
    it("should be a non-empty string", () => {
      expect(typeof holdingsStatementByAccount).toBe("string");
      expect(holdingsStatementByAccount.length).toBeGreaterThan(0);
    });

    it("should select account column", () => {
      expect(holdingsStatementByAccount).toContain("account");
    });

    it("should not include cost column (grouped by account)", () => {
      expect(holdingsStatementByAccount).not.toContain("cost_number as cost");
    });

    it("should not include price column (grouped by account)", () => {
      expect(holdingsStatementByAccount).not.toContain(
        "first(getprice(currency, cost_currency)) as price",
      );
    });

    it("should group by account and related fields", () => {
      expect(holdingsStatementByAccount).toContain("GROUP BY");
      expect(holdingsStatementByAccount).toContain("account");
      expect(holdingsStatementByAccount).toContain("cost_currency");
    });

    it("should order by account_sortkey", () => {
      expect(holdingsStatementByAccount).toContain(
        "ORDER BY account_sortkey(account), currency",
      );
    });
  });

  describe("holdingsStatementByCurrency", () => {
    it("should be a non-empty string", () => {
      expect(typeof holdingsStatementByCurrency).toBe("string");
      expect(holdingsStatementByCurrency.length).toBeGreaterThan(0);
    });

    it("should not select account column (grouped by currency)", () => {
      // The SELECT statement should not have "account," at the start
      const selectMatch = holdingsStatementByCurrency.match(
        /SELECT\s+([\s\S]*?)WHERE/,
      );
      const selectClause = selectMatch ? selectMatch[1] : "";
      expect(selectClause).not.toMatch(/^\s*account\s*,/);
    });

    it("should calculate average_cost", () => {
      expect(holdingsStatementByCurrency).toContain("as average_cost");
    });

    it("should select price column", () => {
      expect(holdingsStatementByCurrency).toContain(
        "first(getprice(currency, cost_currency)) as price",
      );
    });

    it("should group by currency and cost_currency", () => {
      expect(holdingsStatementByCurrency).toContain(
        "GROUP BY currency, cost_currency",
      );
    });

    it("should order by currency", () => {
      expect(holdingsStatementByCurrency).toContain(
        "ORDER BY currency, cost_currency",
      );
    });
  });

  describe("holdingsStatementByCostCurrency", () => {
    it("should be a non-empty string", () => {
      expect(typeof holdingsStatementByCostCurrency).toBe("string");
      expect(holdingsStatementByCostCurrency.length).toBeGreaterThan(0);
    });

    it("should not include average_cost (grouped by cost_currency only)", () => {
      expect(holdingsStatementByCostCurrency).not.toContain("average_cost");
    });

    it("should not include price (grouped by cost_currency only)", () => {
      expect(holdingsStatementByCostCurrency).not.toContain(
        "first(getprice(currency, cost_currency)) as price",
      );
    });

    it("should group by cost_currency only", () => {
      expect(holdingsStatementByCostCurrency).toContain(
        "GROUP BY cost_currency",
      );
    });

    it("should order by cost_currency", () => {
      expect(holdingsStatementByCostCurrency).toContain(
        "ORDER BY cost_currency",
      );
    });

    it("should include core financial metrics", () => {
      expect(holdingsStatementByCostCurrency).toContain(
        "units(sum(position)) as units",
      );
      expect(holdingsStatementByCostCurrency).toContain(
        "cost(sum(position)) as book_value",
      );
      expect(holdingsStatementByCostCurrency).toContain(
        "value(sum(position)) as market_value",
      );
      expect(holdingsStatementByCostCurrency).toContain(
        "unrealized_profit_pct",
      );
    });
  });

  describe("common features across all statements", () => {
    const statements = [
      { name: "holdingsStatement", value: holdingsStatement },
      { name: "holdingsStatementByAccount", value: holdingsStatementByAccount },
      {
        name: "holdingsStatementByCurrency",
        value: holdingsStatementByCurrency,
      },
      {
        name: "holdingsStatementByCostCurrency",
        value: holdingsStatementByCostCurrency,
      },
    ];

    statements.forEach(({ name, value }) => {
      it(`${name} should start with SELECT`, () => {
        expect(value.trim()).toMatch(/^SELECT/i);
      });

      it(`${name} should filter for assets and liabilities (account_sortkey ^[01])`, () => {
        expect(value).toContain('WHERE account_sortkey(account) ~ "^[01]"');
      });

      it(`${name} should include book_value`, () => {
        expect(value).toContain("book_value");
      });

      it(`${name} should include market_value`, () => {
        expect(value).toContain("market_value");
      });

      it(`${name} should include unrealized_profit_pct`, () => {
        expect(value).toContain("unrealized_profit_pct");
      });

      it(`${name} should include units`, () => {
        expect(value).toContain("units");
      });
    });
  });
});
