import { useMemo, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { format, subYears } from "date-fns";
import {
  GetLedgerJournalDocument,
  BudgetInterval,
} from "@/graphql/definitions";
import { createLedgerId } from "@/common/lib/utils/encode";
import { PageHeader } from "@/common/components/page-header";
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
import { BudgetFilterPills } from "./budget-filter-pills";
import { useLedger } from "@/common/hooks/use-ledger";
import type { ConversionOption } from "@/common/types/chart";
import type { BudgetEntry, BudgetGroup } from "./types";
import { groupBudgetEntries } from "./budget-utils";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";

function getLast12MonthsRange(): string {
  const end = new Date();
  const start = subYears(end, 1);
  return `${format(start, "yyyy-MM-dd")} - ${format(end, "yyyy-MM-dd")}`;
}

function BudgetLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border bg-card p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-[250px] w-full" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetEmptyState({ onAdd }: { onAdd: () => void }) {
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
          <Button onClick={onAdd}>
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

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BudgetGroup | null>(null);
  const [search, setSearch] = useState("");
  const [selectedInterval, setSelectedInterval] = useState<string>("ALL");
  const [selectedTimeSpan, setSelectedTimeSpan] = useState<string>("all");
  const conversion: ConversionOption = "units";
  const { primaryCurrency } = useLedger();

  const intervalOptions = useMemo(
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

  const last12MonthsRange = useMemo(() => getLast12MonthsRange(), []);

  const timeFilter = useMemo(() => {
    switch (selectedTimeSpan) {
      case "this-year":
        return "year";
      case "last-year":
        return "year-1";
      case "last-12-months":
        return last12MonthsRange;
      default:
        return undefined;
    }
  }, [selectedTimeSpan, last12MonthsRange]);

  const { data, loading, error } = useQuery(GetLedgerJournalDocument, {
    variables: {
      ledgerId,
      query: {
        directiveTypes: ["Custom"],
        customSubtypes: ["budget"],
      },
    },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });

  const entries = useMemo(
    () =>
      ((data?.getLedgerJournal?.data ?? []) as Record<string, unknown>[]).map(
        (raw) => raw as unknown as BudgetEntry,
      ),
    [data?.getLedgerJournal?.data],
  );

  const budgetGroups = useMemo(() => groupBudgetEntries(entries), [entries]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return budgetGroups.filter((g) => {
      const matchesSearch = !query || g.account.toLowerCase().includes(query);
      const matchesInterval =
        selectedInterval === "ALL" ||
        g.interval.toUpperCase() === selectedInterval;
      return matchesSearch && matchesInterval;
    });
  }, [budgetGroups, search, selectedInterval]);

  const hasListFilters = search.trim() !== "" || selectedInterval !== "ALL";

  const clearListFilters = () => {
    setSearch("");
    setSelectedInterval("ALL");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="flex min-w-0 flex-col"
          title={t("page.budget.budget")}
          description={t("page.budget.budgetDescription")}
        />
        <LedgerWritePermission>
          <Button onClick={() => setIsAddOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
            {t("page.budget.budgetAddBudget")}
          </Button>
        </LedgerWritePermission>
      </div>

      <QueryView
        loading={loading}
        error={error}
        data={budgetGroups}
        loadingSlot={<BudgetLoadingSkeleton />}
        isEmpty={(groups) => groups.length === 0}
        emptySlot={<BudgetEmptyState onAdd={() => setIsAddOpen(true)} />}
      >
        {(groups) => (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative min-w-0 flex-1 sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label={t("page.budget.budgetSearchPlaceholder")}
                    placeholder={t("page.budget.budgetSearchPlaceholder")}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="bg-background pl-9 pr-9"
                  />
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={t("common.clearInput")}
                      onClick={() => setSearch("")}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div
                  className="shrink-0 text-sm tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  <span className="font-medium text-foreground">
                    {filteredGroups.length}
                  </span>{" "}
                  / {groups.length} {t("common.results").toLowerCase()}
                </div>
              </div>
              <div className="grid gap-4 border-t bg-muted/20 p-4 lg:grid-cols-2">
                <BudgetFilterPills
                  label={t("page.budget.budgetIntervalFilterLabel")}
                  options={intervalOptions}
                  value={selectedInterval}
                  onChange={setSelectedInterval}
                />
                <BudgetFilterPills
                  label={t("page.budget.budgetTimeSpanFilterLabel")}
                  options={timeSpanOptions}
                  value={selectedTimeSpan}
                  onChange={setSelectedTimeSpan}
                />
              </div>
            </div>

            {filteredGroups.length === 0 && (
              <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("common.noResultsFound")}
                </p>
                {hasListFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={clearListFilters}
                  >
                    {t("common.clearInput")}
                  </Button>
                )}
              </div>
            )}

            <div className="grid gap-4">
              {filteredGroups.map((group) => (
                <BudgetChartCard
                  key={`${group.account}::${group.currency}`}
                  group={group}
                  ledgerId={ledgerId}
                  conversion={conversion}
                  primaryCurrency={primaryCurrency}
                  time={timeFilter}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </div>
        )}
      </QueryView>

      <AddBudgetDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        ledgerId={ledgerId}
        defaultCurrency={primaryCurrency || "USD"}
        onSuccess={() => {}}
      />

      <DeleteBudgetDialog
        target={deleteTarget}
        ledgerId={ledgerId}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onSuccess={() => setDeleteTarget(null)}
      />
    </div>
  );
}
