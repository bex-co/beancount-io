import { CardLoadFailure } from "@/components/card-load-failure";
import { isolateAccountPath } from "@/common/bidi";
import { useGuest } from "@/common/guest/guest-context";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
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
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useLedgerReadContext } from "@/common/hooks/use-ledger-read-context";
import { useAccountCloseDates } from "@/common/hooks/use-account-close-dates";
import {
  closedAccountNamed,
  firstOpeningAfter,
  notYetOpenAccountNamed,
} from "@/common/account-close-dates";
import { formatLedgerDate } from "@/common/date-format";
import { getFormatDate } from "@/common/format-util";
import { groupAccountsByRoot } from "@/common/ledger-meta-utils";
import { splitAccountLeaf } from "@/common/account-util";
import {
  ALL_ROOTS,
  findAccountLocation,
  isSearchQuery,
  pickerAccounts,
  showCreateAccountRow,
  showCreateBelowResults,
  visibleAccountSections,
  type PickerSection,
} from "./picker-sections";
import { ColorTheme } from "@/types/theme-props";
import { useRouter } from "expo-router";
import { useIsHere } from "@/common/hooks/use-is-here";
import { SelectedAccount } from "@/common/globalFnFactory";
import { pushOpenAccount } from "@/screens/open-account-screen/push-open-account";
import { accountOrderFor, parseCreateRoot } from "./push-account-picker";
import {
  SCROLL_RETRY_DELAY_MS,
  SCROLL_SETTLE_MS,
  initialScrollRetryState,
  scrollRetryAfterFailure,
} from "./scroll-to-selected";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { Ionicons } from "@expo/vector-icons";
import { LedgerGuard, useLedgerGuard } from "@/components";
import {
  SearchBar,
  SEARCH_BAR_RADIUS,
  searchFieldHeight,
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
import {
  capitalizeAccountPrefill,
  createdAccountName,
} from "./create-account-prefill";
import { useLedgerRootNames } from "@/common/hooks/use-ledger-root-names";
import { useRouteParams } from "@/common/hooks/use-route-params";

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
    accountName: {
      flex: 1,
      flexDirection: "row",
    },
    // The parent path is context; the leaf is what identifies the account, so
    // it carries weight as well as colour — hierarchy shouldn't be colour-only.
    // It keeps its width too: on a narrow row the parent path gives way,
    // ellipsized at its head so the segment next to the leaf survives.
    parentPath: {
      flexShrink: 1,
      fontSize: fontSizes.xl,
      lineHeight: 24,
      color: theme.black80,
    },
    leaf: {
      flexShrink: 0,
      maxWidth: "100%",
      fontSize: fontSizes.xl,
      lineHeight: 24,
      color: theme.black,
      fontWeight: fontWeights.medium,
    },
    listContent: {
      // The keyboard inset below keeps the last rows reachable; a fixed
      // 150 pt fell short of a 291–336 pt keyboard (w21/145).
      paddingBottom: gutter,
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
  /** Live text scale; keys the name so a size change remeasures it. */
  fontScale: number;
}

/**
 * Memoized because SectionList rebuilds its `renderItem` closure every render,
 * so its own cell PureComponent can never bail out — without this, every
 * mounted row re-renders on each keystroke. The theme hooks are called here
 * rather than passed down (`useThemeStyle` memoizes per theme), matching
 * `AccountTableRow` and keeping the memo comparison to primitives. The font
 * scale is passed down instead, so rows don't each subscribe to window changes.
 */
const AccountRow = memo(function AccountRow({
  account,
  selected,
  onPress,
  fontScale,
}: AccountRowProps) {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { parent, leaf } = splitAccountLeaf(account);
  return (
    <TouchableOpacity
      style={[styles.listItem, selected && styles.listItemSelected]}
      onPress={() => onPress(account)}
      accessibilityRole="button"
      // The full path, not the grouped children: their chevron/check glyph
      // would otherwise be read as part of the account's name.
      accessibilityLabel={account}
      accessibilityState={{ selected }}
    >
      {/* Keyed on the live scale so a text-size change while the picker is
          open remeasures the name (see DateSectionHeader). */}
      <View key={fontScale} style={styles.accountName}>
        <Text style={styles.parentPath} numberOfLines={1} ellipsizeMode="head">
          {isolateAccountPath(parent)}
        </Text>
        <Text style={styles.leaf} numberOfLines={1}>
          {leaf}
        </Text>
      </View>
      <Ionicons
        name={selected ? "checkmark" : directionalIcon("chevron-forward")}
        size={24}
        color={selected ? theme.primary : theme.black}
        accessible={false}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </TouchableOpacity>
  );
});

function AccountPickerScreenComponent(): JSX.Element {
  const router = useRouter();
  const isHere = useIsHere();
  const guest = useGuest();
  const ledgerId = useLedgerGuard();
  const { type, selectedItem, entryDate, createRoot } = useRouteParams<{
    type: string;
    selectedItem?: string;
    entryDate?: string;
    createRoot?: string;
  }>();
  const { t, locale } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { fontScale } = useWindowDimensions();
  const {
    canWrite,
    loading: accessLoading,
    error: accessError,
  } = useLedgerAccess();

  // Home/Accounts/Reports have usually already fetched this, so render from
  // cache and refresh behind the list instead of skeletoning on every open.
  const {
    assets,
    expenses,
    loading,
    error: contextError,
    data: contextData,
    refetch: contextRefetch,
  } = useLedgerReadContext(ledgerId);

  const [query, setQuery] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(ALL_ROOTS);

  // One snapshot for the screen's whole life: this ledger's habits (a chart of
  // accounts belongs to its ledger) and the instant they are ranked against.
  // Read rather than subscribed, so confirming a pick can't reshuffle the list
  // under the user as the screen dismisses; `now` doubles as the baseline for
  // the time-to-select the confirm event reports.
  const [ranking] = useState<RankingContext>(() => ({
    usage: guest ? {} : usageFor(accountUsageVar(), ledgerId),
    now: Date.now(),
  }));

  // Held in a ref so the picker keeps working even after the store entry is
  // released, and released on unmount so a stale closure can't fire for
  // whichever screen opens the picker next. This pair is what makes a single
  // shared callback key safe — see `pushAccountPicker`.
  const onSelectedRef = useRef(SelectedAccount.getFn());
  useEffect(() => () => SelectedAccount.deleteFn(), []);

  // Filtering by a category (`Expenses:Food`) is offered alongside the opened
  // accounts; every other picker chooses an account a posting can use (w21/036).
  // A posting picker leaves out what is closed by the entry's date (w21/045);
  // the filter keeps closed accounts, whose history is still searchable.
  const closeDates = useAccountCloseDates(ledgerId);
  const opened = accountOrderFor(type) === "from" ? assets : expenses;
  const accounts = useMemo(
    () =>
      pickerAccounts(
        type,
        opened,
        entryDate ?? getFormatDate(new Date()),
        closeDates,
      ),
    [type, opened, entryDate, closeDates],
  );

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
  // True only once a scroll actually landed (or the policy gave up). Setting it
  // when the scroll was merely *issued* was the bug: an unmeasured target makes
  // `scrollToLocation` a no-op, and nothing ever tried again.
  const hasScrolledToSelected = useRef(false);
  const scrollTarget = useRef<{
    sectionIndex: number;
    itemIndex: number;
  } | null>(null);
  const scrollRetry = useRef(initialScrollRetryState);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set synchronously by `onScrollToIndexFailed` during `scrollToLocation`. */
  const scrollFailedSync = useRef(false);

  const stopScrollingToSelected = useCallback((settled: boolean) => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    scrollTarget.current = null;
    if (settled) {
      hasScrolledToSelected.current = true;
    }
  }, []);

  const scrollToSelectedRef = useRef<() => void>(() => {});

  // Rows vary in height only with the OS font scale, so there is no reliable
  // `getItemLayout` to give the list; recovery is a bounded re-issue instead.
  const onScrollToIndexFailed = useCallback(
    (info: { highestMeasuredFrameIndex: number }) => {
      scrollFailedSync.current = true;
      if (!scrollTarget.current) {
        return;
      }
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
        settleTimer.current = null;
      }
      const { retry, state } = scrollRetryAfterFailure(
        scrollRetry.current,
        info,
      );
      scrollRetry.current = state;
      if (!retry) {
        stopScrollingToSelected(true);
        return;
      }
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        scrollToSelectedRef.current();
      }, SCROLL_RETRY_DELAY_MS);
    },
    [stopScrollingToSelected],
  );

  const scrollToSelected = useCallback(() => {
    const location = scrollTarget.current;
    if (!location || !listRef.current) {
      return;
    }
    scrollFailedSync.current = false;
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    listRef.current.scrollToLocation({
      ...location,
      viewPosition: 0.5,
      animated: false,
    });
    if (scrollFailedSync.current || !scrollTarget.current) {
      return;
    }
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      stopScrollingToSelected(true);
    }, SCROLL_SETTLE_MS);
  }, [stopScrollingToSelected]);

  scrollToSelectedRef.current = scrollToSelected;

  // A new query or chip re-lays the list out, so a retry aimed at the old
  // layout must not fire into the new one. Declared before the effect that
  // starts the scroll, so mounting cancels nothing it just scheduled.
  useEffect(() => {
    stopScrollingToSelected(false);
  }, [query, activeRoot, stopScrollingToSelected]);

  // Bring the caller's current account into view once, on the browse list.
  useEffect(() => {
    if (hasScrolledToSelected.current || scrollTarget.current || isSearching) {
      return;
    }
    const location = findAccountLocation(visibleSections, selectedItem);
    if (!location) {
      return;
    }
    scrollRetry.current = initialScrollRetryState;
    scrollTarget.current = location;
    scrollToSelected();
  }, [selectedItem, isSearching, visibleSections, scrollToSelected]);

  // Nothing may fire for a screen that is gone.
  useEffect(
    () => () => stopScrollingToSelected(false),
    [stopScrollingToSelected],
  );

  // The user taking over beats any pending correction of ours.
  const onScrollBeginDrag = useCallback(() => {
    stopScrollingToSelected(true);
  }, [stopScrollingToSelected]);

  // The one exit, so every way out of the picker records the pick — a created
  // account is the likeliest of all to be wanted again, and used to leave no
  // trace because its path had its own hand-rolled copy of these three lines.
  const confirmSelection = useCallback(
    (account: string, at: number) => {
      if (!guest) recordAccountUsage(ledgerId, account, at);
      onSelectedRef.current?.(account);
      // An account created while the user has since left the picker still
      // arrives, but must not pop whichever screen is on top now (w21/905).
      if (isHere()) router.back();
    },
    [ledgerId, router, guest, isHere],
  );

  const onPick = useCallback(
    (account: string) => {
      confirmSelection(account, Date.now());
    },
    [confirmSelection],
  );

  // The create row renders exactly when the empty state does while a query is
  // active (a no-match search yields zero sections — see `picker-sections`),
  // and only for a collaborator who may actually create the account.
  const trimmedQuery = query.trim();
  const roots = useLedgerRootNames();
  // Destination pickers are choosing where money went, so suggest the
  // Expenses root for a rootless query; source pickers suggest Assets.
  const createFallbackRoot =
    parseCreateRoot(createRoot) ??
    (accountOrderFor(type) === "to" ? "Expenses" : "Assets");

  const onCreate = useCallback(() => {
    if (!canWrite) {
      // Belt and braces: the row is the only caller, but a read-only session
      // must never be pushed at the open-account screen's write guard.
      return;
    }
    pushOpenAccount(router, {
      prefill: capitalizeAccountPrefill(trimmedQuery),
      prefillRoot: createFallbackRoot,
      openDate: entryDate,
      onCreated: (account) => {
        confirmSelection(account, Date.now());
      },
    });
  }, [
    canWrite,
    trimmedQuery,
    createFallbackRoot,
    entryDate,
    router,
    confirmSelection,
  ]);

  // A closed account named exactly is not new: say when it closed rather than
  // offer to create it, which Open Account would refuse (w21/122).
  // The name Create would compose counts too: `gym` is `Expenses:Gym`
  // (w21/531).
  const checkDate = entryDate ?? getFormatDate(new Date());
  const createdName = createdAccountName(
    trimmedQuery,
    createFallbackRoot,
    roots,
  );
  const closedMatch =
    type === "filter"
      ? null
      : (closedAccountNamed(trimmedQuery, checkDate, closeDates) ??
        closedAccountNamed(createdName, checkDate, closeDates));
  // The same for an account the ledger opens later than the entry's date.
  const futureMatch =
    type === "filter"
      ? null
      : (notYetOpenAccountNamed(trimmedQuery, checkDate, closeDates) ??
        notYetOpenAccountNamed(createdName, checkDate, closeDates));
  // Nothing to browse because every account opens after the entry's date:
  // say when, rather than "No matching accounts" (w21/643).
  const opensLater =
    type === "filter" || isSearching
      ? null
      : firstOpeningAfter(opened, checkDate, closeDates);
  const showCreateRow =
    !closedMatch &&
    !futureMatch &&
    showCreateAccountRow(
      query,
      visibleSections.length,
      {
        canWrite,
        loading: accessLoading,
        error: accessError,
      },
      type,
      opened.length > 0,
    );
  const createLabel = trimmedQuery
    ? t("accountPickerCreate", { name: trimmedQuery })
    : t("openAccount");

  // Loose matches ("pets" in `Expenses:Transport:Tram`) must not hide Create
  // for a name the ledger does not have (w21/258).
  const searchResults = isSearching ? (visibleSections[0]?.data ?? []) : [];
  const showCreateFooter =
    !closedMatch &&
    !futureMatch &&
    showCreateBelowResults(
      query,
      searchResults,
      {
        canWrite,
        loading: accessLoading,
        error: accessError,
      },
      type,
    );

  const createRow = (
    <TouchableOpacity
      testID="account-picker-create-row"
      style={[styles.listItem, styles.createRow]}
      onPress={onCreate}
      accessibilityRole="button"
      accessibilityLabel={createLabel}
    >
      <Ionicons name="add-circle-outline" size={24} color={theme.primary} />
      <Text
        key={fontScale}
        style={[styles.listItemText, styles.createText]}
        numberOfLines={1}
      >
        {createLabel}
      </Text>
      <Ionicons
        name={directionalIcon("chevron-forward")}
        size={24}
        color={theme.black}
      />
    </TouchableOpacity>
  );

  // Why a name typed exactly is not offered to create: it closed, or opens
  // later. Under the results too, not only in the empty state, where loose
  // matches hid the reason and the Create row (w21/930).
  const matchNotes =
    closedMatch || futureMatch ? (
      <>
        {closedMatch ? (
          <Text
            key={`closed-${fontScale}`}
            testID="account-picker-closed-row"
            style={styles.emptyText}
          >
            {t("accountPickerClosedOn", {
              name: closedMatch.account,
              date: formatLedgerDate(closedMatch.closedAt, locale),
            })}
          </Text>
        ) : null}
        {futureMatch ? (
          <Text
            key={`future-${fontScale}`}
            testID="account-picker-opens-row"
            style={styles.emptyText}
          >
            {t("accountPickerOpensOn", {
              name: futureMatch.account,
              date: formatLedgerDate(futureMatch.openedAt, locale),
            })}
          </Text>
        ) : null}
      </>
    ) : null;

  if (loading && accounts.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingTile
          style={styles.searchSkeleton}
          height={searchFieldHeight(fontScale)}
        />
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

  // A failed first read is not an empty ledger: "no accounts yet" with an Open
  // Account row invited a duplicate (w21/861).
  if (contextError && contextData === undefined) {
    return (
      <View style={styles.container}>
        <CardLoadFailure
          onRetry={() => void contextRefetch().catch(() => undefined)}
        />
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
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        // A real chart of accounts runs to hundreds of rows; the defaults keep
        // most of them mounted, which multiplies the cost of every keystroke.
        // `removeClippedSubviews` is deliberately left off — RN documents it as
        // capable of blanking content, and the windowing already does the work.
        windowSize={5}
        maxToRenderPerBatch={12}
        // A missed target is recovered from, not swallowed: the row the caller
        // came in on has to end up visible.
        onScrollToIndexFailed={onScrollToIndexFailed}
        onScrollBeginDrag={onScrollBeginDrag}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View
              style={styles.sectionHeader}
              // A heading named by its title alone, without the clock glyph
              // (w21/143).
              accessible
              accessibilityRole="header"
              accessibilityLabel={section.title}
            >
              {section.source === "recents" && (
                // The same clock the history suggestion chips wear, so "we saw
                // you use this" reads the same wherever it appears.
                <Ionicons name="time-outline" size={14} color={theme.black80} />
              )}
              <Text key={fontScale} style={styles.sectionHeaderText}>
                {section.title}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View>
            <Text
              key={fontScale}
              testID="account-picker-empty-text"
              style={styles.emptyText}
            >
              {opensLater
                ? t("accountPickerOpenLater", {
                    date: formatLedgerDate(opensLater, locale),
                  })
                : opened.length === 0 && !isSearching
                  ? t("accountPickerNoAccounts")
                  : t("accountPickerNoResults")}
            </Text>
            {matchNotes}
            {showCreateRow && createRow}
          </View>
        }
        ListFooterComponent={
          showCreateFooter
            ? createRow
            : searchResults.length > 0
              ? matchNotes
              : null
        }
        renderItem={({ item }) => (
          <AccountRow
            account={item}
            selected={item === selectedItem}
            onPress={onPick}
            fontScale={fontScale}
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
