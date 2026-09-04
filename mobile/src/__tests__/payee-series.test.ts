import {
  buildPayeeSeriesBql,
  mapPayeeSeries,
  payeeSeriesCutoff,
  shiftLedgerMonths,
  PAYEE_SERIES_WINDOW_MONTHS,
} from "../screens/merchants-screen/selectors/payee-series";
import type { QueryResultTableLike } from "../screens/merchants-screen/selectors/bql-table";

const TYPES = [
  { name: "txn_date", dtype: "date" },
  { name: "payee", dtype: "str" },
  { name: "amount", dtype: "Decimal" },
  { name: "currency", dtype: "str" },
];

function table(rows: unknown[][], types = TYPES): QueryResultTableLike {
  return { rows, types };
}

describe("buildPayeeSeriesBql", () => {
  it("is the fixed aliased series statement with an interpolated cutoff", () => {
    const bql = buildPayeeSeriesBql("2023-07-20");
    expect(bql.includes("txn_date")).toBe(true);
    expect(bql.includes("number as amount")).toBe(true);
    expect(bql.includes("payee != ''")).toBe(true);
    expect(bql.includes("account ~ '^Expenses'")).toBe(true);
    expect(bql.includes("date >= 2023-07-20")).toBe(true);
  });
});

describe("shiftLedgerMonths / payeeSeriesCutoff", () => {
  it("shifts calendar months and clamps end-of-month days", () => {
    expect(shiftLedgerMonths("2026-08-20", -PAYEE_SERIES_WINDOW_MONTHS)).toBe(
      "2023-07-20",
    );
    expect(shiftLedgerMonths("2024-01-31", -1)).toBe("2023-12-31");
    expect(shiftLedgerMonths("2024-03-31", -1)).toBe("2024-02-29");
    expect(shiftLedgerMonths("nope", -1)).toBe(null);
  });

  it("derives the series cutoff from today", () => {
    expect(payeeSeriesCutoff("2026-08-20")).toBe("2023-07-20");
  });
});

describe("mapPayeeSeries", () => {
  it("groups points by payee and sorts by date", () => {
    const mapped = mapPayeeSeries(
      table([
        ["2024-03-01", "Netflix", "-15.99", "USD"],
        ["2024-01-01", "Netflix", "-15.99", "USD"],
        ["2024-02-01", "Spotify", "-10.99", "USD"],
        ["2024-02-01", "Netflix", "-15.99", "USD"],
      ]),
    );
    expect([...mapped.keys()].sort()).toEqual(["Netflix", "Spotify"]);
    expect(mapped.get("Netflix")!.map((p) => p.date)).toEqual([
      "2024-01-01",
      "2024-02-01",
      "2024-03-01",
    ]);
  });

  it("resolves columns by name regardless of order", () => {
    const reordered = [
      { name: "currency", dtype: "str" },
      { name: "payee", dtype: "str" },
      { name: "txn_date", dtype: "date" },
      { name: "amount", dtype: "Decimal" },
    ];
    const mapped = mapPayeeSeries(
      table([["USD", "Netflix", "2024-01-01", "-15.99"]], reordered),
    );
    expect(mapped.get("Netflix")).toEqual([
      { date: "2024-01-01", currency: "USD", amount: -15.99 },
    ]);
  });

  it("sums same-day same-currency amounts for one payee", () => {
    const mapped = mapPayeeSeries(
      table([
        ["2024-12-31", "Corp", "100", "USD"],
        ["2024-12-31", "Corp", "50", "USD"],
        ["2024-12-31", "Corp", "-10", "EUR"],
      ]),
    );
    expect(mapped.get("Corp")).toEqual([
      { date: "2024-12-31", currency: "EUR", amount: -10 },
      { date: "2024-12-31", currency: "USD", amount: 150 },
    ]);
  });

  it("returns an empty map for null/missing columns/bad cells", () => {
    expect(mapPayeeSeries(null).size).toBe(0);
    expect(
      mapPayeeSeries(
        table(
          [["2024-01-01", "X", "-1", "USD"]],
          [
            { name: "txn_date", dtype: "date" },
            { name: "payee", dtype: "str" },
          ],
        ),
      ).size,
    ).toBe(0);
    expect(
      mapPayeeSeries(
        table([
          [null, "Netflix", "-1", "USD"],
          ["2024-01-01", "", "-1", "USD"],
          ["2024-01-01", "Netflix", "nope", "USD"],
          ["2024-01-01", "Netflix", "-1", null],
        ]),
      ).size,
    ).toBe(0);
  });
});
