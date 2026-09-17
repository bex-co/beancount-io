import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import {
  fontSizes,
  fontWeights,
  gutter,
  prefersStackedLayout,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
  space,
  useTheme,
} from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatSignedMoneyWithCurrency } from "@/common/number-utils";
import {
  balanceNotes,
  formatHolding,
  type BalanceDisplay,
} from "@/common/balance-display";
import { AmountText } from "@/components/amount-text";
import { HERO_AMOUNT_FIT } from "@/components/amount-text/hero-amount-fit";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import {
  CATEGORY_SIGN,
  type AccountCategory,
} from "@/components/account-list/select-account-list";
import { flattenRows, rowDisclosure, type TableRow } from "./flatten-rows";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";

/**
 * One step of tree indent, and — deliberately the same number — the width of the
 * chevron slot every row reserves. Keeping them equal is what makes a child's
 * chevron land exactly under its parent's label: a child sits one step right of
 * its parent, and its chevron slot occupies precisely that step. Let the two
 * diverge and every level drifts by the difference.
 */
const INDENT_STEP = 18;
/** Left gutter before the first chevron slot — the app-wide screen inset. */
const GUTTER = gutter;
/** Track a row's magnitude bar fills at 100% of its widest sibling. */
const BAR_TRACK_WIDTH = 72;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    // Fills the frame even when the table is empty, so the whole area — not just
    // the short "no accounts" text — sits inside the scrollable content and stays
    // pull-to-refreshable.
    listContent: {
      flexGrow: 1,
    },
    columnHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: GUTTER,
      paddingVertical: sectionHeaderPaddingVertical,
    },
    columnLabel: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: theme.black80,
      textAlign: LEADING_TEXT_ALIGN,
    },
    columnLabelRight: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingEnd: GUTTER,
      paddingVertical: rowPaddingVertical,
      // Pins every row to the same height regardless of depth, and to the same
      // rhythm as the app's list rows. `minHeight` rather than a fixed
      // `lineHeight`: line heights don't scale with Dynamic Type, so pinning one
      // would clip large text — this lets the row grow instead.
      minHeight: rowMinHeight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    rowMain: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
    },
    stackedColumn: {
      flex: 1,
      marginEnd: 12,
    },
    stackedName: {
      textAlign: LEADING_TEXT_ALIGN,
    },
    stackedNameCategory: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    stackedNameTop: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    stackedNameChild: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    stackedAmounts: {
      marginTop: 2,
      alignItems: "flex-start",
      maxWidth: "100%",
    },
    categoryRow: {
      // Tints the five roots so the groups stay legible once collapsed.
      backgroundColor: theme.black10,
    },
    // Faint vertical rule marking each level of nesting, so depth 2 reads as
    // deeper than depth 1 without measuring the indent by eye. Centered in its
    // step, which lands it directly beneath the parent row's chevron.
    guide: {
      width: INDENT_STEP,
      alignSelf: "stretch",
      alignItems: "center",
    },
    guideRule: {
      width: StyleSheet.hairlineWidth,
      flex: 1,
      backgroundColor: theme.black20,
    },
    chevron: {
      width: INDENT_STEP,
    },
    leaf: {
      width: INDENT_STEP,
    },
    name: {
      flex: 1,
      marginEnd: 12,
      textAlign: LEADING_TEXT_ALIGN,
    },
    nameCategory: {
      fontSize: fontSizes.lg,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    nameTop: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    nameChild: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    valueCategory: {
      fontSize: fontSizes.lg,
      color: theme.text01,
    },
    value: {
      fontSize: fontSizes.md,
      color: theme.text01,
    },
    valueChild: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    // The figure, then any note on what it is: its cost, or what a total leaves
    // out. Capped so a long note wraps under the figure instead of squeezing the
    // account name away.
    amounts: {
      alignItems: "flex-end",
      maxWidth: "55%",
    },
    amountNote: {
      fontSize: fontSizes.xs,
      color: theme.black60,
    },
    // Magnitude bar, aligned under the row's own label. Short and fixed-width by
    // design: given the full row to grow into, the widest sibling's bar spans the
    // screen and reads as a rule under the row rather than a measurement. Held
    // clear of the bottom hairline for the same reason. The track itself is
    // transparent — a visible one on every row would read as stripes.
    barTrack: {
      position: "absolute",
      bottom: 3,
      height: 2,
      width: BAR_TRACK_WIDTH,
      flexDirection: "row",
    },
    bar: {
      height: 2,
      backgroundColor: theme.primary,
      opacity: 0.4,
    },
    empty: {
      paddingHorizontal: GUTTER,
      paddingVertical: space.md,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type AccountTableRowProps = {
  row: TableRow;
  label: string;
  currency: string;
  /** How the row's balance reads; a plain money figure when absent. */
  display?: BalanceDisplay;
  stacked: boolean;
  onToggle: (row: TableRow) => void;
  onPressAccount?: (account: string) => void;
};

const AccountTableRow = memo(function AccountTableRow({
  row,
  label,
  currency,
  display,
  stacked,
  onToggle,
  onPressAccount,
}: AccountTableRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const isCategory = row.depth === 0;
  const disclosure = rowDisclosure(row, label, t);

  const nameStyle = [
    styles.name,
    isCategory
      ? styles.nameCategory
      : row.depth === 1
        ? styles.nameTop
        : styles.nameChild,
  ];
  // Balances read exactly as the ledger holds them, so Liabilities, Equity and
  // Income are normally negative — colouring every negative red would paint three
  // categories as problems. Flag only a balance running *against* its category:
  // an overdrawn asset, a refunded expense, a credit-balance card. Same error red
  // the journal and posting rows use.
  const units = display?.kind === "units" ? display.units : null;
  const signed = units ? units.number : row.value;
  const againstType =
    signed !== 0 && Math.sign(signed) !== CATEGORY_SIGN[row.category];
  const valueStyle = [
    isCategory
      ? styles.valueCategory
      : row.depth === 1
        ? styles.value
        : styles.valueChild,
    againstType && { color: theme.error },
  ];

  const chevronIcon = row.hasChildren ? (
    <Ionicons
      style={styles.chevron}
      name={row.expanded ? "chevron-down" : directionalIcon("chevron-forward")}
      size={14}
      // Dimmer than the label in both themes, so the chevron reads as a control
      // rather than competing with the account name.
      color={theme.black60}
    />
  ) : (
    <View style={styles.leaf} />
  );

  // When rows navigate, the chevron owns the toggle so a nested tap collapses
  // without triggering the row's drill-down. Category rows included: they carry a
  // real root account, so tapping one opens the whole category's detail.
  const navigates = Boolean(onPressAccount) && row.account !== "";
  const chevron =
    navigates && row.hasChildren ? (
      <TouchableOpacity
        onPress={() => onToggle(row)}
        accessibilityRole="button"
        accessibilityLabel={disclosure?.chevronLabel}
        accessibilityState={{ expanded: row.expanded }}
        // Widened to keep a comfortable target under the smaller glyph.
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {chevronIcon}
      </TouchableOpacity>
    ) : (
      chevronIcon
    );

  // A 21+ character balance must stay one visual unit at the default size
  // too: left to wrap, the sign strands on its own line above the figure
  // (w1/034). Same fit props as the hero amounts — shrink, never wrap,
  // never ellipsize.
  const amountBlock = (
    <View style={[styles.amounts, stacked && styles.stackedAmounts]}>
      <AmountText
        mono={isCategory ? "medium" : "regular"}
        style={valueStyle}
        {...HERO_AMOUNT_FIT}
      >
        {units
          ? formatHolding(units)
          : formatSignedMoneyWithCurrency(row.value, currency)}
      </AmountText>
      {display
        ? balanceNotes(display, currency, t).map((note) => (
            <Text key={note} style={styles.amountNote}>
              {note}
            </Text>
          ))
        : null}
    </View>
  );

  const guides = Array.from({ length: row.depth }, (_, level) => (
    <View key={level} style={styles.guide}>
      <View style={styles.guideRule} />
    </View>
  ));

  const content = stacked ? (
    <>
      <View style={styles.rowMain}>
        {guides}
        {chevron}
        <View style={styles.stackedColumn}>
          <Text
            style={[
              styles.stackedName,
              isCategory
                ? styles.stackedNameCategory
                : row.depth === 1
                  ? styles.stackedNameTop
                  : styles.stackedNameChild,
            ]}
          >
            {label}
          </Text>
          {amountBlock}
        </View>
      </View>
      {row.share > 0 && (
        <View
          style={[
            styles.barTrack,
            { start: GUTTER + (row.depth + 1) * INDENT_STEP },
          ]}
        >
          <View style={[styles.bar, { width: `${row.share * 100}%` }]} />
        </View>
      )}
    </>
  ) : (
    <>
      {guides}
      {chevron}
      <Text style={nameStyle} numberOfLines={1}>
        {label}
      </Text>
      {amountBlock}
      {row.share > 0 && (
        <View
          style={[
            styles.barTrack,
            { start: GUTTER + (row.depth + 1) * INDENT_STEP },
          ]}
        >
          <View style={[styles.bar, { width: `${row.share * 100}%` }]} />
        </View>
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    { paddingStart: GUTTER },
    isCategory && styles.categoryRow,
    stacked && styles.rowStacked,
  ];

  if (navigates) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={() => onPressAccount?.(row.account)}
        accessibilityRole="button"
        // Drill-down stays the default action; expanding is published as a
        // custom action because the nested chevron is grouped away on iOS.
        accessibilityActions={disclosure?.actions}
        onAccessibilityAction={
          disclosure
            ? (event) => {
                const action = event.nativeEvent.actionName;
                if (action === "expand" || action === "collapse") {
                  onToggle(row);
                }
              }
            : undefined
        }
      >
        {content}
      </TouchableOpacity>
    );
  }
  if (row.hasChildren) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={() => onToggle(row)}
        accessibilityRole="button"
        accessibilityState={{ expanded: row.expanded }}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={rowStyle}>{content}</View>;
});

type AccountTableProps = {
  categories: AccountCategory[];
  currency: string;
  /** Per-row balance reading, keyed like the rows (`selectTrialBalanceDisplays`). */
  displays?: ReadonlyMap<string, BalanceDisplay>;
  refreshing: boolean;
  onRefresh: () => void;
  /** Tapping an account row drills into it; the chevron still toggles. */
  onPressAccount?: (account: string) => void;
};

/**
 * The whole chart of accounts as one table: the five beancount categories are
 * collapsible depth-0 rows, each account nested beneath its parent. Every value
 * is the rolled-up subtree total signed by its category, so children are a
 * breakdown *of* their parent and always sum back to it. This owns the screen's
 * scroll — it renders rows lazily, which a `ScrollView` full of nested trees
 * could not.
 */
export function AccountTable({
  categories,
  currency,
  displays,
  refreshing,
  onRefresh,
  onPressAccount,
}: AccountTableProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () => flattenRows(categories, overrides),
    [categories, overrides],
  );

  const onToggle = useCallback((row: TableRow) => {
    setOverrides((prev) => ({ ...prev, [row.key]: !row.expanded }));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TableRow }) => (
      <AccountTableRow
        row={item}
        // Category rows label themselves from the i18n key they carry; account
        // rows already hold a display name built from the ledger.
        label={item.depth === 0 ? t(item.label) : item.label}
        currency={currency}
        display={displays?.get(item.key)}
        stacked={stacked}
        onToggle={onToggle}
        onPressAccount={onPressAccount}
      />
    ),
    [t, currency, displays, stacked, onToggle, onPressAccount],
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      alwaysBounceVertical
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={
        <View style={styles.columnHeader}>
          <Text style={styles.columnLabel}>{t("account")}</Text>
          <Text style={styles.columnLabelRight}>{t("balanceAtCost")}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t("noAccounts")}</Text>}
      refreshControl={
        <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      removeClippedSubviews
      maxToRenderPerBatch={20}
      windowSize={10}
    />
  );
}
