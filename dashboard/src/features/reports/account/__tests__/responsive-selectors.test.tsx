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
    ledgerOwner: "open_ledger",
    ledgerName: "crypto-example",
    accountName: "Assets:Crypto:Coinbase:BTC",
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

vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: () => <div data-testid="view-select">View</div>,
}));

describe("AccountPage narrow report selectors", () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockImplementation((document) => {
      if (document === GetLedgerAccountJournalDocument) {
        return {
          data: {
            getLedgerAccountJournal: { data: [], total: 0 },
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

  it("keeps interval and conversion selectors in the toolbar layout", () => {
    const { container } = render(<AccountPage />);

    expect(screen.getByTestId("interval-select")).toBeInTheDocument();
    expect(screen.getByTestId("conversion-select")).toBeInTheDocument();

    const hiddenDesktopOnly = container.querySelector(".hidden.sm\\:flex");
    expect(hiddenDesktopOnly).toBeNull();
    expect(container.querySelector(".flex-wrap")).not.toBeNull();
  });
});
