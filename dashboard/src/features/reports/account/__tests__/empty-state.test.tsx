import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerAccountJournalDocument,
  GetLedgerAccountReportDocument,
} from "@/graphql/definitions";
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
    ledgerData: {},
  }),
}));

vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => <div data-testid="related-links" />,
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

describe("AccountPage empty chart state", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockImplementation((document) => {
      if (document === GetLedgerAccountJournalDocument) {
        return {
          data: {
            getLedgerAccountJournal: {
              data: [
                {
                  __typename: "Transaction",
                  date: "2024-06-01",
                  narration: "Borrow",
                },
              ],
              total: 1,
            },
          },
          previousData: undefined,
          loading: false,
          error: undefined,
        } as never;
      }

      expect(document).toBe(GetLedgerAccountReportDocument);
      return {
        data: {
          getLedgerAccountReport: {
            accountBalanceData: [{ date: "2026-07-31", balance: { USD: "0" } }],
            intervalTotalsData: [],
            linechartData: [{ date: "2024-06-01", balance: { USD: "-2850" } }],
          },
        },
        previousData: undefined,
        loading: false,
        error: undefined,
      } as never;
    });
  });

  it("keeps interval controls and journal when chart aggregates are zero", () => {
    render(<AccountPage />);

    expect(screen.getByText("Assets:Cash")).toBeInTheDocument();
    expect(
      screen.getAllByText("No account data found for this account.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("tab", { name: "Account Balance" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Account Journal")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
    expect(screen.getByTestId("related-links")).toBeInTheDocument();
  });
});
