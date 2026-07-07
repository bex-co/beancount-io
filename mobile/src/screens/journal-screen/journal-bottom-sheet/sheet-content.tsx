import React, { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";

const MONO_FONT = Platform.select({ ios: "Courier New", default: "monospace" });
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useGetLedgerEntryContextQuery } from "@/generated-graphql/graphql";
import { ColorTheme } from "@/types/theme-props";
import { JournalDirectiveType } from "../types";
import { BalanceSection } from "./balance-section";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: theme.black60,
      marginTop: 12,
    },
    errorContainer: {
      paddingVertical: 20,
      alignItems: "center",
    },
    errorText: {
      fontSize: 16,
      color: theme.error,
      textAlign: "center",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.black80,
      marginBottom: 8,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    locationLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.black80,
      marginRight: 8,
    },
    locationText: {
      fontSize: 14,
      fontFamily: MONO_FONT,
      color: theme.black80,
    },
    contextHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.black10,
      borderRadius: 8,
      marginBottom: 8,
    },
    contextHeaderText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.black80,
    },
    balancesContainer: {
      backgroundColor: theme.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.black10,
      overflow: "hidden",
    },
    sourceContainer: {
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 12,
    },
    sourceText: {
      minHeight: 100,
      padding: 12,
      fontSize: 13,
      lineHeight: 20,
      fontFamily: MONO_FONT,
      color: theme.text01,
      backgroundColor: theme.black10,
    },
    emptyState: {
      paddingVertical: 40,
      alignItems: "center",
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.black60,
      textAlign: "center",
    },
  });

interface EntryContextEntry {
  meta?: {
    filename?: string;
    lineno?: number;
  };
}

interface JournalBottomSheetContentProps {
  entry: JournalDirectiveType | null;
  ledgerId: string;
}

export const JournalBottomSheetContent: React.FC<
  JournalBottomSheetContentProps
> = ({ entry, ledgerId }) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [isContextOpen, setIsContextOpen] = useState(true);

  // Fetch entry context data
  const { data, loading, error } = useGetLedgerEntryContextQuery({
    variables: {
      entryHash: entry?.entry_hash || "",
      ledgerId: ledgerId,
    },
    skip: !entry?.entry_hash || !ledgerId,
  });

  // Helper function to format balances for display
  const formatBalances = (balances: Record<string, unknown>) => {
    if (!balances || typeof balances !== "object") return [];

    return Object.entries(balances).map(([account, amount]) => ({
      account,
      amount:
        typeof amount === "object" &&
        amount !== null &&
        "number" in amount &&
        "currency" in amount
          ? `${(amount as { number: string; currency: string }).number} ${
              (amount as { number: string; currency: string }).currency
            }`
          : String(amount),
    }));
  };

  const entryContext = data?.getLedgerEntryContext;
  const entryMeta = (entryContext?.entry as unknown as EntryContextEntry)?.meta;
  const entryFilename = entryMeta?.filename ?? "";
  const entryLineNumber = entryMeta?.lineno ?? "";

  const balancesBefore = entryContext?.balances_before
    ? formatBalances(entryContext.balances_before as Record<string, unknown>)
    : [];
  const balancesAfter = entryContext?.balances_after
    ? formatBalances(entryContext.balances_after as Record<string, unknown>)
    : [];
  const hasBalances = balancesBefore.length > 0 || balancesAfter.length > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          {t("journalLoadingEntryContext")}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {t("journalError")}: {error.message}
        </Text>
      </View>
    );
  }

  if (!entryContext) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t("journalNoData")}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Location Display */}
      {entryFilename && entryLineNumber && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>{t("journalLocation")}:</Text>
          <Text style={styles.locationText}>
            {entryFilename}:{entryLineNumber}
          </Text>
        </View>
      )}

      {/* Balances Context */}
      {hasBalances && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contextHeader}
            onPress={() => setIsContextOpen(!isContextOpen)}
            activeOpacity={0.7}
          >
            <Text style={styles.contextHeaderText}>
              {t("journalEntryContext")}
            </Text>
            <Ionicons
              name={isContextOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.black80}
            />
          </TouchableOpacity>

          {isContextOpen && (
            <View style={styles.balancesContainer}>
              <BalanceSection
                title={t("journalBalancesBefore")}
                balances={balancesBefore}
              />
              <BalanceSection
                title={t("journalBalancesAfter")}
                balances={balancesAfter}
              />
            </View>
          )}
        </View>
      )}

      {/* Entry Source */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("journalSource")}</Text>
        <View style={styles.sourceContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.sourceText}>{entryContext?.slice || ""}</Text>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};
