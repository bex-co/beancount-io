import { useEffect, useMemo, useRef, useState } from "react";
import { useHydrated, useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { format, subYears } from "date-fns";
import {
  BudgetInterval,
  GetLedgerJournalDocument,
} from "@/graphql/definitions";
import { createLedgerId } from "@/common/lib/utils/encode";
import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { DirectiveType } from "@/common/types/journal";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Card, CardContent } from "@/common/components/ui/card";
import { Plus, Search, Wallet, X } from "lucide-react";
import { Skeleton } from "@/common/components/ui/skeleton";
import { useTranslations } from "@/common/hooks/use-translations";
import { QueryView } from "@/common/components/query-view";
import { AddBudgetDialog } from "./add-budget-dialog";
import { DeleteBudgetDialog } from "./delete-budget-dialog";
import { BudgetChartCard } from "./budget-chart-card";
import { BudgetFilterPills, BudgetFilterSelect } from "./budget-filter-pills";
import { useLedger } from "@/common/hooks/use-ledger";
import type { ConversionOption } from "@/common/types/chart";
import type { BudgetGroup } from "./types";
import { useBudgetEntries } from "./use-budget-entries";
import { groupBudgetEntries } from "./budget-utils";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { cn } from "@/common/lib/utils/utils";
import { useFormatCount } from "@/common/hooks/use-format-count";
import { BudgetSummary } from "./budget-summary";
import { budgetKey, budgetSummaryDay } from "./budget-snapshot";

/** The id of a budget's card, for its summary row to lead to. */
const anchorOf = (group: BudgetGroup) =>
  `budget-${budgetKey(group).replace(/[^A-Za-z0-9_-]+/g, "-")}`;

function getLast12MonthsRange(): string {
  const end = new Date();
  const start = subYears(end, 1);
  return `${format(start, "yyyy-MM-dd")} - ${format(end, "yyyy-MM-dd")}`;
}

/** The loaded page's shape: its card of filters and summary rows, then a budget. */
function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="overflow-clip rounded-xl border bg-card shadow-sm">
        <div className="space-y-2 border-b bg-muted/20 px-2 py-2 sm:px-3">
          <Skeleton className="h-9 w-full @4xl:w-64" />
          <Skeleton className="h-8 w-3/4" />
        </div>
        <div className="h-8 border-b bg-muted" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-4 border-b px-4 py-2 last:border-b-0"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    </div>
  );
}

function BudgetEmptyState({ onAdd }: { onAdd: (opener: HTMLElement) => void }) {
  const { t } = useTranslations();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <Wallet className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mb-1 text-base font-semibold">
          {t("page.budget.budgetNoBudgetsFound")}
        </h2>
        <p className="mb-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("page.budget.budgetNoBudgetsFoundDescription")}
        </p>
        <LedgerWritePermission>
          <Button
            onClick={(event) => onAdd(event.currentTarget)}
            className="pointer-coarse:min-h-11 pointer-coarse:px-5"
          >
            <Plus className="h-4 w-4" />
            {t("page.budget.budgetEmptyStateCta")}
          </Button>
        </LedgerWritePermission>
      </CardContent>
    </Card>
  );
}

export default function LedgerBudgetPage() {
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/budget",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { t } = useTranslations();
  const formatCount = useFormatCount();
  const hydrated = useHydrated();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetGroup | null>(null);
  const [search, setSearch] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<string>("ALL");
  const [selectedTimeSpan, setSelectedTimeSpan] = useState<string>("all");
  const conversion: ConversionOption = "units";
  const { primaryCurrency } = useLedger();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const headerAddRef = useRef<HTMLButtonElement | null>(null);
  const addReturnFocusRef = useRef<HTMLElement | null>(null);

  const openAddBudget = (opener: HTMLElement | null) => {
    addReturnFocusRef.current = opener;
    setIsAddOpen(true);
  };

  const deleteReturnFocusRef = useRef<HTMLElement | null>(null);
  const openDeleteBudget = (group: BudgetGroup, opener: HTMLElement | null) => {
    deleteReturnFocusRef.current = opener;
    setDeleteTarget(group);
  };

  const allIntervalOptions = useMemo(
    () => [
      { value: "ALL", label: t("page.budget.budgetIntervalAll") },
      {
        value: BudgetInterval.Daily,
        label: t("page.budget.budgetIntervalDaily"),
      },
      {
        value: BudgetInterval.Weekly,
        label: t("page.budget.budgetIntervalWeekly"),
      },
      {
        value: BudgetInterval.Monthly,
        label: t("page.budget.budgetIntervalMonthly"),
      },
      {
        value: BudgetInterval.Quarterly,
        label: t("page.budget.budgetIntervalQuarterly"),
      },
      {
        value: BudgetInterval.Yearly,
        label: t("page.budget.budgetIntervalYearly"),
      },
    ],
    [t],
  );

  const timeSpanOptions = useMemo(
    () => [
      { value: "all", label: t("page.budget.budgetTimeSpanAll") },
      {
        value: "this-year",
        label: t("page.budget.budgetTimeSpanThisYear"),
      },
      {
        value: "last-year",
        label: t("page.budget.budgetTimeSpanLastYear"),
      },
      {
        value: "last-12-months",
        label: t("page.budget.budgetTimeSpanLast12Months"),
      },
    ],
    [t],
  );

  // The rolling range ends on the reader's day when they choose it, not the
  // day the page mounted: a tab opened yesterday still asks for today
  // (w4/980).
  const [rollingRange, setRollingRange] = useState<string | undefined>();
  const selectTimeSpan = (span: string) => {
    if (span === "last-12-months") setRollingRange(getLast12MonthsRange());
    setSelectedTimeSpan(span);
  };

  const timeFilter = useMemo(() => {
    switch (selectedTimeSpan) {
      case "this-year":
        return "year";
      case "last-year":
        return "year-1";
      case "last-12-months":
        return rollingRange;
      default:
        return undefined;
    }
  }, [selectedTimeSpan, rollingRange]);

  // A saved budget can replace its dialog opener when the list refreshes.
  // Keep track of where focus belongs once the replacement is mounted.
  const pendingBudgetFocusRef = useRef<{
    ledgerId: string;
    update?: { account: string; currency: string };
  } | null>(null);
  const rememberUpdateFocus = (submitted: {
    account: string;
    currency: string;
  }) => {
    pendingBudgetFocusRef.current = { ledgerId, update: submitted };
  };

  const { entries, loading, error, retry } = useBudgetEntries(ledgerId);
  const { ledgerName: ledgerDisplayName } = useLedger();

  // The ledger's last entry: a ledger that stopped long ago is summarised
  // for the last month its data covers, not for an empty current one.
  const latestEntry = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId,
      query: {
        directiveTypes: [DirectiveType.TRANSACTION],
        offset: 0,
        limit: 1,
      },
    },
    skip: !ledgerId,
    fetchPolicy: "cache-first",
  });
  const dataThrough =
    (
      latestEntry.data?.getLedgerJournal?.data as
        | Array<{ date?: string }>
        | undefined
    )?.[0]?.date ?? null;
  const today = format(new Date(), "yyyy-MM-dd");
  const quietDay = budgetSummaryDay(today, dataThrough);
  // A span that begins after the entries end (This year or Last 12 months
  // on a ledger that stopped) holds no period with data: it is read for
  // today, as a live ledger is, and the note says why it is empty.
  const spanStart =
    selectedTimeSpan === "this-year"
      ? `${today.slice(0, 4)}-01-01`
      : selectedTimeSpan === "last-12-months"
        ? rollingRange?.slice(0, 10)
        : undefined;
  const spanAfterEntries = spanStart !== undefined && quietDay < spanStart;
  const asOf = spanAfterEntries ? today : quietDay;
  // What the chosen span means in dates, said beside the control.
  const thisYear = Number(today.slice(0, 4));
  const spanDates =
    selectedTimeSpan === "this-year"
      ? `${thisYear}-01-01 – ${thisYear}-12-31`
      : selectedTimeSpan === "last-year"
        ? `${thisYear - 1}-01-01 – ${thisYear - 1}-12-31`
        : selectedTimeSpan === "last-12-months" && rollingRange
          ? rollingRange.replace(" - ", " – ")
          : undefined;
  // A date in running text never breaks at its hyphens ("2025-" / "09-30").
  const wholeDate = (day: string) => day.replace(/-/g, "-\u2060");
  const summaryNote = [
    dataThrough && spanAfterEntries
      ? t("page.budget.budgetEntriesEndBeforeSpan", {
          date: wholeDate(dataThrough),
        })
      : dataThrough && asOf !== today
        ? t("page.budget.budgetEntriesEnd", {
            date: wholeDate(dataThrough),
            day: wholeDate(asOf),
          })
        : null,
  ]
    .filter(Boolean)
    .join(" ");
  const asOfReady = !latestEntry.loading;

  const budgetGroups = useMemo(
    () => (entries ? groupBudgetEntries(entries) : null),
    [entries],
  );

  // Only the cadences the ledger's budgets use, and All.
  const usedIntervals = new Set(
    (budgetGroups ?? []).map((g) => g.interval.toUpperCase()),
  );
  const intervalOptions = allIntervalOptions.filter(
    (option) => option.value === "ALL" || usedIntervals.has(option.value),
  );

  useEffect(() => {
    const pending = pendingBudgetFocusRef.current;
    if (!pending || pending.ledgerId !== ledgerId || loading) return;
    if (!pending.update && !headerAddRef.current && !error) return;
    const frame = requestAnimationFrame(() => {
      pendingBudgetFocusRef.current = null;
      // Focus the user deliberately moved (a later opening, a new target)
      // is theirs; only a position lost to the replacement is restored. A
      // failed refresh takes the list away, so focus still in it moves too.
      const active = document.activeElement;
      const inList = Boolean(active?.closest("[data-budget-list]"));
      if (
        active &&
        active !== document.body &&
        active.isConnected &&
        !(error && inList)
      )
        return;
      const replacement =
        pending.update && !error
          ? document.querySelector<HTMLElement>(
              `[data-budget-update="${CSS.escape(`${pending.update.account}::${pending.update.currency}`)}"]`,
            )
          : null;
      (replacement ?? headerAddRef.current ?? searchInputRef.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [loading, error, budgetGroups, ledgerId]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (budgetGroups ?? []).filter((g) => {
      const matchesSearch = !query || g.account.toLowerCase().includes(query);
      const matchesInterval =
        selectedInterval === "ALL" ||
        g.interval.toUpperCase() === selectedInterval;
      return matchesSearch && matchesInterval;
    });
  }, [budgetGroups, search, selectedInterval]);

  const hasListFilters = search.trim() !== "" || selectedInterval !== "ALL";

  // The cards follow the summary's order, worst first, once it is settled;
  // until then one placeholder holds their place, so nothing reorders on
  // screen.
  const [cardOrder, setCardOrder] = useState<string[] | null>(null);
  const orderedCards = (() => {
    if (!cardOrder) return null;
    const rank = new Map(cardOrder.map((key, index) => [key, index]));
    if (!filteredGroups.every((group) => rank.has(budgetKey(group))))
      return null;
    return [...filteredGroups].sort(
      (a, b) => rank.get(budgetKey(a))! - rank.get(budgetKey(b))!,
    );
  })();

  // The no-results Clear leaves with its results; hand focus to the search,
  // as the field's own clear icon does, for the next query (w4/340).
  const clearListFilters = () => {
    setSearch("");
    setSelectedInterval("ALL");
    searchInputRef.current?.focus();
  };

  return (
    <LedgerPage className="@container space-y-4 pb-6 sm:space-y-5">
      <LedgerPageHeading
        title={t("page.budget.budget")}
        context={ledgerDisplayName ?? ledgerName}
        meta={
          budgetGroups && budgetGroups.length > 0
            ? t("page.budget.budgetCount", {
                count: budgetGroups.length,
                shown: formatCount(budgetGroups.length),
              })
            : undefined
        }
        actions={
          budgetGroups && budgetGroups.length > 0 ? (
            <LedgerWritePermission>
              {/* Server-rendered before its click handler exists: a click then
                  opened nothing, so it waits for hydration (w4/962). */}
              <Button
                ref={headerAddRef}
                disabled={!hydrated}
                onClick={(event) => openAddBudget(event.currentTarget)}
                className="shrink-0 self-start sm:self-auto pointer-coarse:h-11"
              >
                <Plus className="h-4 w-4" />
                {t("page.budget.budgetAddBudget")}
              </Button>
            </LedgerWritePermission>
          ) : undefined
        }
      />

      <QueryView
        loading={loading && !budgetGroups}
        error={error}
        onRetry={retry}
        // The server's own "try again later" sat beside a Try Again button;
        // say instead what a failed read leaves untouched.
        errorMessage={
          error && getErrorMessageKey(error) === "common.errors.internal"
            ? t("page.budget.budgetReadFailedLedgerUnchanged")
            : undefined
        }
        data={budgetGroups}
        loadingSlot={<BudgetLoadingSkeleton />}
        isEmpty={(groups) => groups.length === 0}
        emptySlot={<BudgetEmptyState onAdd={openAddBudget} />}
      >
        {(groups) => (
          <div data-budget-list className="space-y-4 sm:space-y-5">
            {/* One card, as the Journal and Accounts: what narrows the list
                in its top bar, every budget at a glance under it. */}
            <div className="overflow-clip rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col gap-2 border-b bg-muted/20 px-2 py-2 sm:px-3 @4xl:flex-row @4xl:flex-wrap @4xl:items-center @4xl:gap-x-4">
                <div className="relative w-full @4xl:w-72 @4xl:flex-none">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    aria-label={t("page.budget.budgetSearchPlaceholder")}
                    placeholder={t("page.budget.budgetSearchPlaceholder")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="bg-background ps-9 pe-9 pointer-coarse:h-11"
                  />
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute end-0.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-coarse:size-10"
                      aria-label={t("common.clearInput")}
                      onClick={() => {
                        setSearch("");
                        searchInputRef.current?.focus();
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
                {/* Wide, each filter is a row of chips. Narrow, the two are
                    selects side by side, so the toolbar is two rows and the
                    first budgets show on the first screen. */}
                <BudgetFilterPills
                  label={t("page.budget.budgetIntervalFilterLabel")}
                  options={intervalOptions}
                  value={selectedInterval}
                  onChange={setSelectedInterval}
                  className="hidden @lg:flex"
                />
                <BudgetFilterPills
                  label={t("page.budget.budgetTimeSpanFilterLabel")}
                  detail={spanDates ?? ""}
                  options={timeSpanOptions}
                  value={selectedTimeSpan}
                  onChange={selectTimeSpan}
                  className="hidden @lg:flex"
                />
                <div className="grid grid-cols-1 gap-2 min-[22rem]:grid-cols-2 @lg:hidden">
                  <BudgetFilterSelect
                    label={t("page.budget.budgetIntervalFilterLabel")}
                    options={intervalOptions}
                    value={selectedInterval}
                    onChange={setSelectedInterval}
                  />
                  <BudgetFilterSelect
                    label={t("page.budget.budgetTimeSpanFilterLabel")}
                    detail={spanDates ?? ""}
                    options={timeSpanOptions}
                    value={selectedTimeSpan}
                    onChange={selectTimeSpan}
                  />
                </div>
                <div
                  className={cn(
                    "shrink-0 text-sm tabular-nums text-muted-foreground @4xl:ms-auto",
                    !hasListFilters && "sr-only",
                  )}
                  aria-live="polite"
                >
                  <span className="font-medium text-foreground">
                    {formatCount(filteredGroups.length)}
                  </span>{" "}
                  / {formatCount(groups.length)}
                </div>
              </div>
              {filteredGroups.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {search.trim()
                      ? t("page.budget.budgetNoMatchFor", {
                          query: search.trim(),
                        })
                      : t("common.noResultsFound")}
                  </p>
                  {hasListFilters && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4 pointer-coarse:h-11"
                      onClick={clearListFilters}
                    >
                      <X className="size-3.5" />
                      {t("common.clearInput")}
                    </Button>
                  )}
                </div>
              ) : (
                <BudgetSummary
                  groups={filteredGroups}
                  ready={asOfReady}
                  anchorOf={anchorOf}
                  id="budget-summary"
                  note={summaryNote || undefined}
                  onOrder={setCardOrder}
                  ledgerId={ledgerId}
                  conversion={conversion}
                  primaryCurrency={primaryCurrency}
                  time={timeFilter}
                  asOf={asOf}
                />
              )}
            </div>

            {orderedCards === null && filteredGroups.length > 0 && (
              <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-[260px] w-full" />
              </div>
            )}
            {(orderedCards ?? []).map((group) => (
              <BudgetChartCard
                key={budgetKey(group)}
                anchorId={anchorOf(group)}
                group={group}
                ledgerId={ledgerId}
                conversion={conversion}
                primaryCurrency={primaryCurrency}
                time={timeFilter}
                asOf={asOf}
                onDelete={openDeleteBudget}
                onUpdateSuccess={rememberUpdateFocus}
              />
            ))}
          </div>
        )}
      </QueryView>

      <AddBudgetDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        ledgerId={ledgerId}
        defaultCurrency={primaryCurrency || "USD"}
        onSuccess={() => {
          if (!budgetGroups?.length) {
            pendingBudgetFocusRef.current = { ledgerId };
          }
        }}
        returnFocusRef={addReturnFocusRef}
        fallbackFocusRef={headerAddRef}
      />

      <DeleteBudgetDialog
        target={deleteTarget}
        ledgerId={ledgerId}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={() => setDeleteTarget(null)}
        returnFocusRef={deleteReturnFocusRef}
        fallbackFocusRef={headerAddRef}
      />
    </LedgerPage>
  );
}
