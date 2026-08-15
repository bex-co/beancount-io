import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SectionList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import {
  fontSizes,
  fontWeights,
  gutter,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
  space,
  useTheme,
  withAlpha,
} from "@/common/theme";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import {
  groupAccountsByRoot,
  type AccountSection,
} from "@/common/ledger-meta-utils";
import { splitAccountLeaf } from "@/common/account-util";
import {
  ALL_ROOTS,
  findAccountLocation,
  isSearchQuery,
  visibleAccountSections,
} from "./picker-sections";
import { ColorTheme } from "@/types/theme-props";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SelectedAssets,
  SelectedBudgetAccount,
  SelectedExpenses,
  SelectedFilterAccount,
  SelectedPostingAccount,
} from "@/common/globalFnFactory";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { Ionicons } from "@expo/vector-icons";
import { LedgerGuard, useLedgerGuard } from "@/components";
import { LoadingTile } from "@/components/loading-tile";
import { analytics } from "@/common/analytics";
import { usePageView } from "@/common/hooks";

const SKELETON_ROW_WIDTHS = [200, 160, 220, 140, 180, 210, 150, 190];

/**
 * Per-caller config: which global callback gets the pick, and which account
 * ordering to browse. Both lists hold every account (see
 * `getAccountsAndCurrency`) and differ only in which root sorts first, so
 * "from" suits any picker that isn't choosing a destination.
 *
 * One table rather than two switches on `type`, so a new caller can't be added
 * to the callback side and forgotten on the ordering side.
 */
const PICKERS = {
  assets: { selection: SelectedAssets, order: "from" },
  posting: { selection: SelectedPostingAccount, order: "from" },
  filter: { selection: SelectedFilterAccount, order: "from" },
  expenses: { selection: SelectedExpenses, order: "to" },
  budget: { selection: SelectedBudgetAccount, order: "to" },
} as const;

const pickerFor = (type?: string) =>
  PICKERS[type as keyof typeof PICKERS] ?? PICKERS.expenses;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // Metrics match the two other search fields (transactions, journal). The
    // border is the one deliberate divergence: `black10` sits ~1.1:1 against
    // the `white` surface, so without it the field reads as a smudge rather
    // than a control. See the board note on the light neutral ramp.
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.xs,
      paddingHorizontal: space.md,
      height: 36,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.black40,
      backgroundColor: theme.black10,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSizes.lg,
      color: theme.black90,
      padding: 0,
    },
    // `flexShrink: 0` is the load-bearing half: a horizontal ScrollView
    // defaults to grow+shrink, so an overflowing column squeezes this band
    // until it clips its own chips. The list owns the free space instead.
    chipScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    // `flex: 1` so the list's basis is 0 and the column never overflows —
    // otherwise the bands above are the ones Yoga shrinks.
    list: {
      flex: 1,
    },
    chipRow: {
      gap: space.sm,
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: space.md,
    },
    // Pill metrics match the transaction-filters chips — one tap away in the
    // same flow, so the two rows should read as one control set.
    chip: {
      paddingHorizontal: space.md,
      paddingVertical: space.xs + 2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.black40,
      backgroundColor: theme.black10,
    },
    chipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipText: {
      fontSize: fontSizes.sm,
      lineHeight: 18,
      fontWeight: fontWeights.medium,
      color: theme.black90,
    },
    chipTextActive: {
      color: theme.white,
    },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingVertical: sectionHeaderPaddingVertical,
      backgroundColor: theme.black10,
    },
    sectionHeaderText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    listItem: {
      backgroundColor: theme.white,
      paddingVertical: rowPaddingVertical,
      paddingHorizontal: gutter,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black60,
    },
    // A tinted fill rather than `black10`, which is ~1.1:1 on the light
    // surface and would leave the checkmark doing all the work.
    listItemSelected: {
      backgroundColor: withAlpha(theme.primary, 0.12),
    },
    listItemText: {
      flex: 1,
      fontSize: fontSizes.xl,
      lineHeight: 24,
      color: theme.black,
    },
    // The parent path is context; the leaf is what identifies the account, so
    // it carries weight as well as colour — hierarchy shouldn't be colour-only.
    parentPath: {
      color: theme.black80,
    },
    leaf: {
      fontWeight: fontWeights.medium,
    },
    listContent: {
      paddingBottom: 150,
    },
    emptyText: {
      paddingHorizontal: gutter,
      paddingVertical: space.xl,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    // Mirrors the loaded layout: a search field, then the chip band.
    searchSkeleton: {
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.xs,
      height: 36,
      borderRadius: 10,
    },
    chipRowSkeleton: {
      flexDirection: "row",
      gap: space.sm,
      paddingHorizontal: gutter,
      paddingVertical: space.md,
    },
    chipTile: {
      height: 30,
      width: 72,
      borderRadius: 14,
    },
    // marginVertical fills the same 24px line box as listItemText, keeping
    // skeleton and loaded rows the same height.
    rowTile: {
      height: 14,
      borderRadius: 7,
      marginVertical: 5,
    },
  });

interface AccountRowProps {
  account: string;
  selected: boolean;
  onPress: (account: string) => void;
}

/**
 * Memoized because SectionList rebuilds its `renderItem` closure every render,
 * so its own cell PureComponent can never bail out — without this, every
 * mounted row re-renders on each keystroke. The theme hooks are called here
 * rather than passed down (`useThemeStyle` memoizes per theme), matching
 * `AccountTableRow` and keeping the memo comparison to three primitives.
 */
const AccountRow = memo(function AccountRow({
  account,
  selected,
  onPress,
}: AccountRowProps) {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { parent, leaf } = splitAccountLeaf(account);
  return (
    <TouchableOpacity
      style={[styles.listItem, selected && styles.listItemSelected]}
      onPress={() => onPress(account)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={styles.listItemText} numberOfLines={1}>
        <Text style={styles.parentPath}>{parent}</Text>
        <Text style={styles.leaf}>{leaf}</Text>
      </Text>
      <Ionicons
        name={selected ? "checkmark" : "chevron-forward"}
        size={24}
        color={selected ? theme.primary : theme.black}
      />
    </TouchableOpacity>
  );
});

export function AccountPickerScreenComponent(): JSX.Element {
  const router = useRouter();
  const { userId } = useSession();
  usePageView("account_picker");
  const ledgerId = useLedgerGuard();
  const { type, selectedItem } = useLocalSearchParams<{
    type: string;
    selectedItem?: string;
  }>();
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);

  // Home/Accounts/Reports have usually already fetched this, so render from
  // cache and refresh behind the list instead of skeletoning on every open.
  const { assets, expenses, loading } = useLedgerMeta(userId ?? "", ledgerId, {
    fetchPolicy: "cache-and-network",
  });

  const [query, setQuery] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(ALL_ROOTS);

  const { selection, order } = pickerFor(type);
  // Held in a ref so the picker keeps working even after the store entry is
  // released, and released on unmount so a stale closure can't fire for
  // whichever screen opens the picker next.
  const onSelectedRef = useRef(selection.getFn());
  useEffect(() => () => selection.deleteFn(), [selection]);

  const accounts = order === "from" ? assets : expenses;

  // Grouped once: the chips are its titles, and the browse list is a slice of
  // it — two derivations of "root of an account" would have to stay in sync.
  const browseSections = useMemo(
    () => groupAccountsByRoot(accounts),
    [accounts],
  );
  const roots = useMemo(
    () => browseSections.map(({ title }) => title),
    [browseSections],
  );

  const isSearching = isSearchQuery(query);

  const visibleSections: AccountSection[] = useMemo(
    () => visibleAccountSections(browseSections, accounts, query, activeRoot),
    [browseSections, accounts, query, activeRoot],
  );

  const listRef = useRef<SectionList<string, AccountSection>>(null);
  const hasScrolledToSelected = useRef(false);

  // Bring the caller's current account into view once, on the browse list.
  useEffect(() => {
    if (hasScrolledToSelected.current || isSearching) {
      return;
    }
    const location = findAccountLocation(visibleSections, selectedItem);
    if (!location) {
      return;
    }
    hasScrolledToSelected.current = true;
    listRef.current?.scrollToLocation({
      ...location,
      viewPosition: 0.5,
      animated: false,
    });
  }, [selectedItem, isSearching, visibleSections]);

  const onPick = useCallback(
    async (account: string) => {
      await analytics.track("tap_account_picker_confirm", {
        selectedAccount: account,
      });
      onSelectedRef.current?.(account);
      router.back();
    },
    [router],
  );

  if (loading && accounts.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingTile style={styles.searchSkeleton} />
        <View style={styles.chipRowSkeleton}>
          <LoadingTile style={styles.chipTile} />
          <LoadingTile style={styles.chipTile} />
          <LoadingTile style={styles.chipTile} />
        </View>
        {SKELETON_ROW_WIDTHS.map((width, index) => (
          <View key={index} style={styles.listItem}>
            <LoadingTile
              style={StyleSheet.flatten([styles.rowTile, { width }])}
            />
            <Ionicons name="chevron-forward" size={24} color={theme.black40} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.black60} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("accountPickerSearchPlaceholder")}
          placeholderTextColor={theme.black60}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {!isSearching && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {[ALL_ROOTS, ...roots].map((root) => {
            const active = activeRoot === root;
            return (
              <TouchableOpacity
                key={root ?? "all"}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveRoot(root)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {root ?? t("accountPickerAllTab")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <SectionList
        ref={listRef}
        style={styles.list}
        sections={visibleSections}
        keyExtractor={(account) => account}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        // A real chart of accounts runs to hundreds of rows; the defaults keep
        // most of them mounted, which multiplies the cost of every keystroke.
        // `removeClippedSubviews` is deliberately left off — RN documents it as
        // capable of blanking content, and the windowing already does the work.
        windowSize={5}
        maxToRenderPerBatch={12}
        // Rows vary in height only with the OS font scale, so a missed target
        // is harmless — let the list settle rather than redboxing.
        onScrollToIndexFailed={() => undefined}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("accountPickerNoResults")}</Text>
        }
        renderItem={({ item }) => (
          <AccountRow
            account={item}
            selected={item === selectedItem}
            onPress={onPick}
          />
        )}
      />
    </View>
  );
}

export const AccountPickerScreen = memo(function () {
  return (
    <LedgerGuard>
      <AccountPickerScreenComponent />
    </LedgerGuard>
  );
});

AccountPickerScreen.displayName = "AccountPickerScreen";
