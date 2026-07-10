import { Fragment, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { groupThousands } from "@/common/number-utils";
import { AccountNode } from "./select-account-list";

const CHEVRON_WIDTH = 22;
const INDENT_STEP = 16;
// Levels of account depth shown expanded on load (deeper nodes start collapsed).
const DEFAULT_EXPANDED_LEVELS = 3;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    header: {
      paddingHorizontal: 16,
      marginBottom: 8,
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 16,
      paddingVertical: 10,
    },
    chevron: {
      width: CHEVRON_WIDTH,
    },
    name: {
      flex: 1,
      marginRight: 12,
    },
    nameTop: {
      fontSize: fontSizes.lg,
      color: theme.text01,
    },
    nameChild: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    valueTop: {
      fontSize: fontSizes.lg,
      color: theme.text01,
    },
    valueChild: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black20,
      marginHorizontal: 16,
    },
    empty: {
      paddingHorizontal: 16,
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type AccountListPageProps = {
  label: string;
  /** Pre-formatted category total (with currency symbol). */
  total: string;
  items: AccountNode[];
  currencySymbol: string;
  /**
   * Wrap the tree in its own vertical ScrollView (default). Set false when the
   * list already lives inside a scrolling parent (e.g. the Accounts tab) so the
   * outer scroll owns the gesture and the whole tree lays out inline.
   */
  scrollable?: boolean;
  /**
   * When provided, tapping an account row invokes this with the account name
   * (for drill-down navigation); the expand/collapse chevron stays independently
   * tappable. When omitted, tapping a parent row toggles expansion (home).
   */
  onPressAccount?: (account: string) => void;
};

/**
 * Lists accounts within one category (Assets, Liabilities, …): a headline total
 * plus an indented account tree. Expanded to `DEFAULT_EXPANDED_LEVELS` deep by
 * default; any account with sub-accounts can be collapsed/expanded. Every node's
 * balance is the rolled-up subtree total, so children are a breakdown *of* their
 * parent, never additive. Shared by the home dashboard carousel and the Accounts
 * tab.
 */
export function AccountListPage({
  label,
  total,
  items,
  currencySymbol,
  scrollable = true,
  onPressAccount,
}: AccountListPageProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const toggle = (account: string, currentlyExpanded: boolean) => {
    if (!currentlyExpanded) {
      analytics.track("home_expand_account", { account });
    }
    setOverrides((prev) => ({ ...prev, [account]: !currentlyExpanded }));
  };

  const renderNode = (node: AccountNode, depth: number): JSX.Element => {
    const hasChildren = node.children.length > 0;
    const isExpanded =
      overrides[node.account] ?? depth < DEFAULT_EXPANDED_LEVELS - 1;
    const paddingLeft = 16 + depth * INDENT_STEP;
    const nameStyle = [
      styles.name,
      depth === 0 ? styles.nameTop : styles.nameChild,
    ];
    const valueStyle = depth === 0 ? styles.valueTop : styles.valueChild;

    const chevronIcon = hasChildren ? (
      <Ionicons
        style={styles.chevron}
        name={isExpanded ? "chevron-down" : "chevron-forward"}
        size={16}
        color={theme.black80}
      />
    ) : (
      <View style={styles.chevron} />
    );
    // When rows navigate, the chevron owns the toggle so a nested tap collapses
    // without triggering the row's drill-down.
    const chevron =
      onPressAccount && hasChildren ? (
        <TouchableOpacity
          onPress={() => toggle(node.account, isExpanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
        >
          {chevronIcon}
        </TouchableOpacity>
      ) : (
        chevronIcon
      );

    const rowContent = (
      <>
        {chevron}
        <Text style={nameStyle} numberOfLines={1}>
          {node.name}
        </Text>
        <AmountText
          mono={depth === 0 ? "medium" : "regular"}
          style={valueStyle}
        >
          {currencySymbol}
          {groupThousands(node.value)}
        </AmountText>
      </>
    );

    let row: JSX.Element;
    if (onPressAccount) {
      row = (
        <TouchableOpacity
          style={[styles.row, { paddingLeft }]}
          onPress={() => onPressAccount(node.account)}
          accessibilityRole="button"
        >
          {rowContent}
        </TouchableOpacity>
      );
    } else if (hasChildren) {
      row = (
        <TouchableOpacity
          style={[styles.row, { paddingLeft }]}
          onPress={() => toggle(node.account, isExpanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
        >
          {rowContent}
        </TouchableOpacity>
      );
    } else {
      row = <View style={[styles.row, { paddingLeft }]}>{rowContent}</View>;
    }

    return (
      <Fragment key={node.account}>
        {row}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </Fragment>
    );
  };

  const rows = items.map((node, index) => (
    <Fragment key={`group-${node.account}`}>
      {index > 0 && <View style={styles.separator} />}
      {renderNode(node, 0)}
    </Fragment>
  ));

  return (
    <View style={scrollable ? styles.container : undefined}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <AmountText style={styles.headline}>{total}</AmountText>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t("noAccounts")}</Text>
      ) : scrollable ? (
        <ScrollView
          style={styles.list}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {rows}
        </ScrollView>
      ) : (
        <View>{rows}</View>
      )}
    </View>
  );
}
