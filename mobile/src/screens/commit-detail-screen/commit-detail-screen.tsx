import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, Stack } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fonts } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useGetCommitDetailsQuery } from "@/generated-graphql/graphql";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";
import { RouteLedgerUnavailable } from "@/components/route-ledger-unavailable";
import { bindRouteLedger, firstRouteParam } from "@/common/route-ledger";
import {
  diffLineText,
  commitFileRows,
  DIFF_PAGE_LINES,
  nextDiffChunk,
  parseDiff,
  type CommitFileRow,
  DiffLine,
} from "./diff-utils";
import { isolatePath, isolateSourceLine } from "@/common/bidi";
import { LEADING_TEXT_ALIGN, letterSpacing, LTR_SOURCE } from "@/common/rtl";
import {
  formatCommitAuthorLine,
  splitCommitMessage,
} from "@/screens/notifications-screen/formatting";
import { CardLoadFailure } from "@/components/card-load-failure";
import { selectCardLoadState } from "@/common/apollo/card-load-state";
import { graphQLErrorCodes } from "@/common/graphql-error-codes";
import { useRouteParams } from "@/common/hooks/use-route-params";

/** "Added", "Deleted" or "Renamed from …"; nothing for an edited file. */
function fileStatusText(
  file: CommitFileRow,
  t: ReturnType<typeof useTranslations>["t"],
): string | null {
  switch (file.status) {
    case "added":
      return t("commitFileAdded");
    case "removed":
      return t("commitFileDeleted");
    case "renamed":
      return t("commitFileRenamedFrom", {
        name: isolatePath(file.previousFilename ?? ""),
      });
    default:
      return null;
  }
}

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
      letterSpacing: letterSpacing(0.5),
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
    messageBody: {
      fontSize: 15,
      color: theme.black,
      lineHeight: 22,
      paddingHorizontal: 16,
      paddingBottom: 8,
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
      marginEnd: 8,
      textAlign: LEADING_TEXT_ALIGN,
    },
    fileStats: {
      fontSize: 12,
      color: theme.black80,
    },
    fileStatus: {
      fontSize: 12,
      color: theme.black80,
      paddingHorizontal: 16,
      marginTop: -6,
      paddingBottom: 8,
      textAlign: LEADING_TEXT_ALIGN,
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
    showMore: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    showMoreText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.primary,
      textAlign: LEADING_TEXT_ALIGN,
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
        {isolateSourceLine(diffLineText(line.content))}
      </Text>
    </View>
  );
}

function CommitDetailScreenImpl({
  sha,
  ledgerId,
}: {
  sha: string;
  ledgerId: string;
}): JSX.Element {
  const { t, locale } = useTranslations();
  const styles = useThemeStyle(getStyles);

  const { data, loading, error, refetch } = useGetCommitDetailsQuery({
    variables: { ledgerId, sha },
    skip: !ledgerId || !sha,
    fetchPolicy: "cache-and-network",
  });

  const commit = data?.getCommitDetails;
  const diff = commit?.diff;
  // Parsed once per diff, not on every render.
  const diffLines = useMemo(() => (diff ? parseDiff(diff) : null), [diff]);
  // How much of a large diff is drawn (w21/379).
  const [shown, setShown] = useState(DIFF_PAGE_LINES);
  const fileRows = commit ? commitFileRows(commit.files, commit.diff) : [];
  // The subject heads the summary; the body reflows below it rather than
  // keeping git's ~72-column hard wraps (w0/032).
  const message = splitCommitMessage(commit?.message ?? "");
  const shortSha = sha ? sha.slice(0, 7) : "";

  // An unknown or rewritten sha (a stale Latest Updates row after a force
  // push) answers NOT_FOUND; Try Again could never succeed (w21/297).
  if (!commit && graphQLErrorCodes(error).includes("NOT_FOUND")) {
    return (
      <RouteLedgerUnavailable
        title={shortSha}
        message={t("commitDetailGone")}
      />
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: shortSha }} />
      <SafeAreaView edges={["bottom"]} style={styles.container}>
        {loading && !commit ? (
          <SkeletonRows />
        ) : !commit ? (
          <FadeInView>
            {selectCardLoadState({ loading, hasData: false, error }) ===
            "failed" ? (
              <CardLoadFailure onRetry={() => refetch()} />
            ) : (
              <Text style={styles.emptyText}>{t("commitDetailNoDiff")}</Text>
            )}
          </FadeInView>
        ) : (
          <FadeInView fill>
            <ScrollView>
              {/* Summary */}
              <View style={styles.section}>
                <Text style={styles.messageLine}>
                  {message.subject || t("commitNoMessage")}
                </Text>
                {message.body !== null && (
                  <Text style={styles.messageBody}>{message.body}</Text>
                )}
                <Text style={styles.metaLine}>
                  {t("commitDetailAuthor")}:{" "}
                  {formatCommitAuthorLine(
                    commit.author.name,
                    commit.author.date,
                    locale,
                  )}
                </Text>
              </View>
              <View style={styles.divider} />

              {/* Stats */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} accessibilityRole="header">
                  {t("commitDetailStats")}
                </Text>
                {/* One element, so VoiceOver reads its words, not "+12" and
                    "−3": the label sat on a view that was none (w21/811). */}
                <View
                  style={styles.statsRow}
                  accessible
                  accessibilityLabel={`${t("commitDetailAdditions", {
                    count: commit.stats.additions,
                  })}, ${t("commitDetailDeletions", {
                    count: commit.stats.deletions,
                  })}`}
                >
                  <Text style={styles.additions}>
                    +{commit.stats.additions}
                  </Text>
                  <Text style={styles.deletions}>
                    −{commit.stats.deletions}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />

              {/* Files */}
              {fileRows.length > 0 && (
                <>
                  <View style={styles.section}>
                    <Text
                      style={styles.sectionLabel}
                      accessibilityRole="header"
                    >
                      {t("commitDetailFiles")}
                    </Text>
                    {fileRows.map((f) => (
                      <View
                        key={f.filename}
                        accessible
                        accessibilityLabel={[
                          f.filename,
                          fileStatusText(f, t),
                          `+${f.additions} −${f.deletions}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      >
                        <View style={styles.fileRow}>
                          <Text
                            style={styles.fileName}
                            numberOfLines={1}
                            ellipsizeMode="middle"
                          >
                            {isolatePath(f.filename)}
                          </Text>
                          <Text style={styles.fileStats}>
                            +{f.additions} −{f.deletions}
                          </Text>
                        </View>
                        {f.status !== "modified" && (
                          <Text style={styles.fileStatus} numberOfLines={1}>
                            {fileStatusText(f, t)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                  <View style={styles.divider} />
                </>
              )}

              {/* Diff */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel} accessibilityRole="header">
                  {t("commitDetailDiff")}
                </Text>
              </View>
              {diffLines && diffLines.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator
                    style={LTR_SOURCE}
                    contentContainerStyle={LTR_SOURCE}
                  >
                    <View style={styles.diffContainer}>
                      <FlatList
                        data={diffLines.slice(0, shown)}
                        keyExtractor={(_, i) => String(i)}
                        renderItem={({ item }) => <DiffLineView line={item} />}
                        scrollEnabled={false}
                      />
                    </View>
                  </ScrollView>
                  {shown < diffLines.length ? (
                    <Pressable
                      testID="commit-diff-show-more"
                      style={styles.showMore}
                      onPress={() =>
                        setShown((count) => count + DIFF_PAGE_LINES)
                      }
                      accessibilityRole="button"
                    >
                      <Text style={styles.showMoreText}>
                        {t("commitDetailShowMore", {
                          count: nextDiffChunk(shown, diffLines.length),
                        })}
                      </Text>
                    </Pressable>
                  ) : null}
                </>
              ) : (
                // Outside the horizontal scroller, which sized the panel to
                // its text: the empty state spans the row (w0/032).
                <View style={styles.diffContainer}>
                  <Text style={styles.emptyText}>
                    {t("commitDetailNoDiff")}
                  </Text>
                </View>
              )}
            </ScrollView>
          </FadeInView>
        )}
      </SafeAreaView>
    </>
  );
}

function CommitDetailRoute({
  sha,
  ledger,
}: {
  sha: string;
  ledger?: string;
}): JSX.Element {
  const { t } = useTranslations();
  const binding = bindRouteLedger(ledger, useLedgerGuard());

  if (binding.status === "mismatch") {
    // A revived commit from another ledger: its SHA names a commit in the
    // route's repository, so looking it up in the selected one can only fail
    // (or find the wrong commit). Send no request at all.
    return (
      <RouteLedgerUnavailable
        title={sha.slice(0, 7)}
        message={t("commitDetailUnavailable")}
      />
    );
  }
  return <CommitDetailScreenImpl sha={sha} ledgerId={binding.ledgerId} />;
}

export function CommitDetailScreen(): JSX.Element {
  // `ledger` binds the entry to the ledger it was opened for; see
  // `common/route-ledger` for why the ambient selection is not enough.
  const params = useRouteParams<{
    sha?: string;
    ledger?: string;
  }>();
  const sha = firstRouteParam(params.sha);

  // Opened by URL without a commit there is nothing to show; a blank title over
  // "No diff available." read as an empty commit (w21/297).
  if (!sha) return <Redirect href="/(app)/(tabs)" />;

  return (
    <LedgerGuard>
      <CommitDetailRoute sha={sha} ledger={params.ledger} />
    </LedgerGuard>
  );
}
