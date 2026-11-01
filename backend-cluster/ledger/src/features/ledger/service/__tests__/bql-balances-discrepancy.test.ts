import type { QueryResult } from "@rustledger/wasm";
import {
  applyDiscrepancy,
  discrepancyKey,
  planDiscrepancy,
} from "../bql-balances-discrepancy";

/**
 * `balances.discrepancy` (w23/196): the engine leaves it NULL, so a plain
 * projection gets the key columns appended and the cell filled from the
 * validator; every other use is refused rather than answered over NULL.
 */
const fill = (query: string) => {
  const plan = planDiscrepancy(query);
  if (plan.kind !== "fill") throw new Error(`expected fill, got ${plan.kind}`);
  return plan;
};

describe("planDiscrepancy", () => {
  it("appends the key columns after a plain projection and keeps the rest of the query", () => {
    expect(
      fill("SELECT account, discrepancy FROM balances WHERE date > 2024-01-01"),
    ).toMatchObject({
      query:
        "SELECT account, discrepancy, date, account, amount FROM balances WHERE date > 2024-01-01",
      hidden: 3,
      columns: [1],
    });
  });

  it("finds an aliased column and every position it holds", () => {
    expect(
      fill("select discrepancy AS d, date, discrepancy from #balances"),
    ).toMatchObject({ hidden: 3, columns: [0, 2] });
  });

  it("answers SELECT * without adding columns: the wildcard already has the keys", () => {
    expect(fill("SELECT * FROM balances")).toMatchObject({
      query: "SELECT * FROM balances",
      hidden: 0,
      columns: "named",
    });
  });

  it("leaves a query alone that does not read discrepancy or the balances table", () => {
    for (const query of [
      "SELECT account, amount FROM balances",
      "SELECT discrepancy FROM postings",
      "SELECT account, sum(position) GROUP BY account",
      "SELECT 'discrepancy' FROM balances",
    ])
      expect(planDiscrepancy(query)).toEqual({ kind: "none" });
  });

  it("refuses discrepancy where the engine would evaluate it over NULL", () => {
    for (const query of [
      "SELECT account FROM balances WHERE discrepancy",
      "SELECT account FROM balances ORDER BY discrepancy DESC",
      "SELECT abs(discrepancy) FROM balances",
      "SELECT discrepancy IS NULL FROM balances",
      "SELECT account, discrepancy FROM balances GROUP BY account, discrepancy",
      "SELECT count(discrepancy) FROM balances",
      "SELECT DISTINCT discrepancy FROM balances",
    ])
      expect(() => planDiscrepancy(query)).toThrow(
        /balances\.discrepancy cannot be used here.*SELECT date, account, amount, discrepancy FROM balances/,
      );
  });
});

describe("applyDiscrepancy", () => {
  const diffs = new Map([
    [
      discrepancyKey("2024-01-05", "Assets:Bank", {
        number: "999.00",
        currency: "USD",
      })!,
      { number: "-989.00", currency: "USD" },
    ],
  ]);
  const result: QueryResult = {
    columns: ["account", "discrepancy", "date", "account", "amount"],
    rows: [
      [
        "Assets:Bank",
        null,
        "2024-01-05",
        "Assets:Bank",
        { number: "999.00", currency: "USD" },
      ],
      [
        "Assets:Bank",
        null,
        "2024-01-06",
        "Assets:Bank",
        { number: "10", currency: "USD" },
      ],
    ],
    errors: [],
  };

  it("fills a failed assertion's difference, leaves a passing one NULL, and drops the key columns", () => {
    const out = applyDiscrepancy(
      result,
      fill("SELECT account, discrepancy FROM balances"),
      diffs,
    );
    expect(out.columns).toEqual(["account", "discrepancy"]);
    expect(out.rows).toEqual([
      ["Assets:Bank", { number: "-989.00", currency: "USD" }],
      ["Assets:Bank", null],
    ]);
  });

  it("keeps the same assertion apart by date, amount and currency", () => {
    const sameDayOtherAmount = discrepancyKey("2024-01-05", "Assets:Bank", {
      number: "5",
      currency: "USD",
    });
    const otherCurrency = discrepancyKey("2024-01-05", "Assets:Bank", {
      number: "999.00",
      currency: "EUR",
    });
    expect(diffs.has(sameDayOtherAmount!)).toBe(false);
    expect(diffs.has(otherCurrency!)).toBe(false);
  });

  it("fills the wildcard's discrepancy column by name", () => {
    const wildcard: QueryResult = {
      columns: ["date", "account", "amount", "tolerance", "discrepancy"],
      rows: [
        [
          "2024-01-05",
          "Assets:Bank",
          { number: "999.00", currency: "USD" },
          null,
          null,
        ],
      ],
      errors: [],
    };
    const out = applyDiscrepancy(
      wildcard,
      fill("SELECT * FROM balances"),
      diffs,
    );
    expect(out.columns).toHaveLength(5);
    expect(out.rows[0]?.[4]).toEqual({ number: "-989.00", currency: "USD" });
  });

  it("returns the result as it was when a row has no usable keys", () => {
    const odd: QueryResult = {
      ...result,
      rows: [["Assets:Bank", null, null, null, null]],
    };
    const out = applyDiscrepancy(
      odd,
      fill("SELECT account, discrepancy FROM balances"),
      diffs,
    );
    expect(out.rows).toEqual([["Assets:Bank", null]]);
  });
});
