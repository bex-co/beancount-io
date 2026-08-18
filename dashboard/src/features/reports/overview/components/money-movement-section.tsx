import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { useLedgerNavigateToAccount } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import type {
  IntervalDataSeries,
  MovementSnapshot,
} from "../lib/overview-utils";
import {
  getIntervalDates,
  getMovementSnapshot,
  isPartialMonthlyPeriod,
} from "../lib/overview-utils";
import { FormattedAmounts } from "./formatted-amounts";

function formatMonth(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function MovementCard({
  kind,
  snapshot,
  ledgerOwner,
  ledgerName,
}: {
  kind: "in" | "out";
  snapshot: MovementSnapshot;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t } = useTranslations();
  const navigateToAccount = useLedgerNavigateToAccount();
  const isIncome = kind === "in";
  const topLabel = isIncome
    ? t("page.overview.topSources")
    : t("page.overview.topSpending");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <div className="flex items-center gap-2">
          <span
            className={
              isIncome
                ? "flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "flex size-9 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }
          >
            {isIncome ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </span>
          <div>
            <CardTitle>
              {isIncome
                ? t("page.overview.moneyIn")
                : t("page.overview.moneyOut")}
            </CardTitle>
            <CardDescription>{formatMonth(snapshot.date)}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="px-5 py-5">
          <FormattedAmounts
            amounts={snapshot.total}
            showPositiveSign={isIncome}
            className={
              isIncome
                ? "text-2xl font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-2xl font-semibold"
            }
          />
        </div>

        <div className="border-t px-5 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {topLabel}
        </div>
        <div className="divide-y">
          {snapshot.categories.length === 0 ? (
            <div className="px-5 py-7 text-center text-sm text-muted-foreground">
              {t("page.overview.noMovement")}
            </div>
          ) : (
            snapshot.categories.slice(0, 3).map((category) => (
              <button
                type="button"
                key={category.account}
                className="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                onClick={() => navigateToAccount(category.account)}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {category.label.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {category.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {category.account}
                  </span>
                </span>
                <FormattedAmounts
                  amounts={category.amounts}
                  showPositiveSign={isIncome}
                  className="shrink-0 text-right text-sm font-medium"
                />
              </button>
            ))
          )}
        </div>

        <div className="flex items-end justify-between gap-4 border-t bg-muted/20 px-5 py-4">
          <div>
            <div className="text-xs text-muted-foreground">
              {t("page.overview.previousThreeMonthsAverage")}
            </div>
            <FormattedAmounts
              amounts={snapshot.average}
              showPositiveSign={isIncome}
              className="mt-1 text-sm font-semibold"
            />
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/income-statement"
              params={{ ledgerOwner, ledgerName }}
            >
              {t("page.overview.viewAll")}
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MoneyMovementSection({
  income,
  expenses,
  primaryCurrency,
  ledgerOwner,
  ledgerName,
}: {
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  primaryCurrency: string;
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t } = useTranslations();
  const dates = useMemo(
    () => getIntervalDates(income, expenses),
    [expenses, income],
  );
  const [requestedDate, setRequestedDate] = useState("");
  const selectedDate = dates.includes(requestedDate)
    ? requestedDate
    : (dates.at(-1) ?? "");

  if (!selectedDate) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("page.overview.moneyMovement")}
        </h2>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("page.overview.noMovement")}
          </CardContent>
        </Card>
      </section>
    );
  }

  const selectedIndex = dates.indexOf(selectedDate);
  const incomeSnapshot = getMovementSnapshot({
    series: income,
    date: selectedDate,
    preferredCurrency: primaryCurrency,
    inverted: true,
  });
  const expensesSnapshot = getMovementSnapshot({
    series: expenses,
    date: selectedDate,
    preferredCurrency: primaryCurrency,
    inverted: true,
  });

  return (
    <section
      aria-labelledby="overview-money-movement-heading"
      className="space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="overview-money-movement-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {t("page.overview.moneyMovement")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.overview.moneyMovementDescription")}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={selectedIndex <= 0}
            onClick={() => setRequestedDate(dates[selectedIndex - 1])}
            aria-label={t("common.previous")}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-36 px-2 text-center text-sm font-medium">
            {formatMonth(selectedDate)}
            {isPartialMonthlyPeriod(selectedDate) && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                · {t("page.overview.partialPeriod")}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={selectedIndex >= dates.length - 1}
            onClick={() => setRequestedDate(dates[selectedIndex + 1])}
            aria-label={t("common.next")}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MovementCard
          kind="in"
          snapshot={incomeSnapshot}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
        />
        <MovementCard
          kind="out"
          snapshot={expensesSnapshot}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
        />
      </div>
    </section>
  );
}
