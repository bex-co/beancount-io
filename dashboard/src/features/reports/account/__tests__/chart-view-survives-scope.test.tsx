import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { GetLedgerAccountJournalDocument } from "@/graphql/definitions";
import AccountPage from "../index";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

/**
 * A shared account/filter/time edit makes the ledger layout replace its Outlet,
 * unmounting this page (w4/174). The chart choice must outlive that, so the
 * router here is a real store: navigation writes it and notifies readers.
 */
const router = vi.hoisted(() => {
  let search: Record<string, unknown> = {};
  const listeners = new Set<() => void>();
  return {
    get search() {
      return search;
    },
    set(next: Record<string, unknown>) {
      search = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
});

vi.mock("@tanstack/react-router", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useParams: () => ({
      ledgerOwner: "open_ledger",
      ledgerName: "crypto-example",
      accountName: "Assets:Crypto:Coinbase:BTC",
    }),
    useSearch: () =>
      useSyncExternalStore(router.subscribe, () => router.search),
    useNavigate:
      () =>
      ({
        search,
      }: {
        search: (previous: Record<string, unknown>) => Record<string, unknown>;
      }) =>
        router.set(search(router.search)),
  };
});

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "crypto-example",
    ledgerData: {},
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("@/features/reports/balance-sheet/line-chart", () => ({
  LineChart: () => <div data-testid="line-chart" />,
}));

vi.mock("@/features/reports/income-statement/date-balance-chart", () => ({
  DateBalanceChart: () => <div data-testid="date-balance-chart" />,
}));

vi.mock("@/common/components/interval-select", () => ({
  IntervalSelect: () => <div data-testid="interval-select">Monthly</div>,
}));

vi.mock("@/common/components/conversion-select", () => ({
  ConversionSelect: () => <div data-testid="conversion-select">At Cost</div>,
}));

describe("AccountPage chart view across a scope change", () => {
  beforeEach(() => {
    router.set({});
    vi.mocked(useQuery).mockImplementation((document) => {
      if (document === GetLedgerAccountJournalDocument) {
        return {
          data: { getLedgerAccountJournal: { data: [], total: 0 } },
          previousData: undefined,
          loading: false,
          error: undefined,
        } as never;
      }
      return {
        data: {
          getLedgerAccountReport: {
            accountBalanceData: [
              { date: "2025-12-31", balance: { BTC: "0.18" } },
            ],
            intervalTotalsData: [{ date: "2025-12-31", balance: { BTC: "0" } }],
            linechartData: [{ date: "2025-12-31", balance: { BTC: "0.18" } }],
          },
        },
        previousData: undefined,
        loading: false,
        error: undefined,
      } as never;
    });
  });

  it("keeps Changes Over Time when the page is unmounted and remounted", async () => {
    const user = userEvent.setup();
    const first = render(<AccountPage />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("tab", {
        name: "page.accountReport.changesOverTime",
      })[0],
    );
    expect(screen.getByTestId("date-balance-chart")).toBeInTheDocument();
    expect(router.search.view).toBe("changesOverTime");

    // The shared time edit: the layout swaps the page out, then back in.
    first.unmount();
    act(() => router.set({ ...router.search, time: "2016-10" }));
    render(<AccountPage />);

    expect(screen.getByTestId("date-balance-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });

  it("returns to the default without spelling it in the URL", async () => {
    const user = userEvent.setup();
    router.set({ view: "changesOverTime" });
    render(<AccountPage />);
    await user.click(
      screen.getAllByRole("tab", {
        name: "page.accountReport.accountBalance",
      })[0],
    );
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(router.search).not.toHaveProperty("view", "accountBalance");
    expect(router.search.view).toBeUndefined();
  });

  it("falls back to Account Balance for an unknown view", () => {
    router.set({ view: "<script>" });
    render(<AccountPage />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
