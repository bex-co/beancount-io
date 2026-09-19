import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerIncomeStatementDocument } from "@/graphql/definitions";
import type { ChartInterval } from "@/common/types/chart";
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
import { useReportConversion } from "@/features/reports/components/use-report-conversion";
import { selectSettledReportData } from "@/features/reports/lib/select-settled-report-data";

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
  const reportingEntityTitle = (ledgerData.options.title ?? "").trim();
  const [timeInterval, setTimeInterval] = useState<ChartInterval>(
    incomeStatementQueryDefaults.interval,
  );
  const [conversion, setConversion] = useReportConversion(
    ledgerId,
    primaryCurrency,
  );
  // Owned here rather than in the content component: a pending read
  // replaces that component, so a selection living inside it would reset
  // every time an uncached interval or conversion is chosen. This page
  // outlives the read and is remounted per ledger, so it stays scoped.
  const [selectedTab, setSelectedTab] = useState<string>("netProfit");

  const {
    data,
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

  const settled = selectSettledReportData(
    isLoading,
    data?.getLedgerIncomeStatement,
  );

  const closedAccountNames = useMemo(
    () => new Set(data?.getLedgerAccounts ?? []),
    [data?.getLedgerAccounts],
  );

  const invertIncomeLiabilitiesEquity =
    getInvertIncomeLiabilitiesEquity(ledgerData);
  const showZeroBalance = getShowAccountsWithZeroBalance(ledgerData);
  const showZeroTransactions = getShowAccountsWithZeroTransactions(ledgerData);
  const collapsePatterns = getCollapsePatterns(ledgerData);

  if (settled.pending) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState error={error} />;
  }

  const incomeStatementData = settled.data;
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
      reportingEntityName={
        reportingEntityTitle || ledgerDisplayName || ledgerName
      }
      reportingEntitySource={
        reportingEntityTitle ? "ledger_title" : "ledger_name"
      }
      ledgerDisplayName={ledgerDisplayName ?? ledgerName}
      ledgerOwner={ledgerOwner}
      ledgerNameParam={ledgerName}
      conversion={conversion}
      onConversionChange={setConversion}
      selectedTab={selectedTab}
      onSelectedTabChange={setSelectedTab}
      timeInterval={timeInterval}
      onTimeIntervalChange={setTimeInterval}
      invertIncomeLiabilitiesEquity={invertIncomeLiabilitiesEquity}
      showZeroBalance={showZeroBalance}
      showZeroTransactions={showZeroTransactions}
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      closedAccountNames={closedAccountNames}
      collapsePatterns={collapsePatterns}
      filters={ledgerFilters.searchParams}
      fiscalYearEnd={ledgerData.favaOptions.fiscalYearEnd}
      exportReady
    />
  );
}
