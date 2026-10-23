import fs from "fs";
import path from "path";
import {
  selectSpendingCompare,
  spendingChartSummary,
  spendingWindow,
} from "../select-spending-compare";
import { en } from "../../../../translations/en";

// The card used to sum the newest 200 journal rows, so a month with more
// transactions than that hid last month's spending and capped this month's
// (w21/011). It now reads the Expenses root's monthly totals for the two
// months, which the server sums whole.
const REF = new Date(2026, 9, 20); // 2026-10-20, local time

describe("spendingWindow", () => {
  // w21/184: ending on today made a new cache key every day, so the next day
  // offline found no cached result.
  it("asks for the first of last month through the end of this one", () => {
    expect(spendingWindow(REF)).toBe("2026-09-01 - 2026-10-31");
  });

  it("is the same all month", () => {
    expect(spendingWindow(new Date(2026, 9, 1))).toBe(spendingWindow(REF));
    expect(spendingWindow(new Date(2026, 9, 31))).toBe(spendingWindow(REF));
  });

  it("reaches back across a year boundary in January", () => {
    expect(spendingWindow(new Date(2027, 0, 5))).toBe(
      "2026-12-01 - 2027-01-31",
    );
  });
});

describe("selectSpendingCompare", () => {
  it("returns zeros for no months", () => {
    expect(selectSpendingCompare([], "USD", REF)).toEqual({
      thisMonth: 0,
      lastMonth: 0,
      notInTotal: [],
      lastMonthNotInTotal: [],
      thisMonthKey: "2026-10",
      lastMonthKey: "2026-09",
    });
  });

  it("reads last month and this month from their totals, however busy", () => {
    // The repro: one $100 September expense, 205 October expenses of $1.
    const result = selectSpendingCompare(
      [
        { date: "2026-09-30", balance: { USD: 100 } },
        { date: "2026-10-31", balance: { USD: "205.00" } },
      ],
      "USD",
      REF,
    );
    expect(result.lastMonth).toBe(100);
    expect(result.thisMonth).toBe(205);
  });

  it("reads the active currency only", () => {
    const result = selectSpendingCompare(
      [{ date: "2026-10-31", balance: { EUR: 40, USD: 12 } }],
      "EUR",
      REF,
    );
    expect(result.thisMonth).toBe(40);
  });

  it("ignores months outside the two compared", () => {
    const result = selectSpendingCompare(
      [
        { date: "2026-08-31", balance: { USD: 999 } },
        { date: "2026-10-31", balance: { USD: 5 } },
      ],
      "USD",
      REF,
    );
    expect(result.lastMonth).toBe(0);
    expect(result.thisMonth).toBe(5);
  });

  it("treats a month with no balance as no spending", () => {
    const result = selectSpendingCompare(
      [{ date: "2026-09-30", balance: null }],
      "USD",
      REF,
    );
    expect(result.lastMonth).toBe(0);
  });
});

describe("Spending card", () => {
  it("queries the ledger's Expenses root by month over the window", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "..", "components", "spending-card.tsx"),
      "utf8",
    );
    expect(source.includes("useGetLedgerIntervalTotalsQuery")).toBe(true);
    expect(source.includes("accountName: expensesRoot,")).toBe(true);
    expect(source.includes('interval: "month",')).toBe(true);
    expect(source.includes("time: spendingWindow(),")).toBe(true);
    expect(source.includes("useGetLedgerJournalQuery")).toBe(false);
  });
});

// The chart's bars and ticks are not readable on their own; VoiceOver hears
// one summary naming both months and amounts (w21/018).
describe("spendingChartSummary", () => {
  const t = (key: "spendingChartSummary", params: Record<string, string>) =>
    en[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => params[name]);

  it("names both months and their amounts", () => {
    expect(
      spendingChartSummary({ lastMonth: 100, thisMonth: 205 }, "USD", t),
    ).toBe("Spending: last month $100.00, this month $205.00.");
  });

  it("is the label of the one accessible chart element", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, ...parts), "utf8");
    expect(
      read("..", "..", "..", "..", "common", "d3", "bar-chart-d3.tsx").includes(
        "<View accessible accessibilityLabel={accessibilityLabel}>",
      ),
    ).toBe(true);
    expect(
      read("..", "..", "components", "spending-card.tsx").includes(
        "accessibilityLabel={spendingChartSummary(",
      ),
    ).toBe(true);
  });
});

// w21/038: a 50 EUR expense in a USD ledger read "This month $0" with no hint.
describe("selectSpendingCompare: other currencies", () => {
  it("names the spending the bars cannot include", () => {
    const result = selectSpendingCompare(
      [
        { date: "2026-10-05", balance: { USD: "12.00", EUR: "50.00" } },
        { date: "2026-09-12", balance: { EUR: "20.10" } },
        // Outside the two months: not counted, not disclosed.
        { date: "2026-08-01", balance: { EUR: "999.00" } },
      ],
      "USD",
      REF,
    );
    expect(result.thisMonth).toBe(12);
    expect(result.lastMonth).toBe(0);
    // Each month on its own: the 50.00 EUR is this month's, the 20.10 EUR
    // last month's (w21/263).
    expect(result.notInTotal).toEqual([
      { currency: "EUR", number: 50, scale: 2 },
    ]);
    expect(result.lastMonthNotInTotal).toEqual([
      { currency: "EUR", number: 20.1, scale: 2 },
    ]);
  });

  // w21/263: the two months were netted together, so a refund last month hid
  // this month's spending.
  it("does not let a refund last month hide spending this month", () => {
    const result = selectSpendingCompare(
      [
        { date: "2026-09-12", balance: { USD: "1200.00", EUR: "-50.00" } },
        { date: "2026-10-05", balance: { USD: "300.00", EUR: "50.00" } },
      ],
      "USD",
      REF,
    );
    expect(result.notInTotal).toEqual([
      { currency: "EUR", number: 50, scale: 2 },
    ]);
    expect(result.lastMonthNotInTotal).toEqual([
      { currency: "EUR", number: -50, scale: 2 },
    ]);
  });

  it("does not report an amount neither month spent", () => {
    const result = selectSpendingCompare(
      [
        { date: "2026-09-12", balance: { EUR: "-30.00" } },
        { date: "2026-10-05", balance: { EUR: "80.00" } },
      ],
      "USD",
      REF,
    );
    expect(result.notInTotal).toEqual([
      { currency: "EUR", number: 80, scale: 2 },
    ]);
  });

  it("still adds one currency's entries within a month, and drops zeros", () => {
    const result = selectSpendingCompare(
      [
        { date: "2026-10-05", balance: { EUR: "50.00" } },
        { date: "2026-10-20", balance: { EUR: "-50.00" } },
      ],
      "USD",
      REF,
    );
    expect(result.notInTotal).toEqual([]);
  });

  it("discloses nothing for a single-currency ledger", () => {
    expect(
      selectSpendingCompare(
        [{ date: "2026-10-05", balance: { USD: "12.00" } }],
        "USD",
        REF,
      ).notInTotal,
    ).toEqual([]);
  });
});

describe("spendingChartSummary: other currencies", () => {
  it("speaks the not-in-total line after the amounts", () => {
    const t = (_key: string, params: Record<string, string>) =>
      `${params.lastMonth} then ${params.thisMonth}`;
    expect(
      spendingChartSummary(
        { lastMonth: 0, thisMonth: 12 },
        "USD",
        t,
        "Not in total: 50.00 EUR",
      ),
    ).toBe("$0.00 then $12.00. Not in total: 50.00 EUR");
  });
});

describe("the Spending card's notes", () => {
  it("shows last month's omissions on their own line", () => {
    const card = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "..",
          "components",
          "spending-card.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(card.includes('t("spendingLastMonthNotInTotal"')).toBe(true);
    expect(card.includes('testID="spending-last-not-in-total"')).toBe(true);
    expect(card.includes("lastMonthNotInTotal")).toBe(true);
  });
});

// w21/418: the two monthly totals were only in the VoiceOver label, and an
// empty ledger drew two 2 pt bars over a $0 to $1 axis.
describe("the spending card's totals and empty state", () => {
  const {
    spendingTotalsCaption,
    noSpending,
  } = require("../select-spending-compare");
  const labels = { thisMonth: "This month", lastMonth: "Last month" };

  it("prints both totals under the bars", () => {
    expect(
      spendingTotalsCaption(
        { thisMonth: 1234.56, lastMonth: 987.65 },
        "USD",
        labels,
      ),
    ).toBe("This month $1,234.56 · Last month $987.65");
  });

  // w21/494: $120 spent and a $500 refund read as "This month $380.00".
  it("keeps the sign of a net-refund month in the caption and the summary", () => {
    expect(
      spendingTotalsCaption(
        { thisMonth: -380, lastMonth: 1200 },
        "USD",
        labels,
      ),
    ).toBe("This month -$380.00 · Last month $1,200.00");
    const { spendingChartSummary } = require("../select-spending-compare");
    expect(
      spendingChartSummary(
        { thisMonth: -380, lastMonth: 1200 },
        "USD",
        (_key: string, params: Record<string, string>) =>
          `${params.thisMonth}|${params.lastMonth}`,
      ),
    ).toBe("-$380.00|$1,200.00");
  });

  it("isolates each amount for right-to-left text", () => {
    expect(
      spendingTotalsCaption(
        { thisMonth: 5, lastMonth: 0 },
        "USD",
        labels,
        (text: string) => `[${text}]`,
      ),
    ).toBe("This month [$5.00] · Last month [$0.00]");
  });

  it("is empty only when neither month has spending", () => {
    expect(noSpending({ lastMonth: 0, thisMonth: 0 })).toBe(true);
    expect(noSpending({ lastMonth: 0, thisMonth: 0.01 })).toBe(false);
    expect(noSpending({ lastMonth: 12, thisMonth: 0 })).toBe(false);
  });

  // w21/493: "No spending yet" over its own "Not in total: 80.00 EUR".
  it("is not empty when a month was spent in another currency", () => {
    const eur = [{ currency: "EUR", number: 80, scale: 2 }];
    const base = { lastMonth: 0, thisMonth: 0 };
    expect(noSpending({ ...base, notInTotal: eur })).toBe(false);
    expect(noSpending({ ...base, lastMonthNotInTotal: eur })).toBe(false);
    expect(
      noSpending({ ...base, notInTotal: [], lastMonthNotInTotal: [] }),
    ).toBe(true);
  });

  it("is what the card renders: the empty text, or the chart with its totals", () => {
    const src = require("fs")
      .readFileSync(
        require("path").join(__dirname, "../../components/spending-card.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      src.includes(
        "constempty=noSpending({lastMonth,thisMonth,notInTotal,lastMonthNotInTotal,});",
      ),
    ).toBe(true);
    expect(src.includes("{empty?(")).toBe(true);
    // "No spending yet" only once the whole span shows none (w21/789).
    expect(
      src.includes('t(neverSpent?"spendingEmpty":"spendingEmptyRecent")'),
    ).toBe(true);
    expect(
      src.includes(
        "constneverSpent=everSpent(allMonths.data?.getLedgerIntervalTotals)===false;",
      ),
    ).toBe(true);
    expect(src.includes("skip:!ledgerId||!contextSettled||!empty,")).toBe(true);
    expect(src.includes('testID="spending-totals"')).toBe(true);
    expect(
      src.includes(
        '{thisMonth:t("thisMonth"),lastMonth:t("lastMonth")},isolateLtr,',
      ),
    ).toBe(true);
  });
});

// w21/789: "No spending yet" on a ledger whose spending stopped in August.
describe("everSpent", () => {
  const { everSpent } = require("../select-spending-compare");

  it("finds spending in any month and currency", () => {
    expect(
      everSpent([
        { date: "2026-07-31", balance: {} },
        { date: "2026-08-31", balance: { USD: "84.20" } },
        { date: "2026-09-30", balance: {} },
      ]),
    ).toBe(true);
    expect(everSpent([{ date: "2026-08-31", balance: { EUR: 12 } }])).toBe(
      true,
    );
  });

  it("finds none in an empty ledger, and nothing before the read lands", () => {
    expect(everSpent([])).toBe(false);
    expect(everSpent([{ date: "2026-10-31", balance: { USD: "0" } }])).toBe(
      false,
    );
    expect(everSpent(undefined)).toBe(null);
  });
});
