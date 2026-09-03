import { useCallback, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
  withAlpha,
} from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { LoadingTile } from "@/components/loading-tile";
import { MenuButton } from "@/components/menu-button";
import { useThemeStyle } from "@/common/hooks";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import {
  useDeleteLedgerEntrySourceSliceMutation,
  useGetLedgerEntryContextQuery,
} from "@/generated-graphql/graphql";
import { invalidateLedgerData } from "@/common/apollo/invalidate-ledger";
import { EntryContext } from "@/screens/transactions-screen/entry-context";
import { openEditTransaction } from "@/screens/edit-transaction-screen";
import {
  JournalDirectiveType,
  JournalTransaction,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { formatLedgerDate } from "@/common/date-format";
import { selectedTransactionVar } from "./open-transaction-detail";
import {
  hasEditableSource,
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
      paddingHorizontal: gutter,
      paddingBottom: 40,
    },
    stateContainer: {
      flex: 1,
      backgroundColor: theme.white,
      paddingHorizontal: gutter,
      paddingTop: 32,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black60,
      textAlign: "center",
    },
    hero: {
      alignItems: "center",
      paddingTop: 24,
      paddingBottom: 20,
    },
    heroIcon: {
      marginBottom: 12,
    },
    heroTitle: {
      maxWidth: "92%",
      fontSize: fontSizes.xxl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
    },
    heroAmount: {
      marginTop: 10,
      fontSize: fontSizes.heroSm,
      fontWeight: fontWeights.medium,
    },
    heroSubtitle: {
      marginTop: 6,
      fontSize: fontSizes.lg,
      color: theme.black80,
      textAlign: "center",
      maxWidth: "92%",
    },
    heroMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      marginTop: 12,
    },
    heroDate: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.xs,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: withAlpha(theme.warning, 0.14),
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: withAlpha(theme.warning, 0.5),
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.warning,
    },
    statusText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.warning,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginTop: 8,
      marginBottom: 8,
    },
    card: {
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: theme.white,
    },
    flowCard: {
      backgroundColor: theme.controlFill,
    },
    metadataRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    metadataRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    metadataIcon: {
      width: 20,
      marginTop: 1,
    },
    metadataBody: {
      flex: 1,
      minWidth: 0,
    },
    metadataLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginBottom: 5,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    chip: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.controlFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
    },
    chipText: {
      fontSize: fontSizes.sm,
      color: theme.primary,
    },
    detailSkeleton: {
      alignItems: "center",
      paddingTop: 24,
    },
    skeletonIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
    },
    skeletonTitle: {
      width: 150,
      height: 22,
      marginTop: 12,
    },
    skeletonAmount: {
      width: 118,
      height: 38,
      marginTop: 14,
    },
    skeletonMeta: {
      width: 170,
      height: 14,
      marginTop: 12,
    },
    skeletonSection: {
      alignSelf: "stretch",
      height: 120,
      marginTop: 32,
      borderRadius: 12,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingEnd: 4,
    },
    headerIconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
  });

const TransactionDetailImpl = ({
  entryHash,
  originAccount,
}: {
  entryHash: string;
  originAccount?: string;
}): JSX.Element => {
  const ledgerId = useLedgerGuard();
  const router = useRouter();
  const { t, locale } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const confirmWrite = useLedgerWrite();
  const stashed = useReactiveVar(selectedTransactionVar);
  const client = useApolloClient();
  const stashedEntry = stashed?.entry_hash === entryHash ? stashed : null;
  const shouldLoadContext = !stashedEntry || hasEditableSource(stashedEntry);

  // Also serves as the fallback entry source when the stash is cold (deep
  // link or remount) — the context payload carries the full entry JSON.
  const { data, loading, error } = useGetLedgerEntryContextQuery({
    variables: { entryHash, ledgerId },
    skip: !entryHash || !shouldLoadContext,
  });

  const [deleteMutation, { loading: deleting }] =
    useDeleteLedgerEntrySourceSliceMutation();

  const sha256sum = data?.getLedgerEntryContext?.sha256sum;

  const handleEdit = useCallback(() => {
    if (!sha256sum) return;
    openEditTransaction(router, { entryHash, ledgerId });
  }, [sha256sum, entryHash, ledgerId, router]);

  const handleDelete = useCallback(() => {
    if (!sha256sum) return;
    Alert.alert(t("deleteTransactionTitle"), t("deleteTransactionMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteTransaction"),
        style: "destructive",
        onPress: async () => {
          await confirmWrite({
            perform: () =>
              deleteMutation({
                variables: {
                  input: { entryHash, sha256sum },
                  ledgerId,
                },
              }),
            successMessage: t("deleteSuccess"),
            failureMessage: t("deleteFailed"),
            // The server's reason is more useful than "delete failed".
            failureMessageFor: (e) =>
              e instanceof Error ? e.message : t("deleteFailed"),
            afterSuccess: () => invalidateLedgerData(client, "entries"),
          });
        },
      },
    ]);
  }, [sha256sum, entryHash, ledgerId, deleteMutation, client, t, confirmWrite]);

  const entry: JournalTransaction | null = useMemo(() => {
    if (stashedEntry) {
      return stashedEntry;
    }
    const contextEntry = data?.getLedgerEntryContext?.entry as unknown as
      JournalDirectiveType | undefined;
    return contextEntry && isJournalTransaction(contextEntry)
      ? contextEntry
      : null;
  }, [stashedEntry, data]);

  const handlePressAccount = useCallback(
    (account: string) => {
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
            <View style={styles.detailSkeleton}>
              <LoadingTile style={styles.skeletonIcon} />
              <LoadingTile style={styles.skeletonTitle} />
              <LoadingTile style={styles.skeletonAmount} />
              <LoadingTile style={styles.skeletonMeta} />
              <LoadingTile style={styles.skeletonSection} />
            </View>
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
  const formattedDate = formatLedgerDate(entry.date.slice(0, 10), locale);
  const hasCashPosting = entry.postings.some(
    (posting) =>
      posting.account.startsWith("Assets:") ||
      posting.account.startsWith("Liabilities:"),
  );
  const displayHeroAmount =
    hero.isPositive === false && hero.text && hasCashPosting
      ? `-${hero.text}`
      : hero.text;
  const iconPostings = entry.postings.map((posting) => ({
    account: posting.account,
    amount: Number.parseFloat(posting.units.number),
  }));
  const hasMetadata = Boolean(entry.tags?.length || entry.links?.length);
  const entryHasEditableSource = hasEditableSource(entry);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("transaction"),
          headerRight: sha256sum
            ? () => (
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.headerIconButton}
                    onPress={handleEdit}
                    disabled={deleting}
                    accessibilityRole="button"
                    accessibilityLabel={t("editTransaction")}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={22}
                      color={theme.primary}
                    />
                  </Pressable>
                  <MenuButton
                    accessibilityLabel={t("details")}
                    icon={
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={22}
                        color={theme.black}
                      />
                    }
                    items={[
                      {
                        label: t("deleteTransaction"),
                        icon: (
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color={theme.error}
                          />
                        ),
                        onPress: handleDelete,
                      },
                    ]}
                  />
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
          <View style={styles.heroIcon}>
            <AccountTypeIcon postings={iconPostings} />
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          <AmountText
            style={[
              styles.heroAmount,
              {
                color: hero.isPositive === true ? theme.success : theme.text01,
              },
            ]}
          >
            {displayHeroAmount}
          </AmountText>
          {entry.payee && entry.narration ? (
            <Text style={styles.heroSubtitle}>{entry.narration}</Text>
          ) : null}
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={16} color={theme.black80} />
            <Text style={styles.heroDate}>{formattedDate}</Text>
            {isPending && (
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t("pending")}</Text>
              </View>
            )}
          </View>
        </View>

        {postingRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t("moneyFlow")}</Text>
            <View style={[styles.card, styles.flowCard]}>
              {postingRows.map((posting, index) => (
                <PostingRow
                  key={`${posting.account}-${index}`}
                  posting={posting}
                  directionLabel={
                    posting.sign < 0
                      ? t("from")
                      : posting.sign > 0
                        ? t("to")
                        : undefined
                  }
                  showDivider={index > 0}
                  onPress={() => handlePressAccount(posting.account)}
                />
              ))}
            </View>
          </>
        )}

        {hasMetadata && (
          <>
            <Text style={styles.sectionTitle}>{t("details")}</Text>
            <View style={styles.card}>
              {entry.tags?.length ? (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={20}
                    color={theme.black80}
                    style={styles.metadataIcon}
                  />
                  <View style={styles.metadataBody}>
                    <Text style={styles.metadataLabel}>{t("tags")}</Text>
                    <View style={styles.chipRow}>
                      {entry.tags.map((tag) => (
                        <View style={styles.chip} key={tag}>
                          <Text style={styles.chipText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
              {entry.links?.length ? (
                <View
                  style={[
                    styles.metadataRow,
                    Boolean(entry.tags?.length) && styles.metadataRowDivider,
                  ]}
                >
                  <Ionicons
                    name="link-outline"
                    size={20}
                    color={theme.black80}
                    style={styles.metadataIcon}
                  />
                  <View style={styles.metadataBody}>
                    <Text style={styles.metadataLabel}>{t("links")}</Text>
                    <View style={styles.chipRow}>
                      {entry.links.map((link) => (
                        <View style={styles.chip} key={link}>
                          <Text style={styles.chipText}>^{link}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </>
        )}

        {entryHasEditableSource ? (
          <View>
            <EntryContext
              entry={entry}
              ledgerId={ledgerId}
              contextData={data?.getLedgerEntryContext}
              contextLoading={loading}
              contextError={error}
            />
          </View>
        ) : null}
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
