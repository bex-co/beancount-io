import {
  buildMerchantCurrencyTotalsBql,
  buildMerchantMetaBql,
  composeMerchantStats,
  mapMerchantCurrencyTotals,
  mapMerchantMeta,
} from "../screens/merchant-detail-screen/selectors/merchant-stats";
import type { QueryResultTableLike } from "../screens/merchants-screen/selectors/bql-table";

function table(
  types: { name: string; dtype: string }[],
  rows: unknown[][],
): QueryResultTableLike {
  return { types, rows };
}

describe("buildMerchantMetaBql / buildMerchantCurrencyTotalsBql", () => {
  it("interpolates a safe payee predicate into fixed statements", () => {
    // A double quote can't be escaped in the engine's literal (w21/032).
    const meta = buildMerchantMetaBql('He said "hi"');
    expect(meta.includes('payee ~ "^He said \\x22hi\\x22$"')).toBe(true);
    expect(meta.includes("FROM #entries")).toBe(true);
    expect(meta.includes("transaction_count")).toBe(true);

    const totals = buildMerchantCurrencyTotalsBql("O'Brien");
    expect(totals.includes('payee = "O\'Brien"')).toBe(true);
    expect(totals.includes("account ~ '^Expenses'")).toBe(true);
    expect(totals.includes("GROUP BY currency")).toBe(true);
    expect(totals.includes("FROM #entries")).toBe(false);
  });
});

describe("mapMerchantMeta", () => {
  const types = [
    { name: "transaction_count", dtype: "int" },
    { name: "first_date", dtype: "date" },
    { name: "last_date", dtype: "date" },
  ];

  it("maps the single meta row", () => {
    expect(
      mapMerchantMeta(table(types, [[32, "2022-12-31", "2025-12-31"]])),
    ).toEqual({
      transactionCount: 32,
      firstDate: "2022-12-31",
      lastDate: "2025-12-31",
    });
  });

  it("fails soft on missing columns or empty tables", () => {
    expect(mapMerchantMeta(null)).toBe(null);
    expect(mapMerchantMeta(table(types, []))).toBe(null);
    expect(
      mapMerchantMeta(
        table([{ name: "transaction_count", dtype: "int" }], [[32]]),
      ),
    ).toBe(null);
  });
});

describe("mapMerchantCurrencyTotals", () => {
  const types = [
    { name: "currency", dtype: "str" },
    { name: "total", dtype: "Decimal" },
  ];

  it("maps and sorts per-currency totals without summing across them", () => {
    expect(
      mapMerchantCurrencyTotals(
        table(types, [
          ["USD", "-120.5"],
          ["EUR", "40"],
        ]),
      ),
    ).toEqual([
      { currency: "EUR", total: 40 },
      { currency: "USD", total: -120.5 },
    ]);
  });

  it("skips bad rows and fails soft", () => {
    expect(mapMerchantCurrencyTotals(null)).toEqual([]);
    expect(
      mapMerchantCurrencyTotals(
        table(types, [
          [null, "10"],
          ["USD", "nope"],
          ["JPY", "3"],
        ]),
      ),
    ).toEqual([{ currency: "JPY", total: 3 }]);
  });
});

describe("composeMerchantStats", () => {
  it("returns null without meta, otherwise attaches currency totals", () => {
    expect(composeMerchantStats(null, [{ currency: "USD", total: 1 }])).toBe(
      null,
    );
    expect(
      composeMerchantStats(
        {
          transactionCount: 2,
          firstDate: "2024-01-01",
          lastDate: "2024-02-01",
        },
        [{ currency: "USD", total: -10 }],
      ),
    ).toEqual({
      transactionCount: 2,
      firstDate: "2024-01-01",
      lastDate: "2024-02-01",
      totalsByCurrency: [{ currency: "USD", total: -10 }],
      scheduledTotalsByCurrency: [],
    });
  });
});

// w21/796: "4 transactions · $6,000.00" when three payments, $4,500.00, were
// on or before today and the fourth was pre-entered for November.
describe("a merchant with a pre-entered payment", () => {
  it("reads only what is on or before today, and the rest after it", () => {
    expect(buildMerchantMetaBql("Landlord", { through: "2026-10-23" })).toBe(
      'SELECT count(*) as transaction_count, min(date) as first_date, max(date) as last_date FROM #entries WHERE payee = "Landlord" AND date <= 2026-10-23',
    );
    expect(
      buildMerchantMetaBql("Landlord", { after: "2026-10-23" }).endsWith(
        " AND date > 2026-10-23",
      ),
    ).toBe(true);
    expect(
      buildMerchantCurrencyTotalsBql("Landlord", undefined, {
        through: "2026-10-23",
      }).includes(" AND date <= 2026-10-23 GROUP BY currency"),
    ).toBe(true);
    // A day that is not a date filters nothing rather than breaking the read.
    expect(buildMerchantMetaBql("Landlord", { through: "today" })).toBe(
      buildMerchantMetaBql("Landlord"),
    );
  });

  it("counts and totals what was paid, and keeps the scheduled apart", () => {
    expect(
      composeMerchantStats(
        {
          transactionCount: 3,
          firstDate: "2026-08-01",
          lastDate: "2026-10-01",
        },
        [{ currency: "USD", total: 4500 }],
        {
          meta: {
            transactionCount: 1,
            firstDate: "2026-11-01",
            lastDate: "2026-11-01",
          },
          totals: [{ currency: "USD", total: 1500 }],
        },
      ),
    ).toEqual({
      transactionCount: 3,
      firstDate: "2026-08-01",
      lastDate: "2026-11-01",
      totalsByCurrency: [{ currency: "USD", total: 4500 }],
      scheduledTotalsByCurrency: [{ currency: "USD", total: 1500 }],
    });
  });

  it("is what the header reads", () => {
    const screen = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "screens",
          "merchant-detail-screen",
          "merchant-detail-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    // Split at today on the client, from statements that name no day (w21/918).
    expect(screen.includes("splitMerchantMeta(")).toBe(true);
    expect(screen.includes("splitMerchantTotals(")).toBe(true);
    expect(screen.includes("buildMerchantDailyMetaBql(spellings)")).toBe(true);
    expect(
      screen.includes('t("merchantScheduledTotal",{amount:isolateLtr(line)})'),
    ).toBe(true);
  });
});

describe("merchant detail header failure", () => {
  it("shows the retryable failure in place of the header, rows or not", () => {
    const fs = require("fs");
    const path = require("path");
    const screen = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "screens",
        "merchant-detail-screen",
        "merchant-detail-screen.tsx",
      ),
      "utf8",
    );
    expect(
      screen.includes(
        "ListHeaderComponent={fatalError ? statsError : listHeader}",
      ),
    ).toBe(true);
  });
});
