import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
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
} from "@/common/theme";
import { useLedgerMeta } from "@/common/hooks/use-ledger-meta";
import { groupAccountsByRoot } from "@/common/ledger-meta-utils";
import { splitAccountLeaf } from "@/common/account-util";
import {
  ALL_ROOTS,
  findAccountLocation,
  isSearchQuery,
  visibleAccountSections,
  type PickerSection,
} from "./picker-sections";
import { ColorTheme } from "@/types/theme-props";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SelectedAccount } from "@/common/globalFnFactory";
import { pushOpenAccount } from "@/screens/open-account-screen/push-open-account";
import { accountOrderFor } from "./push-account-picker";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { Ionicons } from "@expo/vector-icons";
import { LedgerGuard, useLedgerGuard } from "@/components";
import {
  SearchBar,
  SEARCH_BAR_HEIGHT,
  SEARCH_BAR_RADIUS,
} from "@/components/search-bar";
import {
  TimeRangePills,
  PILL_GAP,
  PILL_HEIGHT,
  PILL_RADIUS,
} from "@/components/time-range-pills";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { accountUsageVar, recordAccountUsage } from "@/common/vars";
import { usageFor, type RankingContext } from "@/common/account-frecency";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";

const SKELETON_ROW_WIDTHS = [200, 160, 220, 140, 180, 210, 150, 190];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    // Outer spacing only — the field itself is `SearchBar`, which owns the
    // metrics all three copies used to keep drifting apart, and the control
    // token pair that gives it a visible edge in light mode.
    searchBar: {
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.xs,
    },
    // `flex: 1` so the list's basis is 0 and the column never overflows —
    // otherwise the bands above are the ones Yoga shrinks.
    list: {
      flex: 1,
    },
    // A row, so the Recent header can seat its clock on the baseline of the
    // label; a root header simply has nothing to put beside the text.
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
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
    listItemSelected: {
      backgroundColor: theme.controlSelected,
    },
    listItemText: {
      flex: 1,
      fontSize: fontSizes.xl,
      lineHeight: 24,
      color: theme.black,
      textAlign: LEADING_TEXT_ALIGN,
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
    // Deltas only — the create row composes `listItem`/`listItemText` in the
    // JSX so it cannot drift from the real rows it sits beneath.
    createRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black60,
    },
    createText: {
      marginStart: space.sm,
      fontWeight: fontWeights.medium,
      color: theme.primary,
    },
    // Mirrors the loaded layout: a `SearchBar`, then a `TimeRangePills` row.
    // Both mirror their component's own metrics rather than restating them, so
    // nothing shifts when data lands.
    searchSkeleton: {
      marginHorizontal: gutter,
      marginTop: space.md,
      marginBottom: space.xs,
      height: SEARCH_BAR_HEIGHT,
      borderRadius: SEARCH_BAR_RADIUS,
    },
    chipRowSkeleton: {
      flexDirection: "row",
      // The pills carry 3pt side margins each, so neighbours sit 6pt apart.
      gap: PILL_GAP,
      paddingHorizontal: gutter,
      paddingVertical: space.sm,
    },
    chipTile: {
      height: PILL_HEIGHT,
      width: 72,
      borderRadius: PILL_RADIUS,
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
 * `AccountTableRow` and keeping the memo comparison to primitives.
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
        name={selected ? "checkmark" : directionalIcon("chevron-forward")}
        size={24}
        color={selected ? theme.primary : theme.black}
      />
    </TouchableOpacity>
  );
});

function AccountPickerScreenComponent(): JSX.Element {
  const router = useRouter();
  const { userId } = useSession();
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

  // One snapshot for the screen's whole life: this ledger's habits (a chart of
  // accounts belongs to its ledger) and the instant they are ranked against.
  // Read rather than subscribed, so confirming a pick can't reshuffle the list
  // under the user as the screen dismisses; `now` doubles as the baseline for
  // the time-to-select the confirm event reports.
  const [ranking] = useState<RankingContext>(() => ({
    usage: usageFor(accountUsageVar(), ledgerId),
    now: Date.now(),
  }));

  // Held in a ref so the picker keeps working even after the store entry is
  // released, and released on unmount so a stale closure can't fire for
  // whichever screen opens the picker next. This pair is what makes a single
  // shared callback key safe — see `pushAccountPicker`.
  const onSelectedRef = useRef(SelectedAccount.getFn());
  useEffect(() => () => SelectedAccount.deleteFn(), []);

  const accounts = accountOrderFor(type) === "from" ? assets : expenses;

  // Grouped once: the chips are its titles, and the browse list is a slice of
  // it — two derivations of "root of an account" would have to stay in sync.
  const browseSections = useMemo(
    () => groupAccountsByRoot(accounts),
    [accounts],
  );
  // The "All" chip carries a `null` key — the sentinel `TimeRangePills` widened
  // its value type to accept, so this row is the shared pill component rather
  // than a second copy of it.
  const rootOptions = useMemo(
    () => [
      { key: ALL_ROOTS, label: t("accountPickerAllTab") },
      ...browseSections.map(({ title }) => ({ key: title, label: title })),
    ],
    [browseSections, t],
  );

  const isSearching = isSearchQuery(query);

  // The string, not `t` — `useTranslations` hands back a fresh closure every
  // render, and one unstable dep would make this memo recompute on all of them.
  const recentTitle = t("accountPickerRecent");
  const visibleSections: PickerSection[] = useMemo(
    () =>
      visibleAccountSections(browseSections, accounts, query, activeRoot, {
        ranking,
        recentTitle,
      }),
    [browseSections, accounts, query, activeRoot, ranking, recentTitle],
  );

  const listRef = useRef<SectionList<string, PickerSection>>(null);
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

  // The one exit, so every way out of the picker records the pick — a created
  // account is the likeliest of all to be wanted again, and used to leave no
  // trace because its path had its own hand-rolled copy of these three lines.
  const confirmSelection = useCallback(
    (account: string, at: number) => {
      recordAccountUsage(ledgerId, account, at);
      onSelectedRef.current?.(account);
      router.back();
    },
    [ledgerId, router],
  );

  const onPick = useCallback(
    (account: string) => {
      confirmSelection(account, Date.now());
    },
    [confirmSelection],
  );

  // The create row renders exactly when the empty state does while a query is
  // active (a no-match search yields zero sections — see `picker-sections`).
  const trimmedQuery = query.trim();
  const showCreateRow = isSearching && visibleSections.length === 0;

  const onCreate = useCallback(() => {
    pushOpenAccount(router, {
      prefill: trimmedQuery,
      // Destination pickers are choosing where money went, so suggest the
      // Expenses root for a rootless query; source pickers suggest Assets.
      prefillRoot: accountOrderFor(type) === "to" ? "Expenses" : "Assets",
      onCreated: (account) => {
        confirmSelection(account, Date.now());
      },
    });
  }, [trimmedQuery, type, router, confirmSelection]);

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
            <Ionicons
              name={directionalIcon("chevron-forward")}
              size={24}
              color={theme.black40}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <FadeInView style={styles.container}>
      <SearchBar
        testID="account-picker-search"
        style={styles.searchBar}
        value={query}
        onChangeText={setQuery}
        placeholder={t("accountPickerSearchPlaceholder")}
      />

      {!isSearching && (
        <TimeRangePills
          value={activeRoot}
          options={rootOptions}
          onChange={setActiveRoot}
          scrollable
          // See the prop's own note: these chips filter a list that re-renders
          // underneath, and the picker is a rapid browse surface.
          haptics={false}
        />
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
              {section.source === "recents" && (
                // The same clock the history suggestion chips wear, so "we saw
                // you use this" reads the same wherever it appears.
                <Ionicons name="time-outline" size={14} color={theme.black80} />
              )}
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View>
            <Text style={styles.emptyText}>{t("accountPickerNoResults")}</Text>
            {showCreateRow && (
              <TouchableOpacity
                testID="account-picker-create-row"
                style={[styles.listItem, styles.createRow]}
                onPress={onCreate}
                accessibilityRole="button"
                accessibilityLabel={t("accountPickerCreate", {
                  name: trimmedQuery,
                })}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={theme.primary}
                />
                <Text
                  style={[styles.listItemText, styles.createText]}
                  numberOfLines={1}
                >
                  {t("accountPickerCreate", { name: trimmedQuery })}
                </Text>
                <Ionicons
                  name={directionalIcon("chevron-forward")}
                  size={24}
                  color={theme.black}
                />
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <AccountRow
            account={item}
            selected={item === selectedItem}
            onPress={onPick}
          />
        )}
      />
    </FadeInView>
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
