import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerBalanceSheetDocument } from "@/graphql/definitions";
import { useState, useMemo } from "react";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  ReportLoadingState,
  ReportErrorState,
  ReportEmptyState,
} from "@/common/components/state-components";
import { balanceSheetQueryDefaults } from "./constants";
import {
  getShowAccountsWithZeroBalance,
  getShowAccountsWithZeroTransactions,
  getInvertIncomeLiabilitiesEquity,
  getCollapsePatterns,
  getShowClosedAccounts,
} from "@/common/lib/fava-options";
import { BalanceSheetContent } from "./balance-sheet-content";

/**
 * Balance Sheet page component
 * Fetches balance sheet data and handles loading/error/empty states before
 * delegating rendering to BalanceSheetContent.
 */
export default function LedgerBalanceSheetPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const {
    ledgerName: ledgerDisplayName,
    primaryCurrency,
    ledgerData,
  } = useLedger();
  const ledgerFilters = useLedgerSearchParams();
  const reportingEntityTitle = (ledgerData.options.title ?? "").trim();
  const [timeInterval, setTimeInterval] = useState<ChartInterval>(
    balanceSheetQueryDefaults.interval,
  );
  const [conversion, setConversion] = useState<ConversionOption>(
    balanceSheetQueryDefaults.conversion,
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerBalanceSheetDocument, {
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

  const balanceSheetData =
    data?.getLedgerBalanceSheet || previousData?.getLedgerBalanceSheet;

  const closedAccountNames = useMemo(
    () =>
      new Set(data?.getLedgerAccounts ?? previousData?.getLedgerAccounts ?? []),
    [data?.getLedgerAccounts, previousData?.getLedgerAccounts],
  );

  if (isLoading && !balanceSheetData) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState />;
  }

  if (!balanceSheetData) {
    return <ReportEmptyState message={t("page.balanceSheet.noData")} />;
  }

  return (
    <BalanceSheetContent
      balanceSheetData={balanceSheetData}
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
      timeInterval={timeInterval}
      onTimeIntervalChange={setTimeInterval}
      invertIncomeLiabilitiesEquity={getInvertIncomeLiabilitiesEquity(
        ledgerData,
      )}
      showZeroBalance={getShowAccountsWithZeroBalance(ledgerData)}
      showZeroTransactions={getShowAccountsWithZeroTransactions(ledgerData)}
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      closedAccountNames={closedAccountNames}
      collapsePatterns={getCollapsePatterns(ledgerData)}
      filters={ledgerFilters.searchParams}
      fiscalYearEnd={ledgerData.favaOptions.fiscalYearEnd}
    />
  );
}
