import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { ClientOnly, useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerCashFlowAccountsDocument,
  GetLedgerCashFlowDocument,
  type SerializableTreeNode,
} from "@/graphql/definitions";
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
  cashAccountMembership,
  CashFlowReconciliationError,
  collectCashAccounts,
  toAccountMetaMap,
} from "./lib/model";
import { cashActivityFilter } from "./lib/cash-eligibility";
import { mergeIntervalAccountChanges } from "./lib/merge-intervals";
import { joinCashAccountStatus } from "./lib/cash-account-status";
import { CashFlowContent } from "./cash-flow-content";
import { useReportConversion } from "@/features/reports/components/use-report-conversion";
import { selectSettledReportData } from "@/features/reports/lib/select-settled-report-data";
import { useUrlView } from "@/common/hooks/use-url-view";
import { useReportInterval } from "@/common/hooks/use-report-interval";
import { CASH_FLOW_VIEWS, DEFAULT_VIEW } from "./search";
import { PageHeader } from "@/common/components/page-header";
import { ConversionSelect } from "@/common/components/conversion-select";
import { IntervalSelect } from "@/common/components/interval-select";
import { cashFlowRootVariables, ledgerAccountRoots } from "./lib/account-roots";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import type { LegendSelection } from "../lib/legend-selection";

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
  // In the URL too, so a shared scope edit regroups by the reader\'s choice.
  const [timeInterval, setTimeInterval] = useReportInterval(
    "/ledger/$ledgerOwner/$ledgerName/cash-flow",
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
    "/ledger/$ledgerOwner/$ledgerName/cash-flow",
    CASH_FLOW_VIEWS,
    DEFAULT_VIEW,
  );
  // The units chosen in each chart's legend, owned here for the same reason:
  // regrouping the period unmounts the charts while it reads (w4/1024).
  const [unitSelections, setUnitSelections] = useState<
    Partial<Record<string, LegendSelection>>
  >({});

  const roots = useMemo(
    () => ledgerAccountRoots(ledgerData.options),
    [ledgerData.options],
  );
  // Cash membership first, from every account the ledger defines: only a
  // transaction that posts to cash is cash activity (w4/m56). Until it is
  // known the activity read waits, rather than reading every transaction.
  const accounts = useQuery(GetLedgerCashFlowAccountsDocument, {
    variables: { ledgerId },
    fetchPolicy: "cache-first",
  });
  const directives = accounts.data?.getLedgerAccountDirectives;
  const accountMeta = useMemo(
    () => toAccountMetaMap(directives ?? []),
    [directives],
  );
  const activityFilter = useMemo(
    () =>
      directives &&
      cashActivityFilter(
        ledgerFilters.searchParams.filter,
        cashAccountMembership(accountMeta, roots),
      ),
    [directives, accountMeta, roots, ledgerFilters.searchParams.filter],
  );
  const membershipPending = activityFilter === undefined;

  const {
    data,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(GetLedgerCashFlowDocument, {
    variables: {
      ledgerId: ledgerId,
      conversion,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      // Never sent as "": the read is skipped until membership is known.
      activityFilter: activityFilter ?? "",
      time: ledgerFilters.searchParams.time,
      interval: timeInterval,
      ...cashFlowRootVariables(ledgerData.options),
    },
    skip: membershipPending,
    fetchPolicy: "cache-first",
  });
  const { failure, retrying, retry } = useQueryRetry(
    accounts.error ?? error,
    accounts.error ? accounts.refetch : refetch,
  );

  // A skipped read reports no loading, so unknown membership is pending too.
  const settled = selectSettledReportData(isLoading || membershipPending, data);

  const cashFlowData = settled.pending ? undefined : settled.data;

  const closingCashAccounts = useMemo(
    () =>
      cashFlowData
        ? collectCashAccounts(
            cashFlowData.getLedgerBalanceSheet
              .assetsHierarchyData as SerializableTreeNode,
            accountMeta,
            roots,
          )
        : [],
    [cashFlowData, accountMeta, roots],
  );

  const { statement, reconciliationError } = useMemo(() => {
    if (!cashFlowData) return { statement: null, reconciliationError: null };
    const intervals = mergeIntervalAccountChanges(
      cashFlowData.incomeIntervals,
      cashFlowData.expenseIntervals,
      cashFlowData.assetIntervals,
      cashFlowData.liabilityIntervals,
      cashFlowData.equityIntervals,
    );
    try {
      return {
        statement: buildCashFlowStatement({
          intervals,
          closingCashAccounts,
          primaryCurrency,
          accountMeta,
          roots,
        }),
        reconciliationError: null,
      };
    } catch (error) {
      if (!(error instanceof CashFlowReconciliationError)) throw error;
      return { statement: null, reconciliationError: error };
    }
  }, [cashFlowData, closingCashAccounts, primaryCurrency, accountMeta, roots]);

  const cashAccountRows = useMemo(
    () =>
      joinCashAccountStatus(
        closingCashAccounts,
        directives ?? [],
        statement?.invalidRoleValues ?? [],
      ),
    [closingCashAccounts, directives, statement],
  );

  if (failure) {
    return (
      <ReportErrorState error={failure} onRetry={retry} retrying={retrying} />
    );
  }

  if (settled.pending) {
    return <ReportLoadingState />;
  }

  if (reconciliationError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={t("common.cashFlow")}
            description={t("common.pageDescription.cashFlow", {
              ledgerName: ledgerDisplayName,
            })}
          />
          <ClientOnly>
            <div className="flex flex-wrap items-center gap-2">
              <IntervalSelect
                value={timeInterval}
                onValueChange={setTimeInterval}
              />
              <ConversionSelect
                value={conversion}
                onValueChange={setConversion}
                currency={primaryCurrency}
              />
            </div>
          </ClientOnly>
        </div>
        <ReportErrorState
          title={t("page.cashFlow.reconciliationTitle")}
          message={
            // Suggesting At Cost when it is already selected sent readers in
            // a circle (w0/022).
            conversion === "at_cost"
              ? t("page.cashFlow.reconciliationDescriptionAtCost")
              : t("page.cashFlow.reconciliationDescription", {
                  atCost: t("component.conversionSelect.atCost"),
                })
          }
        />
      </div>
    );
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
      selectedTab={selectedTab}
      onSelectedTabChange={setSelectedTab}
      unitSelections={unitSelections}
      onUnitSelectionChange={(view, selected) =>
        setUnitSelections((previous) => ({ ...previous, [view]: selected }))
      }
      filters={ledgerFilters.searchParams}
      fiscalYearEnd={ledgerData.favaOptions.fiscalYearEnd}
      collapsePatterns={getCollapsePatterns(ledgerData)}
      exportReady
    />
  );
}
