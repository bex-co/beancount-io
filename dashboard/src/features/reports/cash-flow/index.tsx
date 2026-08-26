import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerCashFlowDocument,
  type SerializableTreeNode,
} from "@/graphql/definitions";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { cashFlowQueryDefaults } from "./constants";
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
  getCollapsePatterns,
  getShowClosedAccounts,
} from "@/common/lib/fava-options";
import {
  buildCashFlowStatement,
  collectCashAccounts,
  toAccountMetaMap,
} from "./lib/model";
import { mergeIntervalAccountChanges } from "./lib/merge-intervals";
import { joinCashAccountStatus } from "./lib/cash-account-status";
import { CashFlowContent } from "./cash-flow-content";

/**
 * Cash Flow page component
 * Fetches interval totals across the five roots plus the closing assets
 * hierarchy, builds the cash flow statement, and handles loading/error/empty
 * states before delegating rendering to CashFlowContent.
 */
export default function LedgerCashFlowPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/cash-flow",
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
    cashFlowQueryDefaults.interval,
  );
  const [conversion, setConversion] = useState<ConversionOption>(
    cashFlowQueryDefaults.conversion,
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerCashFlowDocument, {
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

  const cashFlowData = data || previousData;

  const accountMeta = useMemo(
    () => toAccountMetaMap(cashFlowData?.getLedgerAccountDirectives ?? []),
    [cashFlowData],
  );

  const closingCashAccounts = useMemo(
    () =>
      cashFlowData
        ? collectCashAccounts(
            cashFlowData.getLedgerBalanceSheet
              .assetsHierarchyData as SerializableTreeNode,
            accountMeta,
          )
        : [],
    [cashFlowData, accountMeta],
  );

  const statement = useMemo(() => {
    if (!cashFlowData) return null;
    const intervals = mergeIntervalAccountChanges(
      cashFlowData.incomeIntervals,
      cashFlowData.expenseIntervals,
      cashFlowData.assetIntervals,
      cashFlowData.liabilityIntervals,
      cashFlowData.equityIntervals,
    );
    return buildCashFlowStatement({
      intervals,
      closingCashAccounts,
      primaryCurrency,
      accountMeta,
    });
  }, [cashFlowData, closingCashAccounts, primaryCurrency, accountMeta]);

  const cashAccountRows = useMemo(
    () =>
      joinCashAccountStatus(
        closingCashAccounts,
        cashFlowData?.getLedgerAccountDirectives ?? [],
        statement?.invalidRoleValues ?? [],
      ),
    [closingCashAccounts, cashFlowData, statement],
  );

  if (isLoading && !statement) {
    return <ReportLoadingState />;
  }

  if (error) {
    return <ReportErrorState />;
  }

  if (
    !statement ||
    (statement.rows.length === 0 && Object.keys(statement.closing).length === 0)
  ) {
    return (
      <ReportEmptyState
        Icon={ArrowLeftRight}
        message={t("page.cashFlow.noData")}
      />
    );
  }

  return (
    <CashFlowContent
      statement={statement}
      closingCashAccounts={closingCashAccounts}
      cashAccountRows={cashAccountRows}
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
      showClosedAccounts={getShowClosedAccounts(ledgerData)}
      conversion={conversion}
      onConversionChange={setConversion}
      timeInterval={timeInterval}
      onTimeIntervalChange={setTimeInterval}
      filters={ledgerFilters.searchParams}
      fiscalYearEnd={ledgerData.favaOptions.fiscalYearEnd}
      collapsePatterns={getCollapsePatterns(ledgerData)}
    />
  );
}
