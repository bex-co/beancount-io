import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { BudgetInterval } from "@/graphql/definitions";
import { Badge } from "@/common/components/ui/badge";
import { Skeleton } from "@/common/components/ui/skeleton";
import { AccountName } from "@/common/components/account-name";
import { useTranslations } from "@/common/hooks/use-translations";
import { isPositiveDecimalNumber } from "@/common/lib/beancount/decimal-number";
import { cn } from "@/common/lib/utils/utils";
import type { ConversionOption } from "@/common/types/chart";
import { budgetPeriodName } from "./budget-utils";
import { budgetKey, useBudgetSnapshot, varianceTone } from "./budget-snapshot";
import { BudgetTargetBar } from "./budget-target-bar";
import type { BudgetGroup } from "./types";

/**
 * How a budget stands, for ordering the summary: missed targets, then met
 * ones, then periods still running; within each, furthest from target first.
 */
interface Standing {
  /** 0 missed, 1 met, 2 still in progress. */
  rank: number;
  /** How far actual is from target, as a share of it; -1 with no target. */
  distance: number;
}

type SummaryContext = {
  ledgerId: string;
  conversion: ConversionOption;
  primaryCurrency: string;
  time?: string;
  asOf: string;
};

type HiddenUntil = (breakpoint: "@lg" | "@2xl") => string;

/**
 * Every budget at a glance for its period: what it was meant to be, what it
 * was, and how far off — missed targets first, then met ones, then periods
 * still running, each furthest from target first. Each row leads to its
 * budget's card below.
 * Rows read the same query as the cards, so the two always agree.
 *
 * Narrow, a row is the account with "actual of target" under it, and how
 * far off; wider, the target and the actual take columns of their own.
 */
export function BudgetSummary({
  groups,
  ready: contextReady,
  anchorOf,
  id,
  note,
  onOrder,
  ...context
}: SummaryContext & {
  groups: BudgetGroup[];
  /** The summarised day is known (the ledger's last entry has been read). */
  ready: boolean;
  anchorOf: (group: BudgetGroup) => string;
  /** The table's id, for the cards' way back to it. */
  id?: string;
  /** Said under the caption: where the ledger's entries end, when they do. */
  note?: string;
  /** The settled order, worst first, so the cards below can follow it. */
  onOrder?: (keys: string[]) => void;
}) {
  const { t } = useTranslations();
  const [standings, setStandings] = useState<Record<string, Standing>>({});
  const report = useCallback((key: string, standing: Standing) => {
    setStandings((previous) => {
      const known = previous[key];
      return known &&
        known.rank === standing.rank &&
        known.distance === standing.distance
        ? previous
        : { ...previous, [key]: standing };
    });
  }, []);

  // The order is settled once, when every budget has been read: rows that
  // moved as reads arrived would jump under the reader's eye. Until then
  // each row is a placeholder of the same height.
  const ready =
    contextReady && groups.every((group) => budgetKey(group) in standings);
  const ordered = ready
    ? [...groups].sort((a, b) => {
        const sa = standings[budgetKey(a)];
        const sb = standings[budgetKey(b)];
        if (sa.rank !== sb.rank) return sa.rank - sb.rank;
        return sb.distance - sa.distance;
      })
    : groups;
  const orderKey = ready ? ordered.map(budgetKey).join("\n") : "";
  useEffect(() => {
    if (orderKey) onOrder?.(orderKey.split("\n"));
  }, [orderKey, onOrder]);

  // A column that does not fit keeps its cell at no width: a hidden cell
  // would leave the grid and pull the next one into its place.
  const hiddenUntil: HiddenUntil = (breakpoint) =>
    breakpoint === "@lg"
      ? "overflow-hidden px-0 @lg:px-2"
      : "overflow-hidden px-0 @2xl:px-2";

  return (
    <table
      id={id}
      tabIndex={-1}
      data-slot="table"
      aria-busy={!ready || undefined}
      className="w-full table-fixed caption-top text-sm outline-none"
    >
      {/* Names the table and says how it is ordered, and for a ledger that
          stopped, which period the figures are for. */}
      <caption className="px-4 py-2 text-start text-xs text-muted-foreground">
        {t("page.budget.budgetSummaryCaption")}
        {/* Its line is held until the ledger's last entry is known, so the
            table does not move down when the note arrives. */}
        <span className="block min-h-4">{ready ? note : null}</span>
      </caption>
      <colgroup>
        <col />
        <col className="w-0 @2xl:w-36 @4xl:w-44" />
        <col className="w-0 @2xl:w-36 @4xl:w-44" />
        <col className="w-32 @lg:w-40 @4xl:w-64 @6xl:w-80" />
      </colgroup>
      <thead className="[&_th]:h-8 [&_th]:bg-muted [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th]:shadow-[inset_0_-1px_0_var(--border)]">
        <tr>
          <th scope="col" className="ps-4 text-start">
            {t("page.accounts.account")}
          </th>
          <th scope="col" className={cn(hiddenUntil("@2xl"), "text-end")}>
            <span className="hidden @2xl:inline">
              {t("page.budget.budget")}
            </span>
          </th>
          <th scope="col" className={cn(hiddenUntil("@2xl"), "text-end")}>
            <span className="hidden @2xl:inline">
              {t("page.budget.budgetSpending")}
            </span>
          </th>
          <th scope="col" className="pe-4 ps-2 text-start">
            {t("page.budget.budgetVariance")}
          </th>
        </tr>
      </thead>
      <tbody>
        {ready
          ? ordered.map((group) => (
              <BudgetSummaryRow
                key={budgetKey(group)}
                group={group}
                context={context}
                anchor={anchorOf(group)}
                hiddenUntil={hiddenUntil}
              />
            ))
          : // Placeholders of their own, not the rows: a row that took a
            // placeholder's place and then moved as the order settled
            // counted as the page shifting under the reader.
            groups.map((_, index) => (
              <PlaceholderRow key={index} hiddenUntil={hiddenUntil} />
            ))}
      </tbody>
      {/* Every budget is read whether or not its row is shown yet, so the
          order is known before any row appears. */}
      {groups.map((group) => (
        <BudgetStandingProbe
          key={budgetKey(group)}
          group={group}
          context={context}
          report={report}
        />
      ))}
    </table>
  );
}

function BudgetStandingProbe({
  group,
  context,
  report,
}: {
  group: BudgetGroup;
  context: SummaryContext;
  report: (key: string, standing: Standing) => void;
}) {
  const {
    loading,
    error,
    latestActual,
    comparisonBudgetValue,
    isFavorable,
    varianceStatus,
  } = useBudgetSnapshot({ group, ...context });
  const distance =
    latestActual !== null &&
    comparisonBudgetValue !== null &&
    isPositiveDecimalNumber(comparisonBudgetValue)
      ? Math.abs(Number(latestActual) / Number(comparisonBudgetValue) - 1)
      : -1;
  const rank = error || varianceStatus === "progress" ? 2 : isFavorable ? 1 : 0;
  const settled = !loading;
  const key = budgetKey(group);
  useEffect(() => {
    if (settled) report(key, { rank, distance });
  }, [settled, rank, distance, key, report]);
  return null;
}

function PlaceholderRow({ hiddenUntil }: { hiddenUntil: HiddenUntil }) {
  return (
    <tr className="border-b last:border-b-0" aria-hidden="true">
      <td className="py-2 ps-4 pe-2 align-top">
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <div className="flex h-4 items-center">
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
        <div className="flex h-6 items-center @2xl:hidden">
          <Skeleton className="h-3 w-24 max-w-full" />
        </div>
      </td>
      <td className={cn(hiddenUntil("@2xl"), "py-2 align-top")} />
      <td className={cn(hiddenUntil("@2xl"), "py-2 align-top")} />
      <td className="py-2 pe-4 ps-2 align-top">
        <div className="flex h-6 items-center">
          <Skeleton className="h-4 w-24" />
        </div>
      </td>
    </tr>
  );
}

function BudgetSummaryRow({
  group,
  context,
  anchor,
  hiddenUntil,
}: {
  group: BudgetGroup;
  context: SummaryContext;
  anchor: string;
  hiddenUntil: HiddenUntil;
}) {
  const { t, i18n } = useTranslations();
  const {
    headlineStart,
    latestActual,
    comparisonBudgetValue,
    variance,
    varianceStatus,
    isFavorable,
    progressPercent,
    showAmount,
    showNumber,
  } = useBudgetSnapshot({ group, ...context });

  const cadences: Record<string, string> = {
    [BudgetInterval.Daily]: t("page.budget.budgetIntervalDaily"),
    [BudgetInterval.Weekly]: t("page.budget.budgetIntervalWeekly"),
    [BudgetInterval.Monthly]: t("page.budget.budgetIntervalMonthly"),
    [BudgetInterval.Quarterly]: t("page.budget.budgetIntervalQuarterly"),
    [BudgetInterval.Yearly]: t("page.budget.budgetIntervalYearly"),
  };
  const cadence = cadences[group.interval.toUpperCase()] ?? group.interval;
  const period =
    headlineStart === null
      ? null
      : budgetPeriodName(
          headlineStart,
          group.interval,
          i18n.language,
          (quarter, year) =>
            t("page.budget.budgetQuarterName", { quarter, year }),
          (day) => t("page.budget.budgetWeekOf", { date: day }),
        );

  const cut = group.account.lastIndexOf(":");
  const path = cut > 0 ? group.account.slice(0, cut) : "";
  const leaf = group.account.slice(cut + 1);

  const goToCard = (event: MouseEvent<HTMLAnchorElement>) => {
    const card = document.getElementById(anchor);
    if (!card) return;
    event.preventDefault();
    const smooth = !window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches;
    card.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "start",
    });
    card.focus({ preventScroll: true });
  };

  const actual = latestActual;
  const off = actual === null ? null : variance;
  const target =
    comparisonBudgetValue === null ? "—" : showAmount(comparisonBudgetValue);

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30">
      <td className="py-2 ps-4 pe-2 align-top">
        {/* Wide, the account is one line as on every ledger page. Narrow,
            the last segment leads — the part that tells two rows apart —
            and its path goes on the line under it. */}
        <a
          href={`#${anchor}`}
          onClick={goToCard}
          title={group.account}
          className="flex h-6 w-fit max-w-full min-w-0 items-center rounded-sm underline decoration-muted-foreground/40 underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <AccountName
            account={group.account}
            className="hidden text-sm leading-6 @2xl:block"
          />
          <span className="truncate text-base leading-6 font-medium @2xl:hidden">
            <span className="sr-only">{group.account}</span>
            <span aria-hidden="true">{leaf}</span>
          </span>
        </a>
        {/* Narrow, the path has a line of its own, wrapped rather than cut:
            a phone has no hover to read a cut path back. */}
        {path && (
          <span
            aria-hidden="true"
            className="block text-xs leading-4 break-all text-muted-foreground @2xl:hidden"
          >
            {path}
          </span>
        )}
        <span className="block min-h-4 text-xs leading-4 text-muted-foreground">
          {cadence}
          {period && ` · ${period}`}
        </span>
        {/* Narrow, the actual and its target share a line under the name:
            the row's figure, at reading size; the target names the
            currency for both. */}
        <span className="mt-0.5 block text-base text-muted-foreground tabular-nums @2xl:hidden">
          {actual !== null && (
            <>
              <span className="font-medium text-foreground">
                {showNumber(actual)}
              </span>{" "}
              {/* "of 9,500.00 USD" stays together: a line that must break
                  breaks before it, never inside it. */}
              {t("page.budget.budgetOfTarget", { target }).replace(
                / /g,
                "\u00a0",
              )}
            </>
          )}
        </span>
      </td>
      <td
        className={cn(
          hiddenUntil("@2xl"),
          "py-2 text-end align-top leading-6 tabular-nums",
        )}
      >
        <span className="hidden @2xl:inline">{target}</span>
      </td>
      <td
        className={cn(
          hiddenUntil("@2xl"),
          "py-2 text-end align-top leading-6 tabular-nums",
        )}
      >
        <span className="hidden font-medium @2xl:inline">
          {actual === null ? "—" : showAmount(actual)}
        </span>
      </td>
      <td className="py-2 pe-4 ps-2 align-top">
        {off !== null ? (
          <>
            {/* One shape in every row: the words, the amount, the bar. */}
            <div className="flex flex-col items-start gap-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  varianceTone(varianceStatus, isFavorable),
                )}
              >
                {varianceStatus === "above" &&
                  t("page.budget.budgetOverBudget")}
                {varianceStatus === "below" &&
                  t("page.budget.budgetUnderBudget")}
                {varianceStatus === "on" && t("page.budget.budgetOnBudget")}
                {varianceStatus === "progress" &&
                  t("page.budget.budgetInProgress")}
              </Badge>
              <span
                className={cn(
                  "text-xs tabular-nums @lg:text-sm",
                  varianceStatus !== "on" &&
                    varianceStatus !== "progress" &&
                    (isFavorable
                      ? "text-emerald-800 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-400"),
                )}
              >
                {isPositiveDecimalNumber(off) ? "+" : ""}
                {showAmount(off)}
              </span>
            </div>
            <BudgetTargetBar
              percent={progressPercent}
              status={varianceStatus}
              favorable={isFavorable}
              className="mt-1.5"
            />
          </>
        ) : (
          <span className="flex h-6 items-center text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
