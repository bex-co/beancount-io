import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetLedgerJournalDocument,
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import LedgerOverviewPage from "../index";

const search = vi.hoisted(() => ({ month: undefined as string | undefined }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useHydrated: () => false,
  useSearch: () => search,
  useNavigate:
    () =>
    async ({
      search: update,
    }: {
      search: (previous: typeof search) => typeof search;
    }) => {
      search.month = update(search).month;
    },
  useParams: () => ({ ledgerOwner: "alice", ledgerName: "books" }),
  useLoaderData: () => ({}),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Books",
    ledgerData: {
      private: true,
      options: {
        nameIncome: "Income",
        nameExpenses: "Expenses",
        renderCommas: true,
      },
    },
  }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ isAdmin: true, canWrite: true }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));
vi.mock("@/common/hooks/use-ledger-readme", () => ({
  useLedgerReadme: () => ({ content: null, loading: false }),
}));
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/components/readme-card", () => ({ ReadmeCard: () => null }));
vi.mock("@/features/ai-agent/components/quick-ask-input", () => ({
  QuickAskInput: () => null,
}));
vi.mock("../hooks/use-account-meta", () => ({
  useAccountMeta: () => ({ accountMeta: undefined, pending: false }),
}));
vi.mock("../components/dashboard-customizer", () => ({
  DashboardCustomizer: () => null,
  CustomizeButton: () => null,
}));
vi.mock("../components/month-hero-chart", () => ({
  MonthHeroChart: () => null,
}));
vi.mock("../components/cash-flow-sankey", () => ({ default: () => null }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => null,
}));

const balances = [
  { date: "2026-10-31", balance: { USD: "2500558.00" } },
  { date: "2026-11-30", balance: { USD: "2500558.00" } },
  { date: "2026-12-31", balance: { USD: "2500508.00" } },
];
const expenses = [
  { date: "2026-10-31", amount: "12.00" },
  { date: "2026-11-30", amount: "0.00" },
  { date: "2026-12-31", amount: "50.00" },
].map(({ date, amount }) => ({
  date,
  balance: { USD: amount },
  accountBalances: { "Expenses:Probe": { USD: amount } },
}));

const journal = [
  { date: "2026-12-15", payee: "Scheduled spend", amount: "50.00" },
  { date: "2026-10-10", payee: "October spend", amount: "12.00" },
].map(({ date, payee, amount }) => ({
  date,
  payee,
  narration: "Probe",
  entry_hash: date,
  flag: "*",
  directive_type: "Transaction",
  postings: [
    { account: "Expenses:Probe", units: { number: amount, currency: "USD" } },
    {
      account: "Assets:Bank",
      units: { number: `-${amount}`, currency: "USD" },
    },
  ],
  tags: [],
  links: [],
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: (
    document: unknown,
    options?: { variables?: { time?: string; query?: { filter?: string } } },
  ) => {
    if (document === GetLedgerJournalDocument) {
      const pattern = /date:"([^"]+)"/.exec(
        options?.variables?.query?.filter ?? "",
      )?.[1];
      const rows = pattern
        ? journal.filter((entry) => new RegExp(pattern).test(entry.date))
        : journal;
      return { data: { getLedgerJournal: { data: rows, total: rows.length } } };
    }
    if (document === GetLedgerOverviewDocument) {
      return {
        data: {
          getLedgerOverview: {
            incomeIntervalData: [],
            expensesIntervalData: expenses,
            netWorthData: balances,
          },
        },
      };
    }
    if (document === GetLedgerOverviewValuationDocument) {
      const capped = options?.variables?.time === "2026-11-01 - 2026-11-18";
      const bank = { USD: capped ? "900.00" : "850.00" };
      return {
        data: {
          market: {
            netWorthData: capped
              ? [{ ...balances[1], date: "2026-11-18" }]
              : balances,
            assetsHierarchyData: {
              account: "Assets",
              balance: {},
              children: [
                { account: "Assets:Bank", balance: bank, children: [] },
                {
                  account: "Assets:Cash",
                  balance: { USD: "2499658.00" },
                  children: [],
                },
              ],
            },
          },
        },
      };
    }
    return { data: undefined };
  },
}));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 10, 18, 12), toFake: ["Date"] });
  search.month = undefined;
});
afterEach(() => vi.useRealTimers());

describe("Overview with a scheduled future expense", () => {
  it("opens in November and still lets the reader view December's spending", async () => {
    render(<LedgerOverviewPage />);
    const month = screen.getByRole("group", { name: "Month shown" });
    expect(month).toHaveTextContent(/November 2026/i);
    fireEvent.click(within(month).getByRole("button", { name: "Next" }));
    expect(month).toHaveTextContent(/December 2026/i);
    expect(
      await screen.findByRole("region", { name: /Money movement.*December/ }),
    ).toHaveTextContent("50.00 USD");
    const projected = screen.getByRole("region", {
      name: /Financial position/,
    });
    expect(projected).toHaveTextContent("Dec 31, 2026");
    expect(projected).toHaveTextContent("2,500,508.00 USD");
  });

  it("shows the headline and account balances through Nov 18", () => {
    search.month = "2026-11";
    render(<LedgerOverviewPage />);
    const position = screen.getByRole("region", { name: /Financial position/ });
    expect(position).toHaveTextContent("Nov 18, 2026");
    expect(position).toHaveTextContent("2,500,558.00 USD");
    expect(
      within(position).getByRole("region", { name: "Assets" }),
    ).toHaveTextContent("2,500,558.00 USD");
    expect(position).toHaveTextContent("900.00");
    expect(position).not.toHaveTextContent("850.00");
  });

  it("shows the latest completed entry in Recent activity", () => {
    render(<LedgerOverviewPage />);
    const recent = screen.getByRole("table", { name: "Recent activity" });
    expect(within(recent).getByText("October spend")).toBeInTheDocument();
    expect(within(recent).queryByText("Scheduled spend")).toBeNull();
  });
});
