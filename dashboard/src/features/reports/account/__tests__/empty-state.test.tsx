import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import AccountPage from "../index";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "demo",
    ledgerName: "empty",
    accountName: "Assets:Cash",
  }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Empty ledger",
  }),
}));

describe("AccountPage empty state", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({
      data: {
        getLedgerAccountReport: {
          accountBalanceData: [{ date: "2026-07-31", balance: { USD: "0" } }],
          intervalTotalsData: [],
          linechartData: [],
        },
      },
      previousData: undefined,
      loading: false,
      error: undefined,
    } as never);
  });

  it("renders a designed empty state instead of blank account charts", () => {
    render(<AccountPage />);

    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
    expect(
      screen.getByText("No account data found for this account."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Account Balance")).not.toBeInTheDocument();
  });
});
