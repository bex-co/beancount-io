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
import { useUrlView } from "@/common/hooks/use-url-view";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import type { LegendSelection } from "../lib/legend-selection";
import {
  CHART_MODES,
  DEFAULT_CHART_MODE,
  DEFAULT_VIEW,
  INCOME_STATEMENT_VIEWS,
} from "./search";

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
  // Owned here, not in the content: the pending branch below unmounts it.
  // The selected chart is view preference, not scoped to the data: it
  // lives in the URL so editing the shared time/account/filter scope —
  // which unmounts this page at the layout boundary — does not discard it.
  const [selectedTab, setSelectedTab] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/income-statement",
    INCOME_STATEMENT_VIEWS,
    DEFAULT_VIEW,
  );
  // The bar mode is the same kind of preference, so it lives there too
  // (w4/998).
  const [chartMode, setChartMode] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/income-statement",
    CHART_MODES,
    DEFAULT_CHART_MODE,
    "mode",
  );
  // The units chosen in each chart's legend, owned here for the same reason:
  // regrouping the period unmounts the charts while it reads (w4/1025).
  const [unitSelections, setUnitSelections] = useState<
    Partial<Record<string, LegendSelection>>
  >({});

  const {
    data,
    loading: isLoading,
    error,
    refetch,
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
  const { failure, retrying, retry } = useQueryRetry(error, refetch);

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

  if (failure) {
    return (
      <ReportErrorState error={failure} onRetry={retry} retrying={retrying} />
    );
  }

  if (settled.pending) {
    return <ReportLoadingState />;
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
      chartMode={chartMode}
      onChartModeChange={setChartMode}
      unitSelections={unitSelections}
      onUnitSelectionChange={(view, selected) =>
        setUnitSelections((previous) => ({ ...previous, [view]: selected }))
      }
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
