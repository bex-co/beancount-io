import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import { useState, useMemo } from "react";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import type { ConversionOption } from "@/common/types/chart";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  ReportLoadingState,
  ReportErrorState,
  ReportEmptyState,
} from "@/common/components/state-components";
import { trialBalanceQueryDefaults } from "./constants";
import {
  getShowAccountsWithZeroBalance,
  getShowAccountsWithZeroTransactions,
  getInvertIncomeLiabilitiesEquity,
  getCollapsePatterns,
  getShowClosedAccounts,
} from "@/common/lib/fava-options";
import { TrialBalanceContent } from "./trial-balance-content";

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
    ledgerName: ledgerDisplayName,
    ledgerData,
  } = useLedger();
  const [conversion, setConversion] = useState<ConversionOption>(
    trialBalanceQueryDefaults.conversion,
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerTrialBalanceDocument, {
    variables: {
      ledgerId: ledgerId,
      conversion: conversion,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      time: ledgerFilters.searchParams.time,
    },
    fetchPolicy: "cache-first",
  });

  const trialBalanceData =
    data?.getLedgerTrialBalance || previousData?.getLedgerTrialBalance;

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

  if (isLoading && !trialBalanceData) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState />;
  }

  if (!trialBalanceData) {
    return <ReportEmptyState message={t("page.trialBalance.noData")} />;
  }

  return (
    <TrialBalanceContent
      trialBalanceData={trialBalanceData}
      primaryCurrency={primaryCurrency}
      ledgerDisplayName={ledgerDisplayName ?? ledgerName}
      ledgerOwner={ledgerOwner}
      ledgerNameParam={ledgerName}
      conversion={conversion}
      onConversionChange={setConversion}
      invertIncomeLiabilitiesEquity={invertIncomeLiabilitiesEquity}
      showZeroBalance={showZeroBalance}
      showZeroTransactions={showZeroTransactions}
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      closedAccountNames={closedAccountNames}
      collapsePatterns={collapsePatterns}
    />
  );
}
