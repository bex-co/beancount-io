import { useCallback, useMemo } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useQuery } from "@apollo/client/react";
import { GetLedgerIntervalTotalsDocument } from "@/graphql/definitions";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import {
  currencyMinorDigits,
  fractionDigitsOf,
} from "@/common/lib/format/format-number";
import {
  absDecimalNumber,
  isPositiveDecimalNumber,
  negateDecimalNumber,
} from "@/common/lib/beancount/decimal-number";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import {
  budgetGroupDirection,
  budgetHeadlinePeriod,
  budgetVariance,
  calculateBudgetForInterval,
  getIntervalStart,
  parseBudgetAmount,
  readSparseBalanceAmount,
} from "./budget-utils";
import type { BudgetGroup } from "./types";

/** One plotted period: its target (none before the first one was set) and actual. */
export interface BudgetPeriodRow {
  date: string;
  budget: string | null;
  actual: string;
}

export type BudgetVarianceStatus = "above" | "below" | "on" | "progress";

/**
 * Everything one budget says for one period: the periods behind its chart,
 * and the period it is summarised by — the one containing `asOf` (today,
 * or for a ledger that stopped, the end of its last whole month), or under
 * "Last year" that year's last. The summary row and the budget's own card
 * read the same query and the same numbers, so they never disagree.
 */
export function useBudgetSnapshot({
  group,
  ledgerId,
  conversion,
  primaryCurrency,
  time,
  asOf: asOfDay,
}: {
  group: BudgetGroup;
  ledgerId: string;
  conversion: ConversionOption;
  primaryCurrency: string;
  time?: string;
  /** Defaults to today. */
  asOf?: string;
}) {
  const formatNum = useFormatNumber();
  const asOf = asOfDay ?? format(new Date(), "yyyy-MM-dd");
  const chartInterval = group.interval.toLowerCase() as ChartInterval;

  const { exact: currentBudgetValue, currency: budgetCurrency } = useMemo(
    () => parseBudgetAmount(group.amount),
    [group.amount],
  );
  const displayCurrency = budgetCurrency || group.currency || primaryCurrency;
  const displayDirection = budgetGroupDirection(group);
  const displayBudgetValue = absDecimalNumber(currentBudgetValue);

  const { data, loading, error } = useQuery(GetLedgerIntervalTotalsDocument, {
    variables: {
      ledgerId,
      accountName: group.account,
      interval: chartInterval,
      conversion,
      time,
    },
    skip: !ledgerId || !group.account,
    fetchPolicy: "cache-first",
  });

  const chartData = useMemo(
    () =>
      (data?.getLedgerIntervalTotals ?? []).map((item) => ({
        date: item.date,
        balance: item.balance as Record<string, unknown>,
        accountBalances: item.accountBalances as Record<string, unknown>,
      })),
    [data],
  );

  // A commodity is shown at the finest precision the ledger recorded for this
  // budget's targets and actuals, so 0.0004 BTC is not read as 0 BTC (w4/m45).
  // ISO currencies keep their minor units.
  const quantityDigits = Math.max(
    ...group.budgetHistory.map((entry) =>
      fractionDigitsOf(entry.amount.trim().split(/\s+/)[0]),
    ),
    ...chartData.map((item) =>
      fractionDigitsOf(String(item.balance[displayCurrency])),
    ),
  );
  // Prorated targets round once to the precision amounts are written at —
  // an ISO currency's minor units, else at least the formatter's three
  // commodity digits — or the recorded digits when those are finer (w4/m55).
  const amountDigits = Math.max(
    quantityDigits,
    currencyMinorDigits(displayCurrency) ?? 3,
  );

  // A period that ended before the first target was set had no target: it
  // is drawn as a gap, not as a target of zero.
  const firstTargetDate = useMemo(
    () =>
      group.budgetHistory.reduce(
        (first, entry) =>
          first === "" || entry.date < first ? entry.date : first,
        "",
      ),
    [group.budgetHistory],
  );

  /**
   * Every plotted period with its effective target and actual. The chart draws
   * from this and so does the table below it, so the readable values are the
   * ones on the canvas rather than a second calculation.
   */
  const periodRows = useMemo(
    (): BudgetPeriodRow[] =>
      chartData.map((item) => {
        const budget = calculateBudgetForInterval(
          item.date,
          group.interval,
          group.budgetHistory,
          amountDigits,
        );
        return {
          date: item.date,
          budget:
            firstTargetDate !== "" && item.date < firstTargetDate
              ? null
              : displayDirection < 0
                ? negateDecimalNumber(budget)
                : budget,
          actual:
            readSparseBalanceAmount(
              item.balance,
              displayCurrency,
              displayDirection,
            ) ?? "0",
        };
      }),
    [
      chartData,
      displayCurrency,
      displayDirection,
      group.budgetHistory,
      group.interval,
      amountDigits,
      firstTargetDate,
    ],
  );

  const showNumber = useCallback(
    (value: string) => formatNum(value, displayCurrency, quantityDigits),
    [formatNum, displayCurrency, quantityDigits],
  );
  const showAmount = useCallback(
    (value: string) => `${showNumber(value)} ${displayCurrency}`,
    [showNumber, displayCurrency],
  );

  // The headline describes the period containing `asOf`, not whichever
  // bucket the selected span happens to end on: "This year" ends in
  // December, and a rolling window clips (and so prorates) the current month.
  const spanEnded = time === "year-1";
  // A span that ended ("Last year") is summarised by its period holding the
  // summarised day when it has one — a ledger that stopped in October is
  // read for its last whole month, not for the empty December after it —
  // and otherwise by its last period.
  const headline = useMemo(() => {
    const ends = chartData.map((item) => item.date);
    if (spanEnded) {
      const holding = ends.findIndex(
        (end) =>
          end >= asOf &&
          format(
            getIntervalStart(parseISO(end), group.interval),
            "yyyy-MM-dd",
          ) <= asOf,
      );
      if (holding !== -1) return { end: ends[holding], bucket: holding };
    }
    return budgetHeadlinePeriod(ends, group.interval, asOf, spanEnded);
  }, [chartData, group.interval, asOf, spanEnded]);

  const latestActual = useMemo(() => {
    if (chartData.length === 0 || headline === null) return null;
    // A bucket missing for the current period means nothing was posted yet.
    if (headline.bucket === null) return "0";
    return readSparseBalanceAmount(
      chartData[headline.bucket].balance,
      displayCurrency,
      displayDirection,
    );
  }, [chartData, headline, displayCurrency, displayDirection]);

  // Under "Last year" the header claims that period's target, which only the
  // period's own read can supply. While that read is pending or has failed,
  // the latest configured budget is not an answer — it showed 200 USD for a
  // year whose target was 0 — so the value stays unknown instead.
  const comparisonBudgetValue = useMemo((): string | null => {
    if (spanEnded && (loading || error)) return null;
    if (headline === null) return spanEnded ? null : displayBudgetValue;
    return absDecimalNumber(
      calculateBudgetForInterval(
        headline.end,
        group.interval,
        group.budgetHistory,
        amountDigits,
      ),
    );
  }, [
    headline,
    displayBudgetValue,
    group.interval,
    group.budgetHistory,
    amountDigits,
    spanEnded,
    loading,
    error,
  ]);

  const variance = useMemo(() => {
    if (latestActual === null || comparisonBudgetValue === null) return null;
    return budgetVariance(latestActual, comparisonBudgetValue);
  }, [latestActual, comparisonBudgetValue]);

  // A period that ends after the summarised day is still running (a month
  // in progress, a year not over, a ledger that stopped part-way through
  // it). It gets no verdict until one is certain: spending already past
  // the whole period's target is over it; income already past it has met
  // it. Otherwise it is in progress.
  const inProgress = headline !== null && headline.end > asOf;
  const varianceStatus = useMemo((): BudgetVarianceStatus | null => {
    if (variance === null) return null;
    const above = isPositiveDecimalNumber(variance);
    if (inProgress && !above) return "progress";
    if (above) return "above";
    if (variance.startsWith("-")) return "below";
    return "on";
  }, [variance, inProgress]);

  const isFavorable =
    varianceStatus === "on" ||
    varianceStatus === "progress" ||
    (displayDirection > 0
      ? varianceStatus === "below"
      : varianceStatus === "above");

  const progressPercent =
    latestActual !== null &&
    comparisonBudgetValue !== null &&
    isPositiveDecimalNumber(comparisonBudgetValue)
      ? Math.max(
          0,
          (Number(latestActual) / Number(comparisonBudgetValue)) * 100,
        )
      : null;

  // The summarised period's first day, so it can be named ("September
  // 2025"); unknown until the read settles.
  const headlineStart =
    headline === null
      ? null
      : format(
          getIntervalStart(parseISO(headline.end), group.interval),
          "yyyy-MM-dd",
        );

  return {
    loading,
    error,
    chartInterval,
    chartData,
    periodRows,
    displayCurrency,
    displayDirection,
    quantityDigits,
    showNumber,
    showAmount,
    spanEnded,
    headline,
    headlineStart,
    latestActual,
    comparisonBudgetValue,
    variance,
    varianceStatus,
    isFavorable,
    progressPercent,
    inProgress,
    asOf,
  };
}

/**
 * The day a budget page summarises. Today, unless the ledger has gone quiet
 * (its last entry more than 45 days back, as Overview decides): then the end
 * of the last month its data covers whole, so every budget is read for a
 * period that has data, not for an empty current one.
 */
export function budgetSummaryDay(
  today: string,
  dataThrough: string | null,
): string {
  if (!dataThrough || dataThrough >= today) return today;
  const quietDays =
    (parseISO(today).getTime() - parseISO(dataThrough).getTime()) / 86_400_000;
  if (quietDays <= 45) return today;
  const next = addDays(parseISO(dataThrough), 1);
  // The data reaches the month's last day: that month is whole.
  if (next.getDate() === 1) return dataThrough;
  return format(
    addDays(parseISO(format(next, "yyyy-MM-01")), -1),
    "yyyy-MM-dd",
  );
}

/** A budget's identity on the page: one per account and currency. */
export const budgetKey = (group: BudgetGroup) =>
  `${group.account}::${group.currency}`;

/** The status words, coloured by whether the result is good for the account. */
export function varianceTone(status: string | null, favorable: boolean) {
  if (status === "on" || status === "progress")
    return "border-muted-foreground/25 bg-muted text-muted-foreground";
  return favorable
    ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
    : "border-red-600/30 bg-red-500/10 text-red-800 dark:text-red-300";
}
