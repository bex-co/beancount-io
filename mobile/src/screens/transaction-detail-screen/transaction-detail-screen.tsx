import { routeText } from "@/common/route-text";
import { useGuest } from "@/common/guest/guest-context";
import { useLedgerAccess } from "@/common/hooks/use-ledger-access";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { CardLoadFailure } from "@/components/card-load-failure";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import {
  fonts,
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
  withAlpha,
} from "@/common/theme";
import { AmountText } from "@/components/amount-text";
import { AccountTypeIcon } from "@/components/account-type-icon";
import { entryRowTitle } from "@/screens/transactions-screen/entry-row/entry-row-secondary";
import { LoadingTile } from "@/components/loading-tile";
import { MenuButton, type MenuButtonItem } from "@/components/menu-button";
import { useThemeStyle, useToast } from "@/common/hooks";
import { useLedgerWrite } from "@/common/hooks/use-ledger-write";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { useDeleteLedgerEntrySourceSliceMutation } from "@/generated-graphql/graphql";
import {
  invalidateLedgerData,
  ledgerRevisionVar,
} from "@/common/apollo/invalidate-ledger";
import { EntryContext } from "@/screens/transactions-screen/entry-context";
import { openEditTransaction } from "@/screens/edit-transaction-screen";
import {
  JournalDirectiveType,
  JournalTransaction,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { formatLedgerDate } from "@/common/date-format";
import {
  selectStashedTransaction,
  selectedTransactionVar,
} from "./open-transaction-detail";
import { bindRouteLedger } from "@/common/route-ledger";
import { RouteLedgerUnavailable } from "@/components/route-ledger-unavailable";
import {
  selectEntrySource,
  selectHeroAmount,
  selectPostingRows,
  selectTransactionMenuActions,
  selectTransactionSubtitle,
  selectTransactionTitle,
  type TransactionMenuAction,
  userMetadataLines,
} from "./selectors/select-transaction-detail";
import {
  holdGeneratedEntry,
  selectOwnEntry,
} from "./selectors/select-own-entry";
import { selectSourceSlice, sourceKind } from "./selectors/select-source-slice";
import {
  forgetSavedChecksum,
  isSavedChecksum,
  isShownEntryReplaced,
  nextShownChecksum,
} from "./selectors/select-shown-checksum";
import { isPluginCopy } from "./selectors/select-plugin-copy";
import { selectHeroBadges } from "./selectors/select-hero-badges";
import { useTransactionContext } from "./use-transaction-context";
import { shouldShowTransactionWriteActions } from "./selectors/select-transaction-write-actions";
import {
  createRevisionCheck,
  isEntryGone,
} from "./selectors/select-entry-gone";
import { selectEntryErrors } from "./selectors/select-entry-errors";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { useLedgerRootNames } from "@/common/hooks/use-ledger-root-names";
import { useOperatingCurrency } from "@/common/hooks/use-operating-currency";
import { useToday } from "@/common/hooks/use-today";
import { deleteTransaction } from "./delete-transaction";
import { ledgerWriteFailureMessage } from "@/common/ledger-refusal";
import { i18n } from "@/translations";
import { PostingRow } from "./components/posting-row";
import { buildLedgerUrl } from "@/common/app-links/build-ledger-url";
import {
  copyLedgerUrl,
  shareLedgerUrl,
} from "@/common/app-links/ledger-url-actions";
import { getServerUrl } from "@/common/vars/server-url";
import { HERO_AMOUNT_FIT } from "@/components/amount-text/hero-amount-fit";
import { LEADING_TEXT_ALIGN, letterSpacing } from "@/common/rtl";
import { createSingleFlight } from "@/common/single-flight";
import { useRouteParams } from "@/common/hooks/use-route-params";

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
      color: theme.black80,
      textAlign: "center",
    },
    sourceSlice: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      textAlign: "left",
      writingDirection: "ltr",
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
      // AmountText aligns to the leading edge; the hero is centred, and a
      // shrunk amount would otherwise sit against one side.
      textAlign: "center",
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
      flexWrap: "wrap",
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
      color: theme.warningText,
    },
    // A forecast, a pad or a future date: noted, not a warning.
    noteBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.black10,
    },
    noteText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
    },
    sectionTitle: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginTop: 8,
      marginBottom: 8,
    },
    errorBanner: {
      borderWidth: 1,
      borderColor: theme.error,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginBottom: 8,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    },
    errorText: {
      flex: 1,
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.error,
      textAlign: LEADING_TEXT_ALIGN,
    },
    errorAction: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.medium,
      color: theme.primary,
      textAlign: LEADING_TEXT_ALIGN,
    },
    copyNotice: {
      borderWidth: 1,
      borderColor: theme.controlBorder,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      marginBottom: 8,
    },
    copyNoticeText: {
      fontSize: fontSizes.sm,
      lineHeight: 20,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
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
    metadataLine: {
      fontSize: fontSizes.sm,
      fontFamily: fonts.mono,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    metadataLabel: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.black80,
      marginBottom: 5,
      textTransform: "uppercase",
      letterSpacing: letterSpacing(0.4),
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
  const operatingCurrency = useOperatingCurrency();
  const roots = useLedgerRootNames();
  const { canWrite } = useLedgerAccess();
  const router = useRouter();
  const guest = useGuest();
  const { t, locale } = useTranslations();
  const today = useToday();
  const toast = useToast();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;

  const confirmWrite = useLedgerWrite();
  const stashed = useReactiveVar(
    guest?.selectedTransaction ?? selectedTransactionVar,
  );
  const client = useApolloClient();
  const stashedEntry = selectStashedTransaction(stashed, {
    entryHash,
    ledgerId,
  });
  // A generated entry stays known after another transaction is stashed over
  // it (w21/444).
  const [heldGenerated, setHeldGenerated] = useState<JournalTransaction | null>(
    null,
  );
  const nextHeld = holdGeneratedEntry(heldGenerated, stashedEntry);
  if (nextHeld !== heldGenerated) setHeldGenerated(nextHeld);

  // Also serves as the fallback entry source when the stash is cold (deep
  // link or remount) — the context payload carries the full entry JSON.
  const {
    data,
    loading,
    error,
    refetch: refetchContext,
    generatedFrom,
  } = useTransactionContext({ entryHash, ledgerId }, !entryHash);
  // Read for a possibly generated entry too: only the read tells one written
  // with flag R from one a plugin made (w21/745).
  const [sourced, setSourced] = useState(false);
  if (!sourced && data?.getLedgerEntryContext) setSourced(true);
  const ownEntry = selectOwnEntry(stashedEntry, nextHeld, entryHash, sourced);
  // A write made from a screen above this one (a delete, an editor fix) leaves
  // this entry's context cached as it was. Recheck on return, and only when
  // the ledger was written meanwhile; a NOT_FOUND then shows the gone state
  // below (w21/094).
  const ledgerChangedSinceCheck = useMemo(
    () => createRevisionCheck(() => ledgerRevisionVar()),
    [],
  );
  // The revision moves only when an invalidation has settled, which can be
  // after the screen above has navigated back here: a focus-only check saw no
  // change and the later bump went unread (w21/527). Following the revision
  // re-runs the check while focused.
  const ledgerRevision = useReactiveVar(ledgerRevisionVar);
  // The checksum of the slice first shown, which every write carries: a twin
  // entry's ID can come to answer with the other twin's slice (w21/672).
  const readSha = data?.getLedgerEntryContext?.sha256sum;
  const [pinnedSha, setPinnedSha] = useState<string | undefined>();
  // An Edit's own save legitimately changes the slice: a read that is the
  // slice that save returned is adopted. Anything else is not, so an Edit that
  // was cancelled leaves the guard on (w21/692).
  // Worked out while rendering, not after it: an effect adopting the saved
  // checksum ran after the frame that already compared the old one, painting
  // "changed or removed" for a frame and refetching the ledger a second time
  // (w21/906). The effect only stores it.
  const shownSha = nextShownChecksum(pinnedSha, readSha, {
    loading,
    adoptNext: isSavedChecksum(readSha),
  });
  useEffect(() => {
    if (shownSha !== pinnedSha) {
      if (isSavedChecksum(readSha)) forgetSavedChecksum();
      setPinnedSha(shownSha);
    }
  }, [shownSha, pinnedSha, readSha]);
  const entryReplaced = isShownEntryReplaced(shownSha, readSha, loading);
  useFocusEffect(
    useCallback(() => {
      if (!entryHash) return;
      if (ledgerChangedSinceCheck()) {
        void refetchContext().catch(() => undefined);
      }
      // `ledgerRevision` only re-runs this; the check reads the var itself.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entryHash, ledgerChangedSinceCheck, refetchContext, ledgerRevision]),
  );

  const [deleteMutation] = useDeleteLedgerEntrySourceSliceMutation();
  // One delete at a time: with no feedback a user repeated ⋯ → Delete, and
  // the second got "not found" after the first had succeeded (w21/197).
  const [deleting, setDeleting] = useState(false);
  const deleteFlight = useRef(createSingleFlight(setDeleting)).current;

  const sha256sum = shownSha ?? readSha;

  const handleEdit = useCallback(() => {
    if (!canWrite || !sha256sum) return;
    openEditTransaction(router, {
      entryHash,
      ledgerId,
      originAccount,
      sha256sum,
    });
  }, [canWrite, sha256sum, entryHash, ledgerId, originAccount, router]);

  const handleDelete = useCallback(() => {
    if (!canWrite || !sha256sum || deleteFlight.busy()) return;
    Alert.alert(t("deleteTransactionTitle"), t("deleteTransactionMessage"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deleteTransaction"),
        style: "destructive",
        onPress: () =>
          void deleteFlight.run(() =>
            deleteTransaction({
              confirmWrite,
              perform: () =>
                deleteMutation({
                  variables: {
                    input: { entryHash, sha256sum },
                    ledgerId,
                  },
                }),
              // The server's reason is more useful than "delete failed".
              describeFailure: (e) => ledgerWriteFailureMessage(e, i18n),
              showRefusal: (title, message) => Alert.alert(title, message),
              messages: {
                loading: t("deleting"),
                success: t("deleteSuccess"),
                failure: t("deleteFailed"),
                changed: t("deleteTransactionChanged"),
              },
              afterSuccess: () => invalidateLedgerData(client, "entries"),
              // The entry moved on elsewhere: reload it, so a removed one
              // shows its state and a changed one deletes on the fresh copy
              // instead of failing the same way again (w21/250).
              onStale: async () => {
                void invalidateLedgerData(client, "entries");
                await refetchContext().catch(() => undefined);
              },
            }),
          ),
      },
    ]);
  }, [
    canWrite,
    sha256sum,
    entryHash,
    ledgerId,
    deleteMutation,
    client,
    refetchContext,
    t,
    confirmWrite,
    deleteFlight,
  ]);

  const entry: JournalTransaction | null = useMemo(() => {
    if (ownEntry) {
      return ownEntry;
    }
    const contextEntry = data?.getLedgerEntryContext?.entry as unknown as
      JournalDirectiveType | undefined;
    return contextEntry && isJournalTransaction(contextEntry)
      ? contextEntry
      : null;
  }, [ownEntry, data]);

  const sourceSlice = selectSourceSlice(
    data?.getLedgerEntryContext,
    entry !== null,
  );

  // Errors the ledger reports inside this entry's own lines (w21/030).
  const { errors: ledgerErrors } = useLedgerErrors(ledgerId);
  const contextSource = data?.getLedgerEntryContext;
  const sourceMeta = (
    contextSource?.entry as { meta?: { filename?: string; lineno?: number } }
  )?.meta;
  const entryErrors = selectEntryErrors(
    ledgerErrors,
    contextSource && sourceMeta?.filename && sourceMeta.lineno != null
      ? {
          filename: sourceMeta.filename,
          lineno: sourceMeta.lineno,
          slice: contextSource.slice,
        }
      : null,
  );
  const openErrorInEditor = useCallback(
    (error: { filename?: string | null; lineno?: number | null }) => {
      router.push({
        pathname: guest
          ? "/examples/ledger-file-editor"
          : "/(app)/ledger-file-editor",
        params: {
          path: routeText(error.filename ?? ""),
          ledger: ledgerId,
          ...(error.lineno != null
            ? { initialLine: String(error.lineno) }
            : {}),
        },
      });
    },
    [router, guest],
  );

  // Changed or removed elsewhere since the list loaded: refresh the lists
  // behind this screen so the stale row is gone when the user goes back.
  const { isGenerated, gone: entryGone } = selectEntrySource({
    entry,
    sourced,
    notFound: isEntryGone(error),
  });
  useEffect(() => {
    if (entryGone) void invalidateLedgerData(client, "entries");
  }, [entryGone, client]);
  useEffect(() => {
    if (entryReplaced) void invalidateLedgerData(client, "entries");
  }, [entryReplaced, client]);

  const handlePressAccount = useCallback(
    (account: string) => {
      if (originAccount && account === originAccount) {
        router.back();
        return;
      }
      // `ledger` binds the pushed entry to this ledger, so a later ledger
      // switch cannot revive it under a different one.
      router.push({
        pathname: guest ? "/examples/account-detail" : "/account-detail",
        params: { account, ledger: ledgerId },
      });
    },
    [router, originAccount, ledgerId, guest],
  );

  // A generated entry (flag `P`, `S`, … and no source found) is synthesized by
  // a report or plugin, so it has no entry context to link to: the permalink
  // would land on "No entry context data available".

  const entryLinkUrl =
    entryHash && !isGenerated && ledgerId
      ? buildLedgerUrl(
          {
            kind: "entry",
            ledgerFullName: ledgerId,
            entryHash,
          },
          getServerUrl(),
        )
      : null;

  const handleShareLink = useCallback(() => {
    if (!entryLinkUrl) return;
    shareLedgerUrl(entryLinkUrl);
  }, [entryLinkUrl]);

  const handleCopyLink = useCallback(() => {
    if (!entryLinkUrl) return;
    copyLedgerUrl(entryLinkUrl, () => {
      toast.showToast({ message: t("copied"), type: "text" });
    });
  }, [entryLinkUrl, toast, t]);

  if (entryGone) {
    // Not the cached copy, and no Share or Copy link to an entry that no
    // longer exists (w21/013).
    return (
      <RouteLedgerUnavailable
        title={t("transaction")}
        message={t("transactionDetailRemoved")}
      />
    );
  }

  if (entryReplaced) {
    // Another entry's slice now answers this ID (a twin moved onto it): not
    // this entry, and a Delete on it would remove the other (w21/672).
    return (
      <RouteLedgerUnavailable
        title={t("transaction")}
        message={t("transactionDetailRemoved")}
      />
    );
  }

  if (!entry) {
    // A source that is not a transaction (a pad) is titled and edited as what it
    // is (w21/841).
    const kind = sourceSlice ? sourceKind(sourceSlice) : null;
    const editLabel =
      kind && kind !== "transaction" ? t("editEntry") : t("editTransaction");
    const sourceTitle =
      kind && kind !== "transaction" ? t(kind) : t("transaction");
    return (
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        <Stack.Screen
          options={{
            title: sourceTitle,
            // No actions of the entry that was showing while this loads (w21/842).
            headerRight: () => null,
          }}
        />
        <View style={styles.stateContainer}>
          {loading ? (
            <View style={styles.detailSkeleton}>
              <LoadingTile style={styles.skeletonIcon} />
              <LoadingTile style={styles.skeletonTitle} />
              <LoadingTile style={styles.skeletonAmount} />
              <LoadingTile style={styles.skeletonMeta} />
              <LoadingTile style={styles.skeletonSection} />
            </View>
          ) : error ? (
            // A cold link whose read failed (not "gone": that returned above)
            // is not "no data": it can be retried (w21/296).
            <CardLoadFailure
              onRetry={() => void refetchContext().catch(() => undefined)}
            />
          ) : sourceSlice ? (
            // The plugin's source has no parsed entry, only its written text
            // (w21/660): show that, and let a writer edit it.
            <View>
              <Text style={styles.sourceSlice} selectable>
                {sourceSlice}
              </Text>
              {canWrite && sha256sum ? (
                <Pressable
                  onPress={handleEdit}
                  accessibilityRole="button"
                  accessibilityLabel={editLabel}
                >
                  <Text style={styles.stateText}>{editLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={styles.stateText}>{t("journalNoData")}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const hero = selectHeroAmount(
    entry,
    t("multiplePostings"),
    operatingCurrency,
    roots,
  );
  const postingRows = selectPostingRows(entry, operatingCurrency);
  const title = selectTransactionTitle(entry) || t("transaction");
  const subtitle = selectTransactionSubtitle(entry);
  const heroBadges = selectHeroBadges(entry, today, {
    pending: t("pending"),
    forecast: t("entryForecast"),
    pad: t("pad"),
    upcoming: t("entryUpcoming"),
  });
  const formattedDate = formatLedgerDate(entry.date.slice(0, 10), locale);
  const iconPostings = entry.postings.map((posting) => ({
    account: posting.account,
    amount: Number.parseFloat(posting.units.number),
    currency: posting.units.currency,
  }));
  const entryMeta = userMetadataLines(entry.meta);
  const hasMetadata = Boolean(
    entry.tags?.length || entry.links?.length || entryMeta.length,
  );
  // Source and balance context is read-only, so any reader of a
  // source-backed entry sees it; only edit/delete need write access.
  const showEntryContext = !isGenerated;
  const pluginCopy = isPluginCopy(entry, contextSource?.slice, generatedFrom);
  const showWriteActions = shouldShowTransactionWriteActions(
    canWrite,
    sha256sum,
    pluginCopy,
  );
  const menuActions = selectTransactionMenuActions({
    isGenerated,
    showWriteActions,
    pluginCopy,
  });
  const menuItemFor: Record<TransactionMenuAction, MenuButtonItem> = {
    shareLink: {
      label: t("shareLink"),
      icon: <Ionicons name="share-outline" size={22} color={theme.black} />,
      onPress: handleShareLink,
    },
    copyLink: {
      label: t("copyLink"),
      icon: <Ionicons name="link-outline" size={22} color={theme.black} />,
      onPress: handleCopyLink,
    },
    deleteTransaction: {
      label: t("deleteTransaction"),
      icon: <Ionicons name="trash-outline" size={22} color={theme.error} />,
      onPress: handleDelete,
    },
  };
  const menuItems = menuActions.map((action) => menuItemFor[action]);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.container}>
      <Stack.Screen
        options={{
          title: t("transaction"),
          headerRight:
            entryHash && (showWriteActions || menuItems.length > 0)
              ? () => (
                  <View style={styles.headerActions}>
                    {showWriteActions ? (
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
                    ) : null}
                    {menuItems.length > 0 ? (
                      <MenuButton
                        accessibilityLabel={t("transactionActions")}
                        icon={
                          <Ionicons
                            name="ellipsis-horizontal"
                            size={22}
                            color={theme.black}
                          />
                        }
                        items={menuItems}
                      />
                    ) : null}
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
          <View
            style={styles.heroIcon}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <AccountTypeIcon
              postings={iconPostings}
              payee={entryRowTitle(entry)}
            />
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          <AmountText
            {...HERO_AMOUNT_FIT}
            style={[
              styles.heroAmount,
              {
                color: hero.isPositive === true ? theme.success : theme.text01,
              },
            ]}
          >
            {hero.text}
          </AmountText>
          {subtitle ? (
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          ) : null}
          <View style={styles.heroMeta}>
            <Ionicons
              name="calendar-outline"
              accessibilityElementsHidden
              importantForAccessibility="no"
              size={16}
              color={theme.black80}
            />
            <Text style={styles.heroDate}>{formattedDate}</Text>
            {heroBadges.map((badge) =>
              badge.tone === "warning" ? (
                <View key={badge.key} style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{badge.text}</Text>
                </View>
              ) : (
                <View key={badge.key} style={styles.noteBadge}>
                  <Text style={styles.noteText}>{badge.text}</Text>
                </View>
              ),
            )}
          </View>
        </View>

        {entryErrors.length > 0 ? (
          <View style={styles.errorBanner} testID="transaction-errors">
            {entryErrors.map((error, index) => (
              <View key={`${error.lineno}-${index}`} style={styles.errorRow}>
                <Ionicons
                  name="warning-outline"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  size={16}
                  color={theme.error}
                />
                <Text style={styles.errorText} selectable>
                  {error.message}
                </Text>
              </View>
            ))}
            <Text
              style={styles.errorAction}
              accessibilityRole="button"
              onPress={() => openErrorInEditor(entryErrors[0]!)}
            >
              {t("transactionErrorOpenFile")}
            </Text>
          </View>
        ) : null}

        {pluginCopy ? (
          // Edit and Delete are withheld from a copy, since they would change
          // its source and every other copy: say so, and open the source when
          // the ledger names it (w21/508).
          <View style={styles.copyNotice} testID="transaction-plugin-copy">
            <Text style={styles.copyNoticeText}>
              {entry.flag === "P" ? t("paddingNotice") : t("pluginCopyNotice")}
            </Text>
            {generatedFrom ? (
              <Text
                style={styles.errorAction}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: guest
                      ? "/examples/transaction-detail"
                      : "/transaction-detail",
                    params: { entry_hash: generatedFrom, ledger: ledgerId },
                  })
                }
              >
                {t("pluginCopyOpenSource")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {postingRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t("moneyFlow")}
            </Text>
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
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t("details")}
            </Text>
            <View style={styles.card}>
              {entry.tags?.length ? (
                <View style={styles.metadataRow}>
                  <Ionicons
                    name="pricetag-outline"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
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
                    accessibilityElementsHidden
                    importantForAccessibility="no"
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
              {entryMeta.length ? (
                <View
                  style={[
                    styles.metadataRow,
                    Boolean(entry.tags?.length || entry.links?.length) &&
                      styles.metadataRowDivider,
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    size={20}
                    color={theme.black80}
                    style={styles.metadataIcon}
                  />
                  <View style={styles.metadataBody}>
                    <Text style={styles.metadataLabel}>{t("metadata")}</Text>
                    {entryMeta.map((line) => (
                      <Text style={styles.metadataLine} key={line} selectable>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </>
        )}

        {showEntryContext ? (
          <View>
            <EntryContext
              entry={entry}
              ledgerId={ledgerId}
              contextData={data?.getLedgerEntryContext}
              contextLoading={loading}
              contextError={error}
              onRetryContext={() => void refetchContext().catch(() => {})}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const TransactionDetailRoute = ({
  entryHash,
  ledger,
  originAccount,
}: {
  entryHash: string;
  ledger?: string | string[];
  originAccount?: string;
}): JSX.Element => {
  const { t } = useTranslations();
  const binding = bindRouteLedger(ledger, useLedgerGuard());

  if (binding.status === "mismatch") {
    // A revived entry from another ledger: render nothing of it and query
    // nothing, so its postings cannot open accounts in the new ledger.
    return (
      <RouteLedgerUnavailable
        title={t("transaction")}
        message={t("transactionDetailUnavailable")}
      />
    );
  }
  return (
    <TransactionDetailImpl
      entryHash={entryHash}
      originAccount={originAccount}
    />
  );
};

export const TransactionDetailScreen = (): JSX.Element => {
  // `ledger` binds the entry to the ledger it was opened for; see
  // `common/route-ledger` for why the ambient selection is not enough.
  const params = useRouteParams<{
    entry_hash?: string;
    ledger?: string;
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
      <TransactionDetailRoute
        entryHash={entryHash}
        ledger={params.ledger}
        originAccount={originAccount}
      />
    </LedgerGuard>
  );
};
