import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
import { FadeInView } from "@/components/crossfade";
import { DashboardCard } from "@/components";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { EntryRow } from "@/screens/transactions-screen/entry-row";
import {
  DirectiveType,
  JournalDirectiveType,
  isJournalTransaction,
} from "@/screens/transactions-screen/types";
import { openTransactionDetail } from "@/screens/transaction-detail-screen/open-transaction-detail";
import { CardLoadFailure } from "@/components/card-load-failure";
import { selectCardLoadState } from "@/common/apollo/card-load-state";
import { useGuest } from "@/common/guest/guest-context";
import { Button } from "@/components/button";

const RECENT_LIMIT = 5;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    empty: {
      paddingHorizontal: 16,
      gap: 16,
    },
    emptyText: {
      fontSize: fontSizes.md,
      color: theme.black80,
    },
  });

type RecentTransactionsCardProps = {
  ledgerId?: string;
  refreshSignal?: number;
  onAddTransaction?: () => void;
};

export function RecentTransactionsCard({
  ledgerId,
  refreshSignal = 0,
  onAddTransaction,
}: RecentTransactionsCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();
  const router = useRouter();
  const guest = useGuest();

  const { data, loading, error, refetch } = useGetLedgerJournalQuery({
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
      void refetch().catch(() => undefined);
    }
  }, [refreshSignal, ledgerId, refetch]);

  const entries = (data?.getLedgerJournal.data ??
    []) as unknown as JournalDirectiveType[];

  const onSeeAll = () => {
    if (guest) {
      guest.navigate("transactions");
      return;
    }
    router.navigate({ pathname: "/transactions" });
  };

  return (
    <DashboardCard title={t("recentTransactions")} onSeeAll={onSeeAll} bleed>
      {selectCardLoadState({
        loading: loading,
        hasData: data !== undefined,
        error: error,
      }) === "failed" ? (
        <CardLoadFailure
          onRetry={() => void refetch().catch(() => undefined)}
        />
      ) : loading && entries.length === 0 ? (
        <LoadingTile height={160} mx={16} />
      ) : (
        <FadeInView>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {t("recentTransactionsEmpty")}
              </Text>
              {ledgerId && data && !error && onAddTransaction ? (
                <Button
                  testID="home-empty-add-transaction"
                  onPress={onAddTransaction}
                >
                  {t("addTransaction")}
                </Button>
              ) : null}
            </View>
          ) : (
            entries.map((entry, index) => (
              <EntryRow
                key={entry.entry_hash || index}
                entry={entry}
                onPress={
                  isJournalTransaction(entry)
                    ? () =>
                        openTransactionDetail(router, entry, undefined, guest)
                    : undefined
                }
              />
            ))
          )}
        </FadeInView>
      )}
    </DashboardCard>
  );
}
