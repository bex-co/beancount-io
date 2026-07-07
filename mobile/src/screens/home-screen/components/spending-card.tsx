import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
import { DashboardCard } from "@/components";
import { BarChartD3 } from "@/common/d3/bar-chart-d3";
import { useGetLedgerJournalQuery } from "@/generated-graphql/graphql";
import {
  DirectiveType,
  JournalDirectiveType,
} from "@/screens/journal-screen/types";
import { selectSpendingCompare } from "@/screens/home-screen/selectors/select-spending-compare";

// Pull enough recent transactions to cover this + last month client-side.
// TODO: replace with a proper expenses-only monthly series once the backend
// exposes one (see select-spending-compare.ts).
const SPENDING_WINDOW = 200;

// Static x-axis labels (translation keys) for the two comparison bars.
const SPENDING_LABELS = ["lastMonth", "thisMonth"];

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    subtitle: {
      paddingHorizontal: 16,
      marginBottom: 12,
      fontSize: 13,
      color: theme.black80,
    },
  });

type SpendingCardProps = {
  ledgerId?: string;
  currency: string;
  currencySymbol: string;
  refreshSignal?: number;
};

/**
 * "Spending" card comparing this month's total spending against last month's,
 * derived client-side from journal transactions (see the backend-gap note in
 * `select-spending-compare.ts`).
 */
export function SpendingCard({
  ledgerId,
  currency,
  currencySymbol,
  refreshSignal = 0,
}: SpendingCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  const { data, loading, refetch } = useGetLedgerJournalQuery({
    variables: {
      ledgerId: ledgerId!,
      query: {
        offset: 0,
        limit: SPENDING_WINDOW,
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
  const { thisMonth, lastMonth } = selectSpendingCompare(entries, currency);

  return (
    <DashboardCard title={t("spending")} bleed>
      <Text style={styles.subtitle}>{t("spendingSubtitle")}</Text>
      {loading && entries.length === 0 ? (
        <LoadingTile height={200} mx={16} />
      ) : (
        <BarChartD3
          currencySymbol={currencySymbol}
          labels={SPENDING_LABELS}
          numbers={[lastMonth, thisMonth]}
        />
      )}
    </DashboardCard>
  );
}
