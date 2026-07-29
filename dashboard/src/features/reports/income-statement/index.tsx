import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerIncomeStatementDocument } from "@/graphql/definitions";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { incomeStatementQueryDefaults } from "./constants";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  ReportLoadingState,
  ReportErrorState,
  ReportEmptyState,
} from "@/common/components/state-components";
import {
  getShowAccountsWithZeroBalance,
  getShowAccountsWithZeroTransactions,
  getInvertIncomeLiabilitiesEquity,
  getCollapsePatterns,
  getShowClosedAccounts,
} from "@/common/lib/fava-options";
import { IncomeStatementContent } from "./income-statement-content";

/**
 * Income Statement page component
 * Fetches income statement data and handles loading/error/empty states before
 * delegating rendering to IncomeStatementContent.
 */
export default function LedgerIncomeStatementPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/income-statement",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const {
    ledgerName: ledgerDisplayName,
    ledgerData,
    primaryCurrency,
  } = useLedger();
  const ledgerFilters = useLedgerSearchParams();
  const [timeInterval, setTimeInterval] = useState<ChartInterval>(
    incomeStatementQueryDefaults.interval,
  );
  const [conversion, setConversion] = useState<ConversionOption>(
    incomeStatementQueryDefaults.conversion,
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerIncomeStatementDocument, {
    variables: {
      ledgerId: ledgerId,
      conversion,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      time: ledgerFilters.searchParams.time,
      interval: timeInterval,
    },
    fetchPolicy: "cache-first",
  });

  const incomeStatementData =
    data?.getLedgerIncomeStatement || previousData?.getLedgerIncomeStatement;

  const closedAccountNames = useMemo(
    () =>
      new Set(data?.getLedgerAccounts ?? previousData?.getLedgerAccounts ?? []),
    [data?.getLedgerAccounts, previousData?.getLedgerAccounts],
  );

  const invertIncomeLiabilitiesEquity =
    getInvertIncomeLiabilitiesEquity(ledgerData);
  const showZeroBalance = getShowAccountsWithZeroBalance(ledgerData);
  const showZeroTransactions = getShowAccountsWithZeroTransactions(ledgerData);
  const collapsePatterns = getCollapsePatterns(ledgerData);

  if (isLoading && !incomeStatementData) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState />;
  }

  if (!incomeStatementData) {
    return (
      <ReportEmptyState
        Icon={TrendingUp}
        message={t("page.incomeStatement.noData")}
      />
    );
  }

  return (
    <IncomeStatementContent
      incomeStatementData={incomeStatementData}
      primaryCurrency={primaryCurrency}
      ledgerDisplayName={ledgerDisplayName ?? ledgerName}
      ledgerOwner={ledgerOwner}
      ledgerNameParam={ledgerName}
      conversion={conversion}
      onConversionChange={setConversion}
      timeInterval={timeInterval}
      onTimeIntervalChange={setTimeInterval}
      invertIncomeLiabilitiesEquity={invertIncomeLiabilitiesEquity}
      showZeroBalance={showZeroBalance}
      showZeroTransactions={showZeroTransactions}
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      closedAccountNames={closedAccountNames}
      collapsePatterns={collapsePatterns}
    />
  );
}
