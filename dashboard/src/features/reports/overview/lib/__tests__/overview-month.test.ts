import { describe, expect, it } from "vitest";
import { financialPositionPeriod, openingMonth } from "../overview-month";
import { recentTransactionsVariables } from "../recent-transactions";
import {
  formatTimeAgo,
  isLedgerDormant,
  isPeriodIncomplete,
  periodPage,
  resolveDataThrough,
  settledOpeningMonth,
} from "../overview-utils";
import { tintColor } from "../sankey-colors";
import { dayBeforeTimeFilter, hierarchyChange } from "../hierarchy-change";
import { transformToSankeyData } from "../sankey-data-transformer";
import type { SerializableTreeNode } from "@/graphql/definitions";

const monthEnds = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(2016, index + 1, 0)).toISOString().slice(0, 10),
  );

describe("the month the Overview shows", () => {
  const dates = ["2026-09-30", "2026-10-31", "2026-11-30", "2026-12-31"];
  const income = dates.map((date, index) => ({
    date,
    balance: { USD: index === 2 ? "0" : "-100" },
    accountBalances: {},
  }));
  const options = {
    income,
    expenses: [],
    hasFilters: false,
    preferActiveMonth: false,
    today: "2026-11-18",
    dataThrough: "2026-10-10",
  };

  it("opens on the latest begun month even with a scheduled later entry", () => {
    expect(openingMonth(options)).toBe("2026-11-30");
    expect(openingMonth({ ...options, month: "2026-12" })).toBe("2026-12-31");
  });

  it("looks for activity in begun months for public readers and filtered views", () => {
    expect(openingMonth({ ...options, preferActiveMonth: true })).toBe(
      "2026-10-31",
    );
    expect(openingMonth({ ...options, hasFilters: true })).toBe("2026-10-31");
  });

  it("keeps the latest future month when the entire selection is in the future", () => {
    expect(openingMonth({ ...options, income: income.slice(-1) })).toBe(
      "2026-12-31",
    );
  });

  it("opens a dormant ledger on its last finished month despite later entries", () => {
    expect(openingMonth({ ...options, dataThrough: "2026-10-02" })).toBe(
      "2026-09-30",
    );
  });

  it("ends the data at the newest entry, never past today", () => {
    expect(resolveDataThrough("2017-09-08", "2026-11-10")).toBe("2017-09-08");
    expect(resolveDataThrough("2026-12-01", "2026-11-10")).toBe("2026-11-10");
    expect(resolveDataThrough(null, "2026-11-10")).toBe("2026-11-10");
  });

  it("calls a month incomplete when the data stops before it ends", () => {
    expect(isPeriodIncomplete("2017-09-30", "2017-09-08")).toBe(true);
    expect(isPeriodIncomplete("2017-08-31", "2017-09-08")).toBe(false);
    expect(isPeriodIncomplete("2017-08-31", "2017-08-31")).toBe(false);
  });

  it("pages a long history by twelve from the latest month", () => {
    const dates = monthEnds(33);
    expect(periodPage(dates, dates[32])).toEqual(dates.slice(21));
    // Anywhere on the latest page keeps that page.
    expect(periodPage(dates, dates[21])).toEqual(dates.slice(21));
    expect(periodPage(dates, dates[20])).toEqual(dates.slice(9, 21));
    // The oldest page is short rather than overlapping the next.
    expect(periodPage(dates, dates[0])).toEqual(dates.slice(0, 9));
    expect(periodPage(dates.slice(0, 5), dates[2])).toEqual(dates.slice(0, 5));
  });

  it("tells a ledger that stopped long ago from one still being written", () => {
    expect(isLedgerDormant("2017-09-08", "2026-11-10")).toBe(true);
    expect(isLedgerDormant("2026-10-20", "2026-11-10")).toBe(false);
    expect(formatTimeAgo("2017-09-08", "2026-11-10", "en")).toBe("9 years ago");
    expect(formatTimeAgo("2026-07-01", "2026-11-10", "en")).toBe(
      "4 months ago",
    );
    expect(formatTimeAgo("2026-11-10", "2026-11-10", "en")).toBe("today");
  });

  it("opens a stopped ledger on its last whole month, a running one on today's", () => {
    const dates = ["2017-07-31", "2017-08-31", "2017-09-30"];
    expect(
      settledOpeningMonth(dates, "2017-09-30", "2017-09-08", "2026-11-10"),
    ).toBe("2017-08-31");
    // It ended on the month's last day: the month is whole.
    expect(
      settledOpeningMonth(dates, "2017-09-30", "2017-09-30", "2026-11-10"),
    ).toBe("2017-09-30");
    // Still being written: the running month is the one to show.
    expect(
      settledOpeningMonth(dates, "2017-09-30", "2017-09-08", "2017-09-08"),
    ).toBe("2017-09-30");
    expect(
      settledOpeningMonth(
        ["2017-09-30"],
        "2017-09-30",
        "2017-09-08",
        "2026-11-10",
      ),
    ).toBe("2017-09-30");
  });
});

describe("Overview valuation cutoffs", () => {
  const month = {
    selectedDate: "2026-11-30",
    latestDate: "2026-12-31",
    dataThrough: "2026-10-10",
    today: "2026-11-18",
  };

  it("uses today and preserves the start of a partial-month filter", () => {
    expect(
      financialPositionPeriod({ ...month, time: "2026-11-08 - 2026-11-29" }),
    ).toEqual({ date: "2026-11-18", time: "2026-11-08 - 2026-11-18" });
  });

  it("keeps an earlier close selected within the current month", () => {
    expect(
      financialPositionPeriod({
        ...month,
        selectedDate: "2026-11-12",
        time: "2026-11-08 - 2026-11-12",
      }),
    ).toEqual({ date: "2026-11-12", time: "2026-11-08 - 2026-11-12" });
  });
});

describe("Recent activity query", () => {
  it("intersects the user's filter and time with all dates through today", () => {
    const filter = "payee:Rent, payee:Mortgage";
    const { query } = recentTransactionsVariables({
      ledgerId: "alice/books",
      account: "Assets:Bank",
      filter,
      time: "fiscal_year",
      today: "2026-11-18",
    });
    expect(query).toMatchObject({
      account: "Assets:Bank",
      time: "fiscal_year",
      offset: 0,
      limit: 8,
    });
    const [clause, pattern] = query.filter.split(' date:"');
    expect(clause).toBe(`(${filter})`);
    const matchesDate = new RegExp(pattern.slice(0, -1));
    for (const date of [
      "0001-01-01",
      "2025-12-31",
      "2026-10-31",
      "2026-11-18",
    ]) {
      expect(matchesDate.test(date)).toBe(true);
    }
    for (const date of [
      "2026-11-19",
      "2026-12-01",
      "2027-01-01",
      "9999-12-31",
    ]) {
      expect(matchesDate.test(date)).toBe(false);
    }
  });
});

describe("Sankey ink", () => {
  it("tints a color toward white", () => {
    expect(tintColor("#000000", 0.5)).toBe("#808080");
    expect(tintColor("#f3813f", 0)).toBe("#f3813f");
    expect(tintColor("#f3813f", 1)).toBe("#ffffff");
    expect(tintColor("teal", 0.5)).toBe("teal");
  });

  const node = (
    account: string,
    balance: Record<string, number> = {},
    children: SerializableTreeNode[] = [],
  ): SerializableTreeNode => ({
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: {},
    cost: null,
    costChildren: null,
    hasTxns: true,
    children,
  });

  it("draws a lone source's parts instead of one slab", () => {
    const income = node("Income", {}, [
      node("Income:US", {}, [
        node("Income:US:Acme", {}, [
          node("Income:US:Acme:Salary", { USD: -900 }),
          node("Income:US:Acme:Bonus", { USD: -100 }),
        ]),
      ]),
    ]);
    const expenses = node("Expenses", {}, [
      node("Expenses:Food", { USD: 400 }),
    ]);
    const sources = (expandSingleSource: boolean) =>
      transformToSankeyData({
        incomeHierarchyData: income,
        expensesHierarchyData: expenses,
        expandSingleSource,
      })
        .links.filter((link) => link.target === "Cash Flow")
        .map((link) => link.source);

    expect(sources(false)).toEqual(["Income:US"]);
    expect(sources(true).sort()).toEqual([
      "Income:US:Acme:Bonus",
      "Income:US:Acme:Salary",
    ]);
  });

  it("counts sources in the diagram's unit when deciding to descend", () => {
    const income = node("Income", {}, [
      node("Income:US", {}, [
        node("Income:US:Acme", {}, [
          node("Income:US:Acme:Salary", { USD: -900 }),
          node("Income:US:Acme:Bonus", { USD: -100 }),
        ]),
        // A retirement unit only: not a second dollar source.
        node("Income:US:Plan", { IRAUSD: -50 }),
      ]),
    ]);
    const data = transformToSankeyData({
      incomeHierarchyData: income,
      expensesHierarchyData: node("Expenses", {}, [
        node("Expenses:Food", { USD: 400 }),
      ]),
      preferredCurrency: "USD",
      expandSingleSource: true,
    });
    expect(
      data.links
        .filter((link) => link.target === "Cash Flow")
        .map((link) => link.source)
        .sort(),
    ).toEqual(["Income:US:Acme:Bonus", "Income:US:Acme:Salary"]);
  });

  it("names a lone brokerage group and a lone card by what is inside them", () => {
    const data = transformToSankeyData({
      incomeHierarchyData: node("Income", {}, [
        node("Income:Salary", { USD: -1000 }),
      ]),
      expensesHierarchyData: node("Expenses", {}, [
        node("Expenses:Food", { USD: 400 }),
      ]),
      assetsHierarchyData: node("Assets", {}, [
        node("Assets:US", {}, [
          node("Assets:US:ETrade", {}, [
            node("Assets:US:ETrade:VHT", { USD: 300 }),
          ]),
          node("Assets:US:Vanguard", {}, [
            node("Assets:US:Vanguard:VBMPX", { USD: 200 }),
          ]),
          // Cash is the hub's own reserve, never a node.
          node("Assets:US:BofA", {}, [
            node("Assets:US:BofA:Checking", { USD: -100 }),
          ]),
        ]),
      ]),
      liabilitiesHierarchyData: node("Liabilities", {}, [
        node("Liabilities:US", {}, [
          node("Liabilities:US:Chase", {}, [
            node("Liabilities:US:Chase:Slate", { USD: -195.11 }),
          ]),
        ]),
      ]),
      preferredCurrency: "USD",
      expandSingleSource: true,
    });
    const names = data.nodes.map((entry) => entry.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Assets:US:ETrade",
        "Assets:US:Vanguard",
        "Liabilities:US:Chase:Slate",
      ]),
    );
    expect(names).not.toContain("Assets:US");
    expect(names).not.toContain("Liabilities:US");
  });

  it("keeps a lone leaf source as it is", () => {
    const data = transformToSankeyData({
      incomeHierarchyData: node("Income", {}, [
        node("Income:Salary", { USD: -100 }),
      ]),
      expensesHierarchyData: node("Expenses", {}, [
        node("Expenses:Food", { USD: 40 }),
      ]),
      expandSingleSource: true,
    });
    expect(
      data.links.filter((link) => link.target === "Cash Flow"),
    ).toMatchObject([{ source: "Income:Salary", exact: "100" }]);
  });
});

describe("a month's balance-sheet change", () => {
  const tree = (
    account: string,
    balance: Record<string, string>,
    children: SerializableTreeNode[] = [],
  ): SerializableTreeNode => ({
    __typename: "SerializableTreeNode",
    account,
    balance,
    balanceChildren: {},
    cost: null,
    costChildren: null,
    hasTxns: true,
    children,
  });

  it("subtracts the opening balances from the closing ones, per account", () => {
    const closing = tree("Assets", {}, [
      tree("Assets:Brokerage", { USD: "1500.25" }),
      tree("Assets:New", { USD: "40" }),
    ]);
    const opening = tree("Assets", {}, [
      tree("Assets:Brokerage", { USD: "1000.25", VACHR: "3" }),
      tree("Assets:Sold", { USD: "200" }),
    ]);
    const change = hierarchyChange(closing, opening)!;
    expect(change.balance).toEqual({});
    expect(
      (change.children as SerializableTreeNode[]).map((child) => [
        child.account,
        child.balance,
      ]),
    ).toEqual([
      ["Assets:Brokerage", { USD: "500.00", VACHR: "-3" }],
      ["Assets:New", { USD: "40" }],
      ["Assets:Sold", { USD: "-200" }],
    ]);
    expect(hierarchyChange(closing, undefined)).toMatchObject({
      children: [
        { account: "Assets:Brokerage", balance: { USD: "1500.25" } },
        { account: "Assets:New", balance: { USD: "40" } },
      ],
    });
    expect(hierarchyChange(undefined, undefined)).toBeUndefined();
  });

  it("closes the opening read on the day before the month begins", () => {
    expect(dayBeforeTimeFilter("2017-09")).toBe("2017-08-31");
    expect(dayBeforeTimeFilter("2016-03")).toBe("2016-02-29");
    expect(dayBeforeTimeFilter("2026-11-01 - 2026-11-10")).toBe("2026-10-31");
    expect(dayBeforeTimeFilter("2017-01")).toBe("2016-12-31");
    expect(dayBeforeTimeFilter("")).toBeNull();
  });
});
