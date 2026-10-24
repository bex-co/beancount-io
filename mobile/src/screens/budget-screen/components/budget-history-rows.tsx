import { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { disclosureAccessibility } from "@/common/accessibility";
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
import { formatLedgerDate, formatLedgerDateShort } from "@/common/date-format";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { AmountText } from "@/components";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useToday } from "@/common/hooks/use-today";
import { journalRowKeys } from "@/screens/transactions-screen/utils/merge-journal-page";
import { useDeleteBudgetEntry } from "@/screens/budget-screen/hooks/use-delete-budget-entry";
import { selectBudgetEntryActions } from "@/screens/budget-screen/selectors/select-budget-write-actions";
import {
  intervalAdjectiveKey,
  intervalLabelKey,
} from "@/screens/budget-screen/selectors/budget-labels";
import {
  formatBudgetEntryAmount,
  selectHistoryRows,
  type BudgetGroup,
  type BudgetHistoryRow,
} from "@/screens/budget-screen/selectors/budget-selectors";
import { isolateLtr } from "@/common/bidi";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";
import { InlineError } from "@/components/inline-error";
import { iconActionSize } from "@/common/theme/spacing";

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
      textAlign: LEADING_TEXT_ALIGN,
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
      textAlign: LEADING_TEXT_ALIGN,
    },
    amount: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      marginEnd: space.sm,
    },
    // A 44 pt target around the 18 pt bin: it is destructive, and was 26 pt
    // (w21/485).
    deleteButton: {
      minWidth: iconActionSize,
      minHeight: iconActionSize,
      alignItems: "center",
      justifyContent: "center",
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
  const { t, locale } = useTranslations();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { deleteBudgetEntry, deleting } = useDeleteBudgetEntry(ledgerId);
  const { canWrite } = useLedgerAccess();
  const { showDelete, deleteDisabled } = selectBudgetEntryActions(
    canWrite,
    deleting,
  );

  const today = useToday();
  const rows = selectHistoryRows(group, today);
  // Twin entries share a hash: their keys carry the ordinal (w21/910).
  const keys = journalRowKeys(rows);

  const confirmDelete = ({
    entry_hash: entryHash,
    date,
    interval,
    amount,
  }: BudgetHistoryRow) => {
    Alert.alert(
      t("budgetDeleteTitle"),
      t("budgetDeleteMessage", {
        interval: t(intervalAdjectiveKey(interval)),
        amount: isolateLtr(formatBudgetEntryAmount(amount, group.currency)),
        account: group.account,
        // In the reader's language, not ISO (w21/366).
        date: formatLedgerDate(date, locale),
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
        // Named by its text alone: the chevron glyph read as "U+F…" (w21/141).
        accessibilityLabel={t("budgetHistoryCount", { count: rows.length })}
        {...disclosureAccessibility(expanded, t)}
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
            key={keys.get(row)}
            style={[styles.row, row.isCurrent && styles.rowCurrent]}
          >
            <Text style={styles.date}>
              {formatLedgerDateShort(row.date, locale)}
            </Text>
            <Text style={styles.interval}>
              {t(intervalLabelKey(row.interval))}
            </Text>
            <AmountText style={styles.amount}>
              {formatBudgetEntryAmount(row.amount, group.currency)}
            </AmountText>
            {showDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                disabled={deleteDisabled}
                onPress={() => confirmDelete(row)}
                accessibilityRole="button"
                // Which entry: every row's button read "Delete" (w21/142).
                accessibilityLabel={t("budgetDeleteNamed", {
                  date: formatLedgerDate(row.date, locale),
                  amount: formatBudgetEntryAmount(row.amount, group.currency),
                })}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={deleteDisabled ? theme.black60 : theme.error}
                />
              </TouchableOpacity>
            )}
          </View>
        ))}

      {error && <InlineError style={styles.error} message={error} />}
    </View>
  );
}
