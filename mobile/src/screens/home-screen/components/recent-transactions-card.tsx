import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard } from "@/components";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { JournalEntryItem } from "@/screens/journal-screen/journal-entry-item";
import {
  DirectiveType,
  JournalDirectiveType,
} from "@/screens/journal-screen/types";

const RECENT_LIMIT = 5;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    empty: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: theme.black80,
    },
  });

type RecentTransactionsCardProps = {
  ledgerId?: string;
  refreshSignal?: number;
};

// Home rows are non-interactive — no drill-down sheet exists yet.
export function RecentTransactionsCard({
  ledgerId,
  refreshSignal = 0,
}: RecentTransactionsCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();

  const { data, loading, refetch } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: RECENT_LIMIT,
        directiveTypes: [DirectiveType.TRANSACTION],
      },
    },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (refreshSignal > 0 && ledgerId) {
      refetch();
    }
  }, [refreshSignal, ledgerId, refetch]);

  const entries = (data?.getLedgerJournal.data ??
    []) as unknown as JournalDirectiveType[];

  const onSeeAll = () => {
    analytics.track("tap_see_all_transactions", {});
    router.navigate({ pathname: "/journal" });
  };

  return (
    <DashboardCard title={t("recentTransactions")} onSeeAll={onSeeAll} bleed>
      {loading && entries.length === 0 ? (
        <LoadingTile height={160} mx={16} />
      ) : entries.length === 0 ? (
        <Text style={styles.empty}>{t("recentTransactionsEmpty")}</Text>
      ) : (
        entries.map((entry, index) => (
          <JournalEntryItem key={index} entry={entry} />
        ))
      )}
    </DashboardCard>
  );
}
