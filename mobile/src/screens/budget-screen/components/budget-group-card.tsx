import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ColorTheme } from "@/types/theme-props";
import {
  durations,
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  formatMoneyWithCurrency,
  formatSignedMoneyWithCurrency,
} from "@/common/number-utils";
import { AmountText, DashboardCard } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import {
  BudgetBarChartD3,
  LEGEND_HEIGHT,
} from "@/common/d3/budget-bar-chart-d3";
import { getCurrencySymbol } from "@/common/currency-util";
import { useBudgetActuals } from "@/screens/budget-screen/hooks/use-budget-actuals";
import {
  budgetDirection,
  type BudgetGroup,
} from "@/screens/budget-screen/selectors/budget-selectors";
import {
  selectBudgetCardStats,
  selectPointFavorability,
} from "@/screens/budget-screen/selectors/select-budget-card-stats";
import {
  intervalLabelKey,
  periodAxisLabel,
  STATUS_LABEL_KEYS,
} from "@/screens/budget-screen/selectors/budget-labels";
import { BudgetHistoryRows } from "@/screens/budget-screen/components/budget-history-rows";
import { BudgetMeter } from "@/screens/budget-screen/components/budget-meter";

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
    account: {
      flex: 1,
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    updateButton: {
      marginLeft: space.sm,
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
      marginRight: space.xs,
      marginTop: space.xxs,
    },
    badgeText: {
      fontSize: fontSizes.xs,
      color: theme.black80,
    },
    statusBadge: {
      borderRadius: 6,
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      marginRight: space.xs,
      marginTop: space.xxs,
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
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
}: BudgetGroupCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  const direction = budgetDirection(group.value);
  const { currency } = group;

  const { series, loading, error } = useBudgetActuals({
    ledgerId,
    group,
    currency,
    time,
    direction,
  });

  const stats = selectBudgetCardStats(group, series);
  const favorables = selectPointFavorability(series, direction);

  const formatAmount = (value: number) =>
    formatMoneyWithCurrency(value, currency);

  const statusColor = stats.favorable ? theme.success : theme.error;

  return (
    // `bleed`: every section below applies its own gutter so the chart and the
    // history rows can run edge to edge.
    <DashboardCard bleed>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.account} numberOfLines={1} ellipsizeMode="middle">
            {group.account}
          </Text>
          {onUpdate && (
            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => onUpdate(group)}
              accessibilityRole="button"
              accessibilityLabel={t("budgetUpdate")}
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
          {stats.status !== null && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: theme.black20, borderColor: statusColor },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
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
            {formatAmount(stats.budget)}
          </AmountText>
        </View>
        {stats.actual !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("budgetActual")}</Text>
            <AmountText style={styles.statValue}>
              {formatAmount(stats.actual)}
            </AmountText>
          </View>
        )}
        {stats.variance !== null && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>{t("budgetVariance")}</Text>
            <AmountText style={[styles.statValue, { color: statusColor }]}>
              {formatSignedMoneyWithCurrency(stats.variance, currency, true)}
            </AmountText>
          </View>
        )}
      </View>

      {stats.progressPercent !== null && (
        <View style={styles.progressWrap}>
          <BudgetMeter
            percent={stats.progressPercent}
            favorable={stats.favorable}
          />
        </View>
      )}

      <View style={styles.chartWrap}>
        {loading && series.length === 0 ? (
          <LoadingTile height={CHART_HEIGHT + LEGEND_HEIGHT} />
        ) : error ? (
          <Text style={styles.errorText}>{t("budgetLoadFailed")}</Text>
        ) : (
          <Animated.View entering={FadeIn.duration(durations.base)}>
            <BudgetBarChartD3
              labels={series.map((point) =>
                periodAxisLabel(point.date, group.interval, t),
              )}
              actuals={series.map((point) => point.actual)}
              budgets={series.map((point) => point.budget)}
              favorables={favorables}
              currencySymbol={getCurrencySymbol(currency)}
              height={CHART_HEIGHT}
            />
          </Animated.View>
        )}
      </View>

      <BudgetHistoryRows group={group} ledgerId={ledgerId} />
    </DashboardCard>
  );
}
