import { useEffect } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes, fontWeights } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard } from "@/components/dashboard-card";
import { analytics } from "@/common/analytics";
import { useGetFeedQuery } from "@/generated-graphql/graphql";
import { FeedSource } from "@/generated-graphql/types";

const FEED_LIMIT = 5;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black20,
    },
    firstRow: {
      borderTopWidth: 0,
    },
    title: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      lineHeight: 20,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 3,
      gap: 6,
    },
    badge: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.white,
      backgroundColor: theme.primary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: "hidden",
    },
    badgeLedger: {
      backgroundColor: theme.success,
    },
    date: {
      fontSize: fontSizes.xs,
      color: theme.black60,
    },
    summary: {
      fontSize: fontSizes.sm,
      color: theme.black60,
      marginTop: 3,
      lineHeight: 18,
    },
  });

function formatFeedDate(publishedAt: unknown): string {
  try {
    const d = new Date(publishedAt as string);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

type FeedRowProps = {
  title: string;
  summary: string | null;
  link: string;
  publishedAt: unknown;
  source: FeedSource;
  isFirst: boolean;
};

function FeedRow({ title, summary, link, publishedAt, source, isFirst }: FeedRowProps) {
  const styles = useThemeStyle(getStyles);
  const isExternal = link.startsWith("http");

  const handlePress = () => {
    analytics.track("feed_item_tap", { source, link });
    if (isExternal) {
      Linking.openURL(link);
    }
  };

  const badgeLabel = source === FeedSource.LedgerRss ? "Ledger" : "Blog";

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.row, isFirst && styles.firstRow]}
    >
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.meta}>
        <Text
          style={[
            styles.badge,
            source === FeedSource.LedgerRss && styles.badgeLedger,
          ]}
        >
          {badgeLabel}
        </Text>
        <Text style={styles.date}>{formatFeedDate(publishedAt)}</Text>
      </View>
      {!!summary && (
        <Text style={styles.summary} numberOfLines={2}>
          {summary}
        </Text>
      )}
    </Pressable>
  );
}

type FeedCardProps = {
  refreshSignal?: number;
};

export function FeedCard({ refreshSignal = 0 }: FeedCardProps): JSX.Element {
  const { t } = useTranslations();

  const { data, loading, refetch } = useGetFeedQuery({
    variables: { offset: 0, limit: FEED_LIMIT, locale: "en" },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (refreshSignal > 0) {
      refetch();
    }
  }, [refreshSignal, refetch]);

  const items = data?.getFeed?.items ?? [];

  return (
    <DashboardCard title={t("latestUpdates")} bleed>
      {loading && items.length === 0 ? (
        <>
          <LoadingTile height={18} mx={16} style={{ marginBottom: 10, width: "90%" }} />
          <LoadingTile height={18} mx={16} style={{ marginBottom: 10, width: "75%" }} />
          <LoadingTile height={18} mx={16} style={{ marginBottom: 10, width: "85%" }} />
        </>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {items.map((item, index) => (
            <FeedRow
              key={item.id}
              title={item.title}
              summary={item.summary ?? null}
              link={item.link}
              publishedAt={item.publishedAt}
              source={item.source}
              isFirst={index === 0}
            />
          ))}
        </View>
      )}
    </DashboardCard>
  );
}
