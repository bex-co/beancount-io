import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { analytics } from "@/common/analytics";
import { getFormatDate } from "@/common/format-util";
import { SelectedFilterAccount } from "@/common/globalFnFactory";
import { usePageView, useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { Button, DatePickerModal } from "@/components";
import { ListItem } from "@/screens/multi-postings-transaction/list-item";
import { ColorTheme } from "@/types/theme-props";
import {
  DATE_RANGE_KEYS,
  DATE_RANGE_LABEL_KEYS,
  DateRangeKey,
  NO_FILTERS,
  TRANSACTION_STATUSES,
  TransactionFilters,
  TransactionStatus,
} from "@/screens/transactions-screen/filters/types";
import { transactionFiltersVar } from "@/screens/transactions-screen/filters/var";
import { countActiveFilters } from "@/screens/transactions-screen/filters/select-filter-query";

type PickerTarget = "start" | "end";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    section: {
      paddingTop: 20,
    },
    sectionTitle: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black60,
      textTransform: "uppercase",
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
    },
    // Pill metrics shared by the status and date rows, so the two read as one
    // control set rather than two sizes stacked on each other.
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.black20,
      backgroundColor: theme.white,
    },
    chipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipPressed: {
      opacity: 0.7,
    },
    chipText: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.black90,
    },
    chipTextActive: {
      color: theme.white,
    },
    // Full-bleed list block, matching the account/date rows elsewhere in the app.
    rows: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
    },
    // The chip row sits directly above the custom rows and needs breathing room.
    rowsUnderChips: {
      marginTop: 12,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    accountRowItem: {
      flex: 1,
    },
    clearAccount: {
      paddingHorizontal: 16,
    },
    headerAction: {
      fontSize: fontSizes.lg,
      color: theme.primary,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
      backgroundColor: theme.white,
    },
  });

const FilterChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => {
  const styles = useThemeStyle(getStyles);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
};

/**
 * Filter sheet for the transactions tab: status, date range and account.
 *
 * Edits a draft — nothing reaches `transactionFiltersVar` (and so nothing
 * refetches) until Apply, and dismissing the modal drops the draft.
 */
export const TransactionFiltersScreen = (): JSX.Element => {
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  usePageView("transaction_filters");

  const [draft, setDraft] = useState<TransactionFilters>(
    transactionFiltersVar(),
  );
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  const toggleStatus = (status: TransactionStatus) => {
    setDraft((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  };

  const changeRange = (range: DateRangeKey) => {
    setDraft((prev) => {
      if (range !== "custom") {
        return { ...prev, range };
      }
      // Seed a usable window so a half-filled custom range never silently
      // filters nothing: last month through today.
      const today = new Date();
      const monthAgo = new Date(today.getTime());
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return {
        ...prev,
        range,
        startDate: prev.startDate ?? getFormatDate(monthAgo),
        endDate: prev.endDate ?? getFormatDate(today),
      };
    });
  };

  const pickAccount = () => {
    SelectedFilterAccount.setFn((account: string) => {
      setDraft((prev) => ({ ...prev, account }));
    });
    router.push({
      pathname: "/(app)/account-picker",
      params: { type: "filter" },
    });
  };

  const apply = () => {
    analytics.track("apply_transaction_filters", {
      activeCount: countActiveFilters(draft, new Date()),
      range: draft.range,
      statuses: draft.statuses.join(",") || "any",
      hasAccount: Boolean(draft.account),
    });
    transactionFiltersVar(draft);
    router.back();
  };

  const pickerDate = (() => {
    const value = pickerTarget === "end" ? draft.endDate : draft.startDate;
    return value ? new Date(`${value}T00:00:00`) : new Date();
  })();

  const confirmDate = (date: Date) => {
    const value = getFormatDate(date);
    setDraft((prev) =>
      pickerTarget === "end"
        ? { ...prev, endDate: value }
        : { ...prev, startDate: value },
    );
    setPickerTarget(null);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: t("filters"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.headerAction}>{t("cancel")}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setDraft(NO_FILTERS)} hitSlop={10}>
              <Text style={styles.headerAction}>{t("reset")}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("filterStatus")}</Text>
          <View style={styles.chipRow}>
            {TRANSACTION_STATUSES.map((status) => (
              <FilterChip
                key={status}
                label={t(status)}
                active={draft.statuses.includes(status)}
                onPress={() => toggleStatus(status)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("filterDateRange")}</Text>
          <View style={styles.chipRow}>
            {DATE_RANGE_KEYS.map((key) => (
              <FilterChip
                key={key}
                label={t(DATE_RANGE_LABEL_KEYS[key])}
                active={draft.range === key}
                onPress={() => changeRange(key)}
              />
            ))}
          </View>
          {draft.range === "custom" && (
            <View style={[styles.rows, styles.rowsUnderChips]}>
              <ListItem
                title={t("startDate").toUpperCase()}
                content={draft.startDate ?? ""}
                onPress={() => setPickerTarget("start")}
              />
              <ListItem
                title={t("endDate").toUpperCase()}
                content={draft.endDate ?? ""}
                showDivider
                onPress={() => setPickerTarget("end")}
              />
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("filterAccount")}</Text>
          <View style={[styles.rows, styles.accountRow]}>
            <View style={styles.accountRowItem}>
              <ListItem
                // title={t("account").toUpperCase()}
                content={draft.account ?? t("allAccounts")}
                onPress={pickAccount}
              />
            </View>
            {draft.account ? (
              <TouchableOpacity
                style={styles.clearAccount}
                onPress={() =>
                  setDraft((prev) => ({ ...prev, account: undefined }))
                }
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t("reset")}
              >
                <Ionicons name="close-circle" size={20} color={theme.black60} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={apply}>{t("apply")}</Button>
      </View>

      <DatePickerModal
        isVisible={pickerTarget !== null}
        mode="date"
        date={pickerDate}
        onConfirm={confirmDate}
        onCancel={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
};
