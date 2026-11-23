import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import TrialBalancePage from "../index";

const { captureProps } = vi.hoisted(() => ({ captureProps: vi.fn() }));
let storedConversion: string | undefined;

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));
vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: () => storedConversion,
  setCookie: vi.fn(),
}));

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
    operatingCurrencies: ["USD"],
    ledgerData: { options: { title: "" }, favaOptions: {} },
  }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: {
      account: "Assets",
      filter: "currency:USD",
      time: "2017-09",
    },
  }),
}));

vi.mock("../trial-balance-content", () => ({
  TrialBalanceContent: (props: Record<string, unknown>) => {
    captureProps(props);
    return <div>trial-balance-content</div>;
  },
}));

function mockQuery(override: Record<string, unknown>) {
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    previousData: undefined,
    loading: false,
    error: undefined,
    ...override,
  } as never);
}

function graphQLError(code: string) {
  return new CombinedGraphQLErrors({
    errors: [{ message: "raw internal server message", extensions: { code } }],
  });
}

beforeEach(() => {
  storedConversion = undefined;
  vi.mocked(useQuery).mockClear();
  routerSearch.current = {};
  routerSearch.listeners.clear();
});

describe("TrialBalancePage", () => {
  it("shows the actionable message for an invalid-input error", () => {
    mockQuery({ error: graphQLError("BAD_USER_INPUT") });

    render(<TrialBalancePage />);

    expect(
      screen.getByText(
        "Some of the information provided is invalid. Please check and try again.",
      ),
    ).toBeInTheDocument();
    // The raw server message must never reach the user.
    expect(
      screen.queryByText(/raw internal server message/),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an access error from an invalid-input error", () => {
    mockQuery({ error: graphQLError("FORBIDDEN") });

    render(<TrialBalancePage />);

    expect(
      screen.queryByText(
        "Some of the information provided is invalid. Please check and try again.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the report content once data arrives", () => {
    mockQuery({
      data: {
        getLedgerTrialBalance: {
          assetsHierarchyData: null,
          liabilitiesHierarchyData: null,
          incomeHierarchyData: null,
          expensesHierarchyData: null,
          equityHierarchyData: null,
        },
        getLedgerAccounts: [],
      },
    });

    render(<TrialBalancePage />);

    expect(screen.getByText("trial-balance-content")).toBeInTheDocument();
  });

  it.each(["loading", "error", "ready"])(
    "requests cost for the exact displayed scope and keeps showing the report when cost is %s",
    (state) => {
      storedConversion = "USD";
      const displayed = { assetsHierarchyData: { balance: { USD: "1109" } } };
      const atCost = { assetsHierarchyData: { balance: { USD: "1000" } } };
      vi.mocked(useQuery).mockImplementation((_query, options) => {
        const { variables } = options as { variables: { conversion: string } };
        const isCostRead = variables.conversion === "at_cost";
        return {
          data: { getLedgerTrialBalance: isCostRead ? atCost : displayed },
          loading: isCostRead && state === "loading",
          error:
            isCostRead && state === "error" ? new Error("offline") : undefined,
        } as never;
      });

      render(<TrialBalancePage />);

      expect(useQuery).toHaveBeenCalledWith(GetLedgerTrialBalanceDocument, {
        fetchPolicy: "cache-first",
        skip: false,
        variables: {
          ledgerId: "demo/books",
          account: "Assets",
          filter: "currency:USD",
          time: "2017-09",
          conversion: "at_cost",
        },
      });
      expect(screen.getByText("trial-balance-content")).toBeInTheDocument();
      expect(captureProps.mock.calls.at(-1)?.[0]).toMatchObject({
        trialBalanceData: displayed,
        atCostData: state === "ready" ? atCost : undefined,
      });
    },
  );
});

describe("TrialBalancePage chart selection lifetime", () => {
  const settled = () =>
    mockQuery({
      data: {
        getLedgerTrialBalance: {
          assetsHierarchyData: null,
          liabilitiesHierarchyData: null,
          incomeHierarchyData: null,
          expensesHierarchyData: null,
          equityHierarchyData: null,
        },
        getLedgerAccounts: [],
      },
    });
  // An uncached interval or conversion change: loading with no data, which
  // selectSettledReportData classifies as pending.
  const pending = () => mockQuery({ loading: true });

  it("keeps the reader's chart selected across an uncached read", () => {
    settled();
    const { rerender } = render(<TrialBalancePage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("assets");

    act(() => captureProps.mock.calls.at(-1)![0].onSelectedTabChange("equity"));
    rerender(<TrialBalancePage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("equity");

    // The content is replaced while the new read is in flight, so a selection
    // living inside it would be lost here.
    pending();
    rerender(<TrialBalancePage />);
    expect(screen.queryByText("trial-balance-content")).not.toBeInTheDocument();

    settled();
    rerender(<TrialBalancePage />);
    expect(captureProps.mock.calls.at(-1)![0].selectedTab).toBe("equity");
  });
});
