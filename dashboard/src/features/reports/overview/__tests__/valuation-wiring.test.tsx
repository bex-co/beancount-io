import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import LedgerOverviewPage from "../index";

/**
 * w4/m26: the balance modules read balances at market value, the flow modules
 * keep the overview at cost, and neither is drawn before both reads land.
 */

type Props = Record<string, unknown>;
const received = vi.hoisted(() => new Map<string, Props[]>());
function capture(name: string) {
  return (props: Props) => {
    received.set(name, [...(received.get(name) ?? []), props]);
    // A card that heads itself with another (Accounts with the Net Worth
    // figure) still renders it, so that one's props arrive too.
    return <div data-testid={name}>{props.summary as React.ReactNode}</div>;
  };
}
const lastProps = (name: string) => received.get(name)?.at(-1);

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  useParams: () => ({ ledgerOwner: "open_ledger", ledgerName: "example" }),
  useLoaderData: () => ({}),
}));

vi.mock("@/common/hooks/use-ledger-readme", () => ({
  useLedgerReadme: () => ({ content: null, loading: false }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Example",
    ledgerData: {
      isStarred: false,
      options: { nameIncome: "Income", nameExpenses: "Expenses" },
      bcioOptions: { transactionFile: null, defaultFile: "main.bean" },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: true, canWrite: false }),
}));

vi.mock("@/common/lib/fava-options", () => ({
  getInvertIncomeLiabilitiesEquity: () => false,
}));

vi.mock("../hooks/use-dashboard-layout", () => ({
  useDashboardLayout: () => ({
    layout: {
      order: ["financial-position", "money-movement"],
      hidden: [],
    },
    setVisible: vi.fn(),
    move: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../hooks/use-account-meta", () => ({
  useAccountMeta: () => ({ accountMeta: undefined, pending: false }),
}));

vi.mock("../components/dashboard-customizer", () => ({
  DashboardCustomizer: () => null,
  CustomizeButton: () => null,
}));
vi.mock("@/features/ai-agent/components/quick-ask-input", () => ({
  QuickAskInput: () => null,
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));
vi.mock("@/common/components/readme-card", () => ({ ReadmeCard: () => null }));
// The hero chart is the summary's own concern; these cases read the wiring.
vi.mock("../components/month-hero-chart", () => ({
  MonthHeroChart: () => null,
}));
vi.mock("../components/net-worth-card", () => ({
  NetWorthCard: capture("net-worth"),
}));
vi.mock("../components/account-balances-card", () => ({
  AccountBalancesCard: capture("account-balances"),
}));
vi.mock("../components/money-movement-section", () => ({
  MoneyMovementSection: capture("money-movement"),
}));
vi.mock("../components/cash-flow-sankey", () => ({
  default: capture("cash-flow"),
}));

const tree = (account: string, balance: Record<string, string>) => ({
  account,
  balance,
  balanceChildren: balance,
  hasTxns: true,
  children: [],
  cost: null,
  costChildren: null,
});

// At cost, as the flows and the cost basis read it.
const overview = {
  netWorthData: [{ date: "2017-09-30", balance: { USD: "106723.05" } }],
  assetsData: [],
  liabilitiesData: [],
  incomeIntervalData: [
    { date: "2017-09-30", balance: { USD: "-100" }, accountBalances: {} },
  ],
  incomeData: [],
  expensesIntervalData: [
    { date: "2017-09-30", balance: { USD: "60" }, accountBalances: {} },
  ],
  expensesData: [],
  assetsHierarchyData: tree("Assets", { USD: "114846.40" }),
  liabilitiesHierarchyData: tree("Liabilities", { USD: "-8123.35" }),
  incomeHierarchyData: tree("Income", { USD: "-100" }),
  expensesHierarchyData: tree("Expenses", { USD: "60" }),
};

// At market value, with the units held and the ledger's prices.
const valuation = {
  market: {
    netWorthData: [{ date: "2017-09-30", balance: { USD: "117546.49" } }],
    assetsHierarchyData: tree("Assets", { USD: "125669.84" }),
    liabilitiesHierarchyData: tree("Liabilities", { USD: "-8123.35" }),
  },
  held: {
    netWorthData: [
      {
        date: "2017-09-30",
        balance: { "USD {}": "8926.93", "RGAGX {USD}": "597.748" },
      },
    ],
  },
  getLedgerCommodities: [
    { base: "RGAGX", quote: "USD", prices: [{ date: "2017-09-08" }] },
  ],
  getLedgerManagedPrices: [
    { commodity: "RGAGX", quote: "USD", freshness: "recent" },
  ],
};

type Read = { data?: unknown; loading?: boolean; error?: Error };

function serve(reads: { overview: Read; valuation: Read }) {
  vi.mocked(useQuery).mockImplementation(((document: unknown) => {
    const read =
      document === GetLedgerOverviewDocument
        ? reads.overview
        : document === GetLedgerOverviewValuationDocument
          ? reads.valuation
          : { data: undefined };
    return { loading: false, error: undefined, ...read };
  }) as never);
}

beforeEach(() => {
  received.clear();
  serve({
    overview: { data: { getLedgerOverview: overview } },
    valuation: { data: valuation },
  });
});

describe("overview valuation wiring", () => {
  it("draws balances at market value and flows at cost", () => {
    render(<LedgerOverviewPage />);

    expect(lastProps("net-worth")?.data).toBe(valuation.market.netWorthData);
    expect(lastProps("account-balances")).toMatchObject({
      assets: valuation.market.assetsHierarchyData,
      liabilities: valuation.market.liabilitiesHierarchyData,
    });
    // Money movement draws Income vs Expenses from these same series.
    expect(lastProps("money-movement")).toMatchObject({
      income: overview.incomeIntervalData,
      expenses: overview.expensesIntervalData,
    });
    // The cash-flow Sankey it carries reads the selected month on its own,
    // at cost like the other flows, and keeps the balance sheet with them.
    const movement = lastProps("money-movement") as {
      flow: React.ReactElement;
      timeFilter: string;
    };
    expect(movement.timeFilter).not.toBe("");
    expect(movement.flow.props).toMatchObject({
      ledgerId: "open_ledger/example",
      time: movement.timeFilter,
    });
    render(movement.flow);
    const reads = vi
      .mocked(useQuery)
      .mock.calls.filter(([document]) => document === GetLedgerOverviewDocument)
      .map(([, options]) => (options as { variables: unknown }).variables);
    // The month itself, and its opening balances the day before it began.
    expect(reads).toContainEqual(
      expect.objectContaining({
        time: movement.timeFilter,
        conversion: "at_cost",
      }),
    );
    expect(reads).toContainEqual(
      expect.objectContaining({
        time: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        conversion: "at_cost",
      }),
    );
    // The month's income and spending as read; its balance sheet as the
    // month's change, which these mocked reads make zero.
    expect(lastProps("cash-flow")).toMatchObject({
      incomeHierarchyData: overview.incomeHierarchyData,
      expensesHierarchyData: overview.expensesHierarchyData,
      assetsHierarchyData: { balance: {} },
    });
  });

  it("asks for the market read with the overview's own scope", () => {
    render(<LedgerOverviewPage />);

    const call = vi
      .mocked(useQuery)
      .mock.calls.find(
        ([document]) => document === GetLedgerOverviewValuationDocument,
      );
    expect(call?.[1]).toMatchObject({
      variables: {
        ledgerId: "open_ledger/example",
        account: "",
        filter: "",
        time: "",
        interval: "monthly",
      },
    });
  });

  it("reads balances again at the close of a month before the data's last", () => {
    // No journal read here, so the data runs to today and September 2017 is
    // history: Accounts answers for its close, as the summary does.
    render(<LedgerOverviewPage />);
    const movement = lastProps("money-movement") as { timeFilter: string };
    const monthRead = vi
      .mocked(useQuery)
      .mock.calls.find(
        ([document, options]) =>
          document === GetLedgerOverviewValuationDocument &&
          (options as { variables: { time: string } }).variables.time ===
            movement.timeFilter,
      );
    expect(monthRead?.[1]).toMatchObject({ skip: false });
    expect(lastProps("account-balances")).toMatchObject({
      time: movement.timeFilter,
      asOf: "2017-09-30",
      pending: false,
    });
  });

  it("gives Net Worth the cost basis and each holding's price behind its figure", () => {
    render(<LedgerOverviewPage />);

    const net = lastProps("net-worth")?.valuation as Record<string, unknown>;
    expect(net).toMatchObject({
      costBasis: 106723.05,
      // The managed feed's source reaches the card: 22 days old is stale.
      staleSince: "2017-09-08",
      holdings: [
        {
          currency: "RGAGX",
          basis: "market",
          priceDate: "2017-09-08",
          stale: true,
          managed: true,
        },
      ],
    });
    expect(net.unrealized).toBeCloseTo(10823.44, 2);
    expect(lastProps("net-worth")).toMatchObject({
      ledgerOwner: expect.any(String),
      ledgerName: expect.any(String),
    });
  });

  it("draws no module until the market read lands", () => {
    serve({
      overview: { data: { getLedgerOverview: overview } },
      valuation: { data: undefined, loading: true },
    });
    render(<LedgerOverviewPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(received.size).toBe(0);
  });

  it("reports a failed market read in the balance modules, keeping flows", () => {
    serve({
      overview: { data: { getLedgerOverview: overview } },
      valuation: { data: undefined, error: new Error("boom") },
    });
    render(<LedgerOverviewPage />);

    expect(received.has("net-worth")).toBe(false);
    expect(received.has("account-balances")).toBe(false);
    // Financial position, the one balance module, says so once.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    // The flows, cash flow included, still draw at cost.
    expect(received.has("money-movement")).toBe(true);
    expect(
      (lastProps("money-movement") as { flow?: unknown }).flow,
    ).toBeTruthy();
  });
});
