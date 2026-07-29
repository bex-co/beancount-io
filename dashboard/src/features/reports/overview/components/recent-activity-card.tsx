import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { ChevronRight, Plus, ReceiptText } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  DirectiveType,
  isJournalTransaction,
  type JournalDirectiveType,
  type JournalTransaction,
} from "@/common/types/journal";
import { GetLedgerJournalDocument } from "@/graphql/definitions";
import { summarizeTransaction } from "../lib/transaction-summary";
import { FormattedAmounts } from "./formatted-amounts";
import { NEW_TRANSACTION_ACTION_SEARCH } from "@/common/lib/ledger-action-search";

const EntryContextDialog = lazy(async () => {
  const module =
    await import("@/features/journal/components/entry-context-dialog");
  return { default: module.EntryContextDialog };
});

function formatActivityDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function getTitle(transaction: JournalTransaction, fallback: string): string {
  return transaction.payee?.trim() || transaction.narration?.trim() || fallback;
}

function getSubtitle(transaction: JournalTransaction): string {
  if (transaction.payee && transaction.narration) return transaction.narration;
  return "";
}

function getInitials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "•"
  );
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
  const { t } = useTranslations();
  const [selectedEntry, setSelectedEntry] =
    useState<JournalDirectiveType | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId,
      query: {
        account: account || undefined,
        filter: filter || undefined,
        time: time || undefined,
        directiveTypes: [DirectiveType.TRANSACTION],
        offset: 0,
        limit: 8,
      },
    },
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

  return (
    <>
      <section
        aria-labelledby="overview-recent-activity-heading"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              id="overview-recent-activity-heading"
              className="text-lg font-semibold tracking-tight"
            >
              {t("page.overview.recentActivity")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("page.overview.recentActivityDescription")}
            </p>
          </div>
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

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <CardTitle>{t("journal.transactions")}</CardTitle>
            <CardDescription>
              {t("page.overview.recentActivityCardDescription")}
            </CardDescription>
            <CardAction>
              <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ReceiptText className="size-4" />
              </span>
            </CardAction>
          </CardHeader>
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
              <div className="divide-y">
                {transactions.map(({ transaction, summary }) => {
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

                  return (
                    <button
                      type="button"
                      key={transaction.entry_hash}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[5rem_auto_minmax(0,1fr)_minmax(8rem,auto)_auto] sm:px-5"
                      onClick={() => {
                        setSelectedEntry(transaction);
                        setIsEntryOpen(true);
                      }}
                    >
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {formatActivityDate(transaction.date)}
                      </span>
                      <span className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {getInitials(title)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {title}
                          </span>
                          {summary.status !== "cleared" && (
                            <Badge
                              variant={
                                summary.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="hidden sm:inline-flex"
                            >
                              {statusLabel}
                            </Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[subtitle, accountSummary]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                          {formatActivityDate(transaction.date)}
                        </span>
                      </span>
                      <span className="hidden truncate text-right text-xs text-muted-foreground sm:block">
                        {summary.kind === "transfer"
                          ? t("page.overview.transactionTransfer")
                          : summary.amounts.length === 0
                            ? t("page.overview.transactionMultiple")
                            : accountSummary}
                      </span>
                      <FormattedAmounts
                        amounts={summary.amounts}
                        showPositiveSign={summary.kind === "income"}
                        className={
                          summary.kind === "income"
                            ? "text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                            : "text-right text-sm font-semibold"
                        }
                      />
                    </button>
                  );
                })}
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
            onSuccess={() => void refetch()}
          />
        )}
      </Suspense>
    </>
  );
}
