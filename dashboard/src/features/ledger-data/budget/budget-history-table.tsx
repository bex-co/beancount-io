import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { BudgetInterval } from "@/graphql/definitions";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerAmount } from "@/common/components/ledger-amount";
import { absDecimalNumber } from "@/common/lib/beancount/decimal-number";
import type { BudgetGroup } from "./types";

interface BudgetHistoryTableProps {
  group: BudgetGroup;
  onDelete: (group: BudgetGroup, opener: HTMLElement | null) => void;
  /**
   * Ids of the card's account title and currency badge. Both are needed:
   * `groupBudgetEntries` keys a group by account *and* currency, so the
   * account alone would name two of these tables identically.
   */
  ariaLabelledBy: string;
}

function toIntervalEnum(interval: string): BudgetInterval | undefined {
  const upper = interval.toUpperCase();
  return Object.values(BudgetInterval).find((value) => value === upper);
}

export function BudgetHistoryTable({
  group,
  onDelete,
  ariaLabelledBy,
}: BudgetHistoryTableProps) {
  const { t } = useTranslations();
  const { canWrite } = useLedgerPermission();
  const intervalLabels = useMemo(
    () => ({
      [BudgetInterval.Daily]: t("page.budget.budgetIntervalDaily"),
      [BudgetInterval.Weekly]: t("page.budget.budgetIntervalWeekly"),
      [BudgetInterval.Monthly]: t("page.budget.budgetIntervalMonthly"),
      [BudgetInterval.Quarterly]: t("page.budget.budgetIntervalQuarterly"),
      [BudgetInterval.Yearly]: t("page.budget.budgetIntervalYearly"),
    }),
    [t],
  );
  const history = useMemo(
    () => [...group.budgetHistory].reverse(),
    [group.budgetHistory],
  );
  const intervalLabel = (interval: string) => {
    const known = toIntervalEnum(interval);
    return known ? intervalLabels[known] : interval;
  };
  // Each Delete names the directive it removes; rows that would read the same
  // (same date, amount and interval) also get their position, so no two
  // buttons share a name.
  const describe = (entry: (typeof history)[number]) =>
    [entry.date, entry.amount, entry.interval].join("\0");
  const counts = new Map<string, number>();
  for (const entry of history) {
    counts.set(describe(entry), (counts.get(describe(entry)) ?? 0) + 1);
  }
  const deleteLabels = history.map((entry, index) => {
    const account = group.account;
    const interval = intervalLabel(entry.interval);
    const { date, amount } = entry;
    return (counts.get(describe(entry)) ?? 0) > 1
      ? t("page.budget.budgetDeleteEntryNumbered", {
          account,
          date,
          amount,
          interval,
          position: index + 1,
        })
      : t("page.budget.budgetDeleteEntry", { account, date, amount, interval });
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table aria-labelledby={ariaLabelledBy}>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead>{t("page.budget.budgetDate")}</TableHead>
            {/* On a phone the cadence sits under the date, so the row fits. */}
            <TableHead className="hidden sm:table-cell">
              {t("page.budget.budgetInterval")}
            </TableHead>
            <TableHead className="text-end">
              {t("page.budget.budgetAmount")}
            </TableHead>
            {canWrite && (
              <TableHead className="w-12 pointer-coarse:w-14">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry, index) => {
            return (
              <TableRow
                key={entry.entry_hash}
                className={index === 0 ? "group bg-muted/15" : "group"}
              >
                <TableCell className="text-base tabular-nums sm:text-sm">
                  <span className="whitespace-nowrap">{entry.date}</span>
                  <span className="block text-xs text-muted-foreground sm:hidden">
                    {intervalLabel(entry.interval)}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {intervalLabel(entry.interval)}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-end text-base font-medium tabular-nums sm:text-sm">
                  {/* The target as the card states it: grouped, and as a
                      size even where income is written negative. */}
                  <AmountText amount={entry.amount} />
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      // Always in view: touch has no hover to reveal it.
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive pointer-coarse:size-11"
                      onClick={(event) =>
                        onDelete(
                          {
                            ...group,
                            interval: entry.interval,
                            amount: entry.amount,
                            entry_hash: entry.entry_hash,
                            date: entry.date,
                          },
                          event.currentTarget,
                        )
                      }
                      aria-label={deleteLabels[index]}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AmountText({ amount }: { amount: string }) {
  const [number, currency] = amount.trim().split(/\s+/);
  if (!number || !currency) return <>{amount}</>;
  return <LedgerAmount number={absDecimalNumber(number)} currency={currency} />;
}
