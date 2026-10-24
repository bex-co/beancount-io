import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { IntervalSelect } from "@/common/components/interval-select";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { ConversionSelect } from "@/common/components/conversion-select";
import { DollarSign, Activity } from "lucide-react";
import {
  GetLedgerAccountReportDocument,
  GetLedgerAccountJournalDocument,
  type GetLedgerAccountJournalQuery,
  type GetLedgerAccountJournalQueryVariables,
} from "@/graphql/definitions";
import { DateBalanceChart } from "@/features/reports/income-statement/date-balance-chart";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useState, useEffect, useId, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { normalizeListSearchOffset } from "@/common/lib/list-search-params";
import {
  ACCOUNT_JOURNAL_MAX_OFFSET,
  ACCOUNT_VIEWS,
  DEFAULT_ACCOUNT_VIEW,
} from "./search";
import { useUrlView } from "@/common/hooks/use-url-view";
import { selectSettledReportData } from "@/features/reports/lib/select-settled-report-data";
import { ChartPeriodTable } from "../components/chart-period-table";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { LineChart } from "@/features/reports/balance-sheet/line-chart";
import type { LegendSelection } from "@/features/reports/lib/legend-selection";
import {
  JournalTable,
  type JournalTableItem,
} from "@/features/journal/components/journal-table";
import type { JournalDirectiveType } from "@/common/types/journal";
import { JournalFilters } from "@/features/journal/components/journal-filters";
import { useJournalFilterState } from "@/features/journal/hooks/use-journal-filter-state";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import {
  PageLoadingState,
  PageErrorState,
  LoadingSpinner,
} from "@/features/journal/components/journal-states";
import {
  ReportEmptyState,
  ReportLoadingIndicator,
  ReportErrorState,
} from "@/common/components/state-components";
import { EntryContextDialog } from "@/features/journal/components/entry-context-dialog";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";
import { accountQueryDefaults } from "./constants";
import { getAccountJournalWithChildren } from "@/common/lib/fava-options";
import { useQueryRetry } from "@/common/hooks/use-query-retry";

import { isAccountReportEmpty } from "./lib/account-report-empty";
import { useReportConversion } from "@/features/reports/components/use-report-conversion";

/**
 * Account Journal Table component
 * Displays journal entries for a specific account with searchParams and pagination
 */
export function AccountJournalTable({
  ledgerId,
  ledgerOwner,
  ledgerName,
  accountName,
  ledgerFilters,
  conversion,
}: {
  ledgerId: string;
  ledgerOwner: string;
  ledgerName: string;
  accountName: string;
  ledgerFilters: { time?: string; filter?: string; account?: string };
  conversion: ConversionOption;
}) {
  const { t } = useTranslations();
  const { ledgerData } = useLedger();
  const withChildren = getAccountJournalWithChildren(ledgerData);
  // Entry-type filters and display toggles, kept for this account the way
  // the Journal keeps its own: a shared time/account/filter change remounts
  // this page, and state held here reverted to the defaults (w4/1000).
  const {
    selectedDirectiveTypes,
    setSelectedDirectiveTypes,
    selectedTransactionSubtypes,
    setSelectedTransactionSubtypes,
    selectedDocumentSubtypes,
    setSelectedDocumentSubtypes,
    selectedCustomSubtypes,
    setSelectedCustomSubtypes,
    showMetadata,
    setShowMetadata,
    showPostings,
    setShowPostings,
  } = useJournalFilterState(`accountJournal.${ledgerId}.${accountName}`);

  // Pagination lives in the route's validated search params so opening a
  // transaction's source — which unmounts this table — plus browser Back
  // returns to the page that was being read. Page moves replace the history
  // entry, so Back leaves the account rather than walking back through every
  // page visited. Re-coerced here because the router still surfaces raw URL
  // values, so `?offset=-5` or `?offset=abc` must not reach the query.
  const accountSearch = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
  });
  const navigate = useNavigate({
    from: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
  });
  const limit = 20;

  // Track filter changes to reset pagination
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        time: ledgerFilters.time,
        filter: ledgerFilters.filter,
        account: ledgerFilters.account,
        directiveTypes: selectedDirectiveTypes,
        transactionSubtypes: selectedTransactionSubtypes,
        documentSubtypes: selectedDocumentSubtypes,
        customSubtypes: selectedCustomSubtypes,
      }),
    [
      ledgerFilters.time,
      ledgerFilters.filter,
      ledgerFilters.account,
      selectedDirectiveTypes,
      selectedTransactionSubtypes,
      selectedDocumentSubtypes,
      selectedCustomSubtypes,
    ],
  );

  const searchOffset =
    normalizeListSearchOffset(
      accountSearch.offset,
      ACCOUNT_JOURNAL_MAX_OFFSET,
    ) ?? 0;
  // A filter change and its offset reset arrive in separate renders; until the
  // reset lands, read the first page rather than the stale position.
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  const offset = appliedFilterKey === filterKey ? searchOffset : 0;

  const replaceOffset = (newOffset: number) => {
    void navigate({
      to: ".",
      search: (previous) => ({
        ...previous,
        offset: newOffset > 0 ? newOffset : undefined,
      }),
      replace: true,
    });
  };

  const setOffset: Dispatch<SetStateAction<number>> = (value) => {
    replaceOffset(typeof value === "function" ? value(offset) : value);
  };

  // State for entry context dialog
  const [isEntryContextDialogOpen, setIsEntryContextDialogOpen] =
    useState(false);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const entryOpenerRef = useRef<HTMLElement | null>(null);
  const entryFallbackRef = useRef<HTMLDivElement | null>(null);

  const {
    data: journalData,
    loading: journalLoading,
    error: journalError,
    refetch: refetchJournal,
  } = useQuery<
    GetLedgerAccountJournalQuery,
    GetLedgerAccountJournalQueryVariables
  >(GetLedgerAccountJournalDocument, {
    variables: {
      ledgerId,
      query: {
        account: accountName,
        filterAccount: ledgerFilters.account || undefined,
        conversion: conversion,
        filter: ledgerFilters.filter,
        time: ledgerFilters.time,
        with_children: withChildren,
        limit,
        offset,
        directiveTypes:
          selectedDirectiveTypes.length > 0
            ? selectedDirectiveTypes
            : undefined,
        transactionSubtypes:
          selectedTransactionSubtypes.length > 0
            ? selectedTransactionSubtypes
            : undefined,
        documentSubtypes:
          selectedDocumentSubtypes.length > 0
            ? selectedDocumentSubtypes
            : undefined,
        customSubtypes:
          selectedCustomSubtypes.length > 0
            ? selectedCustomSubtypes
            : undefined,
      },
    },
    fetchPolicy: "cache-and-network",
  });
  const {
    failure: journalFailure,
    retrying: retryingJournal,
    retry: retryJournal,
  } = useQueryRetry(journalError, refetchJournal);

  // A genuine filter change starts again at the first page.
  useEffect(() => {
    if (appliedFilterKey === filterKey) return;
    setAppliedFilterKey(filterKey);
    if (searchOffset !== 0) replaceOffset(0);
    // replaceOffset is re-created per render; the guard above runs it once per
    // filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilterKey, filterKey, searchOffset]);

  const requestedTotal = journalData?.getLedgerAccountJournal.total;
  const paginationScope = JSON.stringify([
    ledgerId,
    accountName,
    conversion,
    withChildren,
    filterKey,
  ]);
  const [paginationSnapshot, setPaginationSnapshot] = useState({
    scope: paginationScope,
    total: 0,
  });
  if (
    !journalLoading &&
    !journalError &&
    typeof requestedTotal === "number" &&
    (paginationSnapshot.scope !== paginationScope ||
      paginationSnapshot.total !== requestedTotal)
  ) {
    setPaginationSnapshot({ scope: paginationScope, total: requestedTotal });
  }
  const paginationTotal =
    paginationSnapshot.scope === paginationScope ? paginationSnapshot.total : 0;

  // A URL may ask for a page past the end (stale link, deleted entries). Once
  // the real total is known, fall back to the last page instead of an empty
  // journal.
  useEffect(() => {
    const known = typeof requestedTotal === "number" ? requestedTotal : 0;
    if (
      journalLoading ||
      journalError ||
      typeof requestedTotal !== "number" ||
      offset === 0 ||
      offset < known
    )
      return;
    replaceOffset(Math.max(0, Math.floor((known - 1) / limit) * limit));
    // replaceOffset is re-created per render; the guard above makes this a
    // one-shot correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journalLoading, journalError, offset, requestedTotal]);

  // Transform JournalDirectiveType[] to JournalTableItem[]
  const journalTableData: JournalTableItem[] = (
    journalData?.getLedgerAccountJournal.items ?? []
  ).map((item) => {
    return {
      directive: item.entry as unknown as JournalDirectiveType,
      change: item.change as Record<string, string>,
      balance: item.balance as Record<string, string>,
    };
  });

  return (
    <>
      <CardContent className="pb-3">
        <JournalFilters
          selectedDirectiveTypes={selectedDirectiveTypes}
          onDirectiveTypesChange={setSelectedDirectiveTypes}
          selectedTransactionSubtypes={selectedTransactionSubtypes}
          onTransactionSubtypesChange={setSelectedTransactionSubtypes}
          selectedDocumentSubtypes={selectedDocumentSubtypes}
          onDocumentSubtypesChange={setSelectedDocumentSubtypes}
          selectedCustomSubtypes={selectedCustomSubtypes}
          onCustomSubtypesChange={setSelectedCustomSubtypes}
          showMetadata={showMetadata}
          onShowMetadataChange={setShowMetadata}
          showPostings={showPostings}
          onShowPostingsChange={setShowPostings}
        />
      </CardContent>
      <CardContent>
        <div ref={entryFallbackRef} tabIndex={-1} className="outline-none">
          {journalFailure ? (
            <ReportErrorState
              message={t("page.accountReport.errorLoadingJournal")}
              onRetry={retryJournal}
              retrying={retryingJournal}
            />
          ) : journalLoading ? (
            <LoadingSpinner />
          ) : journalTableData.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t("page.accountReport.noJournalEntries")}
                </h3>
                <p className="text-muted-foreground">
                  {t("page.accountReport.noJournalEntriesForAccount")}
                </p>
              </div>
            </div>
          ) : (
            <JournalTable
              data={journalTableData}
              showMetadata={showMetadata}
              showPostings={showPostings}
              isAccountJournal
              accountName={accountName}
              withChildren={withChildren}
              ledgerOwner={ledgerOwner}
              ledgerName={ledgerName}
              onEntryClick={(entry, opener) => {
                entryOpenerRef.current = opener;
                setSelectedEntry(entry);
                setIsEntryContextDialogOpen(true);
              }}
            />
          )}
        </div>
        <div className="relative flex justify-end">
          <JournalPagination
            total={paginationTotal}
            limit={limit}
            offset={offset}
            setOffset={setOffset}
            loading={journalLoading}
            resultCount={journalError ? 0 : journalTableData.length}
            scopeKey={paginationScope}
            fallbackFocusRef={entryFallbackRef}
          />
        </div>
      </CardContent>

      <EntryContextDialog
        open={isEntryContextDialogOpen}
        onOpenChange={setIsEntryContextDialogOpen}
        entry={selectedEntry}
        ledgerId={ledgerId}
        returnFocusRef={entryOpenerRef}
        fallbackFocusRef={entryFallbackRef}
        onSuccess={() => {
          void refetchJournal();
        }}
      />
    </>
  );
}

/**
 * Account Report page component
 * This page shows detailed account information including balance over time
 */
export default function AccountPage() {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const { ledgerOwner, ledgerName, accountName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const ledgerFilters = useLedgerSearchParams();
  // In the URL, not page state: a shared scope edit unmounts this page.
  const [selectedTab, setSelectedTab] = useUrlView(
    "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
    ACCOUNT_VIEWS,
    DEFAULT_ACCOUNT_VIEW,
  );
  const accountBalanceTitleId = useId();
  const changesOverTimeTitleId = useId();
  const tabOptions = [
    { label: t("page.accountReport.accountBalance"), value: "accountBalance" },
    {
      label: t("page.accountReport.changesOverTime"),
      value: "changesOverTime",
    },
  ];
  const { primaryCurrency, ledgerName: ledgerDisplayName } = useLedger();
  const [timeInterval, setTimeInterval] = useState<ChartInterval>(
    accountQueryDefaults.interval,
  );
  const [conversion, setConversion] = useReportConversion(
    ledgerId,
    primaryCurrency,
  );
  // The units chosen in each chart's legend, held above the pending state
  // that unmounts the charts while a new period reads (w4/m51, w4/1025).
  const [balanceUnits, setBalanceUnits] = useState<LegendSelection>();
  const [changeUnits, setChangeUnits] = useState<LegendSelection>();

  const reportVariables = {
    accountName: accountName,
    ledgerId: ledgerId,
    interval: timeInterval,
    conversion: conversion,
    time: ledgerFilters.searchParams.time,
    filter: ledgerFilters.searchParams.filter,
    account: ledgerFilters.searchParams.account,
  };
  const {
    data,
    previousData,
    loading: isLoading,
    error,
    refetch,
  } = useQuery(GetLedgerAccountReportDocument, {
    variables: reportVariables,
    fetchPolicy: "cache-first",
  });
  // Try Again re-reads this report, not the page or its journal: the error
  // and its busy button stay while it runs, another failure hands focus
  // back, and a retry still pending for another account or period keeps no
  // failure for this one (w4/1045).
  const reportRetry = useQueryRetry(
    error,
    refetch,
    JSON.stringify(reportVariables),
  );

  const accountReportData =
    data?.getLedgerAccountReport || previousData?.getLedgerAccountReport;

  // Retained data belongs to the conversion and interval that were selected
  // when it arrived. Presenting it under a newly chosen basis relabels real
  // figures — the same reason the other reports withhold it — so the charts
  // read from the settled result only. The pending state is scoped to the
  // chart cards so the selectors stay usable and the journal below keeps its
  // own read, filters and page.
  const settled = selectSettledReportData(
    isLoading,
    data?.getLedgerAccountReport,
  );
  const settledReport = settled.pending ? undefined : settled.data;

  if (reportRetry.failure) {
    return (
      <PageErrorState
        title={t("page.accountReport.title")}
        // A fixed "error loading" subtitle hid the reason. The shared mapper
        // turns a classified failure — an unparseable date in the Time filter,
        // say — into localized correction guidance, and still falls back to a
        // safe generic message for unknown or transport failures.
        subtitle={formatError(reportRetry.failure)}
        onRetry={reportRetry.retry}
        retrying={reportRetry.retrying}
      />
    );
  }

  if (isLoading && !accountReportData) {
    return (
      <PageLoadingState
        title={t("page.accountReport.title")}
        subtitle={t("page.accountReport.loading")}
      />
    );
  }

  if (!accountReportData) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={accountName}
          description={t("common.pageDescription.account", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
        <ReportEmptyState
          Icon={Activity}
          title={t("component.emptyState.title")}
          message={t("page.accountReport.noData")}
        />
      </div>
    );
  }

  const chartsEmpty = settledReport
    ? isAccountReportEmpty(settledReport)
    : false;

  return (
    <div className="space-y-4">
      <PageHeader
        title={accountName}
        description={t("common.pageDescription.account", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      {/* Chart Tabs with Improved Layout */}
      <Tabs
        defaultValue={selectedTab}
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="w-full flex-col justify-start gap-6"
      >
        <div className="flex items-center justify-between gap-2">
          <ResponsiveTabTriggerList
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            tabOptions={tabOptions}
          />
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
        </div>

        <TabsContent value="accountBalance" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle
                id={accountBalanceTitleId}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-5 w-5" />
                {t("page.accountReport.accountBalance")}
              </CardTitle>
              <CardDescription>
                {t("page.accountReport.accountBalanceDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settled.pending || !settledReport ? (
                <ReportLoadingIndicator />
              ) : chartsEmpty ? (
                <ReportEmptyState
                  Icon={Activity}
                  title={t("component.emptyState.title")}
                  message={t("page.accountReport.noData")}
                />
              ) : (
                <>
                  <LineChart
                    data={settledReport.accountBalanceData}
                    interval={timeInterval}
                    primarySeries={primaryCurrency}
                    legendSelection={balanceUnits}
                    onLegendSelectionChange={setBalanceUnits}
                  />
                  <ChartPeriodTable
                    data={settledReport.accountBalanceData}
                    labelledBy={accountBalanceTitleId}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="changesOverTime" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle
                id={changesOverTimeTitleId}
                className="flex items-center gap-2"
              >
                <Activity className="h-5 w-5" />
                {t("page.accountReport.changesOverTime")}
              </CardTitle>
              <CardDescription>
                {t("page.accountReport.changesOverTimeDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settled.pending || !settledReport ? (
                <ReportLoadingIndicator />
              ) : chartsEmpty ? (
                <ReportEmptyState
                  Icon={Activity}
                  title={t("component.emptyState.title")}
                  message={t("page.accountReport.noData")}
                />
              ) : (
                <>
                  <DateBalanceChart
                    data={settledReport.intervalTotalsData}
                    interval={timeInterval}
                    primarySeries={primaryCurrency}
                    legendSelection={changeUnits}
                    onLegendSelectionChange={setChangeUnits}
                  />
                  <ChartPeriodTable
                    data={settledReport.intervalTotalsData}
                    labelledBy={changesOverTimeTitleId}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Journal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("page.accountReport.accountJournal")}
          </CardTitle>
          <CardDescription>
            {t("page.accountReport.accountJournalDescription")} {accountName}
          </CardDescription>
        </CardHeader>
        <AccountJournalTable
          // Its stored filters are read on mount, per account.
          key={`${ledgerId}/${accountName}`}
          ledgerId={ledgerId}
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          accountName={accountName}
          ledgerFilters={ledgerFilters.searchParams}
          conversion={conversion}
        />
      </Card>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.trialBalance"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/trial-balance`,
          },
        ]}
      />
    </div>
  );
}
