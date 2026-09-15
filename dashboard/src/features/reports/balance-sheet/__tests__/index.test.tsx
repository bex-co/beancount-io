import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import LedgerBalanceSheetPage from "../index";

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

vi.mock("../balance-sheet-content", () => ({
  BalanceSheetContent: () => <div>balance-sheet-content</div>,
}));

vi.mock("@/features/reports/components/use-report-conversion", () => ({
  useReportConversion: () => ["at_cost", vi.fn()],
}));

describe("LedgerBalanceSheetPage", () => {
  it("shows pending state while loading even when previousData exists", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      previousData: {
        getLedgerBalanceSheet: {
          assetsHierarchyData: {},
        },
      },
      loading: true,
      error: undefined,
    } as never);

    render(<LedgerBalanceSheetPage />);

    expect(screen.queryByText("balance-sheet-content")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

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

    render(<LedgerBalanceSheetPage />);

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
