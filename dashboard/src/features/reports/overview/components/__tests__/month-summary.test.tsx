import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { MonthSummary } from "../month-summary";
import { useOverviewMonth } from "../../hooks/use-overview-month";
import type { DataSeries, IntervalDataSeries } from "../../lib/overview-utils";

// Real English, plurals included: the summary's sentences are the subject.
vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.mock("@/common/hooks/use-url-view", async () => {
  const { useState } = await import("react");
  return {
    useUrlView: (_from: string, views: string[], fallback: string) => {
      const [choice, setChoice] = useState("");
      return [views.includes(choice) ? choice : fallback, setChoice];
    },
  };
});
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: () => <div data-testid="echarts-mock" />,
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: {} } }),
}));
vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "" },
  }),
}));

/** The page's wiring in miniature: the month hook picks, the summary tells. */
function Summary({
  income,
  expenses,
  dataThrough,
  ledgerDataThrough = dataThrough,
  today,
  netWorth = [],
}: {
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  dataThrough: string;
  /** The ledger's newest transaction with no filter; only dormancy reads it. */
  ledgerDataThrough?: string;
  today: string;
  netWorth?: DataSeries;
}) {
  const month = useOverviewMonth({
    income,
    expenses,
    preferActiveMonth: false,
    dataThrough,
    today,
  });
  if (!month.selectedDate) return null;
  return (
    <MonthSummary
      dates={month.dates}
      selectedDate={month.selectedDate}
      onSelectDate={month.setSelectedDate}
      dataThrough={dataThrough}
      ledgerDataThrough={ledgerDataThrough}
      income={income}
      expenses={expenses}
      netWorth={netWorth}
      primaryCurrency="USD"
      today={today}
    />
  );
}

async function renderSummary(ui: ReactNode) {
  const localization = createLocalization();
  await localization.changeLanguage("en");
  return render(
    <LocalizationProvider localization={localization}>
      {ui}
    </LocalizationProvider>,
  );
}

/** Month-end interval dates from `first` through `last` (YYYY-MM). */
function months(first: string, last: string) {
  const dates: string[] = [];
  let [year, month] = first.split("-").map(Number);
  for (;;) {
    dates.push(new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10));
    if (`${year}-${String(month).padStart(2, "0")}` === last) return dates;
    month += 1;
    if (month > 12) [year, month] = [year + 1, 1];
  }
}

describe("the month summary", () => {
  const year = months("2026-01", "2026-09");
  const flow = (amounts: Record<string, number>) =>
    year.map((date) => ({
      date,
      balance: { USD: amounts[date.slice(0, 7)] ?? 0 },
      accountBalances: {},
    }));
  const income = flow(
    Object.fromEntries(year.map((date) => [date.slice(0, 7), -1000])),
  );
  const expenses = flow({
    "2026-07": 1200,
    "2026-08": 250,
    "2026-09": 100,
  });
  /** What is announced when the month changes. */
  const summary = () =>
    document.querySelector("[aria-live=polite]")?.textContent ?? "";

  it("names the month and makes no claim about it", async () => {
    await renderSummary(
      <Summary
        income={income}
        expenses={expenses}
        dataThrough="2026-09-30"
        today="2026-10-02"
      />,
    );
    expect(summary()).toBe("September 2026");
    // No sentence reads the month for the reader: not "you kept", not a run
    // of months, for anyone's ledger.
    expect(document.body.textContent).not.toMatch(/\bkept\b|running|came in/i);
  });

  it("marks a month still running with how far its data reaches", async () => {
    await renderSummary(
      <Summary
        income={income}
        expenses={expenses}
        dataThrough="2026-09-10"
        today="2026-09-10"
      />,
    );
    expect(summary()).toBe("September 2026 · through 2026-09-10");
  });

  it("opens a ledger that stopped long ago on its last whole month, and says when it stopped", async () => {
    await renderSummary(
      <Summary
        income={income}
        expenses={expenses}
        dataThrough="2026-09-08"
        today="2035-11-10"
      />,
    );
    expect(summary()).toBe("August 2026Last entry 2026-09-08 (9 years ago)");
  });

  it("does not call a filtered view of an active ledger dormant (w5/1149)", async () => {
    // A past Time filter ends long ago, but the ledger is still writing:
    // its intervals narrow to the filter, as the page's own read does.
    const spring = months("2026-01", "2026-05");
    const springFlow = (amounts: Record<string, number>) =>
      spring.map((date) => ({
        date,
        balance: { USD: amounts[date.slice(0, 7)] ?? 0 },
        accountBalances: {},
      }));
    await renderSummary(
      <Summary
        income={springFlow(
          Object.fromEntries(spring.map((date) => [date.slice(0, 7), -1000])),
        )}
        expenses={springFlow({ "2026-05": 1200 })}
        dataThrough="2026-05-31"
        ledgerDataThrough="2026-09-30"
        today="2026-10-02"
      />,
    );
    expect(summary()).toBe("May 2026");
    expect(document.body.textContent).not.toMatch(/Last entry/);
  });

  it("names the ledger's real last entry on a filtered dormant ledger (w5/1149)", async () => {
    const spring = months("2026-01", "2026-05");
    const springFlow = (amounts: Record<string, number>) =>
      spring.map((date) => ({
        date,
        balance: { USD: amounts[date.slice(0, 7)] ?? 0 },
        accountBalances: {},
      }));
    await renderSummary(
      <Summary
        income={springFlow(
          Object.fromEntries(spring.map((date) => [date.slice(0, 7), -1000])),
        )}
        expenses={springFlow({ "2026-05": 1200 })}
        dataThrough="2026-05-31"
        ledgerDataThrough="2026-06-15"
        today="2027-01-01"
      />,
    );
    expect(document.body.textContent).toMatch(/Last entry 2026-06-15/);
    expect(document.body.textContent).not.toMatch(/Last entry 2026-05-31/);
  });

  it("steps the month from the dateline", async () => {
    const user = userEvent.setup();
    await renderSummary(
      <Summary
        income={income}
        expenses={expenses}
        dataThrough="2026-09-30"
        today="2026-10-02"
      />,
    );
    expect(screen.getByRole("group", { name: "Month shown" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(summary()).toBe("July 2026");
  });

  it("keeps keyboard focus on either arrow after reaching its limit", async () => {
    const user = userEvent.setup();
    await renderSummary(
      <Summary
        income={income.slice(-2)}
        expenses={expenses.slice(-2)}
        dataThrough="2026-09-30"
        today="2026-10-02"
      />,
    );
    const stepper = within(screen.getByRole("group", { name: "Month shown" }));
    const previous = stepper.getByRole("button", { name: "Previous" });
    const next = stepper.getByRole("button", { name: "Next" });

    previous.focus();
    await user.keyboard("{Enter}");
    expect(previous).toHaveFocus();
    expect(previous).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(summary()).toBe("August 2026");

    await user.tab();
    expect(next).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(next).toHaveFocus();
    expect(next).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Enter}");
    expect(summary()).toBe("September 2026");
  });
});
