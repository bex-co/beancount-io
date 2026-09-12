import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import TrialBalancePage from "../index";

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
  TrialBalanceContent: () => <div>trial-balance-content</div>,
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
