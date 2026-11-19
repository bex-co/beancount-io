import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  isJournalTransaction,
  type JournalDirectiveType,
  type JournalTransaction,
} from "@/common/types/journal";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import { summarizeTransaction } from "@/common/lib/beancount/transaction-summary";
import { FormattedAmounts } from "./formatted-amounts";
import { NEW_TRANSACTION_ACTION_SEARCH } from "@/common/lib/ledger-action-search";
import { recentTransactionsVariables } from "../lib/recent-transactions";

const EntryContextDialog = lazy(async () => {
  const module =
    await import("@/features/journal/components/entry-context-dialog");
  return { default: module.EntryContextDialog };
});

/**
 * `language` is required: with an undefined locale `Intl.DateTimeFormat` falls
 * back to the browser's preference instead of the selected app language.
 * Same-year entries stay compact (month + day); other years include the year
 * so a 2017 row cannot be read as this week's activity.
 */
function formatActivityDate(date: string, language: string): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  // The date's own year, which the Gregorian label shows.
  if (Number(date.slice(0, 4)) !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return formatLedgerDate(date, language, options) ?? date;
}

function getTitle(transaction: JournalTransaction, fallback: string): string {
  return transaction.payee?.trim() || transaction.narration?.trim() || fallback;
}

function getSubtitle(transaction: JournalTransaction): string {
  if (transaction.payee && transaction.narration) return transaction.narration;
  return "";
}

export function RecentActivityCard({
  ledgerId,
  ledgerOwner,
  ledgerName,
  account,
  filter,
  time,
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
  primaryCurrency: string;
  incomeRoot: string;
  expensesRoot: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslations();
  const language = i18n.language;
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const entryOpenerRef = useRef<HTMLElement | null>(null);
  const entryFallbackRef = useRef<HTMLElement | null>(null);
  const { data, loading, error, refetch } = useQuery(GetLedgerJournalDocument, {
    variables: recentTransactionsVariables({ ledgerId, account, filter, time }),
    fetchPolicy: "cache-and-network",
  });

  const transactions = useMemo(
    () =>
      ((data?.getLedgerJournal.data ?? []) as unknown as JournalDirectiveType[])
        .filter(isJournalTransaction)
        .map((transaction) => ({
          transaction,
          summary: summarizeTransaction({
            transaction,
            accountFilter: account,
            preferredCurrency: primaryCurrency,
            incomeRoot,
            expensesRoot,
          }),
        })),
    [
      account,
      data?.getLedgerJournal.data,
      expensesRoot,
      incomeRoot,
      primaryCurrency,
    ],
  );
  // One heading per day, not a date on every row.
  const days = useMemo(() => {
    const groups: Array<{ date: string; rows: typeof transactions }> = [];
    for (const row of transactions) {
      const last = groups.at(-1);
      if (last?.date === row.transaction.date) last.rows.push(row);
      else groups.push({ date: row.transaction.date, rows: [row] });
    }
    return groups;
  }, [transactions]);

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
            ("Transactions") was a second heading for the same thing. */}
        <Card className="gap-0 overflow-hidden py-0">
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
              // A ledger's own layout: the day once, in a column of its
              // own, and that day's entries beside it. On a phone the day
              // sits above its entries instead.
              <div className="divide-y">
                {days.map((day) => (
                  <div
                    key={day.date}
                    className="sm:grid sm:grid-cols-[7.5rem_minmax(0,1fr)]"
                  >
                    <h3 className="px-4 pt-3 pb-0.5 text-xs font-medium text-muted-foreground tabular-nums sm:py-3.5 sm:pr-0 sm:pl-5 sm:leading-5">
                      {formatActivityDate(day.date, language)}
                    </h3>
                    <div className="divide-y">
                      {day.rows.map(({ transaction, summary }) => {
                        const title = getTitle(
                          transaction,
                          t("page.overview.unknownTransaction"),
                        );
                        const subtitle = getSubtitle(transaction);
                        const accountSummary = summary.accounts
                          .slice(0, 2)
                          .map((name) => name.split(":").pop() ?? name)
                          .join(" · ");
                        const statusLabel =
                          summary.status === "cleared"
                            ? t("page.overview.transactionCleared")
                            : summary.status === "pending"
                              ? t("page.overview.transactionPending")
                              : t("page.overview.transactionOther");
                        // Where it moved: a transfer's label and the
                        // accounts it touched.
                        const movement = [
                          summary.kind === "transfer"
                            ? t("page.overview.transactionTransfer")
                            : "",
                          accountSummary,
                        ].filter(Boolean);
                        // What it was, then where it moved, on one line
                        // where there is no room for a column of each.
                        const details = [subtitle, ...movement].filter(Boolean);

                        return (
                          <button
                            type="button"
                            key={transaction.entry_hash}
                            className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none forced-colors:focus-visible:[outline-style:solid] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:-outline-offset-2 forced-colors:focus-visible:outline-[CanvasText] sm:pr-5 sm:pl-2 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,18rem)_8rem] lg:gap-6"
                            onClick={(event) => {
                              entryOpenerRef.current = event.currentTarget;
                              setSelectedEntry(transaction);
                              setIsEntryOpen(true);
                            }}
                          >
                            {/* What kind of entry it is, in the page's money
                                colors: income sea green, spending orange, the
                                rest grey. */}
                            <span
                              aria-hidden="true"
                              className={`mx-1 size-2 rounded-full ${
                                summary.kind === "income"
                                  ? "bg-chart-2"
                                  : summary.kind === "expense"
                                    ? "bg-chart-5"
                                    : "bg-muted-foreground/40"
                              }`}
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span
                                  dir="auto"
                                  className="truncate text-sm font-medium"
                                >
                                  {title}
                                </span>
                                {summary.status !== "cleared" && (
                                  <Badge
                                    variant={
                                      summary.status === "pending"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {statusLabel}
                                  </Badge>
                                )}
                              </span>
                              {details.length > 0 && (
                                <span className="block truncate text-xs text-muted-foreground lg:hidden">
                                  {details.join(" · ")}
                                </span>
                              )}
                              {subtitle && (
                                <span
                                  dir="auto"
                                  className="hidden truncate text-xs text-muted-foreground lg:block"
                                >
                                  {subtitle}
                                </span>
                              )}
                            </span>
                            {/* Beside the amount it explains, right-aligned,
                                not adrift mid-row. */}
                            <span className="hidden truncate text-right text-xs text-muted-foreground lg:block">
                              {movement.join(" · ")}
                            </span>
                            {summary.amounts.length === 0 ? (
                              <span className="text-right text-xs font-medium text-muted-foreground">
                                {t("page.overview.transactionMultiple")}
                              </span>
                            ) : (
                              <FormattedAmounts
                                amounts={summary.amounts}
                                showPositiveSign={summary.kind === "income"}
                                className={
                                  summary.kind === "income"
                                    ? "text-right text-sm font-medium text-chart-2"
                                    : "text-right text-sm font-medium"
                                }
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
