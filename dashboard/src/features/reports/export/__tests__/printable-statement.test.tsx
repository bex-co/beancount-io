import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintableStatement } from "../printable-statement";
import type { StatementExportDocument } from "../model";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params?.generatedAt ? `${key}: ${params.generatedAt}` : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

const document: StatementExportDocument = {
  kind: "profit_and_loss",
  title: "Profit and Loss",
  context: {
    reportingEntity: "Example Company, Inc.",
    reportingEntitySource: "ledger_title",
    ledgerName: "Example Ledger",
    primaryCurrency: "USD",
    conversion: "at_cost",
    interval: "monthly",
    filters: {
      time: "2026-01-01 - 2026-06-30",
      account: "Income",
      filter: "tag:consulting",
    },
    reportingPeriod: {
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      asOfDate: null,
      isExplicit: true,
      selection: "2026-01-01 - 2026-06-30",
    },
    generatedAt: "2026-08-15T12:00:00.000Z",
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
          amounts: [
            {
              unit: "USD",
              rawAmount: "-1234.50",
              displayAmount: "1234.50",
            },
            {
              unit: "VACHR",
              rawAmount: "-10.00",
              displayAmount: "10.00",
            },
          ],
        },
        {
          accountPath:
            "Income:Consulting:An intentionally long account name that must wrap",
          label: "An intentionally long account name that must wrap",
          depth: 2,
          rowKind: "account",
          amounts: [
            {
              unit: "USD",
              rawAmount: "-1234.50",
              displayAmount: "1234.50",
            },
            {
              unit: "VACHR",
              rawAmount: "-10.00",
              displayAmount: "10.00",
            },
          ],
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
          amounts: [
            { unit: "USD", rawAmount: "34.50", displayAmount: "34.50" },
            { unit: "VACHR", rawAmount: "20.00", displayAmount: "20.00" },
          ],
        },
        {
          accountPath: "Expenses:Fees",
          label: "Fees",
          depth: 1,
          rowKind: "account",
          amounts: [
            { unit: "USD", rawAmount: "34.50", displayAmount: "34.50" },
            { unit: "VACHR", rawAmount: "20.00", displayAmount: "20.00" },
          ],
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
          amounts: [
            { unit: "USD", rawAmount: "-1200", displayAmount: "1200" },
            { unit: "VACHR", rawAmount: "10", displayAmount: "-10" },
          ],
        },
      ],
    },
  ],
};

function balanceSheetFixture(equity = "304000"): StatementExportDocument {
  const amount = (value: string, inverted = false) => ({
    unit: "USD",
    rawAmount: inverted ? `-${value}` : value,
    displayAmount: value,
  });
  return {
    kind: "balance_sheet",
    title: "Balance Sheet",
    context: {
      reportingEntity: "Northstar Household",
      reportingEntitySource: "ledger_title",
      ledgerName: "northstar-books",
      primaryCurrency: "USD",
      conversion: "USD",
      interval: "monthly",
      filters: { time: "2025", account: "", filter: "" },
      reportingPeriod: {
        startDate: null,
        endDate: null,
        asOfDate: "2025-12-31",
        isExplicit: true,
        selection: "2025",
      },
      generatedAt: "2026-08-15T12:00:00.000Z",
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
            amounts: [amount("425000")],
          },
          {
            accountPath: "Assets:Cash",
            label: "Cash",
            depth: 1,
            rowKind: "account",
            amounts: [amount("425000")],
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
            amounts: [amount("121000", true)],
          },
          {
            accountPath: "Liabilities:Loans",
            label: "Loans",
            depth: 1,
            rowKind: "account",
            amounts: [amount("121000", true)],
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
            amounts: [amount(equity, true)],
          },
          {
            accountPath: "Equity:Opening-Balances",
            label: "Opening-Balances",
            depth: 1,
            rowKind: "account",
            amounts: [amount(equity, true)],
          },
        ],
      },
    ],
  };
}

describe("PrintableStatement", () => {
  it("renders a semantic, statement-specific print tree with active context", () => {
    render(<PrintableStatement document={document} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Profit and Loss" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Example Company, Inc.")).toBeInTheDocument();
    const context = screen
      .getByRole("heading", { name: "reports.export.context" })
      .closest("section")!;
    expect(
      within(context).getByText("reports.export.sourceLedger"),
    ).toBeInTheDocument();
    expect(within(context).getByText("Example Ledger")).toBeInTheDocument();
    expect(
      within(context).getByText(document.context.filters.account),
    ).toBeInTheDocument();
    expect(
      within(context).getByText(document.context.filters.filter),
    ).toBeInTheDocument();
    expect(
      within(context).getByText("component.conversionSelect.atCost"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.unauditedMultiUnitManagementReport"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.multiUnitScheduleNotice"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/VACHR/).length).toBeGreaterThan(1);
    expect(screen.getByText("(10.00)")).toBeInTheDocument();

    const summary = screen
      .getByRole("heading", { name: "reports.export.statementSummary" })
      .closest("section")!;
    const summaryTable = within(summary).getByRole("table");
    expect(
      within(summaryTable).getByRole("columnheader", {
        name: "reports.export.lineItem",
      }),
    ).toBeInTheDocument();
    expect(
      within(summaryTable).getAllByText("reports.export.totalRevenue"),
    ).toHaveLength(2);
    expect(
      within(summaryTable).getAllByText("reports.export.totalExpenses"),
    ).toHaveLength(2);
    expect(
      within(summaryTable).getByText("reports.export.netIncome"),
    ).toBeInTheDocument();
    expect(
      within(summaryTable).getByText("reports.export.netLoss"),
    ).toBeInTheDocument();

    const detail = screen
      .getByRole("heading", {
        name: "reports.export.supportingAccountDetail",
      })
      .closest("section")!;
    expect(
      within(detail).getAllByText(
        "An intentionally long account name that must wrap",
      ),
    ).toHaveLength(2);
    expect(within(detail).getAllByText("USD").length).toBeGreaterThan(1);
    expect(within(detail).getAllByText("VACHR").length).toBeGreaterThan(1);
    expect(within(detail).getByText("1,234.50")).toBeInTheDocument();
  });

  it("discloses when the ledger name stands in for the reporting entity", () => {
    render(
      <PrintableStatement
        document={{
          ...document,
          context: {
            ...document.context,
            reportingEntity: document.context.ledgerName,
            reportingEntitySource: "ledger_name",
          },
        }}
      />,
    );

    expect(
      screen.getByText("reports.export.reportingEntityFallbackNotice"),
    ).toBeInTheDocument();
  });

  it("renders a reconciled balance-sheet summary before its account appendix", () => {
    render(<PrintableStatement document={balanceSheetFixture()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Balance Sheet" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.unauditedManagementReport"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.balanceSheetClassificationNotice"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("reports.export.balanceSheetDoesNotReconcileNotice"),
    ).not.toBeInTheDocument();

    const summary = screen
      .getByRole("heading", { name: "reports.export.statementSummary" })
      .closest("section")!;
    expect(
      within(summary).getByText("reports.export.totalAssets"),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText("reports.export.totalLiabilities"),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText("reports.export.totalEquity"),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText("reports.export.totalLiabilitiesAndEquity"),
    ).toBeInTheDocument();
    expect(
      within(summary).getByText("reports.export.reconciliationDifference"),
    ).toBeInTheDocument();
    expect(within(summary).getAllByText("425,000.00")).toHaveLength(2);
    expect(within(summary).getByText("0.00")).toBeInTheDocument();

    const detail = screen
      .getByRole("heading", {
        name: "reports.export.supportingAccountDetail",
      })
      .closest("section")!;
    expect(within(detail).getByText("Cash")).toBeInTheDocument();
    expect(within(detail).getByText("Loans")).toBeInTheDocument();
    expect(within(detail).getByText("Opening-Balances")).toBeInTheDocument();
    expect(
      within(detail).getByText("reports.export.totalAssets"),
    ).toBeInTheDocument();
    expect(
      summary.compareDocumentPosition(detail) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("marks a balance sheet with a reconciliation difference as a draft", () => {
    render(<PrintableStatement document={balanceSheetFixture("300000")} />);

    expect(
      screen.getByText("reports.export.unauditedInternalDraft"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("reports.export.balanceSheetDoesNotReconcileNotice"),
    ).toBeInTheDocument();
    expect(screen.getByText("4,000.00")).toBeInTheDocument();
  });
});
