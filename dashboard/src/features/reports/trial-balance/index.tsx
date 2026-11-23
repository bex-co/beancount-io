import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import { useMemo } from "react";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useLedger } from "@/common/hooks/use-ledger";
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
import { TrialBalanceContent } from "./trial-balance-content";
import { useReportConversion } from "@/features/reports/components/use-report-conversion";
import { selectSettledReportData } from "@/features/reports/lib/select-settled-report-data";
import { useUrlView } from "@/common/hooks/use-url-view";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { TRIAL_BALANCE_VIEWS, DEFAULT_VIEW } from "./search";

/**
 * Trial Balance page component
 * Fetches trial balance data and handles loading/error/empty states before
 * delegating rendering to TrialBalanceContent.
 */
export default function TrialBalancePage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/trial-balance",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const ledgerFilters = useLedgerSearchParams();
  const {
    primaryCurrency,
    operatingCurrencies,
    ledgerName: ledgerDisplayName,
    ledgerData,
  } = useLedger();
  const [conversion, setConversion] = useReportConversion(
    ledgerId,
    operatingCurrencies,
  );
  // Owned here, not in the content: the pending branch below unmounts it.
  // The selected chart is view preference, not scoped to the data: it
  // lives in the URL so editing the shared time/account/filter scope —
  // which unmounts this page at the layout boundary — does not discard it.
  const [selectedTab, setSelectedTab] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/trial-balance",
    TRIAL_BALANCE_VIEWS,
    DEFAULT_VIEW,
  );

  const scope = {
    ledgerId,
    account: ledgerFilters.searchParams.account,
    filter: ledgerFilters.searchParams.filter,
    time: ledgerFilters.searchParams.time,
  };
  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(GetLedgerTrialBalanceDocument, {
    variables: { ...scope, conversion },
    fetchPolicy: "cache-first",
  });
  const atCostQuery = useQuery(GetLedgerTrialBalanceDocument, {
    variables: { ...scope, conversion: "at_cost" },
    skip: conversion === "at_cost",
    fetchPolicy: "cache-first",
  });
  const { failure, retrying, retry } = useQueryRetry(error, refetch);

  const settled = selectSettledReportData(
    isLoading,
    data?.getLedgerTrialBalance,
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

  if (failure) {
    return (
      <ReportErrorState error={failure} onRetry={retry} retrying={retrying} />
    );
  }

  if (settled.pending) {
    return <ReportLoadingState />;
  }

  const trialBalanceData = settled.data;
  if (!trialBalanceData) {
    return <ReportEmptyState message={t("page.trialBalance.noData")} />;
  }

  return (
    <TrialBalanceContent
      trialBalanceData={trialBalanceData}
      atCostData={
        atCostQuery.loading || atCostQuery.error
          ? undefined
          : atCostQuery.data?.getLedgerTrialBalance
      }
      primaryCurrency={primaryCurrency}
      operatingCurrencies={operatingCurrencies}
      ledgerDisplayName={ledgerDisplayName ?? ledgerName}
      ledgerOwner={ledgerOwner}
      ledgerNameParam={ledgerName}
      conversion={conversion}
      onConversionChange={setConversion}
      selectedTab={selectedTab}
      onSelectedTabChange={setSelectedTab}
      invertIncomeLiabilitiesEquity={invertIncomeLiabilitiesEquity}
      showZeroBalance={showZeroBalance}
      showZeroTransactions={showZeroTransactions}
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      closedAccountNames={closedAccountNames}
      collapsePatterns={collapsePatterns}
    />
  );
}
