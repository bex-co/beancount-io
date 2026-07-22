import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { formatSignedMoney } from "@/common/number-utils";
import { AmountText } from "@/components/amount-text";
import type { AccountCategory } from "@/components/account-list/select-account-list";
import { flattenRows, type TableRow } from "./flatten-rows";

/**
 * One step of tree indent, and — deliberately the same number — the width of the
 * chevron slot every row reserves. Keeping them equal is what makes a child's
 * chevron land exactly under its parent's label: a child sits one step right of
 * its parent, and its chevron slot occupies precisely that step. Let the two
 * diverge and every level drifts by the difference.
 */
const INDENT_STEP = 18;
/** Left gutter before the first chevron slot. */
const GUTTER = 16;
/** Track a row's magnitude bar fills at 100% of its widest sibling. */
const BAR_TRACK_WIDTH = 72;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    list: {
      flex: 1,
    },
    columnHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: GUTTER,
      paddingTop: 4,
      paddingBottom: 8,
    },
    columnLabel: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    columnLabelRight: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: GUTTER,
      paddingVertical: 7,
      // Pins every row to the same height regardless of depth. `minHeight` rather
      // than a fixed `lineHeight`: line heights don't scale with Dynamic Type, so
      // pinning one would clip large text — this lets the row grow instead.
      minHeight: 38,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
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
      marginRight: 12,
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
      paddingVertical: 12,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type AccountTableRowProps = {
  row: TableRow;
  label: string;
  currencySymbol: string;
  onToggle: (row: TableRow) => void;
  onPressAccount?: (account: string) => void;
};

const AccountTableRow = memo(function AccountTableRow({
  row,
  label,
  currencySymbol,
  onToggle,
  onPressAccount,
}: AccountTableRowProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const isCategory = row.depth === 0;

  const nameStyle = [
    styles.name,
    isCategory
      ? styles.nameCategory
      : row.depth === 1
        ? styles.nameTop
        : styles.nameChild,
  ];
  const valueStyle = [
    isCategory
      ? styles.valueCategory
      : row.depth === 1
        ? styles.value
        : styles.valueChild,
    // Negatives take the same error red the journal and posting rows use, so a
    // credit-balance asset or a refunded expense is visible at a glance.
    row.value < 0 && { color: theme.error },
  ];

  const chevronIcon = row.hasChildren ? (
    <Ionicons
      style={styles.chevron}
      name={row.expanded ? "chevron-down" : "chevron-forward"}
      size={14}
      // Dimmer than the label in both themes, so the chevron reads as a control
      // rather than competing with the account name.
      color={theme.black60}
    />
  ) : (
    <View style={styles.leaf} />
  );

  // When rows navigate, the chevron owns the toggle so a nested tap collapses
  // without triggering the row's drill-down.
  const navigates =
    Boolean(onPressAccount) && !isCategory && row.account !== "";
  const chevron =
    navigates && row.hasChildren ? (
      <TouchableOpacity
        onPress={() => onToggle(row)}
        accessibilityRole="button"
        accessibilityState={{ expanded: row.expanded }}
        // Widened to keep a comfortable target under the smaller glyph.
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {chevronIcon}
      </TouchableOpacity>
    ) : (
      chevronIcon
    );

  const content = (
    <>
      {/* One guide per level above this row; the row's own chevron slot supplies
          the last step of indent. */}
      {Array.from({ length: row.depth }, (_, level) => (
        <View key={level} style={styles.guide}>
          <View style={styles.guideRule} />
        </View>
      ))}
      {chevron}
      <Text style={nameStyle} numberOfLines={1}>
        {label}
      </Text>
      <AmountText mono={isCategory ? "medium" : "regular"} style={valueStyle}>
        {formatSignedMoney(row.value, currencySymbol)}
      </AmountText>
      {row.share > 0 && (
        <View
          style={[
            styles.barTrack,
            // Under the label, not the chevron: one more step past the indent.
            { left: GUTTER + (row.depth + 1) * INDENT_STEP },
          ]}
        >
          <View style={[styles.bar, { width: `${row.share * 100}%` }]} />
        </View>
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    { paddingLeft: GUTTER },
    isCategory && styles.categoryRow,
  ];

  if (navigates) {
    return (
      <TouchableOpacity
        style={rowStyle}
        onPress={() => onPressAccount?.(row.account)}
        accessibilityRole="button"
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
  currencySymbol: string;
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
  currencySymbol,
  refreshing,
  onRefresh,
  onPressAccount,
}: AccountTableProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () => flattenRows(categories, overrides),
    [categories, overrides],
  );

  const onToggle = useCallback((row: TableRow) => {
    if (!row.expanded) {
      analytics.track("accounts_expand_row", { account: row.key });
    }
    setOverrides((prev) => ({ ...prev, [row.key]: !row.expanded }));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: TableRow }) => (
      <AccountTableRow
        row={item}
        // Category rows label themselves from the i18n key they carry; account
        // rows already hold a display name built from the ledger.
        label={item.depth === 0 ? t(item.label) : item.label}
        currencySymbol={currencySymbol}
        onToggle={onToggle}
        onPressAccount={onPressAccount}
      />
    ),
    [t, currencySymbol, onToggle, onPressAccount],
  );

  return (
    <FlatList
      style={styles.list}
      data={rows}
      renderItem={renderItem}
      keyExtractor={(row) => row.key}
      ListHeaderComponent={
        <View style={styles.columnHeader}>
          <Text style={styles.columnLabel}>{t("account")}</Text>
          <Text style={styles.columnLabelRight}>{t("accountBalance")}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>{t("noAccounts")}</Text>}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
      removeClippedSubviews
      maxToRenderPerBatch={20}
      windowSize={10}
    />
  );
}
