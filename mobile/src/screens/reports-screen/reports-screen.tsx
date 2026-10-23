import { useApolloClient } from "@apollo/client";
import {
  LEDGER_ERROR_QUERIES,
  refetchNamedQueries,
} from "@/common/apollo/refresh-named-queries";
import {
  selectCardLoadState,
  selectReadContextState,
} from "@/common/apollo/card-load-state";
import { CardLoadFailure } from "@/components/card-load-failure";
import { useReactiveVar } from "@apollo/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToday } from "@/common/hooks/use-today";
import { formatLedgerMonth } from "@/common/date-format";
import { fontSizes } from "@/common/theme";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { useGuest } from "@/common/guest/guest-context";
import { gutter } from "@/common/theme";
import { LedgerDrawerHeader } from "@/components/ledger-drawer/ledger-drawer-header";
import { StaleDataBanner } from "@/components/stale-data-banner";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { DashboardCard } from "@/components/dashboard-card";
import { DashboardScrollView } from "@/components/dashboard-scroll-view";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import {
  DEFAULT_CHART_HEIGHT,
  IncomeExpenseBarChartD3,
  LEGEND_HEIGHT,
} from "@/common/d3/income-expense-bar-chart";
import { TimeRangePills } from "@/components/time-range-pills";
import {
  RANGE_LABEL_KEYS,
  TIME_RANGES,
  TimeRange,
  rangePillText,
} from "@/common/series-util";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";
import { useIncomeStatement } from "./hooks/use-income-statement";
import { useScheduledThisMonth } from "@/screens/home-screen/hooks/use-scheduled-this-month";
import { monthToDateWindow } from "@/screens/home-screen/selectors/scheduled-this-month";
import {
  readsMonthToDate,
  withMonthToDateStatement,
} from "./selectors/month-to-date-statement";
import {
  emptyFlowLabel,
  notInTotalNote,
  selectRangedAccountTree,
} from "./selectors/select-ranged-account-tree";
import {
  selectIncomeExpenseChartSeries,
  selectStatementAnchorMonth,
  staleAnchorMonth,
} from "./selectors/select-income-expense-chart";
import { topNWithOther } from "./selectors/select-breakdown-rows";
import {
  CategoryBreakdown,
  CategoryBreakdownSkeleton,
} from "./components/category-breakdown";
import {
  CashFlowSankey,
  CashFlowSankeySkeleton,
} from "./components/cash-flow-sankey";
import { AccountTransactionsCard } from "./components/account-transactions-card";
import { reportScrollStyles } from "./components/report-scroll-style";
import { requestedReportsRange } from "./reports-range-request";

/** How many top categories to show before folding the tail into "Other". */
const BREAKDOWN_TOP_N = 7;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    anchorNote: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      fontSize: fontSizes.sm,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
  });

const ReportsScreenImpl = (): JSX.Element => {
  const ledgerId = useLedgerGuard();
  const { t, locale } = useTranslations();
  const styles = useThemeStyle(getStyles);

  const [timeRange, setTimeRange] = useState<TimeRange>("6M");
  const requestedRange = useReactiveVar(requestedReportsRange);
  useEffect(() => {
    if (requestedRange === null) return;
    setTimeRange(requestedRange);
    requestedReportsRange(null);
  }, [requestedRange]);
  const [refreshing, setRefreshing] = useState(false);

  const {
    primaryCurrency: currency,
    data: ledgerMeta,
    error: ledgerMetaError,
    refetch: ledgerMetaRefetch,
  } = useLedgerReadContext(ledgerId);
  // The ledger may rename its roots (`option "name_expenses" "Gastos"`), and
  // Recent transactions found nothing under the English names (w21/073).
  const incomeRoot = ledgerMeta?.getLedger.options.nameIncome || "Income";
  const expensesRoot = ledgerMeta?.getLedger.options.nameExpenses || "Expenses";
  const moneyRoots = useMemo(
    () => [incomeRoot, expensesRoot],
    [incomeRoot, expensesRoot],
  );

  const {
    data: incomeData,
    loading: incomeLoading,
    refetch: incomeRefetch,
    error: incomeError,
  } = useIncomeStatement(ledgerId);
  // Entries pre-entered for later this month are not part of the month yet:
  // when there are any, this month is read to today, as Home's Spending does
  // (w21/523).
  const today = useToday();
  const guest = useGuest();
  const { scheduled, refetch: scheduledRefetch } = useScheduledThisMonth(
    ledgerId,
    today,
    Boolean(guest),
  );
  const {
    data: toTodayData,
    error: toTodayError,
    refetch: toTodayRefetch,
  } = useIncomeStatement(scheduled ? ledgerId : "", monthToDateWindow(today));
  const toToday = readsMonthToDate(scheduled, timeRange);
  const toTodayPending = toToday && toTodayData === undefined && !toTodayError;
  const stmt = withMonthToDateStatement(
    incomeData?.getLedgerIncomeStatement,
    toToday ? toTodayData?.getLedgerIncomeStatement : undefined,
    today,
  );

  const client = useApolloClient();
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // The scheduled-entry check is cached too: an entry pre-entered
      // elsewhere is not in it (w21/470).
      // The read context too: the failure state and the stale banner depend on
      // it, and a pull that left it alone kept both after the network returned
      // (w21/574).
      await Promise.all([
        incomeRefetch(),
        ledgerMetaRefetch(),
        scheduledRefetch(),
        scheduled ? toTodayRefetch() : undefined,
        refetchNamedQueries(client, LEDGER_ERROR_QUERIES),
      ]);
    } catch {
      // Query errors render in the screen or the guest access boundary.
    } finally {
      setRefreshing(false);
    }
  }, [
    incomeRefetch,
    ledgerMetaRefetch,
    scheduledRefetch,
    scheduled,
    toTodayRefetch,
    client,
  ]);

  const rangeOptions = TIME_RANGES.map((key) => ({
    key,
    ...rangePillText(t, RANGE_LABEL_KEYS[key]),
  }));

  // The current month caps every flow range (w21/166); `useToday` rolls it
  // over at midnight.
  const currentMonth = today.slice(0, 7);

  // Combined chart: income and net profit are credit-normal in the API, so
  // negate both at the presentation boundary; expenses stay as debits.
  const chart = useMemo(
    () =>
      selectIncomeExpenseChartSeries(
        currency,
        stmt?.incomeData,
        stmt?.expensesData,
        stmt?.netProfitData,
        timeRange,
        currentMonth,
      ),
    [currency, stmt, timeRange, currentMonth],
  );

  // One anchor month for the whole report, derived from the same statement the
  // chart is built from — so the recent-transactions list below cannot window on
  // a different month than the chart above.
  const anchorMonth = useMemo(
    () =>
      selectStatementAnchorMonth(
        currentMonth,
        stmt?.incomeData,
        stmt?.expensesData,
        stmt?.netProfitData,
      ),
    [stmt, currentMonth],
  );

  // Said when the ranges end on an earlier month than this one (w21/727).
  const staleAnchor = staleAnchorMonth(anchorMonth, currentMonth, timeRange);

  const expense = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        stmt?.expensesData ?? [],
        timeRange,
        "expenses",
        currentMonth,
      ),
    [currency, stmt, timeRange, currentMonth],
  );
  const income = useMemo(
    () =>
      selectRangedAccountTree(
        currency,
        stmt?.incomeData ?? [],
        timeRange,
        "income",
        currentMonth,
      ),
    [currency, stmt, timeRange, currentMonth],
  );

  const emptyLabel = emptyFlowLabel(
    t("cashFlowEmpty"),
    [...expense.notInTotal, ...income.notInTotal],
    t,
  );

  // A failed first load has nothing to show; the cards would read an empty
  // statement as $0.00 and "no activity" (w21/080).
  const statementState = selectCardLoadState({
    loading: incomeLoading,
    hasData: incomeData !== undefined,
    error: incomeError,
  });
  // Until the read context lands, the currency is a blind "USD" and the roots
  // the English names: a EUR ledger drew USD charts of 0, and a renamed-root
  // ledger read "No transactions yet". Held like the statement, and a failed
  // context is a failure, not a quiet fallback (w21/406).
  const contextState = selectReadContextState(ledgerMeta, ledgerMetaError);
  const isLoading =
    statementState === "loading" ||
    contextState === "loading" ||
    toTodayPending;
  const failed = statementState === "failed" || contextState === "failed";
  const showStale = isShowingStaleDataFromQueries([
    { data: incomeData, error: incomeError },
    { data: ledgerMeta, error: ledgerMetaError },
  ]);

  return (
    <View style={styles.container}>
      <LedgerDrawerHeader title={t("reports")} />
      {showStale ? <StaleDataBanner /> : null}
      <TimeRangePills
        value={timeRange}
        options={rangeOptions}
        onChange={setTimeRange}
      />
      {staleAnchor !== null ? (
        <Text style={styles.anchorNote}>
          {t("reportsThroughLatestMonth", {
            month: formatLedgerMonth(staleAnchor, locale),
          })}
        </Text>
      ) : null}
      <DashboardScrollView
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={reportScrollStyles.content}
      >
        {failed ? (
          <DashboardCard>
            <CardLoadFailure
              onRetry={() =>
                void Promise.all([incomeRefetch(), ledgerMetaRefetch()]).catch(
                  () => undefined,
                )
              }
            />
          </DashboardCard>
        ) : (
          <>
            <DashboardCard bleed>
              {isLoading ? (
                <LoadingTile
                  height={DEFAULT_CHART_HEIGHT + LEGEND_HEIGHT}
                  mx={gutter}
                />
              ) : (
                <FadeInView>
                  <IncomeExpenseBarChartD3
                    emptyLabel={emptyLabel}
                    currency={currency}
                    months={chart.months}
                    income={chart.income}
                    expense={chart.expense}
                    net={chart.net}
                  />
                </FadeInView>
              )}
            </DashboardCard>

            <DashboardCard bleed title={t("cashFlow")}>
              {isLoading ? (
                <CashFlowSankeySkeleton />
              ) : (
                <FadeInView>
                  <CashFlowSankey
                    emptyLabel={emptyLabel}
                    income={income.tree}
                    expenses={expense.tree}
                    currency={currency}
                  />
                </FadeInView>
              )}
            </DashboardCard>

            {isLoading ? (
              <CategoryBreakdownSkeleton />
            ) : (
              <FadeInView>
                <DashboardCard bleed>
                  <CategoryBreakdown
                    // Expand and collapse choices belong to one ledger (w21/384).
                    key={ledgerId}
                    label={t("expenses")}
                    total={expense.total}
                    items={topNWithOther(
                      expense.tree,
                      BREAKDOWN_TOP_N,
                      t("other"),
                    )}
                    currency={currency}
                    tone={(theme) => theme.error}
                    note={notInTotalNote(expense.notInTotal, t)}
                    emptyMessage={t("reportsNoExpenses")}
                    shareOf="spending"
                  />
                </DashboardCard>
              </FadeInView>
            )}

            {isLoading ? (
              <CategoryBreakdownSkeleton />
            ) : (
              <FadeInView>
                <DashboardCard bleed>
                  <CategoryBreakdown
                    // Expand and collapse choices belong to one ledger (w21/384).
                    key={ledgerId}
                    label={t("income")}
                    total={income.total}
                    items={topNWithOther(
                      income.tree,
                      BREAKDOWN_TOP_N,
                      t("other"),
                    )}
                    currency={currency}
                    tone={(theme) => theme.success}
                    note={notInTotalNote(income.notInTotal, t)}
                    emptyMessage={t("reportsNoIncome")}
                    shareOf="earnings"
                  />
                </DashboardCard>
              </FadeInView>
            )}
          </>
        )}

        {failed ? null : (
          <AccountTransactionsCard
            ledgerId={ledgerId}
            accountPrefix={moneyRoots}
            titleKey="recentTransactions"
            emptyKey="recentTransactionsEmpty"
            timeRange={timeRange}
            anchorMonth={anchorMonth}
            statementLoading={isLoading}
            refreshing={refreshing}
          />
        )}
      </DashboardScrollView>
    </View>
  );
};

export const ReportsScreen = (): JSX.Element => {
  return (
    <LedgerGuard>
      <ReportsScreenImpl />
    </LedgerGuard>
  );
};
