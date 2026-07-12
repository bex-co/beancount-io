import { useEffect } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
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
      color: theme.black60,
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
  link: string;
  publishedAt: unknown;
  source: FeedSource;
  isFirst: boolean;
};

function FeedRow({ title, link, publishedAt, source, isFirst }: FeedRowProps) {
  const styles = useThemeStyle(getStyles);
  const isExternal = link.startsWith("http");

  const handlePress = () => {
    analytics.track("feed_item_tap", { source, link });
    if (isExternal) {
      Linking.openURL(link);
    }
  };

  const sourceLabel = source === FeedSource.LedgerRss ? "Ledger" : "Blog";
  const date = formatFeedDate(publishedAt);
  const metaText = date ? `${sourceLabel} · ${date}` : sourceLabel;

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.row, isFirst && styles.firstRow]}
    >
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>{metaText}</Text>
      </View>
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
          <LoadingTile
            height={18}
            mx={16}
            style={{ marginBottom: 10, width: "90%" }}
          />
          <LoadingTile
            height={18}
            mx={16}
            style={{ marginBottom: 10, width: "75%" }}
          />
          <LoadingTile
            height={18}
            mx={16}
            style={{ marginBottom: 10, width: "85%" }}
          />
        </>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {items.map((item, index) => (
            <FeedRow
              key={item.id}
              title={item.title}
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
