import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import {
  fontSizes,
  fontWeights,
  gutter,
  rowMinHeight,
  space,
  useTheme,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { AmountText } from "@/components";
import { useDeleteBudgetEntry } from "@/screens/budget-screen/hooks/use-delete-budget-entry";
import { intervalLabelKey } from "@/screens/budget-screen/selectors/budget-labels";
import {
  selectHistoryRows,
  type BudgetGroup,
  type BudgetHistoryRow,
} from "@/screens/budget-screen/selectors/budget-selectors";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: space.sm,
      marginTop: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    toggleText: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: rowMinHeight,
      paddingHorizontal: gutter,
      paddingVertical: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    rowCurrent: {
      backgroundColor: theme.black20,
    },
    date: {
      width: 96,
      fontSize: fontSizes.sm,
      color: theme.text01,
    },
    interval: {
      flex: 1,
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    amount: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      marginRight: space.sm,
    },
    deleteButton: {
      padding: space.xs,
    },
    error: {
      paddingHorizontal: gutter,
      paddingBottom: space.sm,
      fontSize: fontSizes.sm,
      color: theme.error,
    },
  });

type BudgetHistoryRowsProps = {
  group: BudgetGroup;
  ledgerId: string;
};

/**
 * A budget's dated entries, collapsed by default — most budgets have exactly
 * one, and the history is management detail rather than something to read at a
 * glance. Deleting removes a single dated entry, not the whole budget.
 */
export function BudgetHistoryRows({
  group,
  ledgerId,
}: BudgetHistoryRowsProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deleteBudgetEntry, deleting } = useDeleteBudgetEntry(ledgerId);

  const rows = selectHistoryRows(group);

  const confirmDelete = ({
    entry_hash: entryHash,
    date,
    interval,
    amount,
  }: BudgetHistoryRow) => {
    Alert.alert(
      t("budgetDeleteTitle"),
      t("budgetDeleteMessage", {
        interval: t(intervalLabelKey(interval)).toLowerCase(),
        amount,
        account: group.account,
        date,
      }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("budgetDelete"),
          style: "destructive",
          onPress: async () => {
            setError(null);
            const result = await deleteBudgetEntry(entryHash);
            if (result.ok) {
              analytics.track("budget_deleted", { interval });
              return;
            }
            setError(result.message || t("budgetDeleteFailed"));
          },
        },
      ],
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.toggleText}>
          {t("budgetHistoryCount", { count: rows.length })}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.black60}
        />
      </TouchableOpacity>

      {expanded &&
        rows.map((row) => (
          <View
            key={row.entry_hash}
            style={[styles.row, row.isCurrent && styles.rowCurrent]}
          >
            <Text style={styles.date}>{row.date}</Text>
            <Text style={styles.interval}>
              {t(intervalLabelKey(row.interval))}
            </Text>
            <AmountText style={styles.amount}>{row.amount}</AmountText>
            <TouchableOpacity
              style={styles.deleteButton}
              disabled={deleting}
              onPress={() => confirmDelete(row)}
              accessibilityRole="button"
              accessibilityLabel={t("budgetDelete")}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={deleting ? theme.black60 : theme.error}
              />
            </TouchableOpacity>
          </View>
        ))}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}
