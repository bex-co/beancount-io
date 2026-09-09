import { describe, expect, it } from "vitest";
import { buildCashFlowDocument } from "@/features/reports/export/model";
import { statementToCSV } from "@/features/reports/export/csv";
import { statementToMarkdown } from "@/features/reports/export/markdown";
import { mergeIntervalAccountChanges } from "../merge-intervals";
import { buildCashFlowStatement } from "../model";
import { buildActivityForest } from "../statement-tree";

/**
 * Captured-response-shaped fixture for the public example's 2016 Federal
 * parent/child collision (see .pm/w3/m16). Interval totals are *direct*
 * postings: Federal USD and PreTax401k IRAUSD coexist; they are not rollups.
 */
const FEDERAL = "Expenses:Taxes:Y2016:US:Federal";
const PRETAx = "Expenses:Taxes:Y2016:US:Federal:PreTax401k";
const OTHER_INCOME = "Income:US:Hoogle:Salary";

const closingCashAccounts = [
  {
    account: "Assets:US:BofA:Checking",
    balance: { USD: "6377.23" },
    roleSource: "heuristic" as const,
  },
  {
    account: "Assets:US:ETrade:Cash",
    balance: { USD: "386.22" },
    roleSource: "heuristic" as const,
  },
  {
    account: "Assets:US:Vanguard:Cash",
    balance: { USD: "0.06" },
    roleSource: "heuristic" as const,
  },
];

const labels = {
  operating: "Operating Activities",
  investing: "Investing Activities",
  financing: "Financing Activities",
  net_change: "Net change in cash & equivalents",
  openingCash: "Cash & equivalents at period start",
  closingCash: "Cash & equivalents at period end",
};

function statementFromSeries(
  income: { date: string; accountBalances: Record<string, unknown> }[],
  expenses: { date: string; accountBalances: Record<string, unknown> }[],
) {
  return buildCashFlowStatement({
    intervals: mergeIntervalAccountChanges(income, expenses),
    closingCashAccounts,
    primaryCurrency: "USD",
  });
}

describe("parent direct postings pipeline (m16)", () => {
  const yearlyIncome = [
    {
      date: "2016",
      accountBalances: { [OTHER_INCOME]: { USD: "-26185.56" } },
    },
  ];
  const yearlyExpenses = [
    {
      date: "2016",
      accountBalances: {
        [FEDERAL]: { USD: "27635.92" },
        [PRETAx]: { IRAUSD: "18000" },
      },
    },
  ];

  // Monthly shape mirrors the repro: parent+child coexist early; later months
  // keep only the parent USD remainder. Period totals must match yearly.
  const monthlyIncome = [
    {
      date: "2016-07",
      accountBalances: { [OTHER_INCOME]: { USD: "-13000.00" } },
    },
    {
      date: "2016-12",
      accountBalances: { [OTHER_INCOME]: { USD: "-13185.56" } },
    },
  ];
  const monthlyExpenses = [
    {
      date: "2016-07",
      accountBalances: {
        [FEDERAL]: { USD: "15943.80" },
        [PRETAx]: { IRAUSD: "18000" },
      },
    },
    {
      date: "2016-12",
      accountBalances: { [FEDERAL]: { USD: "11692.12" } },
    },
  ];

  it("reconciles monthly and yearly groupings to the documented cash set", () => {
    const monthly = statementFromSeries(monthlyIncome, monthlyExpenses);
    const yearly = statementFromSeries(yearlyIncome, yearlyExpenses);

    for (const statement of [monthly, yearly]) {
      expect(statement.closing).toEqual({ USD: "6763.51" });
      expect(statement.netChange).toEqual({
        USD: "-1450.36",
        IRAUSD: "-18000",
      });
      expect(statement.opening).toEqual({ USD: "8213.87", IRAUSD: "18000" });
      expect(
        statement.rows.find((row) => row.accountPath === FEDERAL)?.amounts,
      ).toEqual({ USD: "-27635.92" });
      expect(
        statement.rows.find((row) => row.accountPath === PRETAx)?.amounts,
      ).toEqual({ IRAUSD: "-18000" });
    }

    expect(monthly.netChange).toEqual(yearly.netChange);
    expect(monthly.opening).toEqual(yearly.opening);
  });

  it("keeps Federal own USD on the hierarchy node beside the IRAUSD child", () => {
    const statement = statementFromSeries(yearlyIncome, yearlyExpenses);
    const operating = statement.rows.filter(
      (row) => row.activity === "operating",
    );
    const forest = buildActivityForest(operating, "USD");

    // Walk Taxes → Y2016 → US → Federal
    let node = forest.find((n) => n.account === "Expenses:Taxes")!;
    for (const segment of ["Y2016", "US", "Federal"]) {
      node = (node.children as typeof forest).find((child) =>
        child.account.endsWith(`:${segment}`),
      )!;
    }
    expect(node.account).toBe(FEDERAL);
    expect(node.balance).toEqual({ USD: "-27635.92" });
    expect(node.balanceChildren).toEqual({
      USD: "-27635.92",
      IRAUSD: "-18000",
    });
  });

  it("exports CSV and Markdown with the full Federal USD amount", () => {
    const statement = statementFromSeries(yearlyIncome, yearlyExpenses);
    const document = buildCashFlowDocument({
      title: "Cash Flow",
      statement,
      labels,
      reportingEntity: "Example",
      reportingEntitySource: "ledger_title",
      ledgerName: "example",
      primaryCurrency: "USD",
      conversion: "at_cost",
      interval: "yearly",
      filters: { time: "2016", account: "", filter: "" },
      reportDates: ["2016"],
      generatedAt: "2026-09-08T12:00:00.000Z",
    });
    const csv = statementToCSV(document);
    const markdown = statementToMarkdown(document, {
      locale: "en",
      t: (key: string) => key,
    });

    expect(csv).toContain(FEDERAL);
    expect(csv).toContain("-27635.92");
    expect(csv).toContain(PRETAx);
    expect(csv).toContain("-18000");
    expect(markdown).toContain(FEDERAL);
    expect(markdown).toContain("(27,635.92)");
    expect(markdown).toContain(
      "reports.export.unauditedMultiUnitManagementReport",
    );
  });

  it("preserves a zero child beside a parent direct posting", () => {
    const statement = buildCashFlowStatement({
      intervals: mergeIntervalAccountChanges([
        {
          date: "2016",
          accountBalances: {
            [FEDERAL]: { USD: "100.00" },
            [PRETAx]: { USD: "0.00" },
            [OTHER_INCOME]: { USD: "-50.00" },
          },
        },
      ]),
      closingCashAccounts: [],
      primaryCurrency: "USD",
    });
    // Zero movements are dropped; parent must still appear alone.
    expect(statement.rows.map((row) => row.accountPath).sort()).toEqual([
      FEDERAL,
      OTHER_INCOME,
    ]);
  });
});
