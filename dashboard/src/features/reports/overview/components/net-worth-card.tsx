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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { getChartColors } from "@/common/lib/chart/color";
import { formatDateAxis, formatYAxisNumber } from "@/common/lib/chart/chart";
import type { DataSeries } from "../lib/overview-utils";
import { isPositiveDecimalNumber } from "@/common/lib/beancount/decimal-number";
import {
  amountDifference,
  getBalanceAmounts,
  getComparableAmount,
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
 * Y-axis ticks in the language's own digits, like the amounts beside them.
 * Latin-digit languages keep the compact `18.0k` every other chart uses.
 */
function yAxisTickFormatter(language: string): (value: number) => string {
  const native = new Intl.NumberFormat(language);
  if (native.resolvedOptions().numberingSystem === "latn") {
    return formatYAxisNumber;
  }
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
}: {
  valuation: NetWorthValuation;
  currency: string;
  language: string;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t } = useTranslations();
  const titleId = useId();
  const formatNumber = useFormatNumber();
  // Units keep every digit the ledger recorded: rounding 0.00012 BTC to 0
  // would name a holding the reader cannot see.
  const { holdings, staleSince } = valuation;
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
  if (staleSince !== null) {
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
    <div className="mt-2 space-y-1 text-xs text-muted-foreground sm:text-sm">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${parts.join(" · ")}. ${t("page.overview.valuationDetails")}`}
            className={cn(
              "-mx-1 flex items-start gap-1.5 rounded px-1 text-left underline decoration-dotted underline-offset-4 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              staleSince !== null && "text-amber-700 dark:text-amber-400",
            )}
          >
            {staleSince !== null && (
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0"
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
                key={holding.currency}
                className="flex items-start justify-between gap-3 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium">{holding.currency}</p>
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
}: {
  /** The ledger's day (`YYYY-MM-DD`), which the headline is capped at. */
  today?: string;
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
  // Chart or table is view preference, not scoped to the data. The overview
  // replaces its cards with a spinner on a shared scope change, so this is
  // held in the URL rather than in state that the unmount would discard.
  const [view, setView] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/",
    NET_WORTH_VIEWS,
    DEFAULT_NET_WORTH_VIEW,
  );
  const visibleData = useMemo(() => data.slice(-12), [data]);
  // The headline and its change stop at the current month (w21/995).
  const throughNow = throughCurrentMonth(visibleData, today);
  const latest = throughNow.at(-1);
  const previous = throughNow.at(-2);
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
      color: getChartColors(),
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
        return {
          name: currency,
          type: "line" as const,
          smooth: 0.25,
          symbol: singlePoint ? ("circle" as const) : ("none" as const),
          symbolSize: singlePoint ? 7 : undefined,
          showSymbol: singlePoint,
          lineStyle: { width: 2 },
          areaStyle: { opacity: 0.12 },
          data,
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
  }, [formatNumber, language, primaryCurrency, visibleData]);

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <CardTitle>{t("common.netWorth")}</CardTitle>
        <CardDescription>
          {t("page.overview.netWorthDescription")}
        </CardDescription>
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

      <CardContent className="px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <FormattedAmounts
            amounts={latestAmounts}
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          />
          {change !== null && latestComparable && (
            <div
              className={
                falling
                  ? "flex items-center gap-1 text-sm text-rose-600 dark:text-rose-400"
                  : "flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400"
              }
            >
              {falling ? (
                <TrendingDown className="size-4" />
              ) : (
                <TrendingUp className="size-4" />
              )}
              <span className="tabular-nums">
                {isPositiveDecimalNumber(change) ? "+" : ""}
                {formatNumber(
                  change,
                  latestComparable.currency,
                  fractionDigitsOf(change),
                )}{" "}
                {latestComparable.currency}
              </span>
              <span className="text-muted-foreground">
                {t("page.overview.fromPreviousMonth")}
              </span>
            </div>
          )}
        </div>
        {valuation && (
          <NetWorthValuationNote
            valuation={valuation}
            currency={primaryCurrency}
            language={language}
            ledgerOwner={ledgerOwner}
            ledgerName={ledgerName}
          />
        )}

        {visibleData.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            {t("common.noDataFound")}
          </div>
        ) : view === "chart" ? (
          <ReactECharts
            option={chartOption}
            style={{ height: "230px", width: "100%" }}
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
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {t("page.overview.netWorthMonth")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {t("common.netWorth")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...visibleData].reverse().map((point) => (
                  <tr key={point.date}>
                    <th
                      scope="row"
                      className="px-3 py-2.5 text-left font-normal text-muted-foreground"
                    >
                      {formatMonth(point.date, language)}
                    </th>
                    <td className="px-3 py-2.5">
                      <FormattedAmounts
                        amounts={prioritizeCurrency(
                          getBalanceAmounts(point.balance),
                          primaryCurrency,
                        )}
                        className="text-right font-medium"
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
