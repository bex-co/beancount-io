import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import TrialBalancePage from "../index";

const { captureProps } = vi.hoisted(() => ({ captureProps: vi.fn() }));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
}));

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
