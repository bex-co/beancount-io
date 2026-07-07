import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { analytics } from "@/common/analytics";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard } from "@/components";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import { JournalItemDescription } from "@/screens/journal-screen/journal-entry-item/journal-item-description";
import { JournalItemDate } from "@/screens/journal-screen/journal-entry-item/journal-item-date";
import {
  DirectiveType,
  JournalDirectiveType,
} from "@/screens/journal-screen/types";
import {
  getSignedTransactionAmount,
  formatSignedAmount,
} from "@/screens/home-screen/selectors/select-transaction-amount";

const RECENT_LIMIT = 5;

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    amount: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 8,
    },
    amountPositive: {
      color: theme.success,
    },
    amountNeutral: {
      color: theme.text01,
    },
    empty: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: theme.black80,
    },
  });

function RecentTransactionRow({
  entry,
  currency,
  currencySymbol,
}: {
  entry: JournalDirectiveType;
  currency: string;
  currencySymbol: string;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const amount = getSignedTransactionAmount(entry, currency);
  return (
    <View style={styles.row}>
      <JournalItemDate date={entry.date} />
      <JournalItemDescription entry={entry} />
      {amount !== null && (
        <Text
          style={[
            styles.amount,
            amount > 0 ? styles.amountPositive : styles.amountNeutral,
          ]}
        >
          {formatSignedAmount(amount, currencySymbol)}
        </Text>
      )}
    </View>
  );
}

type RecentTransactionsCardProps = {
  ledgerId?: string;
  currency: string;
  currencySymbol: string;
  refreshSignal?: number;
};

/**
 * Glimpse of the most recent transactions with a "see all →" affordance that
 * navigates to the journal tab. Reuses the journal screen's row renderers.
 */
export function RecentTransactionsCard({
  ledgerId,
  currency,
  currencySymbol,
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

  // The query already caps results to RECENT_LIMIT via `limit`.
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
          <RecentTransactionRow
            key={index}
            entry={entry}
            currency={currency}
            currencySymbol={currencySymbol}
          />
        ))
      )}
    </DashboardCard>
  );
}
