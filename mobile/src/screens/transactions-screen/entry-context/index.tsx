import React, { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, fontSizes, fontWeights } from "@/common/theme";
import { useTheme, useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  GetLedgerEntryContextQuery,
  useGetLedgerEntryContextQuery,
} from "@/generated-graphql/graphql";
import { ColorTheme } from "@/types/theme-props";
import { JournalDirectiveType } from "../types";
import { BalanceSection } from "./balance-section";
import { LoadingTile } from "@/components/loading-tile";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    loadingContainer: {
      marginTop: 20,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    loadingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.controlFill,
    },
    loadingIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    loadingCopy: {
      flex: 1,
      gap: 7,
    },
    loadingTitle: {
      height: 16,
      width: 120,
    },
    loadingMeta: {
      height: 12,
      width: 90,
    },
    loadingChevron: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    errorContainer: {
      marginTop: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      backgroundColor: theme.controlFill,
    },
    errorText: {
      fontSize: fontSizes.md,
      color: theme.error,
      textAlign: "center",
    },
    contextCard: {
      marginTop: 20,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    contextHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 15,
      backgroundColor: theme.controlFill,
    },
    contextHeaderCopy: {
      flex: 1,
      minWidth: 0,
    },
    contextHeaderText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    contextLocation: {
      marginTop: 4,
      fontSize: fontSizes.xs,
      fontFamily: fonts.mono,
      color: theme.black80,
    },
    contextContent: {
      padding: 12,
      backgroundColor: theme.white,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginBottom: 8,
    },
    balancesContainer: {
      backgroundColor: theme.white,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      overflow: "hidden",
    },
    sourceContainer: {
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 8,
      overflow: "hidden",
    },
    sourceText: {
      minHeight: 100,
      padding: 12,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      fontFamily: fonts.mono,
      color: theme.text01,
      backgroundColor: theme.controlFill,
    },
    emptyState: {
      marginTop: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      backgroundColor: theme.controlFill,
    },
    emptyStateText: {
      fontSize: fontSizes.md,
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

interface EntryContextProps {
  entry: JournalDirectiveType | null;
  ledgerId: string;
  contextData?: GetLedgerEntryContextQuery["getLedgerEntryContext"] | null;
  contextLoading?: boolean;
  contextError?: Error;
}

/**
 * Read-only context for a directive: where it lives in the ledger file, the
 * balances around it, and its source. Rendered inline by transaction detail and
 * inside the journal's bottom sheet.
 */
export const EntryContext: React.FC<EntryContextProps> = ({
  entry,
  ledgerId,
  contextData,
  contextLoading = false,
  contextError,
}) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [isContextOpen, setIsContextOpen] = useState(false);

  // The detail screen already fetches this context to resolve the source
  // checksum and deep-link fallback entry. Reuse it there; the journal sheet
  // still fetches its own data when no context is supplied.
  const { data, loading, error } = useGetLedgerEntryContextQuery({
    variables: {
      entryHash: entry?.entry_hash || "",
      ledgerId: ledgerId,
    },
    skip:
      Boolean(contextData) || contextLoading || !entry?.entry_hash || !ledgerId,
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

  const entryContext = contextData ?? data?.getLedgerEntryContext;
  const isLoading = contextLoading || (loading && !entryContext);
  const entryError = contextError ?? error;
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <LoadingTile style={styles.loadingIcon} />
          <View style={styles.loadingCopy}>
            <LoadingTile style={styles.loadingTitle} />
            <LoadingTile style={styles.loadingMeta} />
          </View>
          <LoadingTile style={styles.loadingChevron} />
        </View>
      </View>
    );
  }

  if (entryError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {t("journalError")}: {entryError.message}
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
    <View style={styles.contextCard}>
      <TouchableOpacity
        style={styles.contextHeader}
        onPress={() => setIsContextOpen((open) => !open)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isContextOpen }}
      >
        <Ionicons name="code-slash-outline" size={20} color={theme.black80} />
        <View style={styles.contextHeaderCopy}>
          <Text style={styles.contextHeaderText}>
            {t("journalEntryContext")}
          </Text>
          {entryFilename && entryLineNumber ? (
            <Text style={styles.contextLocation} numberOfLines={1}>
              {entryFilename}:{entryLineNumber}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name={isContextOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.black80}
        />
      </TouchableOpacity>

      {isContextOpen && (
        <View style={styles.contextContent}>
          {hasBalances && (
            <View style={styles.section}>
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
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("journalSource")}</Text>
            <View style={styles.sourceContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={styles.sourceText}>
                  {entryContext.slice || ""}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
