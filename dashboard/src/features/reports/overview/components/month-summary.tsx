import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  type DataSeries,
  type IntervalDataSeries,
  formatPeriodMonth,
  formatTimeAgo,
  getComparableAmount,
  getMovementSnapshot,
  isLedgerDormant,
  isPeriodIncomplete,
} from "../lib/overview-utils";
import { MonthHeroChart } from "./month-hero-chart";

/**
 * The head of the page: which month the Overview is showing, stepped in
 * place, and how far the data reaches, then the year it sits in as one chart.
 *
 * It states facts only. A sentence reading the month ("you kept…", "net worth
 * rose, n months running") was tried and set aside: it judged a person's
 * savings, a company's cash-basis income and a public reference ledger with
 * one voice, and was wrong for most of them. The figures it drew on are in
 * the chart and the modules below.
 */
export function MonthSummary({
  dates,
  selectedDate,
  onSelectDate,
  dataThrough,
  ledgerDataThrough,
  income,
  expenses,
  netWorth,
  primaryCurrency,
  today,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** The ledger's last day with data; a month past it is incomplete. */
  dataThrough: string;
  /**
   * The ledger's newest transaction with no account, filter or time: only
   * the dormancy line reads it. A past Time filter always ends long ago,
   * so reading dormancy off the filtered date calls every filtered view
   * of an active ledger dormant (w5/1149).
   */
  ledgerDataThrough: string;
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  /** Net worth at market value, one point per month. */
  netWorth: DataSeries;
  primaryCurrency: string;
  today: string;
}) {
  const { t, i18n } = useTranslations();
  const language = i18n.language;
  const monthStart = `${selectedDate.slice(0, 8)}01`;
  // Only a month the data reaches into but does not finish says so; one
  // wholly after the data simply has nothing in it.
  const incomplete =
    isPeriodIncomplete(selectedDate, dataThrough) && dataThrough >= monthStart;
  const dormant = isLedgerDormant(ledgerDataThrough, today);
  const throughLabel = incomplete
    ? t("page.overview.dataThrough", {
        // A ledger date, written as the ledger writes it, as every list
        // on these pages does.
        date: dataThrough,
      })
    : null;
  const lastEntryDate = ledgerDataThrough;
  const lastEntry = dormant
    ? t("page.overview.lastEntry", {
        date: lastEntryDate,
        ago: formatTimeAgo(ledgerDataThrough, today, language),
      })
    : null;

  // The chart draws one unit: the operating currency where the month's
  // income (or else its spending) holds it.
  const unitOf = (series: IntervalDataSeries, inverted: boolean) =>
    getComparableAmount(
      getMovementSnapshot({
        series,
        date: selectedDate,
        preferredCurrency: primaryCurrency,
        inverted,
      }).total,
      primaryCurrency,
    )?.currency;
  const unit =
    unitOf(income, true) ?? unitOf(expenses, false) ?? primaryCurrency;

  const index = dates.indexOf(selectedDate);

  return (
    <div className="grid gap-y-6">
      {/* Announced when the month changes: its name and how far its data
          reaches. */}
      <div aria-live="polite" className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* The dateline is also the month's control. */}
          <div
            role="group"
            aria-label={t("page.overview.shownMonth")}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full text-muted-foreground sm:size-8"
              disabled={index <= 0}
              onClick={() => onSelectDate(dates[index - 1])}
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[9.5rem] text-center text-sm font-semibold text-foreground">
              {formatPeriodMonth(selectedDate, language)}
              {throughLabel && !lastEntry && (
                <span className="text-muted-foreground"> · {throughLabel}</span>
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full text-muted-foreground sm:size-8"
              disabled={index < 0 || index >= dates.length - 1}
              onClick={() => onSelectDate(dates[index + 1])}
              aria-label={t("common.next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {lastEntry && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <History aria-hidden="true" className="size-3.5" />
              {lastEntry}
            </span>
          )}
        </div>
      </div>
      <MonthHeroChart
        dates={dates}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        dataThrough={dataThrough}
        income={income}
        expenses={expenses}
        netWorth={netWorth}
        unit={unit}
      />
    </div>
  );
}
