import { StaleDataBanner } from "@/components/stale-data-banner";
import { isShowingStaleDataFromQueries } from "@/common/apollo/stale-data";
import { isolatePath } from "@/common/bidi";
import { routeText } from "@/common/route-text";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { fonts, useTheme } from "@/common/theme";
import { useThemeStyle, useToast } from "@/common/hooks";
import * as Clipboard from "expo-clipboard";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { errorHint } from "@/common/new-ledger-error";
import { selectSectionsPending } from "./section-state";
import {
  appendCommitPage,
  commitPageOverlaps,
  COMMITS_PAGE_SIZE,
  endRowsFor,
  historyEnded,
  type HistoryEnd,
  isLastCommitPage,
  shownCommitPages,
} from "./commit-pages";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useListCommitsQuery } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { LedgerGuard } from "@/components/ledger-guard";
import { FadeInView } from "@/components/crossfade";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import {
  errorCopyText,
  errorSpokenText,
  formatErrorLocation,
  formatCommitAuthorLine,
  commitRowAccessibilityLabel,
  formatShortSha,
  LedgerError,
  splitCommitMessage,
} from "./formatting";
import {
  directionalIcon,
  LEADING_TEXT_ALIGN,
  letterSpacing,
} from "@/common/rtl";
import { CardLoadFailure } from "@/components/card-load-failure";
import { selectCardLoadState } from "@/common/apollo/card-load-state";

const SKELETON_WIDTHS = [180, 220, 160, 200, 140, 190];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    scrollContent: {
      flexGrow: 1,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.black80,
      textTransform: "uppercase",
      letterSpacing: letterSpacing(0.5),
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
      marginHorizontal: 16,
    },
    errorRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    errorContent: {
      flex: 1,
      marginEnd: 8,
    },
    errorMessage: {
      fontSize: 14,
      color: theme.error,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    errorHint: {
      fontSize: 13,
      color: theme.black80,
      lineHeight: 18,
      marginTop: 4,
      textAlign: LEADING_TEXT_ALIGN,
    },
    errorLocation: {
      fontSize: 12,
      color: theme.black80,
      marginTop: 2,
      fontFamily: fonts.mono,
      textAlign: LEADING_TEXT_ALIGN,
    },
    emptyRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.black80,
      lineHeight: 20,
    },
    olderRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    olderText: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.primary,
    },
    changeRow: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    changeContent: {
      flex: 1,
      marginEnd: 8,
    },
    changeMessage: {
      fontSize: 14,
      color: theme.black,
      lineHeight: 20,
      textAlign: LEADING_TEXT_ALIGN,
    },
    changeMeta: {
      fontSize: 12,
      color: theme.black80,
      marginTop: 2,
      textAlign: LEADING_TEXT_ALIGN,
    },
    changeSha: {
      fontFamily: fonts.mono,
    },
    skeletonRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
  });

function SkeletonRows(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <>
      {SKELETON_WIDTHS.map((w, i) => (
        <View key={i} style={styles.skeletonRow}>
          <LoadingTile height={16} width={w} />
          <LoadingTile height={12} width={w * 0.6} style={{ marginTop: 6 }} />
        </View>
      ))}
    </>
  );
}

function ErrorRow({
  err,
  ledgerId,
}: {
  err: LedgerError;
  ledgerId: string;
}): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const canFix = !!err.filename;
  const { t } = useTranslations();
  const toast = useToast();
  // A long press, or VoiceOver's actions rotor, copies the message with its
  // place (w21/432).
  const copyError = async () => {
    await Clipboard.setStringAsync(errorCopyText(err));
    toast.showToast({ message: t("copied"), type: "text" });
  };

  const handlePress = () => {
    if (!canFix) return;
    router.push({
      pathname: "/(app)/ledger-file-editor",
      params: {
        path: routeText(err.filename!),
        ledger: ledgerId,
        ...(err.lineno != null ? { initialLine: String(err.lineno) } : {}),
      },
    });
  };

  const inner = (
    <View style={styles.errorRow}>
      <View style={styles.errorContent}>
        <Text style={styles.errorMessage} selectable={!canFix}>
          {err.message}
        </Text>
        {errorHint(err) && (
          <Text style={styles.errorHint}>{errorHint(err)}</Text>
        )}
        {err.filename && (
          <Text style={styles.errorLocation}>
            {isolatePath(formatErrorLocation(err))}
          </Text>
        )}
      </View>
      {canFix && (
        <Ionicons
          accessibilityElementsHidden
          importantForAccessibility="no"
          name="open-outline"
          size={16}
          color={theme.black60}
        />
      )}
    </View>
  );

  if (canFix) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        onLongPress={() => void copyError()}
        accessibilityRole="button"
        accessibilityLabel={errorSpokenText(err)}
        accessibilityActions={[{ name: "copy", label: t("copy") }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "copy") void copyError();
        }}
      >
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function NotificationsScreenImpl(): JSX.Element {
  const { t, locale } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);

  const ledgerId = useReactiveVar(ledgerVar) ?? "";

  const {
    errors,
    loaded: errorsLoaded,
    loading: errorsLoading,
    error: errorsError,
    count: errorCount,
    refetch: refetchErrors,
  } = useLedgerErrors();
  const errorsLoadState = selectCardLoadState({
    loading: errorsLoading,
    hasData: errorsLoaded,
    error: errorsError,
  });

  const [refreshing, setRefreshing] = useState(false);
  const {
    data: commitsData,
    loading: commitsLoading,
    error: commitsError,
    refetch: refetchCommits,
    fetchMore: fetchMoreCommits,
  } = useListCommitsQuery({
    variables: { ledgerId, branch: "main", page: 1, limit: COMMITS_PAGE_SIZE },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  // "Show older" pages back through the history (w21/313): the next page, until
  // one comes back short. The page to ask for follows from the rows shown, and
  // the end is remembered as the row count the short page left, so a refetch
  // that drops the list to its first page brings the button back (w21/431), and
  // an empty page after a whole number of pages ends the list (w21/498).
  const shownRows = commitsData?.listCommits.length ?? 0;
  const shownPages = shownCommitPages(shownRows);
  const headSha = commitsData?.listCommits[0]?.sha;
  const [historyEnd, setHistoryEnd] = useState<HistoryEnd | null>(null);
  const noOlder = historyEnded(shownRows, endRowsFor(historyEnd, headSha));
  const [loadingOlder, setLoadingOlder] = useState(false);
  useEffect(() => {
    setHistoryEnd(null);
  }, [ledgerId]);
  const showOlder = async () => {
    if (loadingOlder) return;
    setLoadingOlder(true);
    const page = shownPages + 1;
    let mergedRows = 0;
    let moved = false;
    try {
      const result = await fetchMoreCommits({
        variables: { page },
        updateQuery: (previous, { fetchMoreResult }) => {
          moved = commitPageOverlaps(
            previous.listCommits,
            fetchMoreResult.listCommits,
          );
          if (moved) return previous;
          const listCommits = appendCommitPage(
            previous.listCommits,
            fetchMoreResult.listCommits,
          );
          mergedRows = listCommits.length;
          return { listCommits };
        },
      });
      if (moved) {
        // Commits landed since the list was read: start again from the first
        // page, where they now sit (w21/626).
        await refetchCommits();
      } else if (isLastCommitPage(result.data.listCommits))
        setHistoryEnd({ rows: mergedRows, head: headSha });
    } catch {
      // The rows already shown stay; the button is there to try again.
    } finally {
      setLoadingOlder(false);
    }
  };

  // Rows show the subject line only: git messages end in a newline, which
  // filled the two-line slot with a blank line (w0/032).
  const commits = (commitsData?.listCommits ?? []).map((commit) => ({
    ...commit,
    subject: splitCommitMessage(commit.message).subject,
  }));
  const { errorsPending, commitsPending } = selectSectionsPending({
    errorsLoaded,
    errorsFailed: errorsLoadState === "failed",
    commitsLoading,
    commitsLoaded: commitsData !== undefined,
  });

  // Data from before a failed refresh stays on screen under a banner, and is
  // not taken for a clean bill of health (w21/860).
  const showStale = isShowingStaleDataFromQueries([
    { data: errorsLoaded ? errors : undefined, error: errorsError },
    { data: commitsData, error: commitsError },
  ]);
  const errorsStale = errorsLoaded && Boolean(errorsError);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Both halves: an error fixed outside the app clears on a pull too.
      setHistoryEnd(null);
      await Promise.all([refetchCommits(), refetchErrors()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t("notificationsTitle") }} />
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        {showStale ? <StaleDataBanner /> : null}
        <ScrollView
          // flexGrow keeps short content (healthy ledger, no changes) filling the
          // frame, so the whole area stays pull-to-refreshable, not just the rows.
          contentContainerStyle={styles.scrollContent}
          alwaysBounceVertical
          refreshControl={
            <ThemedRefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t("notificationsErrorsSection")}
          </Text>
          <View style={styles.divider} />

          {errorsPending ? (
            <SkeletonRows />
          ) : (
            <FadeInView>
              {errorsLoadState === "failed" ? (
                <CardLoadFailure onRetry={() => refetchErrors()} />
              ) : errorCount === 0 && errorsStale ? null : errorCount === 0 ? (
                <View style={styles.emptyRow}>
                  <Ionicons
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    name="checkmark-circle-outline"
                    size={18}
                    color={theme.success}
                  />
                  <Text style={styles.emptyText}>
                    {t("notificationsLedgerHealthy")}
                  </Text>
                </View>
              ) : (
                errors.map((err, i) => (
                  <View key={i}>
                    <ErrorRow err={err} ledgerId={ledgerId} />
                    <View style={styles.divider} />
                  </View>
                ))
              )}
            </FadeInView>
          )}

          <Text style={styles.sectionHeader} accessibilityRole="header">
            {t("notificationsChangesSection")}
          </Text>
          <View style={styles.divider} />

          {commitsPending ? (
            <SkeletonRows />
          ) : (
            <FadeInView>
              {selectCardLoadState({
                loading: commitsLoading,
                hasData: commitsData !== undefined,
                error: commitsError,
              }) === "failed" ? (
                <CardLoadFailure onRetry={() => refetchCommits()} />
              ) : commits.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    {t("notificationsNoChanges")}
                  </Text>
                </View>
              ) : (
                commits.map((commit, i) => (
                  <View key={commit.sha}>
                    <TouchableOpacity
                      style={styles.changeRow}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={commitRowAccessibilityLabel(
                        commit,
                        t("commitNoMessage"),
                        locale,
                      )}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/commit-detail",
                          // `ledger` binds the entry to this ledger's
                          // repository; see `common/route-ledger`.
                          params: { sha: commit.sha, ledger: ledgerId },
                        })
                      }
                    >
                      <View style={styles.changeContent}>
                        <Text style={styles.changeMessage} numberOfLines={2}>
                          {commit.subject || t("commitNoMessage")}
                        </Text>
                        <Text style={styles.changeMeta}>
                          {formatCommitAuthorLine(
                            commit.author.name,
                            commit.author.date,
                            locale,
                          )}{" "}
                          <Text style={styles.changeSha}>
                            {formatShortSha(commit.sha, commit.shortSha)}
                          </Text>
                        </Text>
                      </View>
                      <Ionicons
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        name={directionalIcon("chevron-forward")}
                        size={18}
                        color={theme.black60}
                      />
                    </TouchableOpacity>
                    {i < commits.length - 1 && <View style={styles.divider} />}
                  </View>
                ))
              )}
            </FadeInView>
          )}

          {!commitsPending &&
          commits.length >= COMMITS_PAGE_SIZE &&
          !noOlder ? (
            <TouchableOpacity
              testID="notifications-show-older"
              style={styles.olderRow}
              activeOpacity={0.7}
              onPress={() => void showOlder()}
              disabled={loadingOlder}
              accessibilityRole="button"
              accessibilityState={{
                busy: loadingOlder,
                disabled: loadingOlder,
              }}
            >
              <Text style={styles.olderText}>
                {t("notificationsShowOlder")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

export function NotificationsScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <NotificationsScreenImpl />
    </LedgerGuard>
  );
}
