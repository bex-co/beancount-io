import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { analytics } from "@/common/analytics";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { useThemeStyle, usePageView, useToast } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import {
  TrialBalanceDocument,
  AccountJournalDocument,
  AccountReportDocument,
  BalanceSheetDocument,
  GetLedgerJournalDocument,
  HomeChartsDocument,
  useDeleteLedgerEntrySourceSliceMutation,
  useGetLedgerEntryContextQuery,
} from "@/generated-graphql/graphql";
import { EntryContext } from "@/screens/transactions-screen/entry-context";
import { openEditTransaction } from "@/screens/edit-transaction-screen";
import {
  JournalDirectiveType,
  JournalTransaction,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { formatDisplayDate } from "@/screens/transactions-screen/utils/transaction-display-utils";
import { selectedTransactionVar } from "./open-transaction-detail";
import {
  selectHeroAmount,
  selectPostingRows,
  selectTransactionTitle,
} from "./selectors/select-transaction-detail";
import { PostingRow } from "./components/posting-row";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    stateContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.white,
      paddingVertical: 40,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    hero: {
      alignItems: "center",
      paddingTop: 24,
      paddingBottom: 8,
    },
    heroAmount: {
      fontSize: fontSizes.heroSm,
      fontWeight: fontWeights.medium,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    pill: {
      marginTop: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: theme.warning,
    },
    pillText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: "#fff",
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginTop: 20,
      marginBottom: 8,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.black10,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    detailRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    detailLabel: {
      fontSize: fontSizes.md,
      color: theme.black60,
      flexShrink: 0,
    },
    detailValue: {
      flex: 1,
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      textAlign: "right",
    },
    sourceSection: {
      marginTop: 20,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingRight: 4,
    },
  });

type DetailRow = { label: string; value: string };

const TransactionDetailImpl = ({
  entryHash,
  originAccount,
}: {
  entryHash: string;
  originAccount?: string;
}): JSX.Element => {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  usePageView("transaction_detail");

  const toast = useToast();
  const stashed = useReactiveVar(selectedTransactionVar);

  // Also serves as the fallback entry source when the stash is cold (deep
  // link or remount) — the context payload carries the full entry JSON.
  const { data, loading } = useGetLedgerEntryContextQuery({
    variables: { entryHash, ledgerId },
    skip: !entryHash,
  });

  const [deleteMutation, { loading: deleting }] =
    useDeleteLedgerEntrySourceSliceMutation({
      refetchQueries: [
        GetLedgerJournalDocument,
        HomeChartsDocument,
        AccountJournalDocument,
        AccountReportDocument,
        TrialBalanceDocument,
        BalanceSheetDocument,
      ],
      awaitRefetchQueries: false,
    });

  const sha256sum = data?.getLedgerEntryContext?.sha256sum;

  const handleEdit = useCallback(() => {
    if (!sha256sum) return;
    analytics.track("transaction_detail_edit", {});
    openEditTransaction(router, { entryHash, ledgerId });
  }, [sha256sum, entryHash, ledgerId, router]);

  const handleDelete = useCallback(() => {
    if (!sha256sum) return;
    analytics.track("transaction_detail_delete_prompt", {});
    Alert.alert(t("deleteTransactionTitle"), t("deleteTransactionMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteTransaction"),
        style: "destructive",
        onPress: async () => {
          analytics.track("transaction_detail_delete_confirm", {});
          try {
            await deleteMutation({
              variables: {
                input: { entryHash, sha256sum },
                ledgerId,
              },
            });
            toast.showToast({ message: t("deleteSuccess"), type: "success" });
            router.back();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t("deleteFailed");
            toast.showToast({ message: msg, type: "error" });
          }
        },
      },
    ]);
  }, [sha256sum, entryHash, ledgerId, deleteMutation, t, toast, router]);

  const entry: JournalTransaction | null = useMemo(() => {
    if (stashed && stashed.entry_hash === entryHash) {
      return stashed;
    }
    const contextEntry = data?.getLedgerEntryContext?.entry as unknown as
      JournalDirectiveType | undefined;
    return contextEntry && isJournalTransaction(contextEntry)
      ? contextEntry
      : null;
  }, [stashed, entryHash, data]);

  const handlePressAccount = useCallback(
    (account: string) => {
      analytics.track("transaction_detail_open_account", { account });
      if (originAccount && account === originAccount) {
        router.back();
        return;
      }
      router.push({ pathname: "/account-detail", params: { account } });
    },
    [router, originAccount],
  );

  if (!entry) {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        <Stack.Screen options={{ title: t("transaction") }} />
        <View style={styles.stateContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <Text style={styles.stateText}>{t("journalNoData")}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const hero = selectHeroAmount(entry);
  const postingRows = selectPostingRows(entry);
  const title = selectTransactionTitle(entry) || t("transaction");
  const isPending = entry.flag === "!";

  const detailRows: DetailRow[] = [
    { label: t("date"), value: formatDisplayDate(entry.date.slice(0, 10)) },
    ...(entry.payee ? [{ label: t("payee"), value: entry.payee }] : []),
    ...(entry.narration
      ? [{ label: t("narration"), value: entry.narration }]
      : []),
    ...(entry.tags?.length
      ? [{ label: t("tags"), value: entry.tags.map((x) => `#${x}`).join("  ") }]
      : []),
    ...(entry.links?.length
      ? [
          {
            label: t("links"),
            value: entry.links.map((x) => `^${x}`).join("  "),
          },
        ]
      : []),
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title,
          headerRight: sha256sum
            ? () => (
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={handleEdit}
                    hitSlop={8}
                    disabled={deleting}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={22}
                      color={theme.black}
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleDelete}
                    hitSlop={8}
                    disabled={deleting}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={theme.error}
                    />
                  </Pressable>
                </View>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <AmountText
            style={[
              styles.heroAmount,
              { color: hero.isPositive ? theme.success : theme.text01 },
            ]}
          >
            {hero.text || title}
          </AmountText>
          {entry.payee && entry.narration ? (
            <Text style={styles.heroSubtitle}>{entry.narration}</Text>
          ) : null}
          {isPending && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t("pending")}</Text>
            </View>
          )}
        </View>

        {postingRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("postings")}</Text>
            <View style={styles.card}>
              {postingRows.map((posting, index) => (
                <PostingRow
                  key={`${posting.account}-${index}`}
                  posting={posting}
                  showDivider={index > 0}
                  onPress={() => handlePressAccount(posting.account)}
                />
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{t("details")}</Text>
        <View style={styles.card}>
          {detailRows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.detailRow, index > 0 && styles.detailRowDivider]}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sourceSection}>
          <EntryContext entry={entry} ledgerId={ledgerId} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const TransactionDetailScreen = (): JSX.Element => {
  const params = useLocalSearchParams<{
    entry_hash?: string;
    origin_account?: string;
  }>();
  const entryHash =
    typeof params.entry_hash === "string" ? params.entry_hash : "";
  const originAccount =
    typeof params.origin_account === "string"
      ? params.origin_account
      : undefined;

  return (
    <LedgerGuard>
      <TransactionDetailImpl
        entryHash={entryHash}
        originAccount={originAccount}
      />
    </LedgerGuard>
  );
};
