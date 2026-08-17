import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GetLedgerBalanceSheetQuery,
  GetLedgerIncomeStatementQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import type { StatementExportDocument } from "../model";
import { BalanceSheetContent } from "../../balance-sheet/balance-sheet-content";
import { IncomeStatementContent } from "../../income-statement/income-statement-content";

const { captureDocument } = vi.hoisted(() => ({
  captureDocument: vi.fn(),
}));

vi.mock("../statement-export-menu", () => ({
  StatementExportMenu: ({
    document,
  }: {
    document: StatementExportDocument;
  }) => {
    captureDocument(document);
    return <button>statement-export-menu</button>;
  },
}));
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));
vi.mock("@/common/hooks/use-cookie-storage-state", () => ({
  useCookieStorageState: () => [false, vi.fn()],
}));
vi.mock("@/common/components/page-header", () => ({
  PageHeader: () => <div>page-header</div>,
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));
vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));
vi.mock("@/common/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: () => null,
}));
vi.mock("@/common/components/interval-select", () => ({
  IntervalSelect: () => null,
}));
vi.mock("@/common/components/conversion-select", () => ({
  ConversionSelect: () => null,
}));
vi.mock("../../balance-sheet/line-chart", () => ({ LineChart: () => null }));
vi.mock("../../balance-sheet/hierarchy-visualization-card", () => ({
  HierarchyVisualizationCard: () => null,
}));
vi.mock("../../balance-sheet/hierarchy-list-card", () => ({
  HierarchyListCard: () => null,
}));
vi.mock("../../income-statement/date-balance-chart", () => ({
  DateBalanceChart: () => null,
}));
vi.mock("../../income-statement/chart-mode-select", () => ({
  ChartModeSelect: () => null,
}));

function node(
  account: string,
  amount: string,
  children: SerializableTreeNode[] = [],
): SerializableTreeNode {
  return {
    __typename: "SerializableTreeNode",
    account,
    balance: { USD: amount },
    balanceChildren: { USD: amount },
    children: children as unknown as Array<Record<string, unknown>>,
    cost: null,
    costChildren: null,
    hasTxns: true,
  };
}

const sharedProps = {
  primaryCurrency: "USD",
  reportingEntityName: "Acme, Inc.",
  reportingEntitySource: "ledger_title" as const,
  ledgerDisplayName: "Current ledger",
  ledgerOwner: "owner",
  ledgerNameParam: "ledger",
  conversion: "at_cost" as const,
  timeInterval: "quarterly" as const,
  invertIncomeLiabilitiesEquity: true,
  showZeroBalance: true,
  showZeroTransactions: true,
  showClosedAccounts: true,
  closedAccountNames: new Set<string>(),
  collapsePatterns: ["^Assets:LongTerm"],
  filters: {
    time: "2026-01-01 - 2026-06-30",
    account: "Assets|Income",
    filter: "tag:reviewed",
  },
  fiscalYearEnd: { month: 12, day: 31 },
  onConversionChange: vi.fn(),
  onTimeIntervalChange: vi.fn(),
};

describe("financial statement export wiring", () => {
  beforeEach(() => captureDocument.mockClear());

  it("passes the current filtered Balance Sheet context to the shared actions", () => {
    const data = {
      assetsHierarchyData: node("Assets", "100", [node("Assets:Cash", "100")]),
      liabilitiesHierarchyData: node("Liabilities", "-40"),
      equityHierarchyData: node("Equity", "-60"),
      netWorthData: [{ date: "2026-06-30", balance: { USD: "0" } }],
      assetsData: [],
      liabilitiesData: [],
      equityData: [],
    } as unknown as GetLedgerBalanceSheetQuery["getLedgerBalanceSheet"];

    render(<BalanceSheetContent {...sharedProps} balanceSheetData={data} />);

    expect(screen.getByText("statement-export-menu")).toBeInTheDocument();
    const exported = captureDocument.mock
      .lastCall?.[0] as StatementExportDocument;
    expect(exported.kind).toBe("balance_sheet");
    expect(exported.context).toMatchObject({
      ledgerName: "Current ledger",
      reportingEntity: "Acme, Inc.",
      reportingEntitySource: "ledger_title",
      primaryCurrency: "USD",
      conversion: "at_cost",
      interval: "quarterly",
      filters: sharedProps.filters,
    });
    expect(exported.sections[0].rows.map((row) => row.accountPath)).toEqual([
      "Assets",
      "Assets:Cash",
    ]);
    expect(exported.sections[1].rows[0].amounts[0].displayAmount).toBe("40");
    expect(exported.context.reportingPeriod.asOfDate).toBe("2026-06-30");
  });

  it("passes the current filtered P&L context and exact total to the shared actions", () => {
    const data = {
      incomeHierarchyData: node("Income", "-10"),
      expensesHierarchyData: node("Expenses", "4"),
      incomeData: [],
      expensesData: [],
      netProfitData: [
        {
          __typename: "DateAndBalance",
          date: "2026-03-31",
          balance: { USD: "-5.50" },
        },
        {
          __typename: "DateAndBalance",
          date: "2026-06-30",
          balance: { USD: "-0.50" },
        },
      ],
    } as unknown as GetLedgerIncomeStatementQuery["getLedgerIncomeStatement"];

    render(
      <IncomeStatementContent {...sharedProps} incomeStatementData={data} />,
    );

    expect(screen.getByText("statement-export-menu")).toBeInTheDocument();
    const exported = captureDocument.mock
      .lastCall?.[0] as StatementExportDocument;
    expect(exported.kind).toBe("profit_and_loss");
    expect(exported.context.filters).toEqual(sharedProps.filters);
    expect(exported.context.conversion).toBe("at_cost");
    expect(exported.sections[2].rows[0].amounts).toEqual([
      { unit: "USD", rawAmount: "-6.00", displayAmount: "6.00" },
    ]);
  });
});
