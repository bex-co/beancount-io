import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import LedgerIncomeStatementPage from "../index";

const { captureProps } = vi.hoisted(() => ({ captureProps: vi.fn() }));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

const routerSearch = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
}));

vi.mock("@tanstack/react-router", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
    // The selected view lives in the URL now, so the router mock has to hold
    // it the way the URL does — and notify readers, so a selection re-renders
    // the page exactly as a real navigation would.
    useSearch: () =>
      useSyncExternalStore(
        (onChange: () => void) => {
          routerSearch.listeners.add(onChange);
          return () => routerSearch.listeners.delete(onChange);
        },
        () => routerSearch.current,
      ),
    useNavigate: () => (options: { search?: (previous: object) => object }) => {
      routerSearch.current = {
        ...routerSearch.current,
        ...(options.search?.(routerSearch.current) ?? {}),
      };
      routerSearch.listeners.forEach((listener) => listener());
    },
  };
});

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Demo Books",
    primaryCurrency: "USD",
    ledgerData: { options: { title: "" }, favaOptions: {} },
  }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("../income-statement-content", () => ({
  IncomeStatementContent: (props: Record<string, unknown>) => {
    captureProps(props);
    return <div>income-statement-content</div>;
  },
}));

beforeEach(() => {
  routerSearch.current = {};
  routerSearch.listeners.clear();
});

describe("LedgerIncomeStatementPage", () => {
  it("shows the actionable message for an invalid-input error", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      previousData: undefined,
      loading: false,
      error: new CombinedGraphQLErrors({
        errors: [
          {
            message: "raw internal server message",
            extensions: { code: "BAD_USER_INPUT" },
          },
        ],
      }),
    } as never);

    render(<LedgerIncomeStatementPage />);

    expect(
      screen.getByText(
        "Some of the information provided is invalid. Please check and try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/raw internal server message/),
    ).not.toBeInTheDocument();
  });
});

describe("LedgerIncomeStatementPage chart selection lifetime", () => {
  const mock = (override: Record<string, unknown>) =>
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      previousData: undefined,
      loading: false,
      error: undefined,
      ...override,
    } as never);
  const settled = () =>
    mock({
      data: {
        getLedgerIncomeStatement: { netProfitData: [] },
        getLedgerAccounts: [],
      },
    });
  // An uncached interval or conversion change: loading with no data, which
  // selectSettledReportData classifies as pending.
  const pending = () => mock({ loading: true });

  it("keeps the reader's chart selected across an uncached read", () => {
    settled();
    const { rerender } = render(<LedgerIncomeStatementPage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("netProfit");

    act(() => captureProps.mock.calls.at(-1)![0].onSelectedTabChange("income"));
    rerender(<LedgerIncomeStatementPage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("income");

    // The content is replaced while the new read is in flight, so a selection
    // living inside it would be lost here.
    pending();
    rerender(<LedgerIncomeStatementPage />);
    expect(
      screen.queryByText("income-statement-content"),
    ).not.toBeInTheDocument();

    settled();
    rerender(<LedgerIncomeStatementPage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("income");
  });
});
