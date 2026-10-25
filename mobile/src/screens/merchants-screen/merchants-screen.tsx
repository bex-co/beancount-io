import { StaleDataBanner } from "@/components/stale-data-banner";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";
import { routeText } from "@/common/route-text";
import { CardLoadFailure } from "@/components/card-load-failure";
import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useReactiveVar } from "@apollo/client";
import { useRouter } from "expo-router";
import {
  fontSizes,
  fontWeights,
  gutter,
  sectionHeaderPaddingVertical,
  space,
  useTheme,
} from "@/common/theme";
import { contentColumn } from "@/common/content-column";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToday } from "@/common/hooks/use-today";
import { ColorTheme } from "@/types/theme-props";
import { useQueryShellQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { SearchBar, searchFieldHeight } from "@/components/search-bar";
import { useKeyboardHeight } from "@/components/keyboard-accessory-bar/use-keyboard-height";
import { getKeyboardOverlap } from "@/components/keyboard-accessory-bar/utils";
import {
  merchantRecurringOverridesVar,
  overrideFor,
} from "@/common/vars/merchant-recurring-overrides";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { MerchantRow } from "./merchant-row";
import { MerchantsListSkeleton } from "./merchants-list-skeleton";
import {
  aggregatePayees,
  PAYEE_ROLLUP_BQL,
  payeeCountsThroughBql,
  withCountsThrough,
  type MerchantSort,
} from "./selectors/aggregate-payees";
import {
  buildMerchantSections,
  type MerchantListItem,
  type MerchantSection,
} from "./selectors/merchant-sections";
import { usePayeeRecurrence } from "./use-payee-recurrence";
import { merchantsSortButtonLabelKey } from "./sort-button-label";
import { letterSpacing } from "@/common/rtl";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.sm,
      gap: space.sm,
    },
    searchBar: {
      flex: 1,
    },
    // Square box sized per-render from `searchFieldHeight(fontScale)` so it
    // stays the same height as the field it sits beside at every text size.
    sortButton: {
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      backgroundColor: theme.controlFill,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      flex: 1,
    },
    listContent: {
      // Capped centered column on iPad; a no-op on phones (w21/m2).
      ...contentColumn,
      flexGrow: 1,
    },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingTop: space.md,
      paddingBottom: sectionHeaderPaddingVertical,
      backgroundColor: theme.white,
    },
    sectionHeaderText: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textTransform: "uppercase",
      letterSpacing: letterSpacing(0.4),
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 48,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.black10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
      marginBottom: 8,
    },
    emptyMessage: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.regular,
      color: theme.black80,
      textAlign: "center",
      lineHeight: 24,
    },
    errorText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 16,
      paddingVertical: 40,
    },
  });

function MerchantsDirectory() {
  const today = useToday();
  const ledgerId = useLedgerGuard();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<MerchantSort>("count");
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The "no results" message is centered in a full-height container, so with the
  // keyboard up it lands behind it. Shortening the container by the overlap
  // re-centers the message in what the user can actually see.
  const keyboardHeight = useKeyboardHeight();
  const keyboardOverlap = getKeyboardOverlap(
    keyboardHeight,
    insets.bottom,
    Platform.OS,
  );
  const searchBoxHeight = searchFieldHeight(fontScale);
  const overrides = useReactiveVar(merchantRecurringOverridesVar);

  const {
    data: rollupData,
    loading: rollupLoading,
    error: rollupError,
    refetch: refetchRollup,
  } = useQueryShellQuery({
    variables: {
      ledgerId: ledgerId!,
      query: PAYEE_ROLLUP_BQL,
    },
    skip: !ledgerId,
  });

  const {
    detections,
    enoughHistory,
    loading: seriesLoading,
    refetch: refetchSeries,
  } = usePayeeRecurrence(ledgerId);

  // Counted to today, as the detail counts (w21/812).
  const { data: countsData, refetch: refetchCounts } = useQueryShellQuery({
    variables: { ledgerId: ledgerId!, query: payeeCountsThroughBql(today) },
    skip: !ledgerId,
  });
  const merchants = useMemo(
    () =>
      withCountsThrough(
        aggregatePayees(rollupData?.queryShell?.table ?? null),
        countsData?.queryShell?.table ?? null,
      ),
    [rollupData?.queryShell?.table, countsData?.queryShell?.table],
  );

  const sections = useMemo(
    () =>
      buildMerchantSections(
        merchants,
        detections,
        enoughHistory,
        (payee) => overrideFor(overrides, ledgerId!, payee),
        searchQuery,
        sort,
        today,
      ),
    [
      merchants,
      detections,
      enoughHistory,
      overrides,
      ledgerId,
      searchQuery,
      sort,
      today,
    ],
  );

  const loading = rollupLoading || seriesLoading;
  // Only the directory's own read can empty it: a failed recurrence series
  // leaves the list and its rows, without cadence (w21/118).
  const error = rollupData === undefined ? rollupError : undefined;
  const isInitialLoading = loading && !rollupData && !error;
  const showBlankEmpty = !isInitialLoading && !error && merchants.length === 0;
  const showNoResults =
    !isInitialLoading &&
    !error &&
    merchants.length > 0 &&
    sections.every((section) => section.data.length === 0);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchRollup(), refetchCounts(), refetchSeries()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchRollup, refetchCounts, refetchSeries]);

  const onToggleSort = useCallback(() => {
    setSort((current) => {
      const next: MerchantSort = current === "count" ? "alphabetical" : "count";
      return next;
    });
  }, []);

  const onPressRow = useCallback(
    (item: MerchantListItem) => {
      router.push({
        pathname: "/merchant-detail",
        // `ledger` binds the entry to this ledger, so a later ledger switch
        // cannot revive the merchant under a different one.
        params: {
          payee: routeText(item.merchant.payee),
          ledger: ledgerId,
          // The spellings this row merged, so the detail counts what the row
          // did (w21/046).
          otherSpellings: item.merchant.otherSpellings
            ? routeText(JSON.stringify(item.merchant.otherSpellings))
            : undefined,
        },
      });
    },
    [router, ledgerId],
  );

  const searchPlaceholder = t("merchantsSearchPlaceholder", {
    count: merchants.length,
  });
  // The button is named for what tapping it does — the other order. The icon
  // shows the order already applied, so the two deliberately differ.
  const sortLabel = t(merchantsSortButtonLabelKey(sort));

  // The detail header reads its currencies against the same one (w21/719).
  const { primaryCurrency } = useLedgerReadContext(ledgerId!);
  const renderItem = useCallback(
    ({ item }: { item: MerchantListItem }) => (
      <MerchantRow
        item={item}
        onPress={() => onPressRow(item)}
        primaryCurrency={primaryCurrency}
      />
    ),
    [onPressRow, primaryCurrency],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: MerchantSection }) => {
      if (!section.titleKey) {
        return null;
      }
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText} accessibilityRole="header">
            {t(section.titleKey)}
          </Text>
        </View>
      );
    },
    [styles.sectionHeader, styles.sectionHeaderText, t],
  );

  const listEmpty = () => {
    if (isInitialLoading) {
      return <MerchantsListSkeleton />;
    }
    if (error) {
      // A whole translated sentence and a Retry, never transport text.
      return (
        <View>
          <Text style={styles.errorText}>{t("merchantsLoadError")}</Text>
          <CardLoadFailure onRetry={() => onRefresh()} />
        </View>
      );
    }
    if (showBlankEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="storefront-outline"
              size={40}
              color={theme.black60}
            />
          </View>
          <Text style={styles.emptyTitle}>{t("merchantsEmptyTitle")}</Text>
          <Text style={styles.emptyMessage}>{t("merchantsEmptyMessage")}</Text>
        </View>
      );
    }
    if (showNoResults) {
      return (
        <View
          style={[
            styles.emptyContainer,
            keyboardOverlap > 0 && { marginBottom: keyboardOverlap },
          ]}
        >
          <View style={styles.emptyIcon}>
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="search-outline"
              size={40}
              color={theme.black60}
            />
          </View>
          <Text style={styles.emptyMessage}>
            {t("merchantsNoSearchResults")}
          </Text>
        </View>
      );
    }
    return null;
  };

  // Rows from before a failed refresh stay, under the banner every other
  // data screen shows (w21/860).
  const showStale = isShowingStaleDataFromQueries([
    { data: rollupData, error: rollupError },
  ]);

  return (
    <View style={styles.container}>
      {showStale ? <StaleDataBanner /> : null}
      <SectionList
        style={styles.list}
        // A pushed screen has no tab bar to clear the home indicator (w21/1001).
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom },
        ]}
        sections={isInitialLoading || error ? [] : sections}
        keyExtractor={(item, index) =>
          `${item.inRecurringSection ? "r" : "a"}:${item.merchant.payee}:${index}`
        }
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        alwaysBounceVertical
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ThemedRefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
          />
        }
        ListHeaderComponent={
          isInitialLoading || error || showBlankEmpty ? null : (
            <View style={styles.searchRow}>
              <SearchBar
                testID="merchants-search"
                style={styles.searchBar}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder}
              />
              <TouchableOpacity
                testID="merchants-sort"
                style={[
                  styles.sortButton,
                  { width: searchBoxHeight, height: searchBoxHeight },
                ]}
                onPress={onToggleSort}
                accessibilityRole="button"
                accessibilityLabel={sortLabel}
                hitSlop={8}
              >
                <Ionicons
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name={
                    sort === "count" ? "swap-vertical-outline" : "text-outline"
                  }
                  size={18}
                  color={theme.controlPlaceholder}
                />
              </TouchableOpacity>
            </View>
          )
        }
        ListEmptyComponent={listEmpty}
      />
    </View>
  );
}

export function MerchantsScreen() {
  return (
    <LedgerGuard>
      <MerchantsDirectory />
    </LedgerGuard>
  );
}
