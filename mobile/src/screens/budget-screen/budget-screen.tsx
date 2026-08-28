import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApolloClient } from "@apollo/client";
import { ColorTheme } from "@/types/theme-props";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { GetLedgerIntervalTotalsDocument } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { Button, DashboardCard, TimeRangePills } from "@/components";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { useBudgetGroups } from "@/screens/budget-screen/hooks/use-budget-groups";
import { BudgetGroupCard } from "@/screens/budget-screen/components/budget-group-card";
import {
  BUDGET_TIME_SPANS,
  DEFAULT_BUDGET_SPAN,
  TIME_SPAN_LABEL_KEYS,
  timeSpanToFilter,
  type BudgetTimeSpan,
} from "@/screens/budget-screen/selectors/budget-labels";
import type { BudgetGroup } from "@/screens/budget-screen/selectors/budget-selectors";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // Matches the dashboard screens: side gutters, a top gutter because cards
    // only carry a bottom margin, and flexGrow so the empty and error states
    // stay inside the scrollable area and remain pull-to-refreshable.
    list: {
      paddingHorizontal: gutter,
      paddingTop: space.lg,
      paddingBottom: space.xxl,
      flexGrow: 1,
    },
    stateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: space.xl,
      paddingVertical: 40,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    emptyIcon: {
      marginBottom: space.lg,
    },
    emptyTitle: {
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      marginBottom: space.sm,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: fontSizes.md,
      color: theme.black80,
      textAlign: "center",
      marginBottom: space.xl,
      lineHeight: 22,
    },
    cta: {
      paddingHorizontal: space.xl,
    },
  });

/** Roughly a loaded card: header, stats, meter, chart. */
const CARD_SKELETON_HEIGHT = 320;

export function BudgetScreenImpl(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  // `.name` is the *resolved* theme — `themeVar` itself can hold "system".
  const { colorTheme: theme, name: themeName } = useTheme();
  const isDark = themeName === "dark";
  const { t } = useTranslations();
  const router = useRouter();
  const ledgerId = useLedgerGuard();
  const client = useApolloClient();

  const [span, setSpan] = useState<BudgetTimeSpan>(DEFAULT_BUDGET_SPAN);
  const [refreshing, setRefreshing] = useState(false);
  const time = timeSpanToFilter(span);

  const { groups, loading, error, refetch } = useBudgetGroups(ledgerId);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // The cards read actuals `cache-first`, so refreshing the directives
      // alone would leave the charts on stale numbers.
      await Promise.all([
        refetch(),
        client.refetchQueries({
          include: [GetLedgerIntervalTotalsDocument],
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Stable across renders so the FlatList doesn't re-render every visible card
  // each time `refreshing` or the span toggles.
  const openAdd = useCallback(
    (group?: BudgetGroup) => {
      router.push({
        pathname: "/add-budget",
        params: group
          ? {
              account: group.account,
              interval: group.interval.toUpperCase(),
              currency: group.currency,
            }
          : {},
      });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: BudgetGroup }) => (
      <BudgetGroupCard
        group={item}
        ledgerId={ledgerId}
        time={time}
        onUpdate={openAdd}
      />
    ),
    [ledgerId, time, openAdd],
  );

  const isFirstLoad = loading && groups.length === 0;
  const hasContent = isFirstLoad || groups.length > 0;

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("budget"),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => openAdd()}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("budgetAdd")}
            >
              <Ionicons name="add" size={26} color={theme.black} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Kept mounted through the first load so the list doesn't shift when
          the skeleton gives way to real cards. */}
      {hasContent && (
        <TimeRangePills
          value={span}
          options={BUDGET_TIME_SPANS.map((key) => ({
            key,
            label: t(TIME_SPAN_LABEL_KEYS[key]),
          }))}
          onChange={setSpan}
        />
      )}

      {isFirstLoad ? (
        // Skeleton in the same card the loaded state uses, so nothing shifts.
        <View style={styles.list}>
          <DashboardCard bleed>
            <LoadingTile height={CARD_SKELETON_HEIGHT} mx={gutter} />
          </DashboardCard>
          <DashboardCard bleed>
            <LoadingTile height={CARD_SKELETON_HEIGHT} mx={gutter} />
          </DashboardCard>
        </View>
      ) : (
        <FadeInView fill>
          <FlatList
            data={groups}
            keyExtractor={(group) => `${group.account}::${group.currency}`}
            contentContainerStyle={styles.list}
            alwaysBounceVertical
            showsVerticalScrollIndicator={false}
            indicatorStyle={isDark ? "white" : "default"}
            refreshControl={
              <ThemedRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            // Cards fetch their own actuals on mount, so an off-screen budget
            // costs nothing until it scrolls into view.
            initialNumToRender={3}
            windowSize={5}
            renderItem={renderItem}
            ListEmptyComponent={
              error ? (
                <View style={styles.stateContainer}>
                  <Text style={styles.stateText}>{t("budgetLoadFailed")}</Text>
                </View>
              ) : (
                <View style={styles.stateContainer}>
                  <Ionicons
                    name="wallet-outline"
                    size={48}
                    color={theme.black60}
                    style={styles.emptyIcon}
                  />
                  <Text style={styles.emptyTitle}>
                    {t("budgetNoBudgetsFound")}
                  </Text>
                  <Text style={styles.emptyBody}>
                    {t("budgetNoBudgetsFoundDescription")}
                  </Text>
                  <Button style={styles.cta} onPress={() => openAdd()}>
                    {t("budgetEmptyStateCta")}
                  </Button>
                </View>
              )
            }
          />
        </FadeInView>
      )}
    </SafeAreaView>
  );
}

export function BudgetScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <BudgetScreenImpl />
    </LedgerGuard>
  );
}
