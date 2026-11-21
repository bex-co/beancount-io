import { type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { ledgerDateFormat } from "@/common/lib/format/ledger-date";
import { formatPeriodMonth } from "../lib/overview-utils";
import { formatStatementDate } from "../../export/date";
import { NetWorthCard } from "../components/net-worth-card";
import { RecentActivityCard } from "../components/recent-activity-card";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const charts = vi.hoisted(() => ({ option: undefined as unknown }));
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => {
    charts.option = option;
    return null;
  },
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<object>()),
  useHydrated: () => true,
  // The card keeps its chart/table view in the URL; the default suffices.
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerJournal: {
        data: [
          {
            directive_type: "Transaction",
            entry_hash: "netflix",
            date: "2026-02-10",
            flag: "*",
            payee: "NETFLIX",
            narration: "",
            tags: [],
            links: [],
            postings: [
              {
                account: "Expenses:Media",
                units: { number: "15", currency: "USD" },
              },
              {
                account: "Assets:Cash",
                units: { number: "-15", currency: "USD" },
              },
            ],
          },
        ],
      },
    },
    loading: false,
  }),
}));

afterEach(cleanup);

/** Persian month names on the Gregorian calendar, and the Hijri ones. */
const GREGORIAN_AUGUST = "اوت";
const HIJRI_SHAHRIVAR = "شهریور";

describe("Persian ledger dates stay Gregorian (w3/632)", () => {
  it("formats with Persian names and digits on the Gregorian calendar", () => {
    const text = ledgerDateFormat("fa", {
      month: "long",
      year: "numeric",
    }).format(new Date(2026, 7, 15));
    expect(text).toContain(GREGORIAN_AUGUST);
    expect(text).toContain("۲۰۲۶");
    expect(text).not.toContain("۱۴۰۵");
  });

  it("titles a Money movement month with the month its figures cover", () => {
    const label = formatPeriodMonth("2026-08-01", "fa");
    expect(label).toContain(GREGORIAN_AUGUST);
    expect(label).toContain("۲۰۲۶");
    expect(label).not.toContain(HIJRI_SHAHRIVAR);
  });

  it("dates a Persian statement in the ledger's calendar", () => {
    const label = formatStatementDate("2026-07-01", "fa");
    expect(label).toContain("۲۰۲۶");
    expect(label).not.toContain("۱۴۰۵");
  });

  it.each(["en", "de", "zh"])("leaves %s unchanged", (language) => {
    expect(formatPeriodMonth("2026-08-01", language)).toBe(
      new Intl.DateTimeFormat(language, {
        month: "long",
        year: "numeric",
      }).format(new Date(2026, 7, 1)),
    );
  });

  async function mount(children: ReactNode) {
    const localization = createLocalization();
    await localization.changeLanguage("fa");
    const ledger = {
      ledgerData: { options: { renderCommas: true } },
    } as unknown as LedgerProviderContextType;
    render(
      <LocalizationProvider localization={localization}>
        <LedgerProviderContext.Provider value={ledger}>
          {children}
        </LedgerProviderContext.Provider>
      </LocalizationProvider>,
    );
  }

  it("labels Net Worth axis months and ticks like its table", async () => {
    await mount(
      <NetWorthCard
        data={[
          { date: "2026-07-31", balance: { USD: "17000" } },
          { date: "2026-08-31", balance: { USD: "18000" } },
        ]}
        valuation={null}
        primaryCurrency="USD"
        ledgerOwner="alice"
        ledgerName="books"
      />,
    );
    const option = charts.option as {
      xAxis: { axisLabel: { formatter: (v: string) => string } };
      yAxis: { axisLabel: { formatter: (v: number) => string } };
    };

    expect(option.xAxis.axisLabel.formatter("2026-08-31")).toContain(
      GREGORIAN_AUGUST,
    );
    expect(option.yAxis.axisLabel.formatter(18000)).toMatch(/۱۸/);
    expect(option.yAxis.axisLabel.formatter(18000)).not.toMatch(/\d/);
  });

  it("gives Recent activity the Gregorian day, as the Journal names it", async () => {
    await mount(
      <RecentActivityCard
        ledgerId="alice/books"
        ledgerOwner="alice"
        ledgerName="books"
        account=""
        filter=""
        time="2026-02"
        primaryCurrency="USD"
        incomeRoot="Income"
        expensesRoot="Expenses"
        canWrite={false}
      />,
    );
    // The Journal's day heading: weekday, day, month and year.
    const expected = ledgerDateFormat("fa", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2026, 1, 10)));

    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(expected).not.toContain("بهمن");
  });
});
