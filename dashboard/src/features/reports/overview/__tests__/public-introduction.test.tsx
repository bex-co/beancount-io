import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
} from "@/graphql/definitions";
import { base64Encode } from "@/common/lib/utils/encode";
import { DASHBOARD_WIDGET_IDS } from "../hooks/use-dashboard-layout";
import LedgerOverviewPage from "../index";

const state = vi.hoisted(() => ({
  readme:
    "# Stock ledger guide\n\nFictional stock purchases and sales for learning Beancount.",
  private: false,
  canWrite: false,
  activity: true,
  error: undefined as Error | undefined,
  loading: false,
  search: { account: "", filter: "", time: "" },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "stock-example",
  }),
  useLoaderData: () => ({
    readme: {
      ledgerId: "open_ledger/stock-example",
      path: "README.md",
      status: "ready",
      content: state.readme || null,
    },
  }),
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: (document: unknown) =>
    document === GetLedgerFileDocument
      ? {
          data: {
            getLedgerFile: state.readme
              ? { content: base64Encode(state.readme) }
              : null,
          },
          loading: false,
        }
      : document === GetLedgerOverviewDocument
        ? {
            data: {
              getLedgerOverview: {
                netWorthData: state.activity
                  ? [{ date: "2026-05-31", balance: { USD: 10 } }]
                  : [],
              },
            },
            loading: state.loading,
            error: state.error,
          }
        : { data: {}, loading: false },
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "stock-example",
    ledgerData: {
      name: "stock-example",
      description: "",
      private: state.private,
      isStarred: false,
      options: {
        title: "Stock & ETF Cost-Basis Example",
        nameIncome: "Income",
        nameExpenses: "Expenses",
      },
      bcioOptions: { defaultFile: "main.bean" },
    },
  }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({ searchParams: state.search }),
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({
    isAdmin: state.canWrite,
    canWrite: state.canWrite,
  }),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => vi.fn(),
}));
vi.mock("@/common/components/ledger-permission/write", () => ({
  LedgerWritePermission: () => null,
}));
vi.mock("@/common/lib/fava-options", () => ({
  getInvertIncomeLiabilitiesEquity: () => false,
}));
vi.mock("../hooks/use-account-meta", () => ({
  useAccountMeta: () => ({ pending: false }),
}));
vi.mock("../components/star-button", () => ({ StarButton: () => null }));
vi.mock("../components/dashboard-customizer", () => ({
  DashboardCustomizer: () => null,
  CustomizeButton: () => null,
}));
vi.mock("@/features/ai-agent/components/quick-ask-input", () => ({
  QuickAskInput: () => null,
}));
vi.mock("../components/net-worth-card", () => ({ NetWorthCard: () => null }));
vi.mock("../components/account-balances-card", () => ({
  AccountBalancesCard: () => null,
}));
vi.mock("../components/income-expenses-chart", () => ({
  IncomeExpensesChart: () => null,
}));
vi.mock("../components/distribution-chart", () => ({
  DistributionChart: () => null,
}));
vi.mock("../components/money-movement-section", () => ({
  MoneyMovementSection: () => null,
}));
vi.mock("../components/recent-activity-card", () => ({
  RecentActivityCard: () => null,
}));
vi.mock("../components/cash-flow-sankey", () => ({ default: () => null }));

const storageKey = "ledger.open_ledger/stock-example.overview.layout.v1";

beforeEach(() => {
  Object.assign(state, {
    readme:
      "# Stock ledger guide\n\nFictional stock purchases and sales for learning Beancount.",
    private: false,
    canWrite: false,
    activity: true,
    error: undefined,
    loading: false,
    search: { account: "", filter: "", time: "" },
  });
  const store = new Map<string, string>();
  vi.mocked(window.localStorage.getItem).mockImplementation(
    (key) => store.get(key) ?? null,
  );
  vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
    store.set(key, value);
  });
});

describe("public overview introduction", () => {
  it("renders the authored title and introduction, with the full README after reports on the server", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<LedgerOverviewPage />);
    expect(container.querySelector("h1")).toHaveTextContent(
      "Stock & ETF Cost-Basis Example",
    );
    const readme = container.querySelector("#overview-ledger-notes")!;
    const reports = container.querySelector(
      "#overview-widget-financial-position",
    )!;
    expect(readme.textContent).toContain("Fictional stock purchases");
    expect(
      reports.compareDocumentPosition(readme) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      container
        .querySelector("#overview-widget-cash-flow")!
        .compareDocumentPosition(readme) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelectorAll("#overview-ledger-notes")).toHaveLength(
      1,
    );
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(
      container.querySelector('a[href="#overview-ledger-notes"]'),
    ).toHaveTextContent("Ledger notes");
    // The reports start one scroll below; the header offers no jump to them.
    expect(
      container.querySelector('a[href="#overview-widget-financial-position"]'),
    ).toBeNull();
  });

  it.each(["empty", "filtered", "error", "loading"])(
    "keeps the public narrative visible through a %s report",
    (mode) => {
      if (mode === "error") state.error = new Error("Report unavailable");
      else if (mode === "loading") state.loading = true;
      else state.activity = false;
      if (mode === "filtered") state.search.time = "2027-01";
      const { container } = render(<LedgerOverviewPage />);
      expect(
        container
          .querySelector("#overview-report-state")!
          .compareDocumentPosition(
            container.querySelector("#overview-ledger-notes")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "Stock & ETF Cost-Basis Example",
      );
      expect(
        screen.getAllByRole("heading", {
          name: "Stock ledger guide",
          level: 2,
        }),
      ).toHaveLength(1);
      expect(
        screen.queryByRole("heading", { name: "Financial position" }),
      ).toBeNull();
    },
  );

  it("honors saved README order and hiding without removing the short introduction", () => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        order: DASHBOARD_WIDGET_IDS,
        hidden: ["readme"],
      }),
    );
    const { container } = render(<LedgerOverviewPage />);
    expect(
      screen.queryByRole("heading", { name: "Stock ledger guide" }),
    ).toBeNull();
    expect(
      screen.getByText(
        "Fictional stock purchases and sales for learning Beancount.",
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector('a[href="#overview-ledger-notes"]'),
    ).toBeNull();
    expect(
      container.querySelector("#overview-widget-financial-position"),
    ).toBeInTheDocument();
  });

  it.each([{ canWrite: true }, { private: true }])(
    "preserves the workspace ordering for %j",
    (access) => {
      Object.assign(state, access);
      const { container } = render(<LedgerOverviewPage />);
      const readme = container.querySelector("#overview-ledger-notes")!;
      const reports = container.querySelector(
        "#overview-widget-financial-position",
      )!;
      expect(
        reports.compareDocumentPosition(readme) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        "stock-example",
      );
    },
  );

  it("uses a factual fallback and omits the README jump when no file exists", () => {
    state.readme = "";
    const { container } = render(<LedgerOverviewPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Stock & ETF Cost-Basis Example",
    );
    expect(
      container.querySelector('a[href="#overview-ledger-notes"]'),
    ).toBeNull();
    expect(screen.queryByText("README.md")).toBeNull();
  });
});
