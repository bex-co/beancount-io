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
import { type JournalDirectiveType } from "@/common/types/journal";
import { Button } from "@/common/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useJournalFilterState } from "@/features/journal/hooks/use-journal-filter-state";
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
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { useTranslations } from "@/common/hooks/use-translations";
import { Authenticated } from "@/common/components/authenticated";
import { useLedger } from "@/common/hooks/use-ledger";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import {
  JOURNAL_MAX_OFFSET,
  NEW_ENTRY_ACTION,
  NEW_TRANSACTION_ACTION_SEARCH,
  type JournalDirectiveAction,
} from "@/common/lib/ledger-action-search";
import { normalizeListSearchOffset } from "@/common/lib/list-search-params";

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

  // Filter state — persisted per ledger in localStorage. The keys carry the
  // ledger id so one ledger's selections never hide another's entries; the
  // page remounts per ledger (see `key` below) because the hook reads its key
  // only on mount.
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
  } = useJournalFilterState(`journal.${ledgerId}`);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        directiveTypes: selectedDirectiveTypes,
        transactionSubtypes: selectedTransactionSubtypes,
        documentSubtypes: selectedDocumentSubtypes,
        customSubtypes: selectedCustomSubtypes,
      }),
    [
      selectedDirectiveTypes,
      selectedTransactionSubtypes,
      selectedDocumentSubtypes,
      selectedCustomSubtypes,
    ],
  );

  const limit = 60;

  // Pagination lives in the route's validated search params so a drill-down
  // into an account (or a reload, or a shared link) plus browser Back returns
  // to the page the user was reading. Page moves replace the history entry, as
  // the shared ledger filters do, so Back leaves the journal rather than
  // walking back through every page visited. Local directive/subtype edits
  // reset below; shared filter edits reset atomically in their provider so
  // history and explicit links can restore both a scope and its page offset.
  // Re-coerced here: the router still surfaces raw URL values the route schema
  // omitted, so `?offset=-5` or `?offset=abc` must not reach the query.
  const searchOffset =
    normalizeListSearchOffset(actionSearch.offset, JOURNAL_MAX_OFFSET) ?? 0;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  const offset = appliedFilterKey === filterKey ? searchOffset : 0;

  const replaceOffset = (newOffset: number) => {
    // Addressed explicitly rather than with `to: "."`. This also runs from the
    // new-directive dialog's success callback, after an awaited mutation, and
    // a relative write resolves its params against whatever navigation is
    // pending. If the reader has started toward /ledger or a profile by then,
    // this page's params are gone from that destination and the write lands on
    // /ledger/undefined/undefined/journal.
    void navigate({
      to: "/ledger/$ledgerOwner/$ledgerName/journal",
      params: { ledgerOwner, ledgerName },
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

  // A late entry completion must not navigate this page back into view
  // after the reader has left it (w4/1078).
  const pageAliveRef = useRef(true);
  useEffect(() => {
    pageAliveRef.current = true;
    return () => {
      pageAliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (appliedFilterKey === filterKey) return;
    setAppliedFilterKey(filterKey);
    if (searchOffset !== 0) replaceOffset(0);
    // replaceOffset is re-created per render; the guard above runs it once per
    // filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilterKey, filterKey, searchOffset]);

  // State for entry context dialog
  const [isEntryContextDialogOpen, setIsEntryContextDialogOpen] =
    useState(false);
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const entryOpenerRef = useRef<HTMLElement | null>(null);
  // The persistent toolbar New Entry link: every New Entry opener (toolbar,
  // sidebar, Overview, a bookmarked ?action=new-entry) returns focus here.
  const newEntryLinkRef = useRef<HTMLAnchorElement | null>(null);
  const entryFallbackRef = useRef<HTMLDivElement | null>(null);

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
  const { failure, retrying, retry } = useQueryRetry(error, refetch);

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
  const paginationScope = JSON.stringify({
    ledgerId,
    filterKey,
    ...ledgerSearchParams.searchParams,
  });
  const [paginationSnapshot, setPaginationSnapshot] = useState({
    scope: paginationScope,
    total: 0,
  });
  if (
    !loading &&
    !error &&
    typeof rawTotal === "number" &&
    (paginationSnapshot.scope !== paginationScope ||
      paginationSnapshot.total !== rawTotal)
  ) {
    setPaginationSnapshot({ scope: paginationScope, total: rawTotal });
  }
  const paginationTotal =
    paginationSnapshot.scope === paginationScope ? paginationSnapshot.total : 0;
  const firstVisibleEntry = total === 0 ? 0 : Math.min(offset + 1, total);
  const lastVisibleEntry = Math.min(offset + journalTableData.length, total);

  // A URL may ask for a page past the end (stale link, deleted entries). Once
  // the real total is known, fall back to the last page instead of showing an
  // empty journal.
  useEffect(() => {
    if (
      loading ||
      error ||
      typeof rawTotal !== "number" ||
      offset === 0 ||
      offset < total
    )
      return;
    replaceOffset(Math.max(0, Math.floor((total - 1) / limit) * limit));
    // replaceOffset is re-created per render; the guard above makes this a
    // one-shot correction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, rawTotal, offset, total]);

  return (
    <>
      <div
        ref={entryFallbackRef}
        tabIndex={-1}
        className="overflow-hidden rounded-xl border bg-card shadow-sm outline-none"
      >
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
                    ref={newEntryLinkRef}
                    to="/ledger/$ledgerOwner/$ledgerName/journal"
                    params={{ ledgerOwner, ledgerName }}
                    search={(previous) => ({
                      ...previous,
                      ...NEW_TRANSACTION_ACTION_SEARCH,
                    })}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {/* The visible label names the link at every width (WCAG
                        2.5.3); below `sm` it stays for screen readers only. */}
                    <span className="sr-only sm:not-sr-only">
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
            {loading
              ? "…"
              : `${firstVisibleEntry}–${lastVisibleEntry} / ${total}`}
          </span>
        </div>

        {failure ? (
          <div className="p-4">
            <JournalErrorState
              message={t(getErrorMessageKey(failure))}
              onRetry={retry}
              retrying={retrying}
            />
          </div>
        ) : loading ? (
          <JournalLoadingState />
        ) : journalTableData.length === 0 ? (
          <JournalEmptyState />
        ) : (
          <JournalTable
            data={journalTableData}
            showMetadata={showMetadata}
            showPostings={showPostings}
            ledgerOwner={ledgerOwner}
            ledgerName={ledgerName}
            onEntryClick={(directive, opener) => {
              entryOpenerRef.current = opener;
              setSelectedEntry(directive);
              setIsEntryContextDialogOpen(true);
            }}
          />
        )}
        <div className="flex justify-end border-t bg-muted/10 px-3 pb-3">
          <JournalPagination
            total={paginationTotal}
            limit={limit}
            offset={offset}
            setOffset={setOffset}
            loading={loading}
            resultCount={error ? 0 : journalTableData.length}
            scopeKey={paginationScope}
            fallbackFocusRef={entryFallbackRef}
          />
        </div>
      </div>

      <NewDirectiveDialog
        returnFocusRef={newEntryLinkRef}
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
        onSuccess={({ leftErrors }) => {
          if (!pageAliveRef.current) return;
          // A write that broke the ledger already warned with its error.
          if (!leftErrors) toast.success(t("journal.entryCreatedSuccess"));
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
        returnFocusRef={entryOpenerRef}
        fallbackFocusRef={entryFallbackRef}
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
      <PageHeader
        title={t("journal.journal")}
        description={t("common.pageDescription.journal", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <ClientOnly fallback={<JournalLoadingState />}>
        <JournalContent key={createLedgerId(ledgerOwner, ledgerName)} />
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
