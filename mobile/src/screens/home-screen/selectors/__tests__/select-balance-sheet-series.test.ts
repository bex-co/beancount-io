import {
  selectNetWorthSeries,
  selectAssetsSeries,
  selectLiabilitiesSeries,
  selectSeriesValuation,
} from "../select-balance-sheet-series";
import {
  BalanceSheetBasisQuery,
  BalanceSheetQuery,
} from "@/generated-graphql/graphql";

type Point = { date: string; balance: Record<string, number | string> };

function createBalanceSheet(sections: {
  netWorthData?: Point[];
  assetsData?: Point[];
  liabilitiesData?: Point[];
}): BalanceSheetQuery {
  return {
    getLedgerBalanceSheet: {
      netWorthData: [],
      assetsData: [],
      liabilitiesData: [],
      ...sections,
    },
  } as unknown as BalanceSheetQuery;
}

describe("selectNetWorthSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectNetWorthSeries("USD", undefined)).toEqual([]);
  });

  it("returns an empty array when the section is empty", () => {
    expect(selectNetWorthSeries("USD", createBalanceSheet({}))).toEqual([]);
  });

  it("converts points to a series in the active currency", () => {
    const data = createBalanceSheet({
      netWorthData: [
        { date: "2025-01-31", balance: { USD: 1000 } },
        { date: "2025-02-28", balance: { USD: 1500 } },
      ],
    });
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: 1000 },
      { date: "2025-02-28", value: 1500 },
    ]);
  });

  it("keeps one (most recent) point per month, sorted ascending", () => {
    const data = createBalanceSheet({
      netWorthData: [
        { date: "2025-02-10", balance: { USD: 1200 } },
        { date: "2025-02-28", balance: { USD: 1500 } },
        { date: "2025-01-31", balance: { USD: 1000 } },
      ],
    });
    expect(selectNetWorthSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: 1000 },
      { date: "2025-02-28", value: 1500 },
    ]);
  });
});

describe("selectAssetsSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectAssetsSeries("USD", undefined)).toEqual([]);
  });

  it("reads the active currency and coerces string amounts", () => {
    const data = createBalanceSheet({
      assetsData: [
        { date: "2025-03-31", balance: { EUR: "2500.50", USD: 10 } },
      ],
    });
    expect(selectAssetsSeries("EUR", data)).toEqual([
      { date: "2025-03-31", value: 2500.5 },
    ]);
  });
});

describe("selectLiabilitiesSeries", () => {
  it("returns an empty array when data is undefined", () => {
    expect(selectLiabilitiesSeries("USD", undefined)).toEqual([]);
  });

  // Beancount keeps liabilities negative; the chart plots them as-is so growing
  // debt trends downward.
  it("keeps liabilities signed (negative)", () => {
    const data = createBalanceSheet({
      liabilitiesData: [
        { date: "2025-01-31", balance: { USD: -4000 } },
        { date: "2025-02-28", balance: { USD: -5000 } },
      ],
    });
    expect(selectLiabilitiesSeries("USD", data)).toEqual([
      { date: "2025-01-31", value: -4000 },
      { date: "2025-02-28", value: -5000 },
    ]);
  });

  // w21/058: USD history read as EUR made net worth "crash" 98% at the first
  // EUR posting.
  it("reads a point without the active currency as zero, not its USD", () => {
    const data = createBalanceSheet({
      liabilitiesData: [{ date: "2025-01-31", balance: { USD: -1200 } }],
    });
    expect(selectLiabilitiesSeries("EUR", data)).toEqual([
      { date: "2025-01-31", value: 0 },
    ]);
  });
});

describe("selectSeriesValuation", () => {
  // The latest two net-worth points of `open_ledger/example`, as the API
  // returned them on 2026-09-26, in all three reads.
  const market = createBalanceSheet({
    netWorthData: [
      { date: "2017-08-31", balance: { USD: "115457.9812", VACHR: "-18" } },
      { date: "2017-09-30", balance: { USD: "117649.48828", VACHR: "-13" } },
    ],
  });
  const basis = {
    cost: {
      netWorthData: [
        { date: "2017-09-30", balance: { USD: "106826.04944", VACHR: "-13" } },
      ],
      assetsData: [],
      liabilitiesData: [],
    },
    units: {
      netWorthData: [
        {
          date: "2017-09-30",
          balance: { USD: "906.58", VACHR: "-13", RGAGX: "597.748" },
        },
      ],
      assetsData: [],
      liabilitiesData: [],
    },
  } as unknown as BalanceSheetBasisQuery;
  const prices = [
    { base: "RGAGX", quote: "USD", prices: [{ date: "2017-09-08" }] },
  ];

  it("measures the latest market point against the same point at cost", () => {
    const valuation = selectSeriesValuation(
      "USD",
      "netWorthData",
      market,
      basis,
      prices,
      "2026-09-26",
    );
    expect(valuation.market).toBe(117649.48828);
    expect(valuation.cost).toBe(106826.04944);
    expect(valuation.priced.map((holding) => holding.currency)).toEqual([
      "RGAGX",
    ]);
    expect(valuation.priced[0]?.priceDate).toBe("2017-09-08");
    // Dated against its own 2017-09-30 point, not only against today.
    expect(valuation.priced[0]?.stale).toBe(true);
    expect(valuation.notInTotal).toEqual([
      { currency: "VACHR", number: -13, scale: 0 },
    ]);
  });

  it("measures price age against today, not the month-end of the last activity (w21/209)", () => {
    // Nothing dated October: the series ends at 2026-09-30, five days after
    // the last price, but the price is 26 days old on 2026-10-21 and the
    // Accounts tree says so.
    const idle = createBalanceSheet({
      netWorthData: [{ date: "2026-09-30", balance: { USD: "35714.29" } }],
    });
    const idleBasis = {
      cost: {
        netWorthData: [{ date: "2026-09-30", balance: { USD: "30000.00" } }],
        assetsData: [],
        liabilitiesData: [],
      },
      units: {
        netWorthData: [
          { date: "2026-09-30", balance: { USD: "0", QAETH: "0.5" } },
        ],
        assetsData: [],
        liabilitiesData: [],
      },
    } as unknown as BalanceSheetBasisQuery;
    const idlePrices = [
      {
        base: "QAETH",
        quote: "USD",
        prices: [{ date: "2026-08-04" }, { date: "2026-09-25" }],
      },
    ];
    const valuation = selectSeriesValuation(
      "USD",
      "netWorthData",
      idle,
      idleBasis,
      idlePrices,
      "2026-10-21",
    );
    expect(valuation.priced[0]?.priceDate).toBe("2026-09-25");
    expect(valuation.priced[0]?.stale).toBe(true);
  });

  it("knows no cost and no holdings until the basis read lands", () => {
    const valuation = selectSeriesValuation(
      "USD",
      "netWorthData",
      market,
      undefined,
      prices,
      "2026-09-26",
    );
    expect(valuation.cost).toBe(null);
    expect(valuation.valuesHoldings).toBe(false);
    // What the total leaves out is read from the market figure alone.
    expect(valuation.notInTotal.length).toBe(1);
  });

  it("reads a curve with no points as an empty total", () => {
    const valuation = selectSeriesValuation(
      "USD",
      "liabilitiesData",
      market,
      basis,
      prices,
      "2026-09-26",
    );
    expect(valuation.market).toBe(0);
    expect(valuation.cost).toBe(null);
    expect(valuation.valuesHoldings).toBe(false);
    expect(valuation.notInTotal).toEqual([]);
  });
});

// w21/665: a lot bought next month made today's caption and footnote describe
// November's holdings while the chart ended today.
describe("selectSeriesValuation: entries booked for later months", () => {
  const point = (date: string, usd: number, voo = 0): Point => ({
    date,
    balance: voo ? { USD: usd, VOO: voo } : { USD: usd },
  });
  const market = createBalanceSheet({
    netWorthData: [point("2026-10-31", 12000), point("2026-11-30", 17081.51)],
  });
  const basis = {
    cost: {
      netWorthData: [point("2026-10-31", 12000), point("2026-11-30", 16881.51)],
      assetsData: [],
      liabilitiesData: [],
    },
    units: {
      netWorthData: [
        point("2026-10-31", 12000),
        point("2026-11-30", 12000, 10),
      ],
      assetsData: [],
      liabilitiesData: [],
    },
  } as unknown as BalanceSheetBasisQuery;

  it("reads market, cost and units at today's month, not the later one", () => {
    const valuation = selectSeriesValuation(
      "USD",
      "netWorthData",
      market,
      basis,
      [],
      "2026-10-22",
    );
    expect(valuation.market).toBe(12000);
    expect(valuation.cost).toBe(12000);
    expect(valuation.priced).toEqual([]);
  });

  it("reads the later point once its month arrives", () => {
    const valuation = selectSeriesValuation(
      "USD",
      "netWorthData",
      market,
      basis,
      [],
      "2026-11-02",
    );
    expect(valuation.market).toBe(17081.51);
    expect(valuation.cost).toBe(16881.51);
  });
});
