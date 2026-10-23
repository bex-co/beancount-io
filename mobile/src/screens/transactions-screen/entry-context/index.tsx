import { entryLocationLabel, entrySourceText } from "./source-text";
import { CardLoadFailure } from "@/components/card-load-failure";
import React, { useState } from "react";
import { disclosureAccessibility } from "@/common/accessibility";
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
import { formatEntryBalances } from "./format-entry-balances";
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
      color: theme.black80,
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
  /** Retries the caller's own context read, when it supplies one. */
  onRetryContext?: () => void;
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
  onRetryContext,
}) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const [isContextOpen, setIsContextOpen] = useState(false);

  // The detail screen already fetches this context to resolve the source
  // checksum and deep-link fallback entry. Reuse it there; the journal sheet
  // still fetches its own data when no context is supplied.
  const { data, loading, error, refetch } = useGetLedgerEntryContextQuery({
    variables: {
      entryHash: entry?.entry_hash || "",
      ledgerId: ledgerId,
    },
    skip:
      Boolean(contextData) || contextLoading || !entry?.entry_hash || !ledgerId,
  });

  const entryContext = contextData ?? data?.getLedgerEntryContext;
  const isLoading = contextLoading || (loading && !entryContext);
  const entryError = contextError ?? error;
  const entryMeta = (entryContext?.entry as unknown as EntryContextEntry)?.meta;
  const entryFilename = entryMeta?.filename ?? "";
  const entryLineNumber = entryMeta?.lineno ?? "";

  const balancesBefore = formatEntryBalances(entryContext?.balances_before);
  const balancesAfter = formatEntryBalances(entryContext?.balances_after);
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

  // Only a failure with nothing cached replaces the context: translated, with
  // a Retry, never transport text. Cached context stays under a note
  // (w21/118).
  const retry = onRetryContext ?? (() => void refetch().catch(() => {}));
  if (entryError && !entryContext) {
    return <CardLoadFailure onRetry={retry} />;
  }
  const staleNote = entryError ? (
    <Text style={styles.contextLocation}>{t("staleDataNotice")}</Text>
  ) : null;

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
        // Its text alone: the code and chevron glyphs read as "U+F…"
        // (w21/141).
        accessibilityLabel={t("journalEntryContext")}
        accessibilityValue={{
          text: [
            entryFilename && entryLineNumber
              ? `${entryFilename}:${entryLineNumber}`
              : null,
            entryError ? t("staleDataNotice") : null,
          ]
            .filter(Boolean)
            .join(", "),
        }}
        {...disclosureAccessibility(isContextOpen, t)}
      >
        <Ionicons name="code-slash-outline" size={20} color={theme.black80} />
        <View style={styles.contextHeaderCopy}>
          <Text style={styles.contextHeaderText}>
            {t("journalEntryContext")}
          </Text>
          {entryFilename && entryLineNumber ? (
            // Cut at the head, not the tail: the line number is what tells
            // two entries in one file apart (w21/433).
            <Text
              style={styles.contextLocation}
              numberOfLines={1}
              ellipsizeMode="head"
            >
              {entryLocationLabel(entryFilename, entryLineNumber)}
            </Text>
          ) : null}
          {staleNote}
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
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t("journalSource")}
            </Text>
            <View style={styles.sourceContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Text style={styles.sourceText} selectable>
                  {entrySourceText(entryContext.slice || "")}
                </Text>
              </ScrollView>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
