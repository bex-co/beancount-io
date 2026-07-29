import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useParams } from "@tanstack/react-router";
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
import { useState, useEffect, useMemo, useRef } from "react";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { LineChart } from "@/features/reports/balance-sheet/line-chart";
import {
  JournalTable,
  type JournalTableItem,
} from "@/features/journal/components/journal-table";
import type { JournalDirectiveType } from "@/common/types/journal";
import { DirectiveType } from "@/common/types/journal";
import { JournalFilters } from "@/features/journal/components/journal-filters";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import {
  PageLoadingState,
  PageErrorState,
  LoadingSpinner,
} from "@/features/journal/components/journal-states";
import {
  ReportEmptyState,
  ReportErrorState,
} from "@/common/components/state-components";
import { EntryContextDialog } from "@/features/journal/components/entry-context-dialog";
import { useLedger } from "@/common/hooks/use-ledger";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { accountQueryDefaults } from "./constants";
import { getAccountJournalWithChildren } from "@/common/lib/fava-options";

import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { isAccountReportEmpty } from "./lib/account-report-empty";

/**
 * Account Journal Table component
 * Displays journal entries for a specific account with searchParams and pagination
 */
function AccountJournalTable({
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
  // Filter state
  const [selectedDirectiveTypes, setSelectedDirectiveTypes] = useState<
    DirectiveType[]
  >([DirectiveType.TRANSACTION]);
  const [selectedTransactionSubtypes, setSelectedTransactionSubtypes] =
    useState<string[]>([]);
  const [selectedDocumentSubtypes, setSelectedDocumentSubtypes] = useState<
    string[]
  >([]);
  const [selectedCustomSubtypes, setSelectedCustomSubtypes] = useState<
    string[]
  >([]);

  // UI toggle state
  const [showMetadata, setShowMetadata] = useState(true);
  const [showPostings, setShowPostings] = useState(false);

  // Pagination state
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // State for entry context dialog
  const [isEntryContextDialogOpen, setIsEntryContextDialogOpen] =
    useState(false);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);

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
        conversion: conversion,
        filter: ledgerFilters.filter,
        time: ledgerFilters.time,
        with_children: withChildren,
        limit,
        offset,
      },
    },
    fetchPolicy: "cache-first",
  });

  // Track filter changes to reset pagination
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        time: ledgerFilters.time,
        filter: ledgerFilters.filter,
        directiveTypes: selectedDirectiveTypes,
        transactionSubtypes: selectedTransactionSubtypes,
        documentSubtypes: selectedDocumentSubtypes,
        customSubtypes: selectedCustomSubtypes,
      }),
    [
      ledgerFilters.time,
      ledgerFilters.filter,
      selectedDirectiveTypes,
      selectedTransactionSubtypes,
      selectedDocumentSubtypes,
      selectedCustomSubtypes,
    ],
  );
  const previousFilterKeyRef = useRef(filterKey);

  // Reset pagination when searchParams change (scheduled asynchronously to avoid cascading renders)
  useEffect(() => {
    if (previousFilterKeyRef.current !== filterKey) {
      previousFilterKeyRef.current = filterKey;
      queueMicrotask(() => setOffset(0));
    }
  }, [filterKey]);

  if (journalLoading) {
    return (
      <CardContent>
        <LoadingSpinner />
      </CardContent>
    );
  }

  if (journalError) {
    return (
      <CardContent>
        <ReportErrorState
          message={t("page.accountReport.errorLoadingJournal")}
        />
      </CardContent>
    );
  }

  if (!journalData?.getLedgerAccountJournal?.items?.length) {
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
        </CardContent>
      </>
    );
  }

  // Transform the account journal entries to journal directive format

  const total = journalData.getLedgerAccountJournal.total || 0;

  // Transform JournalDirectiveType[] to JournalTableItem[]
  const journalTableData: JournalTableItem[] =
    journalData.getLedgerAccountJournal.items.map((item) => {
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
        <JournalTable
          data={journalTableData}
          showMetadata={showMetadata}
          showPostings={showPostings}
          isAccountJournal
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          onEntryClick={(entry) => {
            setSelectedEntry(entry);
            setIsEntryContextDialogOpen(true);
          }}
        />
        <div className="relative flex justify-end">
          <JournalPagination
            total={total}
            limit={limit}
            offset={offset}
            setOffset={setOffset}
          />
        </div>
      </CardContent>

      <EntryContextDialog
        open={isEntryContextDialogOpen}
        onOpenChange={setIsEntryContextDialogOpen}
        entry={selectedEntry}
        ledgerId={ledgerId}
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
  const { ledgerOwner, ledgerName, accountName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const ledgerFilters = useLedgerSearchParams();
  const [selectedTab, setSelectedTab] = useState<string>("accountBalance");
  const tabOptions = [
    { label: t("page.accountReport.accountBalance"), value: "accountBalance" },
    {
      label: t("page.accountReport.changesOverTime"),
      value: "changesOverTime",
    },
  ];
  const [timeInterval, setTimeInterval] = useState<ChartInterval>(
    accountQueryDefaults.interval,
  );
  const [conversion, setConversion] = useState<ConversionOption>(
    accountQueryDefaults.conversion,
  );

  const {
    data,
    previousData,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerAccountReportDocument, {
    variables: {
      accountName: accountName,
      ledgerId: ledgerId,
      interval: timeInterval,
      conversion: conversion,
      time: ledgerFilters.searchParams.time,
      filter: ledgerFilters.searchParams.filter,
      account: ledgerFilters.searchParams.account,
    },
    fetchPolicy: "cache-first",
  });

  const { primaryCurrency, ledgerName: ledgerDisplayName } = useLedger();

  const accountReportData =
    data?.getLedgerAccountReport || previousData?.getLedgerAccountReport;

  if (isLoading && !accountReportData) {
    return (
      <PageLoadingState
        title={t("page.accountReport.title")}
        subtitle={t("page.accountReport.loading")}
      />
    );
  }

  if (error) {
    return (
      <PageErrorState
        title={t("page.accountReport.title")}
        subtitle={t("page.accountReport.errorLoading")}
      />
    );
  }

  if (!accountReportData || isAccountReportEmpty(accountReportData)) {
    return (
      <div className="space-y-4">
        <LedgerPageSEO seoKey="ledgerAccount" params={{ accountName }} />
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

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerAccount" params={{ accountName }} />
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
        <div className="flex items-center justify-between">
          <ResponsiveTabTriggerList
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            tabOptions={tabOptions}
          />
          <div className="hidden sm:flex items-center gap-2">
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
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t("page.accountReport.accountBalance")}
              </CardTitle>
              <CardDescription>
                {t("page.accountReport.accountBalanceDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LineChart
                data={accountReportData.accountBalanceData}
                interval={timeInterval}
                primarySeries={primaryCurrency}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="changesOverTime" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("page.accountReport.changesOverTime")}
              </CardTitle>
              <CardDescription>
                {t("page.accountReport.changesOverTimeDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DateBalanceChart
                data={accountReportData.intervalTotalsData}
                interval={timeInterval}
                primarySeries={primaryCurrency}
              />
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
