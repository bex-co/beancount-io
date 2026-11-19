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
import {
  ArrowRight,
  CalendarDays,
  ListFilter,
  Plus,
  Scale,
  WalletCards,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type Dispatch,
  type ReactNode,
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
import { cn } from "@/common/lib/utils/utils";
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
import { useFormatCount } from "@/common/hooks/use-format-count";

const JournalContent = () => {
  const { t } = useTranslations();
  const formatCount = useFormatCount();
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
  const { primaryCurrency, ledgerData } = useLedger();
  const accountFilter = ledgerSearchParams.searchParams.account;
  // What each row needs to say how much moved, in the ledger's own names.
  // Beancount's own root names where the ledger has not renamed them.
  const incomeRoot = ledgerData?.options?.nameIncome || "Income";
  const expensesRoot = ledgerData?.options?.nameExpenses || "Expenses";
  const money = useMemo(
    () => ({ primaryCurrency, incomeRoot, expensesRoot, accountFilter }),
    [accountFilter, expensesRoot, incomeRoot, primaryCurrency],
  );

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
    density,
    setDensity,
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
      <JournalHeading
        summary={
          // Unknown while it loads, and when the read failed: "0 entries"
          // would say the ledger is empty.
          (loading && total === 0) || failure
            ? undefined
            : t("journal.entryCount", {
                count: total,
                shown: formatCount(total),
              })
        }
        actions={
          <Authenticated>
            <div className="flex shrink-0 items-center gap-2">
              <ExportJournalButton
                ledgerId={ledgerId}
                account={ledgerSearchParams.searchParams.account}
                filter={ledgerSearchParams.searchParams.filter}
                time={ledgerSearchParams.searchParams.time}
              />
              {canWrite && (
                <Button
                  asChild
                  className="flex items-center gap-2 pointer-coarse:h-11"
                >
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
                    {t("journal.newEntry")}
                  </Link>
                </Button>
              )}
            </div>
          </Authenticated>
        }
      />
      <div
        ref={entryFallbackRef}
        tabIndex={-1}
        // Clipped to its corners without becoming a scroller, so the list's
        // column and day headings can stay pinned as the page scrolls.
        className="overflow-clip rounded-xl border bg-card shadow-sm outline-none"
      >
        <div className="border-b bg-muted/20 px-2 py-2 sm:px-3">
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
            density={density}
            onDensityChange={setDensity}
          />
        </div>
        <JournalScope ledgerOwner={ledgerOwner} ledgerName={ledgerName} />

        {failure ? (
          <div>
            <JournalErrorState
              message={
                // The server's own "try again later" sat above a Try Again
                // button; here, say what a failed read leaves untouched.
                getErrorMessageKey(failure) === "common.errors.internal"
                  ? t("journal.readFailedLedgerUnchanged")
                  : t(getErrorMessageKey(failure))
              }
              onRetry={retry}
              retrying={retrying}
            />
          </div>
        ) : loading ? (
          <JournalLoadingState density={density} />
        ) : journalTableData.length === 0 ? (
          <JournalEmptyState
            onClearFilters={
              ledgerSearchParams.searchParams.time ||
              ledgerSearchParams.searchParams.account ||
              ledgerSearchParams.searchParams.filter
                ? () =>
                    ledgerSearchParams.setSearchParams({
                      time: "",
                      account: "",
                      filter: "",
                    })
                : undefined
            }
          />
        ) : (
          <JournalTable
            layout={density === "compact" ? "lines" : "days"}
            money={money}
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
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 [&>div]:mt-0",
            // Nothing to page through: no strip left under the message.
            !loading && journalTableData.length === 0
              ? "p-0"
              : "border-t bg-muted/10 px-3 py-2",
          )}
        >
          {/* Where this page sits in the whole; the live region inside the
              pagination announces it. */}
          <span
            aria-hidden="true"
            className="text-xs text-muted-foreground tabular-nums"
          >
            {!loading && total > 0
              ? t("common.showingResultsRange", {
                  first: formatCount(firstVisibleEntry),
                  last: formatCount(lastVisibleEntry),
                  total: formatCount(total),
                })
              : ""}
          </span>
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
          void leftErrors.then((left) => {
            if (!left && pageAliveRef.current) {
              toast.success(t("journal.entryCreatedSuccess"));
            }
          });
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

/**
 * The page's name at every width, the ledger it reads and how many entries
 * match, with the page's actions beside it. On a phone the heading was for
 * screen readers only, so the page opened on a strip of filter chips.
 */
function JournalHeading({
  summary,
  actions,
}: {
  summary?: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslations();
  const { ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });
  const { ledgerName: ledgerDisplayName } = useLedger();
  return (
    // Below `sm` the actions take their own row, always: wrapping by width
    // let the entry count, arriving after load, push them down a line.
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("journal.journal")}
        </h1>
        <p className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
          {ledgerDisplayName ?? ledgerName}
          {summary && <span> · {summary}</span>}
        </p>
      </div>
      {actions}
    </div>
  );
}

/**
 * What narrows the list, above it: on a phone or tablet the filters in
 * force (the header folds them into a sheet there), and, filtered to one
 * account, the way to its register and running balance. Rendered in the
 * page's server fallback too, so the list does not move down on hydration.
 */
function JournalScope({
  ledgerOwner,
  ledgerName,
}: {
  ledgerOwner: string;
  ledgerName: string;
}) {
  const { t } = useTranslations();
  const { searchParams, setSearchParams } = useLedgerSearchParams();
  const accountFilter = searchParams.account;
  return (
    <>
      {(searchParams.time || accountFilter || searchParams.filter) && (
        // Narrower than the header's inline filters (52rem of header, the
        // page's 49rem), the header folds them into a sheet behind a
        // count; the ones in force are named here, over the list they
        // narrowed, with the way to clear them.
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 @min-[49rem]/journal-page:hidden sm:px-5">
          {(
            [
              [
                CalendarDays,
                t("component.searchControls.time"),
                searchParams.time,
              ],
              [
                WalletCards,
                t("component.searchControls.account"),
                accountFilter,
              ],
              [
                ListFilter,
                t("component.searchControls.filterByTagPayee"),
                searchParams.filter,
              ],
            ] as const
          )
            .filter(([, , value]) => value)
            .map(([Icon, label, value]) => (
              <span
                key={label}
                className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-[13px]"
              >
                <Icon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="sr-only">{label}: </span>
                <span title={value} className="min-w-0 truncate">
                  {value}
                </span>
              </span>
            ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSearchParams({
                time: "",
                account: "",
                filter: "",
              })
            }
            className="ms-auto h-8 gap-1 px-2 text-muted-foreground hover:text-foreground pointer-coarse:h-11"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
            {t("component.searchControls.clearAll")}
          </Button>
        </div>
      )}
      {accountFilter && (
        // Reconciling one account wants its balance after every entry:
        // the account's register keeps that running total.
        <div className="border-b bg-primary/[0.04] px-3 py-2 text-sm sm:px-5">
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
            params={{ ledgerOwner, ledgerName, accountName: accountFilter }}
            className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
          >
            <Scale aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {t("journal.openRegister", { account: accountFilter })}
            </span>
            <ArrowRight
              aria-hidden="true"
              className="size-3.5 shrink-0 rtl:-scale-x-100"
            />
          </Link>
        </div>
      )}
    </>
  );
}

const LedgerJournalPage = () => {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/journal",
  });

  return (
    // A reading width on very wide screens: a row's name, accounts and
    // amount stay within one sweep of the eye.
    <div className="@container/journal-page space-y-4 sm:space-y-5 2xl:mx-auto 2xl:w-full 2xl:max-w-[88rem]">
      <ClientOnly
        fallback={
          <>
            {/* The actions' room held, so they do not arrive and push the
                journal down where they wrap under the title. */}
            <JournalHeading
              actions={
                <div aria-hidden="true" className="flex shrink-0 gap-2">
                  <div className="size-9 rounded-md border pointer-coarse:size-11 sm:w-24" />
                  <div className="h-9 w-32 rounded-md bg-primary/20 pointer-coarse:h-11" />
                </div>
              }
            />
            <div className="overflow-clip rounded-xl border bg-card shadow-sm">
              <div className="h-12 border-b bg-muted/20" />
              <JournalScope ledgerOwner={ledgerOwner} ledgerName={ledgerName} />
              <JournalLoadingState />
            </div>
          </>
        }
      >
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
