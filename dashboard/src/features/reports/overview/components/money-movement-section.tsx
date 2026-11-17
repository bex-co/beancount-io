import { useMemo, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useLedgerNavigateToAccount } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { toLedgerFilterSearchParam } from "@/common/lib/ledger-search-params";
import type {
  IntervalDataSeries,
  MovementSnapshot,
} from "../lib/overview-utils";
import {
  formatPeriodMonth,
  getComparableAmount,
  getMovementSnapshot,
  isPeriodIncomplete,
  periodPage,
} from "../lib/overview-utils";
import { AccountName } from "./account-name";
import { FormattedAmounts } from "./formatted-amounts";
import { ShareMeter } from "./share-meter";
import { IncomeExpensesChart } from "./income-expenses-chart";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { useUrlView } from "@/common/hooks/use-url-view";
import { DEFAULT_MONEY_MOVEMENT_VIEW, MONEY_MOVEMENT_VIEWS } from "../search";

/**
 * The month's total in its main unit. Any other unit (vacation hours, a
 * retirement account's own unit) is not a second total and is noted at the
 * foot of the card instead.
 */
function LeadAmounts({ amounts }: { amounts: MovementSnapshot["total"] }) {
  const [lead] = amounts;
  return (
    <p className="mt-2">
      <FormattedAmounts
        amounts={lead ? [lead] : []}
        className="text-3xl font-semibold tracking-tight"
      />
    </p>
  );
}

/**
 * The month against the months before it, in the month's main unit: the
 * average, and how far above or below it the month landed. A month the data
 * has not finished gets no verdict; half a month below average says nothing.
 */
function AverageComparison({
  snapshot,
  previousCount,
  complete,
}: {
  snapshot: MovementSnapshot;
  previousCount: number;
  complete: boolean;
}) {
  const { t, i18n } = useTranslations();
  const total = snapshot.total[0];
  const average = total
    ? snapshot.average.find((amount) => amount.currency === total.currency)
    : undefined;
  if (!total || !average || previousCount === 0) {
    return <p className="mt-2 h-5" aria-hidden="true" />;
  }
  const baseline = Math.abs(average.value);
  const ratio = baseline > 0 ? (total.value - average.value) / baseline : 0;
  // A whole percent or more is a difference worth naming.
  const verdict = complete && Math.round(Math.abs(ratio) * 100) >= 1;
  const percent = new Intl.NumberFormat(i18n.language, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Math.abs(ratio));
  return (
    <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground">
      <span>{t("page.overview.monthsAverage", { count: previousCount })}</span>
      <FormattedAmounts amounts={[average]} className="text-foreground" />
      {verdict && (
        // The verdict as its own quiet tag, apart from the figure it is
        // measured against.
        <span className="ml-1 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium text-foreground">
          {ratio > 0
            ? t("page.overview.aboveAverage", { percent })
            : t("page.overview.belowAverage", { percent })}
        </span>
      )}
    </p>
  );
}

function MovementCard({
  kind,
  snapshot,
  previousCount,
  complete,
  ledgerOwner,
  ledgerName,
  timeFilter,
  primaryCurrency,
}: {
  kind: "in" | "out";
  snapshot: MovementSnapshot;
  /** How many months precede this one in the average (up to three). */
  previousCount: number;
  /** The data covers the whole month. */
  complete: boolean;
  ledgerOwner: string;
  ledgerName: string;
  timeFilter: string;
  primaryCurrency: string;
}) {
  const { t } = useTranslations();
  const navigateToAccount = useLedgerNavigateToAccount();
  const isIncome = kind === "in";
  const topLabel = isIncome
    ? t("page.overview.topSources")
    : t("page.overview.topSpending");
  // The month's total in the comparable unit, which each row's share is of.
  const comparable = getComparableAmount(snapshot.total, primaryCurrency);
  const monthTotal = Math.abs(comparable?.value ?? 0);
  // The largest rows in the total's own unit: a 401k contribution counted in
  // its plan's unit is not ranked among dollars. A month with no such unit
  // lists what it has.
  const inUnit = snapshot.categories.filter((category) =>
    category.amounts.some((amount) => amount.currency === comparable?.currency),
  );
  const topCategories = (
    inUnit.length > 0 ? inUnit : snapshot.categories
  ).slice(0, 3);
  const otherUnits = snapshot.total.slice(1);

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      {/* The footer sits at the card's foot, so the pair's footers line up
          when one card lists fewer rows. */}
      <CardContent className="flex flex-1 flex-col px-0">
        <div className="px-5 pt-5 pb-5">
          {/* The swatch is the chart's own color for this side: money in
              wears --chart-2 there, spending --chart-5. */}
          <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span
              aria-hidden="true"
              className={`size-2.5 rounded-[3px] ${isIncome ? "bg-chart-2" : "bg-chart-5"}`}
            />
            {isIncome
              ? t("page.overview.moneyIn")
              : t("page.overview.moneyOut")}
          </h3>
          <LeadAmounts amounts={snapshot.total} />
          <AverageComparison
            snapshot={snapshot}
            previousCount={previousCount}
            complete={complete}
          />
        </div>

        <div className="border-t px-5 pt-4 pb-1 text-xs font-medium text-muted-foreground">
          {topLabel}
        </div>
        <div className="divide-y">
          {topCategories.length === 0 ? (
            <div className="px-5 py-7 text-center text-sm text-muted-foreground">
              {t("page.overview.noMovement")}
            </div>
          ) : (
            topCategories.map((category) => {
              const share =
                monthTotal > 0
                  ? Math.min(category.sortValue / monthTotal, 1)
                  : 0;
              return (
                <button
                  type="button"
                  key={category.account}
                  // The whole name, where a narrow row cuts it short.
                  title={category.account}
                  className="flex w-full cursor-pointer items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]"
                  onClick={() =>
                    navigateToAccount(category.account, { time: timeFilter })
                  }
                >
                  {/* As in Accounts: Expenses:Taxes:…:Federal says what
                      Federal is, on the amount's own line. */}
                  <AccountName account={category.account} className="flex-1" />
                  {/* The amount over its share of the month, as in the
                      Accounts card: the rows read as a breakdown. */}
                  <span className="shrink-0 text-right">
                    <FormattedAmounts
                      amounts={category.amounts}
                      className="block text-sm"
                    />
                    {/* Only a row in the total's unit has a share of it:
                        vacation hours are no part of a dollar total. */}
                    {monthTotal > 0 &&
                      category.amounts.some(
                        (amount) => amount.currency === comparable?.currency,
                      ) && (
                        <ShareMeter
                          share={share}
                          className="mt-1 flex"
                          fillClassName={isIncome ? "bg-chart-2" : "bg-chart-5"}
                        />
                      )}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t py-2 pr-3 pl-5">
          {/* Units the total cannot include, said once and quietly. */}
          <span className="min-w-0 text-xs text-muted-foreground">
            {otherUnits.length > 0 && (
              <>
                {"+ "}
                <FormattedAmounts
                  amounts={otherUnits}
                  className="inline-flex flex-wrap gap-x-2"
                />
              </>
            )}
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/income-statement"
              params={{ ledgerOwner, ledgerName }}
              search={(prev) => ({
                ...prev,
                time: toLedgerFilterSearchParam(timeFilter),
              })}
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
  dates,
  selectedDate,
  onSelectDate,
  timeFilter,
  dataThrough,
  flow,
  history = true,
}: {
  /**
   * Offer Income vs Expenses beside the flow. Off where the page already
   * draws each month's income and spending in its own chart.
   */
  history?: boolean;
  income: IntervalDataSeries;
  expenses: IntervalDataSeries;
  primaryCurrency: string;
  ledgerOwner: string;
  ledgerName: string;
  /** Every month the flows cover, oldest first. */
  dates: string[];
  /** The month the page shows; the page header steps it. */
  selectedDate: string;
  onSelectDate: (date: string) => void;
  /** That month as a time filter, for drill-downs. */
  timeFilter: string;
  /** The ledger's last day with data; a month past it is incomplete. */
  dataThrough: string;
  /** Where that month's money went, beside its history. */
  flow?: ReactNode;
}) {
  const { t, i18n } = useTranslations();
  // Which history shows under the cards. In `?movement=`, because a shared
  // scope edit swaps the page for a spinner and would reset a state value.
  const [chartView, setChartView] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/",
    MONEY_MOVEMENT_VIEWS,
    DEFAULT_MONEY_MOVEMENT_VIEW,
    "movement",
  );
  // The history shows a year at a time: the page of twelve months holding
  // the selected one, so a click inside it never moves the bars.
  const page = useMemo(
    () => new Set(periodPage(dates, selectedDate)),
    [dates, selectedDate],
  );
  const pageIncome = useMemo(
    () => income.filter((point) => page.has(point.date)),
    [income, page],
  );
  const pageExpenses = useMemo(
    () => expenses.filter((point) => page.has(point.date)),
    [expenses, page],
  );

  if (!selectedDate) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
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

  // The months each average is over: up to three before this one.
  const previousCount = (series: IntervalDataSeries) =>
    Math.min(series.filter((point) => point.date < selectedDate).length, 3);
  const complete = !isPeriodIncomplete(selectedDate, dataThrough);
  // Both read positive: income is recorded negative, spending positive.
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
    inverted: false,
  });

  return (
    <section
      aria-labelledby="overview-money-movement-heading"
      className="space-y-3"
    >
      <h2
        id="overview-money-movement-heading"
        className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tracking-tight"
      >
        {t("page.overview.moneyMovement")}
        <span className="text-base font-normal tracking-normal text-muted-foreground">
          {formatPeriodMonth(selectedDate, i18n.language)}
        </span>
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MovementCard
          kind="in"
          snapshot={incomeSnapshot}
          previousCount={previousCount(income)}
          complete={complete}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          timeFilter={timeFilter}
          primaryCurrency={primaryCurrency}
        />
        <MovementCard
          kind="out"
          snapshot={expensesSnapshot}
          previousCount={previousCount(expenses)}
          complete={complete}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          timeFilter={timeFilter}
          primaryCurrency={primaryCurrency}
        />
      </div>

      {flow !== undefined && !history && (
        // Where the month's money went, drawn on the page itself like the
        // hero chart: an open diagram between the panels of detail.
        <Card
          data-plain=""
          className="min-w-0 gap-0 overflow-hidden rounded-none border-0 bg-transparent py-0 shadow-none"
        >
          <h3 className="pt-6 text-base font-semibold tracking-tight">
            {t("page.overview.cashFlow")}
          </h3>
          <div className="py-4">{flow}</div>
        </Card>
      )}
      {flow !== undefined && history && (
        // The history behind the month, or where its money went. One module,
        // so the page tells the money story once; a click on a period's
        // column selects it for the whole page.
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <Tabs
            value={chartView}
            onValueChange={setChartView}
            className="gap-0"
          >
            <div className="px-4 pt-4 sm:px-6 sm:pt-5">
              <TabsList>
                <TabsTrigger value="flow">
                  {t("page.overview.cashFlow")}
                </TabsTrigger>
                <TabsTrigger value="trend">
                  {t("page.reports.incomeVsExpenses")}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="flow" className="px-3 py-4 sm:px-6 sm:py-5">
              {flow}
            </TabsContent>
            <TabsContent value="trend" className="px-3 py-4 sm:px-6 sm:py-5">
              <IncomeExpensesChart
                income={pageIncome}
                expenses={pageExpenses}
                primaryCurrency={primaryCurrency}
                dataThrough={dataThrough}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
              />
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </section>
  );
}
