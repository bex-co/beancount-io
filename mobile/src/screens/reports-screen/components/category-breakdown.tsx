import { Fragment, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import {
  fontSizes,
  fontWeights,
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  sectionHeaderPaddingVertical,
  space,
  useTheme,
} from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { groupThousands } from "@/common/number-utils";
import { AmountText } from "@/components/amount-text";
import { DashboardCard } from "@/components/dashboard-card";
import { LoadingTile } from "@/components/loading-tile";
import { AccountNode } from "@/components/account-list/select-account-list";

/** One step of tree indent for expanded sub-rows (matches AccountListPage). */
const INDENT_STEP = 18;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: gutter,
      marginBottom: sectionHeaderPaddingVertical,
    },
    label: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    headline: {
      fontSize: fontSizes.display,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    // Top-level category row: name + amount on line 1, proportion bar on line 2.
    topRow: {
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
      justifyContent: "center",
    },
    topLine: {
      flexDirection: "row",
      alignItems: "center",
    },
    topName: {
      flex: 1,
      marginRight: space.md,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    topValue: {
      fontSize: fontSizes.md,
      color: theme.text01,
    },
    chevron: {
      marginLeft: space.xs,
    },
    barLine: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: space.xs,
    },
    track: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.black20,
      overflow: "hidden",
    },
    fill: {
      height: 6,
      borderRadius: 3,
    },
    pctLabel: {
      marginLeft: space.sm,
      minWidth: 34,
      textAlign: "right",
      fontSize: fontSizes.xs,
      color: theme.black60,
    },
    // Expanded sub-account row: indented name + amount, no bar.
    childRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
    },
    childName: {
      flex: 1,
      marginRight: space.md,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    childValue: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    leaf: {
      width: INDENT_STEP,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black20,
      marginHorizontal: gutter,
    },
    empty: {
      paddingHorizontal: gutter,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type CategoryBreakdownProps = {
  /** Section caption above the total, e.g. t("expenses"). */
  label: string;
  /** Numeric section total (sum of `items`), rendered as the headline. */
  total: number;
  /** Top-level category rows, already sorted by magnitude descending. */
  items: AccountNode[];
  currencySymbol: string;
  /** Bar fill accent, echoing the chart legend (expenses=error, income=success). */
  tone: (theme: ColorTheme) => string;
  /** Analytics tag for expand events. */
  section: "income" | "expenses";
};

/**
 * Ranked horizontal-bar breakdown of one income-statement category: each
 * top-level account is a row with a proportional bar (its share of the section
 * total) and a % label; tapping a row with sub-accounts expands them as indented
 * name+amount rows. Pure `View`s (no SVG). Colors come from theme tokens and the
 * caller-supplied `tone`, so it reads as one system with the combined chart.
 */
export function CategoryBreakdown({
  label,
  total,
  items,
  currencySymbol,
  tone,
  section,
}: CategoryBreakdownProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const toggle = (account: string, currentlyExpanded: boolean) => {
    if (!currentlyExpanded) {
      analytics.track("reports_expand_category", { account, section });
    }
    setOverrides((prev) => ({ ...prev, [account]: !currentlyExpanded }));
  };

  const renderChild = (node: AccountNode, depth: number): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded = overrides[node.account] ?? false;
    const paddingLeft = gutter + depth * INDENT_STEP;

    const chevron = hasChildren ? (
      <Ionicons
        style={styles.leaf}
        name={isExpanded ? "chevron-down" : "chevron-forward"}
        size={14}
        color={theme.black60}
      />
    ) : (
      <View style={styles.leaf} />
    );

    const rowContent = (
      <>
        {chevron}
        <Text style={styles.childName} numberOfLines={1}>
          {node.name}
        </Text>
        <AmountText style={styles.childValue}>
          {currencySymbol}
          {groupThousands(node.value)}
        </AmountText>
      </>
    );

    return (
      <Fragment key={node.account}>
        {hasChildren ? (
          <TouchableOpacity
            style={[styles.childRow, { paddingLeft }]}
            onPress={() => toggle(node.account, isExpanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            {rowContent}
          </TouchableOpacity>
        ) : (
          <View style={[styles.childRow, { paddingLeft }]}>{rowContent}</View>
        )}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderChild(child, depth + 1))}
      </Fragment>
    );
  };

  const renderTop = (node: AccountNode): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded = overrides[node.account] ?? false;
    // Share of the section total. Negative rows (a net-refunded category) can't
    // draw a meaningful slice, so the bar is hidden but the amount still shows.
    const pct =
      total > 0 ? Math.max(0, Math.min(100, (node.value / total) * 100)) : 0;

    const line1 = (
      <View style={styles.topLine}>
        <Text style={styles.topName} numberOfLines={1}>
          {node.name}
        </Text>
        <AmountText mono="medium" style={styles.topValue}>
          {currencySymbol}
          {groupThousands(node.value)}
        </AmountText>
        {hasChildren && (
          <Ionicons
            style={styles.chevron}
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={14}
            color={theme.black60}
          />
        )}
      </View>
    );

    const line2 = (
      <View style={styles.barLine}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${pct}%`, backgroundColor: tone(theme) },
            ]}
          />
        </View>
        <Text style={styles.pctLabel}>{Math.round(pct)}%</Text>
      </View>
    );

    return (
      <Fragment key={node.account}>
        {hasChildren ? (
          <TouchableOpacity
            style={styles.topRow}
            onPress={() => toggle(node.account, isExpanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            {line1}
            {line2}
          </TouchableOpacity>
        ) : (
          <View style={styles.topRow}>
            {line1}
            {line2}
          </View>
        )}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderChild(child, 1))}
      </Fragment>
    );
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <AmountText style={styles.headline}>
          {currencySymbol}
          {groupThousands(total)}
        </AmountText>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t("noAccounts")}</Text>
      ) : (
        items.map((node, index) => (
          <Fragment key={`group-${node.account}`}>
            {index > 0 && <View style={styles.separator} />}
            {renderTop(node)}
          </Fragment>
        ))
      )}
    </View>
  );
}

// Skeleton rows sized to the loaded breakdown's rhythm.
const SKELETON_ROWS = [
  { labelWidth: 110, valueWidth: 84 },
  { labelWidth: 150, valueWidth: 70 },
  { labelWidth: 92, valueWidth: 96 },
];

const skeletonStyles = StyleSheet.create({
  header: {
    paddingHorizontal: gutter,
    marginBottom: sectionHeaderPaddingVertical,
  },
  label: {
    marginBottom: 6,
  },
  row: {
    paddingHorizontal: gutter,
    paddingVertical: rowPaddingVertical,
    minHeight: rowMinHeight,
    justifyContent: "center",
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bar: {
    marginTop: space.xs,
    width: "100%",
  },
});

/** First-load skeleton mirroring one DashboardCard + CategoryBreakdown. */
export function CategoryBreakdownSkeleton(): JSX.Element {
  return (
    <DashboardCard bleed>
      <View style={skeletonStyles.header}>
        <LoadingTile width={90} height={14} style={skeletonStyles.label} />
        <LoadingTile width={120} height={26} />
      </View>
      {SKELETON_ROWS.map((row, index) => (
        <View key={index} style={skeletonStyles.row}>
          <View style={skeletonStyles.topLine}>
            <LoadingTile width={row.labelWidth} height={14} />
            <LoadingTile width={row.valueWidth} height={14} />
          </View>
          <LoadingTile height={6} style={skeletonStyles.bar} />
        </View>
      ))}
    </DashboardCard>
  );
}
