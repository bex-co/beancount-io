import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { fonts, useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLedgerErrors } from "@/common/hooks/use-ledger-errors";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useListCommitsQuery } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { LedgerGuard } from "@/components/ledger-guard";
import { FadeInView } from "@/components/crossfade";
import { ThemedRefreshControl } from "@/components/dashboard-scroll-view";
import { formatErrorLocation, formatShortSha, LedgerError } from "./formatting";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";

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
      letterSpacing: 0.5,
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

function ErrorRow({ err }: { err: LedgerError }): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const canFix = !!err.filename;

  const handlePress = () => {
    if (!canFix) return;
    router.push({
      pathname: "/(app)/ledger-file-editor",
      params: {
        path: err.filename!,
        ...(err.lineno != null ? { initialLine: String(err.lineno) } : {}),
      },
    });
  };

  const inner = (
    <View style={styles.errorRow}>
      <View style={styles.errorContent}>
        <Text style={styles.errorMessage}>{err.message}</Text>
        {err.filename && (
          <Text style={styles.errorLocation}>{formatErrorLocation(err)}</Text>
        )}
      </View>
      {canFix && (
        <Ionicons name="open-outline" size={16} color={theme.black60} />
      )}
    </View>
  );

  if (canFix) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

function NotificationsScreenImpl(): JSX.Element {
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);

  const ledgerId = useReactiveVar(ledgerVar) ?? "";

  const {
    errors,
    loading: errorsLoading,
    count: errorCount,
  } = useLedgerErrors();

  const [refreshing, setRefreshing] = useState(false);
  const {
    data: commitsData,
    loading: commitsLoading,
    refetch: refetchCommits,
  } = useListCommitsQuery({
    variables: { ledgerId, branch: "main", page: 1, limit: 30 },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  const commits = commitsData?.listCommits ?? [];
  const isFirstLoad = (errorsLoading || commitsLoading) && !commitsData;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchCommits();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t("notificationsTitle") }} />
      <SafeAreaView edges={["bottom"]} style={styles.container}>
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
          <Text style={styles.sectionHeader}>
            {t("notificationsErrorsSection")}
          </Text>
          <View style={styles.divider} />

          {isFirstLoad ? (
            <SkeletonRows />
          ) : (
            <FadeInView>
              {errorCount === 0 ? (
                <View style={styles.emptyRow}>
                  <Ionicons
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
                    <ErrorRow err={err} />
                    <View style={styles.divider} />
                  </View>
                ))
              )}
            </FadeInView>
          )}

          <Text style={styles.sectionHeader}>
            {t("notificationsChangesSection")}
          </Text>
          <View style={styles.divider} />

          {isFirstLoad ? (
            <SkeletonRows />
          ) : (
            <FadeInView>
              {commits.length === 0 ? (
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
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/commit-detail",
                          params: { sha: commit.sha },
                        })
                      }
                    >
                      <View style={styles.changeContent}>
                        <Text style={styles.changeMessage} numberOfLines={2}>
                          {commit.message}
                        </Text>
                        <Text style={styles.changeMeta}>
                          {commit.author.name}{" "}
                          <Text style={styles.changeSha}>
                            {formatShortSha(commit.sha, commit.shortSha)}
                          </Text>
                        </Text>
                      </View>
                      <Ionicons
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
