import { isolateAccountPath } from "@/common/bidi";
import { formatLedgerDate } from "@/common/date-format";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { FadeInView } from "@/components/crossfade";
import { ColorTheme } from "@/types/theme-props";
import {
  fontSizes,
  fontWeights,
  gutter,
  prefersStackedLayout,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "@/common/number-utils";
import { AmountText, DashboardCard, StaleDataBanner } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import {
  BudgetBarChartD3,
  LEGEND_HEIGHT,
} from "@/common/d3/budget-bar-chart-d3";
import { useToday } from "@/common/hooks/use-today";
import { useAccountCloseDates } from "@/common/hooks/use-account-close-dates";
import { budgetEndsOn, budgetHasEnded } from "@/common/account-close-dates";
import { useBudgetActuals } from "@/screens/budget-screen/hooks/use-budget-actuals";
import {
  groupDirection,
  budgetDisplayScale,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import {
  selectBudgetCardStats,
  selectBudgetedPeriods,
  selectPointFavorability,
} from "@/screens/budget-screen/selectors/select-budget-card-stats";
import {
  budgetChartSummary,
  intervalLabelKey,
  periodAxisLabel,
  timeWindowEnd,
  STATUS_LABEL_KEYS,
} from "@/screens/budget-screen/selectors/budget-labels";
import { withYearMarks } from "@/common/d3/axis-year-marks";
import { BudgetHistoryRows } from "@/screens/budget-screen/components/budget-history-rows";
import { BudgetMeter } from "@/screens/budget-screen/components/budget-meter";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { notInTotalNotes } from "@/common/balance-display";

const CHART_HEIGHT = 190;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: gutter,
      marginBottom: space.md,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    // Accessibility text sizes: the account gets the full width and Update
    // Budget moves under it, as DashboardCard stacks its title and action.
    titleStacked: {
      flexDirection: "column",
      alignItems: "flex-start",
    },
    // `flex: 1` sizes the row's title; in a column it would collapse it.
    accountStacked: {
      flex: 0,
      alignSelf: "stretch",
    },
    updateButtonStacked: {
      marginStart: 0,
      marginTop: space.xxs,
    },
    account: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    updateButton: {
      marginStart: space.sm,
      paddingVertical: space.xxs,
    },
    // Matches DashboardCard's "see all" action, the card-level affordance this
    // sits in place of.
    updateText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.primary,
    },
    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: space.xs,
    },
    badge: {
      borderRadius: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black40,
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      marginEnd: space.xs,
      marginTop: space.xxs,
    },
    badgeText: {
      fontSize: fontSizes.xs,
      color: theme.black80,
    },
    // The fill is the page's quiet grey and the text is the primary text colour,
    // both 4.5:1 or better in both themes; the status shows in the border, not
    // in text that failed contrast ("Above target" was 2.22:1 in dark)
    // (w21/482).
    statusBadge: {
      backgroundColor: theme.black20,
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      marginEnd: space.xs,
      marginTop: space.xxs,
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    stats: {
      flexDirection: "row",
      paddingHorizontal: gutter,
      marginBottom: space.md,
    },
    stat: {
      flex: 1,
    },
    statLabel: {
      fontSize: fontSizes.xs,
      color: theme.black80,
      marginBottom: space.xxs,
      textAlign: LEADING_TEXT_ALIGN,
    },
    statValue: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    progressWrap: {
      paddingHorizontal: gutter,
      marginBottom: space.md,
    },
    notInTotal: {
      fontSize: fontSizes.xs,
      color: theme.black80,
      paddingHorizontal: gutter,
      marginBottom: space.md,
      textAlign: LEADING_TEXT_ALIGN,
    },
    chartWrap: {
      paddingHorizontal: gutter,
    },
    errorText: {
      paddingHorizontal: gutter,
      fontSize: fontSizes.md,
      color: theme.error,
    },
  });

type BudgetGroupCardProps = {
  group: BudgetGroup;
  ledgerId: string;
  /** Fava time filter for the actuals query; undefined means all time. */
  time?: string;
  /** Opens the form pre-filled to add a newer-dated entry for this budget. */
  onUpdate?: (group: BudgetGroup) => void;
  /** Currencies its account budgets on cards of their own (w21/806). */
  budgetedCurrencies?: readonly string[];
};

/**
 * One card per account+currency budget: the numbers that answer "am I on
 * track?" up top, then the period-by-period chart behind them.
 */
export function BudgetGroupCard({
  group,
  ledgerId,
  time,
  onUpdate,
  budgetedCurrencies,
}: BudgetGroupCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t, locale } = useTranslations();
  // At AX2 the row left the account a few letters — "Ex…ing", "Ex…ries" —
  // so budgets could not be told apart (w21/027).
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  const direction = groupDirection(group);
  const { currency } = group;
  // The day a budget dated after it has not started on (w21/301).
  const today = useToday();

  // A budget on a closed account ends with it (w21/398).
  const closeDates = useAccountCloseDates(ledgerId);
  const endsOn = budgetEndsOn(group.account, closeDates);
  const { series, loading, error, stale, settled } = useBudgetActuals({
    ledgerId,
    group,
    currency,
    time,
    direction,
    endsOn,
    budgetedCurrencies,
  });

  // While the current period's read is pending or failed there is nothing to
  // judge: the budget alone, never a $0 actual and a green "Below target".
  const stats = selectBudgetCardStats(group, settled ? series : [], today);
  const favorables = selectPointFavorability(
    series,
    direction,
    group.budgetHistory,
    today,
    group.currency,
  );

  // One object so the chart and its spoken summary can never describe different
  // series.
  // A window that ended before today ends its last period with it (w21/764);
  // one running through today keeps the period's own end (w21/219).
  const windowEnd = timeWindowEnd(time, today);
  const periodLabels = series.map((point) =>
    periodAxisLabel(
      point.date,
      group.interval,
      t,
      locale,
      windowEnd !== undefined && windowEnd < today ? windowEnd : undefined,
    ),
  );
  const periodDates = series.map((point) => point.date);
  const chartSeries = {
    // A year where it changes, so a 12-month window's two Octobers differ
    // (w21/497); the spoken summary names its own years.
    labels: withYearMarks(periodLabels, periodDates, locale),
    actuals: series.map((point) => point.actual),
    budgets: series.map((point) => point.budget),
    favorables,
    currency,
  };

  const scale = budgetDisplayScale(group.budgetHistory);
  // The figures as the ledger's decimals, so 9007199254740993 keeps its last
  // digit (w4/1039).
  const formatAmount = (value: string) =>
    formatMoneyWithCurrency(value, currency, scale);

  // Spending in another currency could turn the status around: none is
  // given, and the variance and meter read neutral (w21/709).
  const statusColor = stats.unjudged
    ? theme.text01
    : stats.favorable
      ? theme.success
      : theme.error;
  const [notInTotalNote] = notInTotalNotes(stats.notInTotal, t);

  return (
    // `bleed`: every section below applies its own gutter so the chart and the
    // history rows can run edge to edge.
    <DashboardCard bleed>
      <View style={styles.header}>
        <View style={[styles.titleRow, stacked && styles.titleStacked]}>
          <Text
            // Remeasured on a live size change (mobile/AGENTS.md).
            key={`account-${fontScale}`}
            style={[styles.account, stacked && styles.accountStacked]}
            numberOfLines={stacked ? 2 : 1}
            // Stacked, the leaf is what tells two budgets apart.
            ellipsizeMode={stacked ? "head" : "middle"}
          >
            {isolateAccountPath(group.account)}
          </Text>
          {onUpdate && !budgetHasEnded(endsOn, today) && (
            <TouchableOpacity
              style={[
                styles.updateButton,
                stacked && styles.updateButtonStacked,
              ]}
              onPress={() => onUpdate(group)}
              accessibilityRole="button"
              // Which budget: every card's button read "Update" (w21/142).
              accessibilityLabel={t("budgetUpdateNamed", {
                account: group.account,
                currency,
              })}
            >
              <Text style={styles.updateText}>{t("budgetUpdate")}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {t(intervalLabelKey(group.interval))}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{currency}</Text>
          </View>
          {stats.startsOn !== null && (
            // Not yet in effect: neutral, never "Above target" (w21/101).
            <View style={[styles.statusBadge, { borderColor: theme.black60 }]}>
              <Text style={styles.statusText}>
                {t("budgetStartsOn", {
                  date: formatLedgerDate(stats.startsOn, locale),
                })}
              </Text>
            </View>
          )}
          {stats.status !== null && (
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={styles.statusText}>
                {t(STATUS_LABEL_KEYS[stats.status])}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t("budget")}</Text>
          <AmountText style={styles.statValue}>
            {formatAmount(stats.budgetExact)}
          </AmountText>
        </View>
        {stats.actualExact !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("budgetActual")}</Text>
            <AmountText style={styles.statValue}>
              {formatSignedMoneyWithCurrency(
                stats.actualExact,
                currency,
                false,
                scale,
              )}
            </AmountText>
          </View>
        )}
        {stats.varianceExact !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("budgetVariance")}</Text>
            <AmountText style={[styles.statValue, { color: statusColor }]}>
              {formatSignedMoneyWithCurrency(
                stats.varianceExact,
                currency,
                true,
                scale,
              )}
            </AmountText>
          </View>
        )}
      </View>

      {stats.progressPercent !== null && (
        <View style={styles.progressWrap}>
          <BudgetMeter
            percent={stats.progressPercent}
            favorable={stats.unjudged ? null : stats.favorable}
          />
        </View>
      )}
      {notInTotalNote !== undefined && (
        <Text style={styles.notInTotal}>{notInTotalNote}</Text>
      )}

      {stale ? <StaleDataBanner /> : null}
      <View style={styles.chartWrap}>
        {loading && series.length === 0 ? (
          <LoadingTile height={CHART_HEIGHT + LEGEND_HEIGHT} />
        ) : error ? (
          <Text style={styles.errorText}>{t("budgetLoadFailed")}</Text>
        ) : (
          <FadeInView>
            <BudgetBarChartD3
              {...chartSeries}
              accessibilityLabel={budgetChartSummary(
                {
                  ...chartSeries,
                  labels: periodLabels,
                  dates: periodDates,
                  direction,
                  budgeted: selectBudgetedPeriods(
                    series,
                    group.budgetHistory,
                    today,
                  ),
                },
                t,
              )}
              height={CHART_HEIGHT}
            />
          </FadeInView>
        )}
      </View>

      <BudgetHistoryRows group={group} ledgerId={ledgerId} />
    </DashboardCard>
  );
}
