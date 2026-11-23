import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  isJournalTransaction,
  type JournalDirectiveType,
} from "@/common/types/journal";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import {
  JournalTable,
  type JournalTableItem,
} from "@/features/journal/components/journal-table";
import { NEW_TRANSACTION_ACTION_SEARCH } from "@/common/lib/ledger-action-search";
import { recentTransactionsVariables } from "../lib/recent-transactions";
import { toLocalISODate } from "../lib/overview-utils";

const EntryContextDialog = lazy(async () => {
  const module =
    await import("@/features/journal/components/entry-context-dialog");
  return { default: module.EntryContextDialog };
});

export function RecentActivityCard({
  ledgerId,
  ledgerOwner,
  ledgerName,
  account,
  filter,
  time,
  today = toLocalISODate(new Date()),
  primaryCurrency,
  incomeRoot,
  expensesRoot,
  canWrite,
}: {
  ledgerId: string;
  ledgerOwner: string;
  ledgerName: string;
  account: string;
  filter: string;
  time: string;
  today?: string;
  primaryCurrency: string;
  incomeRoot: string;
  expensesRoot: string;
  canWrite: boolean;
}) {
  const { t } = useTranslations();
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const entryOpenerRef = useRef<HTMLElement | null>(null);
  const entryFallbackRef = useRef<HTMLElement | null>(null);
  const { data, loading, error, refetch } = useQuery(GetLedgerJournalDocument, {
    variables: recentTransactionsVariables({
      ledgerId,
      account,
      filter,
      time,
      today,
    }),
    fetchPolicy: "cache-and-network",
  });

  // The Journal's own rows, so an entry reads here as it does there.
  const transactions = useMemo<JournalTableItem[]>(
    () =>
      ((data?.getLedgerJournal.data ?? []) as unknown as JournalDirectiveType[])
        .filter(isJournalTransaction)
        .map((directive) => ({ directive })),
    [data?.getLedgerJournal.data],
  );
  const money = useMemo(
    () => ({
      primaryCurrency,
      // Beancount's own root names where the ledger has not renamed them.
      incomeRoot: incomeRoot || "Income",
      expensesRoot: expensesRoot || "Expenses",
      accountFilter: account,
    }),
    [account, expensesRoot, incomeRoot, primaryCurrency],
  );

  return (
    <>
      <section
        ref={entryFallbackRef}
        tabIndex={-1}
        aria-labelledby="overview-recent-activity-heading"
        className="space-y-3 outline-none"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            id="overview-recent-activity-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("page.overview.recentActivity")}
          </h2>
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button asChild variant="outline" size="sm">
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/journal"
                  params={{ ledgerOwner, ledgerName }}
                  search={NEW_TRANSACTION_ACTION_SEARCH}
                >
                  <Plus className="size-4" />
                  {t("journal.newEntry")}
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link
                to="/ledger/$ledgerOwner/$ledgerName/journal"
                params={{ ledgerOwner, ledgerName }}
              >
                {t("page.overview.viewAll")}
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* The section heading names this list; a card title repeating it
            ("Transactions") was a second heading for the same thing.
            Clipped to its corners without becoming a scroller, so the
            list's day headings stay pinned as the page scrolls. */}
        <Card className="gap-0 overflow-clip py-0">
          <CardContent className="px-0">
            {error ? (
              <div className="px-6 py-10 text-center text-sm text-destructive">
                {t("page.overview.recentActivityError")}
              </div>
            ) : loading && transactions.length === 0 ? (
              <div className="space-y-1 px-5 py-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-lg bg-muted/60"
                  />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {t("page.overview.noRecentActivity")}
              </div>
            ) : (
              <JournalTable
                layout="days"
                money={money}
                data={transactions}
                showMetadata={false}
                showPostings={false}
                ledgerOwner={ledgerOwner}
                ledgerName={ledgerName}
                label={t("page.overview.recentActivity")}
                onEntryClick={(entry, opener) => {
                  entryOpenerRef.current = opener;
                  setSelectedEntry(entry);
                  setIsEntryOpen(true);
                }}
              />
            )}
          </CardContent>
        </Card>
      </section>

      <Suspense fallback={null}>
        {isEntryOpen && (
          <EntryContextDialog
            open={isEntryOpen}
            onOpenChange={setIsEntryOpen}
            entry={selectedEntry}
            ledgerId={ledgerId}
            returnFocusRef={entryOpenerRef}
            fallbackFocusRef={entryFallbackRef}
            onSuccess={() => void refetch()}
          />
        )}
      </Suspense>
    </>
  );
}
