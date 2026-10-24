import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ColorTheme } from "@/types/theme-props";
import { fontSizes } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { useToday } from "@/common/hooks/use-today";
import { RecentTransactionsSkeleton } from "./home-skeletons";
import { journalRowKeys } from "@/screens/transactions-screen/utils/merge-journal-page";
import {
  RECENT_FUTURE_BUFFER,
  pageEndedBeforeToday,
  recentTransactionsUpTo,
  recentTransactionsWindow,
  recentTransactionsWindowToToday,
  selectRecentCardState,
} from "../selectors/recent-window";
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
  // The day each row's date is judged against, kept current past midnight.
  const today = useToday();
  const guest = useGuest();

  const { data, loading, error, refetch } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: RECENT_LIMIT + RECENT_FUTURE_BUFFER,
        directiveTypes: [DirectiveType.TRANSACTION],
        // What has happened, not what is booked for later (w21/471); the
        // window holds still through the month so the offline copy keeps its
        // key (w21/513).
        time: recentTransactionsWindow(today),
      },
    },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  const page = (data?.getLedgerJournal.data ??
    []) as unknown as JournalDirectiveType[];
  // More than the buffer's worth of entries booked for later this month leave
  // the page with nothing, or too little, that has happened: read up to today
  // instead (w21/664).
  const needsPast = pageEndedBeforeToday(
    page,
    today,
    RECENT_LIMIT,
    RECENT_LIMIT + RECENT_FUTURE_BUFFER,
  );
  const {
    data: pastData,
    error: pastError,
    refetch: refetchPast,
  } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: RECENT_LIMIT,
        directiveTypes: [DirectiveType.TRANSACTION],
        time: recentTransactionsWindowToToday(today),
      },
    },
    skip: !ledgerId || !needsPast,
    fetchPolicy: "cache-and-network",
  });
  // Both reads, so a pull to refresh or a Retry reaches the one ending today
  // too (w21/700).
  // Set once the newest-entry read below is declared, while it is asked for.
  const refetchNewestRef = useRef<(() => Promise<unknown>) | null>(null);
  const refetchAll = () => {
    void refetch().catch(() => undefined);
    if (needsPast) void refetchPast().catch(() => undefined);
  };
  // Its failure is the card's too, and Retry has to reach it (w21/919).
  const retry = () => {
    refetchAll();
    void refetchNewestRef.current?.().catch(() => undefined);
  };
  useEffect(() => {
    if (refreshSignal > 0 && ledgerId) refetchAll();
    // `needsPast` and the queries are read at the pull, not re-run by it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal, ledgerId]);
  const entries = recentTransactionsUpTo(
    needsPast && pastData
      ? (pastData.getLedgerJournal.data as unknown as JournalDirectiveType[])
      : page,
    today,
    RECENT_LIMIT,
  );

  // Nothing up to today may still be a ledger with entries booked for later (the
  // rent of the next months), not a new one: the newest entry says which
  // (w21/573). Read only when the card would otherwise show the first-run copy.
  const emptyUpToToday =
    data !== undefined &&
    !error &&
    (!needsPast || pastData !== undefined) &&
    entries.length === 0;
  const {
    data: newestData,
    error: newestError,
    refetch: refetchNewest,
  } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: 1,
        directiveTypes: [DirectiveType.TRANSACTION],
      },
    },
    skip: !ledgerId || !emptyUpToToday,
    fetchPolicy: "cache-and-network",
  });
  const newest = newestData?.getLedgerJournal.data?.[0]?.date;
  refetchNewestRef.current = emptyUpToToday ? refetchNewest : null;
  const upcomingOnly = emptyUpToToday && newest !== undefined && newest > today;

  // Twin entries share a hash: their keys carry the ordinal (w21/419, w21/524).
  const rowKeys = journalRowKeys(entries);
  const cardState = selectRecentCardState({
    page: { loading, hasData: data !== undefined, error },
    past: needsPast
      ? { hasData: pastData !== undefined, error: pastError }
      : null,
    newest: emptyUpToToday
      ? { hasData: newestData !== undefined, error: newestError }
      : null,
    shown: entries.length,
  });

  const onSeeAll = () => {
    if (guest) {
      guest.navigate("transactions");
      return;
    }
    router.navigate({ pathname: "/transactions" });
  };

  return (
    <DashboardCard title={t("recentTransactions")} onSeeAll={onSeeAll} bleed>
      {cardState === "failed" ? (
        <CardLoadFailure onRetry={retry} />
      ) : cardState === "loading" ? (
        <RecentTransactionsSkeleton />
      ) : (
        <FadeInView>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {upcomingOnly
                  ? t("recentTransactionsUpcoming")
                  : t("recentTransactionsEmpty")}
              </Text>
              {!upcomingOnly &&
              ledgerId &&
              data &&
              !error &&
              onAddTransaction ? (
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
                key={rowKeys.get(entry) ?? index}
                entry={entry}
                dateToday={today}
                onPress={
                  isJournalTransaction(entry)
                    ? () =>
                        openTransactionDetail(
                          router,
                          entry,
                          ledgerId ?? "",
                          undefined,
                          guest,
                        )
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
