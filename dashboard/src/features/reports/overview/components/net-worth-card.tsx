import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { useId, useMemo } from "react";
import type { EChartsOption } from "echarts";
import {
  AlertTriangle,
  AreaChart,
  Table2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { Link, useHydrated } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils.ts";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { CHART_PALETTE } from "@/common/lib/chart/color";
import { useIsDarkTheme } from "@/common/hooks/use-theme";
import { formatDateAxis } from "@/common/lib/chart/chart";
import type { DataSeries } from "../lib/overview-utils";
import { isPositiveDecimalNumber } from "@/common/lib/beancount/decimal-number";
import {
  amountDifference,
  type CurrencyAmount,
  getBalanceAmounts,
  getComparableAmount,
  periodPage,
  prioritizeCurrency,
  toLocalISODate,
} from "../lib/overview-utils";
import {
  throughCurrentMonth,
  type NetWorthValuation,
} from "../lib/net-worth-valuation";
import { FormattedAmounts } from "./formatted-amounts";
import { useUrlView } from "@/common/hooks/use-url-view";
import {
  NET_WORTH_VIEWS,
  DEFAULT_NET_WORTH_VIEW,
} from "@/features/reports/overview/search";

/**
 * `language` is required: with an undefined locale `Intl.DateTimeFormat` falls
 * back to the browser's preference instead of the selected app language.
 */
function formatMonth(date: string, language: string): string {
  return (
    formatLedgerDate(date, language, { month: "short", year: "numeric" }) ??
    date
  );
}

/**
 * Y-axis ticks in the language's own digits and compact notation, like the
 * amounts beside them: `120K`, not `120.0k`.
 */
function yAxisTickFormatter(language: string): (value: number) => string {
  const compact = new Intl.NumberFormat(language, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return (value) => compact.format(value);
}

/** `YYYY-MM-DD` as a medium date in the app language, e.g. "Sep 8, 2017". */
function formatPriceDate(date: string, language: string): string {
  return formatLedgerDate(date, language, { dateStyle: "medium" }) ?? date;
}

/**
 * What the figure above it is (w4/m26, w4/m27): one quiet status line —
 * "At market value", plus counts only when something needs attention — that
 * opens the per-holding detail, then the cost basis with the unrealized
 * difference. Rendered right after the figure, so a screen reader reads it
 * with the figure.
 */
function NetWorthValuationNote({
  valuation,
  currency,
  language,
  ledgerOwner,
  ledgerName,
  staleNoticeShown,
}: {
  valuation: NetWorthValuation;
  currency: string;
  language: string;
  ledgerOwner: string;
  ledgerName: string;
  /** The page already says which prices stopped updating, with the fix. */
  staleNoticeShown: boolean;
}) {
  const { t } = useTranslations();
  const titleId = useId();
  const formatNumber = useFormatNumber();
  // Units keep every digit the ledger recorded: rounding 0.00012 BTC to 0
  // would name a holding the reader cannot see.
  const { holdings, staleSince } = valuation;
  // A commodity bought in two currencies is two holdings; each then names its
  // cost currency in beancount's own notation (`VTI {EUR}`, `VTI {}`).
  const repeated = new Set(
    holdings
      .map((holding) => holding.currency)
      .filter((commodity, index, all) => all.indexOf(commodity) !== index),
  );
  const holdingKey = (holding: NetWorthValuation["holdings"][number]) =>
    `${holding.currency} {${holding.costCurrency ?? ""}}`;
  // The exact decimals where the valuation has them: a +1 gain on a 2^53
  // basis is 0 as doubles, and would hide this line (w4/1015).
  const costBasis = valuation.costBasisExact ?? valuation.costBasis;
  const unrealized = valuation.unrealizedExact ?? valuation.unrealized;
  const staleCount = holdings.filter((holding) => holding.stale).length;
  const atCostCount = holdings.filter((h) => h.basis === "cost").length;
  const notInTotalCount = holdings.filter(
    (h) => h.basis === "notInTotal",
  ).length;
  // Only a cent or more is a difference worth a line.
  const showCostBasis =
    costBasis !== null &&
    unrealized !== null &&
    Math.round(Number(unrealized) * 100) !== 0;

  const parts = [t("page.overview.valuedAtMarket")];
  const showStale = staleSince !== null && !staleNoticeShown;
  if (showStale) {
    parts.push(
      t("page.overview.pricesNotUpdated", {
        date: formatPriceDate(staleSince, language),
        count: staleCount,
      }),
    );
  }
  if (atCostCount > 0) {
    parts.push(t("page.overview.atCostCount", { count: atCostCount }));
  }
  if (notInTotalCount > 0) {
    parts.push(t("page.overview.notInTotalCount", { count: notInTotalCount }));
  }

  return (
    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${parts.join(" · ")}. ${t("page.overview.valuationDetails")}`}
            className="-mx-1 flex items-start gap-1.5 rounded px-1 text-left underline decoration-muted-foreground/40 decoration-dotted underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {showStale && (
              // The warning is the icon's to carry; the line stays a quiet
              // note under the figure rather than an alarm across the card.
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
              />
            )}
            <span>{parts.join(" · ")}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          aria-labelledby={titleId}
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
        >
          <p id={titleId} className="border-b px-4 py-3 text-sm font-medium">
            {t("page.overview.valuationDetails")}
          </p>
          <ul
            tabIndex={0}
            className="max-h-72 divide-y overflow-y-auto text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            {holdings.map((holding) => (
              <li
                key={holdingKey(holding)}
                className="flex items-start justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {repeated.has(holding.currency)
                      ? holdingKey(holding)
                      : holding.currency}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatNumber(
                      holding.unitsExact ?? holding.units,
                      holding.currency,
                      fractionDigitsOf(holding.unitsExact ?? holding.units),
                    )}{" "}
                    {holding.currency}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p
                    className={cn(
                      "tabular-nums",
                      holding.stale
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {holding.priceDate === null
                      ? t("page.overview.noPrice")
                      : t("page.overview.holdingPrice", {
                          date: formatPriceDate(holding.priceDate, language),
                        })}
                  </p>
                  <p className="text-muted-foreground">
                    {[
                      holding.stale && t("page.overview.priceNotUpdated"),
                      holding.managed && t("page.overview.livePrice"),
                      holding.basis === "cost" && t("page.overview.atCostTag"),
                      holding.basis === "notInTotal" &&
                        t("page.overview.notInTotalTag"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t px-4 py-3 text-sm">
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/commodities"
              params={{ ledgerOwner, ledgerName }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("page.overview.updatePrices")}
            </Link>
          </div>
        </PopoverContent>
      </Popover>
      {showCostBasis && (
        <p className="tabular-nums">
          {t("page.overview.costBasis", {
            amount: `${formatNumber(costBasis, currency, fractionDigitsOf(costBasis))} ${currency}`,
          })}
          {" · "}
          {t("page.overview.unrealized", {
            amount: `${Number(unrealized) > 0 ? "+" : ""}${formatNumber(unrealized, currency, fractionDigitsOf(unrealized))} ${currency}`,
          })}
        </p>
      )}
    </div>
  );
}

/** A digit in any numbering system, then one separator, then a digit. */
const DECIMAL_PROBE = /\p{Nd}([^\p{Nd}])\p{Nd}/u;

/**
 * The headline figure, set like a statement: the whole units large, the
 * fraction and the unit quieter. The split is only visual — assistive
 * technology and text search read the one formatted amount — and it happens
 * only where the formatter itself wrote a decimal separator, found by
 * formatting 1.5 the same way (so `1.234` in German is never cut, and a unit
 * without minor units is shown whole).
 */
function HeadlineAmount({ amount }: { amount: CurrencyAmount }) {
  const formatNumber = useFormatNumber();
  const value = amount.exact ?? amount.value;
  const text = formatNumber(value, amount.currency, fractionDigitsOf(value));
  const separator = formatNumber("1.5", amount.currency, 1).match(
    DECIMAL_PROBE,
  )?.[1];
  const split = separator ? text.lastIndexOf(separator) : -1;
  return (
    <p className="tabular-nums">
      <span className="sr-only">{`${text} ${amount.currency}`}</span>
      <span
        aria-hidden="true"
        className="flex flex-wrap items-baseline gap-x-2 whitespace-nowrap"
      >
        <span className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          {split < 0 ? text : text.slice(0, split)}
          {split >= 0 && (
            <span className="text-2xl font-medium text-muted-foreground sm:text-3xl">
              {text.slice(split)}
            </span>
          )}
        </span>
        <span className="text-sm font-medium tracking-wide text-muted-foreground">
          {amount.currency}
        </span>
      </span>
    </p>
  );
}

/**
 * A series with a single finite point draws no line segment, so it needs a
 * visible marker or the chart looks empty.
 */
function isSinglePointSeries(data: ReadonlyArray<number | null>): boolean {
  return (
    data.filter((value) => value !== null && Number.isFinite(value)).length ===
    1
  );
}

export function NetWorthCard({
  data,
  valuation,
  primaryCurrency,
  ledgerOwner,
  ledgerName,
  today = toLocalISODate(new Date()),
  selectedDate,
  dataThrough,
  staleNoticeShown = false,
  trend = true,
}: {
  /**
   * Draw the year's line (and its table) under the figure, in a card of its
   * own. Off where the page already draws net worth in its own chart: then
   * only the figure, its change and what the valuation discloses render, with
   * no card or date, to head the card that lists the accounts it adds up.
   */
  trend?: boolean;
  /** The ledger's day (`YYYY-MM-DD`), which the headline is capped at. */
  today?: string;
  /**
   * The month the page shows. Its close is the headline when it is before the
   * latest one, and it is marked on the line.
   */
  selectedDate?: string;
  /**
   * The ledger's last day with data. The series dates a month by its last
   * day; the figure for a month the data stops in is as of this day instead.
   */
  dataThrough?: string;
  /** The page already reports stale prices; the note need not repeat it. */
  staleNoticeShown?: boolean;
  /** Net worth at market value (`at_value`), one point per month. */
  data: DataSeries;
  /** What the latest point discloses; null when it holds nothing to value. */
  valuation: NetWorthValuation | null;
  primaryCurrency: string;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t, i18n } = useTranslations();
  const tableCaptionId = useId();
  const hydrated = useHydrated();
  const language = i18n.language;
  const formatNumber = useFormatNumber();
  const isDark = useIsDarkTheme();
  // Chart or table is view preference, not scoped to the data. The overview
  // replaces its cards with a spinner on a shared scope change, so this is
  // held in the URL rather than in state that the unmount would discard.
  const [view, setView] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/",
    NET_WORTH_VIEWS,
    DEFAULT_NET_WORTH_VIEW,
  );
  // The headline and its change stop at the current month (w21/995).
  const throughNow = useMemo(
    () => throughCurrentMonth(data, today),
    [data, today],
  );
  // The page's month, when it is one before the latest: the card then reads
  // that month's close, so it answers for the same month as the summary.
  const shownIndex = selectedDate
    ? throughNow.findIndex(
        (point) => point.date.slice(0, 7) === selectedDate.slice(0, 7),
      )
    : -1;
  const past = shownIndex >= 0 && shownIndex < throughNow.length - 1;
  const shownAt = past ? shownIndex : throughNow.length - 1;
  const latest = throughNow[shownAt];
  const previous = shownAt > 0 ? throughNow[shownAt - 1] : undefined;
  const asOf =
    latest && dataThrough && dataThrough < latest.date
      ? dataThrough
      : latest?.date;
  // A year of the line, the page of twelve months holding the shown one.
  const visibleData = useMemo(() => {
    if (!past) return data.slice(-12);
    const page = new Set(
      periodPage(
        data.map((point) => point.date),
        throughNow[shownIndex].date,
      ),
    );
    return data.filter((point) => page.has(point.date));
  }, [data, past, shownIndex, throughNow]);
  const latestAmounts = prioritizeCurrency(
    getBalanceAmounts(latest?.balance),
    primaryCurrency,
  );
  const latestComparable = getComparableAmount(latestAmounts, primaryCurrency);
  // The change subtracts last month's amount in the same currency. A month
  // that held only another currency has nothing to compare: subtracting it
  // would report unlike units as a gain (w4/993).
  const previousComparable =
    previous && latestComparable
      ? (getBalanceAmounts(previous.balance).find(
          (amount) => amount.currency === latestComparable.currency,
        ) ?? null)
      : null;
  const change =
    latestComparable && previousComparable
      ? amountDifference(latestComparable, previousComparable)
      : null;
  const falling = change?.startsWith("-") ?? false;
  // The change as a share of last month, when last month held something to
  // be a share of. A ratio, so the doubles are fine here.
  const previousValue = previousComparable
    ? Number(previousComparable.exact ?? previousComparable.value)
    : 0;
  const changeShare =
    change !== null && previousValue !== 0
      ? new Intl.NumberFormat(language, {
          style: "percent",
          maximumFractionDigits: 1,
          signDisplay: "exceptZero",
        }).format(Number(change) / Math.abs(previousValue))
      : null;
  const [headline, ...otherUnits] = latestAmounts;
  const leftOutListed =
    valuation?.holdings.some((holding) => holding.basis === "notInTotal") ??
    false;

  const chartOption = useMemo<EChartsOption>(() => {
    const formatTick = yAxisTickFormatter(language);
    const currencies = Array.from(
      new Set(
        visibleData.flatMap((point) =>
          getBalanceAmounts(point.balance).map((amount) => amount.currency),
        ),
      ),
    );
    const displayedCurrencies = currencies.includes(primaryCurrency)
      ? [primaryCurrency]
      : currencies;

    return {
      animationDuration: 500,
      // The resolved theme's palette, so a live theme switch repaints it.
      color: [...CHART_PALETTE[isDark ? "dark" : "light"]],
      tooltip: { trigger: "axis" },
      grid: {
        left: 8,
        right: 8,
        top: 18,
        bottom: 28,
        containLabel: true,
      },
      legend:
        displayedCurrencies.length > 1
          ? { data: displayedCurrencies, bottom: 0 }
          : undefined,
      xAxis: {
        type: "category",
        boundaryGap: true,
        data: visibleData.map((point) => point.date),
        axisLabel: {
          formatter: (value: string) =>
            formatLedgerDate(value, language, { month: "short" }) ??
            formatDateAxis(value, "monthly"),
        },
      },
      yAxis: {
        type: "value",
        splitLine: defaultSplitLine,
        axisLabel: { formatter: formatTick },
        scale: true,
      },
      series: displayedCurrencies.map((currency) => {
        const amounts = visibleData.map((point) =>
          getBalanceAmounts(point.balance).find(
            (amount) => amount.currency === currency,
          ),
        );
        const data = amounts.map((amount) => amount?.value ?? null);
        const singlePoint = isSinglePointSeries(data);
        // The page's month on the line, so the trend and the summary above
        // are read as one story.
        const markedIndex = selectedDate
          ? visibleData.findIndex(
              (point) => point.date.slice(0, 7) === selectedDate.slice(0, 7),
            )
          : -1;
        const marked = markedIndex >= 0 ? data[markedIndex] : null;
        return {
          name: currency,
          type: "line" as const,
          smooth: 0.25,
          symbol: singlePoint ? ("circle" as const) : ("none" as const),
          symbolSize: singlePoint ? 7 : undefined,
          showSymbol: singlePoint,
          // A line, not an area: the axis is scaled to the data, and a fill
          // down to a baseline that is not zero would exaggerate the change.
          lineStyle: { width: 2.5 },
          data,
          markPoint:
            marked === null || singlePoint
              ? undefined
              : {
                  silent: true,
                  symbol: "circle",
                  symbolSize: 9,
                  label: { show: false },
                  itemStyle: {
                    borderColor: isDark ? "#131713" : "#ffffff",
                    borderWidth: 2,
                  },
                  data: [{ name: "selected", coord: [markedIndex, marked] }],
                },
          // The point's own decimal in its unit, not the plotted double
          // (w4/1015).
          tooltip: {
            valueFormatter: (value: unknown, dataIndex: number) => {
              const text = amounts[dataIndex]?.exact ?? Number(value);
              return formatNumber(text, currency, fractionDigitsOf(text));
            },
          },
        };
      }),
    };
  }, [
    formatNumber,
    isDark,
    language,
    primaryCurrency,
    selectedDate,
    visibleData,
  ]);

  const changeTag = change !== null && latestComparable && (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm",
        trend && "mt-3",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium whitespace-nowrap tabular-nums",
          falling
            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        )}
      >
        {falling ? (
          <TrendingDown aria-hidden="true" className="size-3.5" />
        ) : (
          <TrendingUp aria-hidden="true" className="size-3.5" />
        )}
        {isPositiveDecimalNumber(change) ? "+" : ""}
        {formatNumber(
          change,
          latestComparable.currency,
          fractionDigitsOf(change),
        )}{" "}
        {latestComparable.currency}
        {changeShare && (
          <span className="font-normal opacity-80">
            {" · "}
            {changeShare}
          </span>
        )}
      </span>
      <span className="text-muted-foreground">
        {t("page.overview.fromPreviousMonth")}
      </span>
    </div>
  );
  const figure = headline ? (
    <HeadlineAmount amount={headline} />
  ) : (
    <FormattedAmounts
      amounts={latestAmounts}
      className="text-4xl font-semibold tracking-tight"
    />
  );
  // Units with no price stay beside the figure, not added into it, and
  // quieter than it: they are not a second net worth. When the valuation note
  // already counts them as left out, it names them.
  const unpriced = otherUnits.length > 0 && !leftOutListed && (
    <FormattedAmounts
      amounts={otherUnits}
      className="mt-1 block text-sm text-muted-foreground"
    />
  );
  // What the latest valuation discloses (its basis, cost, stale prices) is
  // about today's holdings, not a past month's.
  const valuationNote = valuation && !past && (
    <NetWorthValuationNote
      valuation={valuation}
      currency={primaryCurrency}
      language={language}
      ledgerOwner={ledgerOwner}
      ledgerName={ledgerName}
      staleNoticeShown={staleNoticeShown}
    />
  );

  if (!trend) {
    // The head of the card that lists what it is made of: the figure and its
    // change on one line. That card's section names the day.
    return (
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">
          {t("common.netWorth")}
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {figure}
          {changeTag}
        </div>
        {unpriced}
        {valuationNote}
      </div>
    );
  }

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      {/* Title and figure read as one block: no rule between them. */}
      <CardHeader className="items-center pt-5 pb-0">
        {/* The day the figure is for: the month the page shows, or the
            ledger's last day, which may be years ago. */}
        <CardTitle className="flex flex-wrap items-baseline gap-x-2">
          {t("common.netWorth")}
          {latest && (
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {formatLedgerDate(asOf ?? latest.date, language, {
                dateStyle: "medium",
              }) ?? latest.date}
            </span>
          )}
        </CardTitle>
        <CardAction className="flex rounded-lg border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant={view === "chart" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 aria-pressed:forced-selected"
            disabled={!hydrated}
            onClick={() => setView("chart")}
            aria-label={t("page.overview.chartView")}
            aria-pressed={view === "chart"}
          >
            <AreaChart className="size-4" />
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 aria-pressed:forced-selected"
            disabled={!hydrated}
            onClick={() => setView("table")}
            aria-label={t("page.overview.tableView")}
            aria-pressed={view === "table"}
          >
            <Table2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col px-4 pt-1 pb-5 sm:px-6">
        {figure}
        {unpriced}
        {changeTag}
        {valuationNote}

        {visibleData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {t("common.noDataFound")}
          </div>
        ) : view === "chart" ? (
          // The line takes whatever height the row gives the card, so it
          // never ends above an empty band beside a taller Accounts list.
          <ReactECharts
            option={chartOption}
            style={{ flex: "1 1 230px", minHeight: "230px", width: "100%" }}
          />
        ) : (
          // A named, focusable region: the months overflow the box and the
          // table holds nothing focusable, so keyboard users scroll it here.
          <div
            role="region"
            tabIndex={0}
            aria-labelledby={tableCaptionId}
            className="mt-5 max-h-[230px] overflow-y-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <table className="w-full text-sm">
              <caption id={tableCaptionId} className="sr-only">
                {t("page.overview.netWorthByMonth")}
              </caption>
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="px-3 py-2 text-start font-medium">
                    {t("page.overview.netWorthMonth")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-end font-medium">
                    {t("common.netWorth")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...visibleData].reverse().map((point) => (
                  <tr key={point.date}>
                    <th
                      scope="row"
                      className="px-3 py-2.5 text-start font-normal text-muted-foreground"
                    >
                      {formatMonth(point.date, language)}
                    </th>
                    <td className="px-3 py-2.5">
                      <FormattedAmounts
                        amounts={prioritizeCurrency(
                          getBalanceAmounts(point.balance),
                          primaryCurrency,
                        )}
                        className="text-end font-medium"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
