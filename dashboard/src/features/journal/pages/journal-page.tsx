import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { useQuery } from "@apollo/client/react";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import {
  Link,
  useParams,
  ClientOnly,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import {
  JournalTable,
  type JournalTableItem,
} from "@/features/journal/components/journal-table";
import {
  type JournalDirectiveType,
  DirectiveType,
} from "@/common/types/journal";
import { Button } from "@/common/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { useLocalStorageState } from "@/common/hooks/use-local-storage-state";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { NewDirectiveDialog } from "@/features/journal/components/new-directive-dialog";
import { EntryContextDialog } from "@/features/journal/components/entry-context-dialog";
import { ExportJournalButton } from "@/features/journal/components/export-journal-button";
import { JournalFilters } from "@/features/journal/components/journal-filters";
import { JournalPagination } from "@/features/journal/components/journal-pagination";
import {
  JournalLoadingState,
  JournalErrorState,
  JournalEmptyState,
} from "@/features/journal/components/journal-states";
import { createLedgerId } from "@/common/lib/utils/encode";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";
import { Authenticated } from "@/common/components/authenticated";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import {
  NEW_ENTRY_ACTION,
  NEW_TRANSACTION_ACTION_SEARCH,
  type JournalDirectiveAction,
} from "@/common/lib/ledger-action-search";

const DEFAULT_DIRECTIVE_TYPES: DirectiveType[] = [DirectiveType.TRANSACTION];
const DEFAULT_STRING_FILTER: string[] = [];

const JournalContent = () => {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const ledgerSearchParams = useLedgerSearchParams();
  const actionSearch = useSearch({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });
  const navigate = useNavigate({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });
  const { canWrite } = useLedgerPermission();

  // Filter state — persisted per ledger in localStorage
  const [selectedDirectiveTypes, setSelectedDirectiveTypes] =
    useLocalStorageState<DirectiveType[]>(
      `journal.directiveTypes`,
      DEFAULT_DIRECTIVE_TYPES,
    );
  const [selectedTransactionSubtypes, setSelectedTransactionSubtypes] =
    useLocalStorageState<string[]>(
      `journal.transactionSubtypes`,
      DEFAULT_STRING_FILTER,
    );
  const [selectedDocumentSubtypes, setSelectedDocumentSubtypes] =
    useLocalStorageState<string[]>(
      `journal.documentSubtypes`,
      DEFAULT_STRING_FILTER,
    );
  const [selectedCustomSubtypes, setSelectedCustomSubtypes] =
    useLocalStorageState<string[]>(
      `journal.customSubtypes`,
      DEFAULT_STRING_FILTER,
    );
  const [showMetadata, setShowMetadata] = useLocalStorageState(
    `journal.showMetadata`,
    true,
  );
  const [showPostings, setShowPostings] = useLocalStorageState(
    `journal.showPostings`,
    false,
  );

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        time: ledgerSearchParams.searchParams.time,
        filter: ledgerSearchParams.searchParams.filter,
        account: ledgerSearchParams.searchParams.account,
        directiveTypes: selectedDirectiveTypes,
        transactionSubtypes: selectedTransactionSubtypes,
        documentSubtypes: selectedDocumentSubtypes,
        customSubtypes: selectedCustomSubtypes,
      }),
    [
      ledgerSearchParams.searchParams.time,
      ledgerSearchParams.searchParams.filter,
      ledgerSearchParams.searchParams.account,
      selectedDirectiveTypes,
      selectedTransactionSubtypes,
      selectedDocumentSubtypes,
      selectedCustomSubtypes,
    ],
  );

  // Pagination: combine filterKey + offset so changing filters resets to page 0 atomically
  const [pagination, setPagination] = useState({ filterKey: "", offset: 0 });
  const offset = pagination.filterKey === filterKey ? pagination.offset : 0;
  const setOffset: Dispatch<SetStateAction<number>> = (value) => {
    const newOffset = typeof value === "function" ? value(offset) : value;
    setPagination({ filterKey, offset: newOffset });
  };
  const limit = 60;

  // State for entry context dialog
  const [isEntryContextDialogOpen, setIsEntryContextDialogOpen] =
    useState(false);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);

  const { data, loading, error, refetch } = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId: ledgerId,
      query: {
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
        time: ledgerSearchParams.searchParams.time,
        filter: ledgerSearchParams.searchParams.filter,
        account: ledgerSearchParams.searchParams.account,
        offset,
        limit,
      },
    },
    fetchPolicy: "cache-and-network",
  });

  // Type assertion for now - the data will be properly typed once GraphQL schema is updated
  const allJournalData = useMemo(
    () =>
      (data?.getLedgerJournal.data || []) as unknown as JournalDirectiveType[],
    [data?.getLedgerJournal.data],
  );

  // Transform JournalDirectiveType[] to JournalTableItem[]
  const journalTableData = useMemo<JournalTableItem[]>(
    () =>
      allJournalData.map((directive) => ({
        directive,
      })),
    [allJournalData],
  );

  const rawTotal = data?.getLedgerJournal.total;
  const total = typeof rawTotal === "number" ? rawTotal : 0;
  const firstVisibleEntry = total === 0 ? 0 : Math.min(offset + 1, total);
  const lastVisibleEntry = Math.min(offset + journalTableData.length, total);

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
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
          </div>
          <Authenticated>
            <div className="flex shrink-0 gap-2 self-end lg:self-auto">
              <ExportJournalButton
                ledgerId={ledgerId}
                account={ledgerSearchParams.searchParams.account}
                filter={ledgerSearchParams.searchParams.filter}
                time={ledgerSearchParams.searchParams.time}
              />
              {canWrite && (
                <Button asChild className="flex items-center gap-2">
                  <Link
                    to="/ledger/$ledgerOwner/$ledgerName/journal"
                    params={{ ledgerOwner, ledgerName }}
                    search={(previous) => ({
                      ...previous,
                      ...NEW_TRANSACTION_ACTION_SEARCH,
                    })}
                    aria-label={t("journal.addNewJournalEntry")}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {t("journal.newEntry")}
                    </span>
                  </Link>
                </Button>
              )}
            </div>
          </Authenticated>
        </div>

        <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground sm:text-sm">
          <span>{t("common.results")}</span>
          <span className="font-medium tabular-nums text-foreground">
            {loading && journalTableData.length === 0
              ? "…"
              : `${firstVisibleEntry}–${lastVisibleEntry} / ${total}`}
          </span>
        </div>

        {error ? (
          <div className="p-4">
            <JournalErrorState message={t(getErrorMessageKey(error))} />
          </div>
        ) : loading && journalTableData.length === 0 ? (
          <JournalLoadingState />
        ) : journalTableData.length === 0 ? (
          <JournalEmptyState />
        ) : (
          <>
            <JournalTable
              data={journalTableData}
              showMetadata={showMetadata}
              showPostings={showPostings}
              ledgerOwner={ledgerOwner}
              ledgerName={ledgerName}
              onEntryClick={(directive) => {
                setSelectedEntry(directive);
                setIsEntryContextDialogOpen(true);
              }}
            />
            <div className="flex justify-end border-t bg-muted/10 px-3 pb-3">
              <JournalPagination
                total={total}
                limit={limit}
                offset={offset}
                setOffset={setOffset}
              />
            </div>
          </>
        )}
      </div>

      <NewDirectiveDialog
        open={canWrite && actionSearch.action === NEW_ENTRY_ACTION}
        onOpenChange={(open) => {
          if (!open) {
            void navigate({
              to: ".",
              search: (previous) => ({
                ...previous,
                action: undefined,
                directive: undefined,
              }),
              replace: true,
            });
          }
        }}
        activeTab={actionSearch.directive ?? "transaction"}
        onActiveTabChange={(directive: JournalDirectiveAction) => {
          void navigate({
            to: ".",
            search: (previous) => ({
              ...previous,
              action: NEW_ENTRY_ACTION,
              directive,
            }),
            replace: true,
          });
        }}
        ledgerId={ledgerId}
        onSuccess={() => {
          toast.success(t("journal.entryCreatedSuccess"));
          setOffset(0);
          // Evict journal query cache and refetch to ensure fresh data
          void refetch();
        }}
      />

      <EntryContextDialog
        open={isEntryContextDialogOpen}
        onOpenChange={setIsEntryContextDialogOpen}
        entry={selectedEntry}
        ledgerId={ledgerId}
        onSuccess={() => {
          void refetch();
        }}
      />
    </>
  );
};

const LedgerJournalPage = () => {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });
  const { ledgerName: ledgerDisplayName } = useLedger();

  return (
    <div className="space-y-4 sm:space-y-6">
      <LedgerPageSEO seoKey="ledgerJournal" />
      <PageHeader
        title={t("journal.journal")}
        description={t("common.pageDescription.journal", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <ClientOnly fallback={<JournalLoadingState />}>
        <JournalContent />
      </ClientOnly>
      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerName}`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.query"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/query`,
          },
        ]}
      />
    </div>
  );
};

export default LedgerJournalPage;
