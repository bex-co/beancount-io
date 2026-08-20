import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { analytics } from "@/common/analytics";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { useQueryShellQuery } from "@/generated-graphql/graphql";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { SearchBar, SEARCH_BAR_HEIGHT } from "@/components/search-bar";
import { MerchantRow } from "./merchant-row";
import { MerchantsListSkeleton } from "./merchants-list-skeleton";
import {
  aggregatePayees,
  filterMerchants,
  sortMerchants,
  PAYEE_ROLLUP_BQL,
  type MerchantAggregate,
  type MerchantSort,
} from "./selectors/aggregate-payees";

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
    sortButton: {
      width: SEARCH_BAR_HEIGHT,
      height: SEARCH_BAR_HEIGHT,
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
      flexGrow: 1,
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
      color: theme.black60,
      textAlign: "center",
      lineHeight: 24,
    },
    errorText: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.black60,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 16,
      paddingVertical: 40,
    },
  });

function MerchantsDirectory() {
  const ledgerId = useLedgerGuard();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<MerchantSort>("count");

  usePageView("merchants");

  const { data, loading, error, refetch } = useQueryShellQuery({
    variables: {
      ledgerId: ledgerId!,
      query: PAYEE_ROLLUP_BQL,
    },
    skip: !ledgerId,
  });

  const merchants = useMemo(
    () => aggregatePayees(data?.queryShell?.table ?? null),
    [data?.queryShell?.table],
  );

  const visibleMerchants = useMemo(
    () => sortMerchants(filterMerchants(merchants, searchQuery), sort),
    [merchants, searchQuery, sort],
  );

  const isInitialLoading = loading && !data && !error;
  const showBlankEmpty = !isInitialLoading && !error && merchants.length === 0;
  const showNoResults =
    !isInitialLoading &&
    !error &&
    merchants.length > 0 &&
    visibleMerchants.length === 0;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const onToggleSort = useCallback(() => {
    setSort((current) => {
      const next: MerchantSort = current === "count" ? "alphabetical" : "count";
      analytics.track("merchants_sort_change", { sort: next });
      return next;
    });
  }, []);

  const searchPlaceholder = t("merchantsSearchPlaceholder", {
    count: merchants.length,
  });
  const sortLabel =
    sort === "count"
      ? t("merchantsSortByCount")
      : t("merchantsSortAlphabetical");

  const renderItem = useCallback(
    ({ item }: { item: MerchantAggregate }) => <MerchantRow merchant={item} />,
    [],
  );

  const listEmpty = () => {
    if (isInitialLoading) {
      return <MerchantsListSkeleton />;
    }
    if (error) {
      return (
        <Text style={styles.errorText}>
          {t("merchantsLoadError")}
          {error.message}
        </Text>
      );
    }
    if (showBlankEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons
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
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={40} color={theme.black60} />
          </View>
          <Text style={styles.emptyMessage}>
            {t("merchantsNoSearchResults")}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={isInitialLoading || error ? [] : visibleMerchants}
        keyExtractor={(item) => item.payee}
        renderItem={renderItem}
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
          isInitialLoading ? null : (
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
                style={styles.sortButton}
                onPress={onToggleSort}
                accessibilityRole="button"
                accessibilityLabel={sortLabel}
                hitSlop={8}
              >
                <Ionicons
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
