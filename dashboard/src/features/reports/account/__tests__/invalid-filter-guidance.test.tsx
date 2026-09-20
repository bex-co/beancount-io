import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerAccountJournalDocument,
  GetLedgerAccountReportDocument,
} from "@/graphql/definitions";
import AccountPage from "../index";

/**
 * A mistyped date in the Time filter comes back as a classified
 * BAD_USER_INPUT, which the shared mapper already turns into localized
 * correction guidance. This page discarded the caught error and showed a fixed
 * "error loading account data" instead, so the reader had nothing to act on.
 * These cases drive the page itself rather than the mapper.
 */

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "demo",
    ledgerName: "books",
    accountName: "Assets:Brokerage",
  }),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "2026-02-30" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    primaryCurrency: "USD",
    ledgerName: "Books",
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

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

/** The shape the API returns for an unparseable date in the Time filter. */
const badUserInput = new CombinedGraphQLErrors({
  errors: [
    {
      message: "Failed to parse date: 2026-02-30",
      extensions: { code: "BAD_USER_INPUT" },
    },
  ],
});

function renderWithReportError(error: unknown) {
  vi.mocked(useQuery).mockImplementation((document) => {
    if (document === GetLedgerAccountJournalDocument) {
      return {
        data: undefined,
        previousData: undefined,
        loading: false,
        error: undefined,
      } as never;
    }
    expect(document).toBe(GetLedgerAccountReportDocument);
    return {
      data: undefined,
      previousData: undefined,
      loading: false,
      error,
    } as never;
  });
  render(<AccountPage />);
}

describe("account report query failures", () => {
  it("asks the reader to correct an invalid filter", () => {
    renderWithReportError(badUserInput);

    expect(
      screen.getAllByText("common.errors.badUserInput").length,
    ).toBeGreaterThan(0);
  });

  it("no longer shows the unexplained fixed message", () => {
    renderWithReportError(badUserInput);

    expect(screen.queryByText("page.accountReport.errorLoading")).toBeNull();
  });

  it("keeps a safe fallback for an unclassified failure", () => {
    renderWithReportError(new Error("boom"));

    expect(screen.getAllByText("common.errors.generic").length).toBeGreaterThan(
      0,
    );
    // The raw server text is an internal detail and never reaches the page.
    expect(screen.queryByText(/boom/)).toBeNull();
  });

  it("does not leak the server's parse message for a classified failure", () => {
    renderWithReportError(badUserInput);

    expect(screen.queryByText(/Failed to parse date/)).toBeNull();
  });

  it("renders the report again once the filter is corrected", () => {
    vi.mocked(useQuery).mockImplementation((document) => {
      if (document === GetLedgerAccountJournalDocument) {
        return {
          data: {
            getLedgerAccountJournal: {
              data: [
                {
                  __typename: "Transaction",
                  date: "2026-04-17",
                  narration: "Sell ACME",
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
      return {
        data: {
          getLedgerAccountReport: {
            accountBalanceData: [
              { date: "2026-04-30", balance: { USD: "10" } },
            ],
            intervalTotalsData: [],
            linechartData: [{ date: "2026-04-17", balance: { USD: "10" } }],
          },
        },
        previousData: undefined,
        loading: false,
        error: undefined,
      } as never;
    });

    render(<AccountPage />);

    expect(screen.queryByText("common.errors.badUserInput")).toBeNull();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});
