import { describe, expect, it } from "vitest";
import type { StatementExportDocument } from "../model";
import {
  getBalanceSheetSummaryItems,
  getBalanceSheetSupportingSections,
  getProfitAndLossSummaryItems,
  getProfitAndLossSupportingSections,
  getStatementPresentationCurrency,
  hasBalanceSheetReconciliationDifference,
  isNegativeStatementAmount,
  isZeroStatementAmount,
} from "../presentation";

function fixture(): StatementExportDocument {
  return {
    kind: "profit_and_loss",
    title: "Income Statement",
    context: {
      reportingEntity: "Northstar Household",
      reportingEntitySource: "ledger_title",
      ledgerName: "northstar-books",
      primaryCurrency: "USD",
      conversion: "USD",
      interval: "monthly",
      filters: { time: "2026", account: "", filter: "" },
      reportingPeriod: {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        asOfDate: null,
        isExplicit: true,
        selection: "2026",
      },
      generatedAt: "2026-12-31T12:00:00.000Z",
    },
    sections: [
      {
        key: "income",
        label: "Income",
        rows: [
          {
            accountPath: "Income",
            label: "Income",
            depth: 0,
            rowKind: "total",
            amounts: [{ unit: "USD", rawAmount: "-100", displayAmount: "100" }],
          },
          {
            accountPath: "Income:Salary",
            label: "Salary",
            depth: 1,
            rowKind: "account",
            amounts: [{ unit: "USD", rawAmount: "-100", displayAmount: "100" }],
          },
        ],
      },
      {
        key: "expenses",
        label: "Expenses",
        rows: [
          {
            accountPath: "Expenses",
            label: "Expenses",
            depth: 0,
            rowKind: "total",
            amounts: [{ unit: "USD", rawAmount: "120", displayAmount: "120" }],
          },
          {
            accountPath: "Expenses:Rent",
            label: "Rent",
            depth: 1,
            rowKind: "account",
            amounts: [{ unit: "USD", rawAmount: "120", displayAmount: "120" }],
          },
        ],
      },
      {
        key: "net_profit",
        label: "Net Income",
        rows: [
          {
            accountPath: "Net Income",
            label: "Net Income",
            depth: 0,
            rowKind: "total",
            amounts: [{ unit: "USD", rawAmount: "20", displayAmount: "-20" }],
          },
        ],
      },
    ],
  };
}

function balanceSheetFixture(): StatementExportDocument {
  const document = fixture();
  return {
    ...document,
    kind: "balance_sheet",
    title: "Balance Sheet",
    context: {
      ...document.context,
      reportingPeriod: {
        startDate: null,
        endDate: null,
        asOfDate: "2026-12-31",
        isExplicit: true,
        selection: "2026",
      },
    },
    sections: [
      {
        key: "assets",
        label: "Assets",
        rows: [
          {
            accountPath: "Assets",
            label: "Assets",
            depth: 0,
            rowKind: "total",
            amounts: [
              {
                unit: "USD",
                rawAmount: "9007199254740993.30",
                displayAmount: "9007199254740993.30",
              },
              { unit: "VACHR", rawAmount: "4", displayAmount: "4" },
            ],
          },
          {
            accountPath: "Assets:Cash",
            label: "Cash",
            depth: 1,
            rowKind: "account",
            amounts: [
              {
                unit: "USD",
                rawAmount: "9007199254740993.30",
                displayAmount: "9007199254740993.30",
              },
              { unit: "VACHR", rawAmount: "4", displayAmount: "4" },
            ],
          },
        ],
      },
      {
        key: "liabilities",
        label: "Liabilities",
        rows: [
          {
            accountPath: "Liabilities",
            label: "Liabilities",
            depth: 0,
            rowKind: "total",
            amounts: [
              { unit: "USD", rawAmount: "-40.10", displayAmount: "40.10" },
              { unit: "VACHR", rawAmount: "-1", displayAmount: "1" },
            ],
          },
        ],
      },
      {
        key: "equity",
        label: "Equity",
        rows: [
          {
            accountPath: "Equity",
            label: "Equity",
            depth: 0,
            rowKind: "total",
            amounts: [
              {
                unit: "USD",
                rawAmount: "-9007199254740953.20",
                displayAmount: "9007199254740953.20",
              },
              { unit: "VACHR", rawAmount: "-2", displayAmount: "2" },
            ],
          },
        ],
      },
    ],
  };
}

describe("statement presentation", () => {
  it("builds a single-step summary and removes root totals from the appendix", () => {
    const document = fixture();

    expect(
      getProfitAndLossSummaryItems(document).map((item) => item.key),
    ).toEqual(["total_revenue", "total_expenses", "net_result"]);
    expect(
      getProfitAndLossSupportingSections(document).map((section) => ({
        key: section.key,
        rows: section.rows.map((row) => row.accountPath),
      })),
    ).toEqual([
      { key: "income", rows: ["Income:Salary"] },
      { key: "expenses", rows: ["Expenses:Rent"] },
    ]);
  });

  it("distinguishes presentation currency, multi-unit schedules, and losses", () => {
    const document = fixture();
    expect(getStatementPresentationCurrency(document)).toBe("USD");
    expect(isNegativeStatementAmount("-20.00")).toBe(true);
    expect(isNegativeStatementAmount("-0.00")).toBe(false);

    document.sections[0].rows[0].amounts.push({
      unit: "VACHR",
      rawAmount: "-1",
      displayAmount: "1",
    });
    expect(getStatementPresentationCurrency(document)).toBeNull();
  });

  it("builds and exactly reconciles a balance-sheet control summary", () => {
    const document = balanceSheetFixture();
    const summary = getBalanceSheetSummaryItems(document);

    expect(summary.map((item) => item.key)).toEqual([
      "total_assets",
      "total_liabilities",
      "total_equity",
      "total_liabilities_and_equity",
      "reconciliation_difference",
    ]);
    expect(summary[3].amounts).toEqual([
      { unit: "USD", displayAmount: "9007199254740993.30" },
      { unit: "VACHR", displayAmount: "3" },
    ]);
    expect(summary[4].amounts).toEqual([
      { unit: "USD", displayAmount: "0.00" },
      { unit: "VACHR", displayAmount: "1" },
    ]);
    expect(hasBalanceSheetReconciliationDifference(document)).toBe(true);
    expect(isZeroStatementAmount("-0.000")).toBe(true);

    document.sections[2].rows[0].amounts[1] = {
      unit: "VACHR",
      rawAmount: "-3",
      displayAmount: "3",
    };
    expect(hasBalanceSheetReconciliationDifference(document)).toBe(false);
  });

  it("moves balance-sheet root totals below their supporting detail", () => {
    expect(
      getBalanceSheetSupportingSections(balanceSheetFixture()).map(
        (section) => ({
          key: section.key,
          rows: section.rows.map((row) => row.accountPath),
        }),
      ),
    ).toEqual([
      { key: "assets", rows: ["Assets:Cash", "Assets"] },
      { key: "liabilities", rows: ["Liabilities"] },
      { key: "equity", rows: ["Equity"] },
    ]);
  });
});
