import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GetLedgerIncomeStatementQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import { IncomeStatementContent } from "../income-statement-content";

vi.mock("../../export/statement-export-menu", () => ({
  StatementExportMenu: () => <button>statement-export-menu</button>,
}));
vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({
    to,
    params,
    children,
    ...props
  }: React.ComponentProps<"a"> & {
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href={Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      {...props}
    >
      {children}
    </a>
  ),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => {
      if (key === "common.netProfit") return "Net Profit";
      if (key === "common.income") return "Income";
      if (key === "common.expenses") return "Expenses";
      if (key === "common.noDataFound") return "No data found.";
      return key;
    },
  }),
}));
vi.mock("@/common/hooks/use-cookie-storage-state", () => ({
  useCookieStorageState: () => [false, vi.fn()],
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
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
vi.mock("../date-balance-chart", () => ({
  DateBalanceChart: () => null,
}));
vi.mock("../chart-mode-select", () => ({
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
  reportingEntityName: "Example",
  reportingEntitySource: "ledger_title" as const,
  ledgerDisplayName: "example",
  ledgerOwner: "open_ledger",
  ledgerNameParam: "example",
  conversion: "at_cost" as const,
  timeInterval: "monthly" as const,
  invertIncomeLiabilitiesEquity: false,
  showZeroBalance: true,
  showZeroTransactions: true,
  showClosedAccounts: true,
  closedAccountNames: new Set<string>(),
  collapsePatterns: [] as string[],
  filters: { time: "", account: "", filter: "" },
  fiscalYearEnd: { month: 12, day: 31 },
  onConversionChange: vi.fn(),
  onTimeIntervalChange: vi.fn(),
};

describe("Income Statement Net Profit summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Net Profit as an unlinked summary with real account links intact", () => {
    const data = {
      incomeHierarchyData: node("Income", "-1000", [
        node("Income:US:Hoogle:Salary", "-1000"),
      ]),
      expensesHierarchyData: node("Expenses", "400"),
      incomeData: [],
      expensesData: [],
      netProfitData: [
        {
          __typename: "DateAndBalance",
          date: "2017-09-30",
          balance: { USD: "-600" },
        },
      ],
    } as unknown as GetLedgerIncomeStatementQuery["getLedgerIncomeStatement"];

    render(
      <IncomeStatementContent {...sharedProps} incomeStatementData={data} />,
    );

    expect(screen.getAllByText("Net Profit").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole("link", { name: "Net Profit" }),
    ).not.toBeInTheDocument();

    const income = screen.getByRole("link", { name: "Income" });
    expect(income).toHaveAttribute(
      "href",
      "/ledger/open_ledger/example/account/Income",
    );

    expect(screen.getByText("-600")).toBeInTheDocument();
  });
});
