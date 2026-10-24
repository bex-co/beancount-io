import { useEffect } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { FeedSkeleton } from "./home-skeletons";
import { FadeInView } from "@/components/crossfade";
import { DashboardCard } from "@/components/dashboard-card";
import { useGetFeedQuery } from "@/generated-graphql/graphql";
import { FeedSource } from "@/generated-graphql/types";
import {
  feedQueryVariables,
  feedRowDate,
  feedRowTitle,
  pushSummary,
  feedRowAction,
  feedSourceLabelKey,
  feedCardIsEmpty,
  feedRowDetail,
  sortFeedItems,
} from "./feed-logic";
import { useApolloClient } from "@apollo/client";
import { useCurrentUser } from "@/common/hooks/use-current-user";
import { getServerUrl } from "@/common/vars/server-url";
import { openAppLinkTarget } from "@/common/app-links/open-app-link";
import { CardLoadFailure } from "@/components/card-load-failure";
import { selectCardLoadState } from "@/common/apollo/card-load-state";

const FEED_LIMIT = 5;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    firstRow: {
      borderTopWidth: 0,
    },
    title: {
      fontSize: fontSizes.sm,
      fontWeight: fontWeights.regular,
      color: theme.text01,
      lineHeight: 18,
    },
    meta: {
      marginTop: 2,
    },
    metaText: {
      fontSize: fontSizes.xs,
      color: theme.black80,
    },
  });

type FeedRowProps = {
  title: string;
  link: string;
  publishedAt: unknown;
  source: FeedSource;
  subtitle: string | null;
  byline: string | null;
  isFirst: boolean;
};

function FeedRow({
  title,
  link,
  publishedAt,
  source,
  subtitle,
  byline,
  isFirst,
}: FeedRowProps) {
  // Keyed on the text size: iOS keeps a Text's old measurement when it
  // changes with the app open (mobile/AGENTS.md; w21/015).
  const { fontScale } = useWindowDimensions();
  const styles = useThemeStyle(getStyles);
  const { t, locale } = useTranslations();
  const client = useApolloClient();
  const action = feedRowAction(link, getServerUrl());

  const handlePress = () => {
    if (action?.kind === "external") {
      void Linking.openURL(action.url);
    } else if (action?.kind === "ledger") {
      void openAppLinkTarget({
        client,
        target: action.target,
        sourceUrl: action.sourceUrl,
        isCurrentSession: () => true,
        navigation: "push",
      });
    }
  };

  // The count first, in the app's language: it was the cut-off last line
  // (w21/716).
  const push = subtitle ? pushSummary(subtitle) : null;
  const shownSubtitle = push
    ? `${t("feedPushCommits", { count: push.total })}\n${push.newest}`
    : subtitle;
  const sourceLabel = t(feedSourceLabelKey(source));
  const date = feedRowDate(publishedAt, source, locale);
  const metaText = [sourceLabel, date, byline].filter(Boolean).join(" · ");

  return (
    <Pressable
      // No `disabled`: it adds the not-enabled trait, so a row with nothing to
      // open read "dimmed" (w21/851); no handler is enough.
      onPress={action ? handlePress : undefined}
      accessibilityRole={action ? "button" : undefined}
      style={[styles.row, isFirst && styles.firstRow]}
    >
      <Text key={`title-${fontScale}`} style={styles.title} numberOfLines={2}>
        {feedRowTitle(title, source, t)}
      </Text>
      {subtitle ? (
        <Text
          key={`subtitle-${fontScale}`}
          style={styles.metaText}
          numberOfLines={2}
        >
          {shownSubtitle}
        </Text>
      ) : null}
      <View style={styles.meta}>
        <Text key={`meta-${fontScale}`} style={styles.metaText}>
          {metaText}
        </Text>
      </View>
    </Pressable>
  );
}

type FeedCardProps = {
  refreshSignal?: number;
};

export function FeedCard({
  refreshSignal = 0,
}: FeedCardProps): JSX.Element | null {
  const { t, locale } = useTranslations();

  const { data, loading, error, refetch } = useGetFeedQuery({
    variables: feedQueryVariables(FEED_LIMIT, locale),
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (refreshSignal > 0) {
      refetch();
    }
  }, [refreshSignal, refetch]);

  const { user, displayName } = useCurrentUser();
  const items = sortFeedItems(data?.getFeed?.items ?? []);
  const loadState = selectCardLoadState({
    loading: loading,
    hasData: data !== undefined,
    error: error,
  });
  if (
    feedCardIsEmpty({
      failed: loadState === "failed",
      loading,
      itemCount: items.length,
    })
  ) {
    return null;
  }

  return (
    <DashboardCard title={t("latestUpdates")} bleed>
      {loadState === "failed" ? (
        <CardLoadFailure onRetry={() => refetch()} />
      ) : loading && items.length === 0 ? (
        <FeedSkeleton />
      ) : (
        <FadeInView style={{ paddingHorizontal: 16 }}>
          {items.map((item, index) => (
            <FeedRow
              key={item.id}
              title={item.title}
              link={item.link}
              publishedAt={item.publishedAt}
              source={item.source}
              {...feedRowDetail(item, {
                username: user?.username,
                names: [displayName, user?.email?.split("@")[0]],
              })}
              isFirst={index === 0}
            />
          ))}
        </FadeInView>
      )}
    </DashboardCard>
  );
}
