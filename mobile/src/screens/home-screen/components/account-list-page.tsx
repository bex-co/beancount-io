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
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { groupThousands } from "@/common/number-utils";
import { AccountNode } from "@/screens/home-screen/selectors/select-account-list";

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
      fontSize: 14,
      fontWeight: "600",
      color: theme.black80,
    },
    headline: {
      fontSize: 28,
      fontWeight: "bold",
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
      fontSize: 16,
      color: theme.text01,
    },
    nameChild: {
      fontSize: 15,
      color: theme.black80,
    },
    valueTop: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text01,
    },
    valueChild: {
      fontSize: 15,
      color: theme.black80,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black20,
      marginHorizontal: 16,
    },
    empty: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: theme.black80,
    },
  });

type AccountListPageProps = {
  label: string;
  /** Pre-formatted category total (with currency symbol). */
  total: string;
  items: AccountNode[];
  currencySymbol: string;
};

/**
 * A swipe page listing the user's accounts within one category (Assets,
 * Liabilities, …): a headline total plus a scrollable, indented account tree.
 * Expanded to `DEFAULT_EXPANDED_LEVELS` deep by default; any account with
 * sub-accounts can be collapsed/expanded. Every node's balance is the rolled-up
 * subtree total, so children are a breakdown *of* their parent, never additive.
 */
export function AccountListPage({
  label,
  total,
  items,
  currencySymbol,
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

    const rowContent = (
      <>
        {hasChildren ? (
          <Ionicons
            style={styles.chevron}
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={16}
            color={theme.black80}
          />
        ) : (
          <View style={styles.chevron} />
        )}
        <Text style={nameStyle} numberOfLines={1}>
          {node.name}
        </Text>
        <Text style={valueStyle}>
          {currencySymbol}
          {groupThousands(node.value)}
        </Text>
      </>
    );

    return (
      <Fragment key={node.account}>
        {hasChildren ? (
          <TouchableOpacity
            style={[styles.row, { paddingLeft }]}
            onPress={() => toggle(node.account, isExpanded)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
          >
            {rowContent}
          </TouchableOpacity>
        ) : (
          <View style={[styles.row, { paddingLeft }]}>{rowContent}</View>
        )}
        {hasChildren &&
          isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </Fragment>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.headline}>{total}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{t("noAccounts")}</Text>
      ) : (
        <ScrollView
          style={styles.list}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {items.map((node, index) => (
            <Fragment key={`group-${node.account}`}>
              {index > 0 && <View style={styles.separator} />}
              {renderNode(node, 0)}
            </Fragment>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
