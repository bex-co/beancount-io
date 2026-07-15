import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fonts } from "@/common/theme";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetCommitDetailsQuery } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { LedgerGuard } from "@/components/ledger-guard";
import { parseDiff, DiffLine } from "./diff-utils";

const SKELETON_WIDTHS = [200, 160, 240, 180, 120, 220, 150, 190];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    section: {
      paddingTop: 16,
      paddingBottom: 8,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.black80,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.black40,
      marginHorizontal: 16,
    },
    messageLine: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.black,
      lineHeight: 22,
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    metaLine: {
      fontSize: 13,
      color: theme.black80,
      paddingHorizontal: 16,
      paddingBottom: 4,
    },
    statsRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 16,
    },
    additions: {
      fontSize: 14,
      color: theme.success,
      fontWeight: "600",
    },
    deletions: {
      fontSize: 14,
      color: theme.error,
      fontWeight: "600",
    },
    fileRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    fileName: {
      fontSize: 13,
      color: theme.black,
      fontFamily: fonts.mono,
      flex: 1,
      marginRight: 8,
    },
    fileStats: {
      fontSize: 12,
      color: theme.black80,
    },
    diffContainer: {
      backgroundColor: theme.black10,
    },
    diffLineAdded: {
      backgroundColor: theme.success + "26",
      paddingHorizontal: 12,
      paddingVertical: 1,
    },
    diffLineRemoved: {
      backgroundColor: theme.error + "26",
      paddingHorizontal: 12,
      paddingVertical: 1,
    },
    diffLineContext: {
      paddingHorizontal: 12,
      paddingVertical: 1,
    },
    diffText: {
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 18,
      color: theme.black,
    },
    emptyText: {
      fontSize: 14,
      color: theme.black80,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    skeletonRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
  });

function SkeletonRows(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <>
      {SKELETON_WIDTHS.map((w, i) => (
        <View key={i} style={styles.skeletonRow}>
          <LoadingTile height={16} width={w} />
          <LoadingTile height={12} width={w * 0.5} style={{ marginTop: 6 }} />
        </View>
      ))}
    </>
  );
}

function DiffLineView({ line }: { line: DiffLine }): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const rowStyle =
    line.type === "added"
      ? styles.diffLineAdded
      : line.type === "removed"
        ? styles.diffLineRemoved
        : styles.diffLineContext;
  return (
    <View style={rowStyle}>
      <Text style={styles.diffText} selectable>
        {line.content}
      </Text>
    </View>
  );
}

function CommitDetailScreenImpl(): JSX.Element {
  const { t } = useTranslations();
  const styles = useThemeStyle(getStyles);
  const { sha } = useLocalSearchParams<{ sha: string }>();
  usePageView("commit_detail");

  const ledgerId = useReactiveVar(ledgerVar) ?? "";
  const { data, loading } = useGetCommitDetailsQuery({
    variables: { ledgerId, sha: sha ?? "" },
    skip: !ledgerId || !sha,
    fetchPolicy: "cache-and-network",
  });

  const commit = data?.getCommitDetails;
  const diffLines = commit?.diff ? parseDiff(commit.diff) : null;
  const shortSha = sha ? sha.slice(0, 7) : "";

  return (
    <>
      <Stack.Screen options={{ title: shortSha }} />
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        {loading && !commit ? (
          <SkeletonRows />
        ) : !commit ? (
          <Text style={styles.emptyText}>{t("commitDetailNoDiff")}</Text>
        ) : (
          <ScrollView>
            {/* Summary */}
            <View style={styles.section}>
              <Text style={styles.messageLine}>{commit.message}</Text>
              <Text style={styles.metaLine}>
                {t("commitDetailAuthor")}: {commit.author.name}
              </Text>
            </View>
            <View style={styles.divider} />

            {/* Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("commitDetailStats")}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.additions}>+{commit.stats.additions}</Text>
                <Text style={styles.deletions}>−{commit.stats.deletions}</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Files */}
            {commit.files.length > 0 && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {t("commitDetailFiles")}
                  </Text>
                  {commit.files.map((f) => (
                    <View key={f.filename}>
                      <View style={styles.fileRow}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {f.filename}
                        </Text>
                        <Text style={styles.fileStats}>
                          +{f.additions} −{f.deletions}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Diff */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("commitDetailDiff")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.diffContainer}>
                {diffLines && diffLines.length > 0 ? (
                  <FlatList
                    data={diffLines}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={({ item }) => <DiffLineView line={item} />}
                    scrollEnabled={false}
                  />
                ) : (
                  <Text style={styles.emptyText}>
                    {t("commitDetailNoDiff")}
                  </Text>
                )}
              </View>
            </ScrollView>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

export function CommitDetailScreen(): JSX.Element {
  return (
    <LedgerGuard>
      <CommitDetailScreenImpl />
    </LedgerGuard>
  );
}
