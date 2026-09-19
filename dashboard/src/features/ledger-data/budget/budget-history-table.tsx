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
import type { BudgetGroup } from "./types";

interface BudgetHistoryTableProps {
  group: BudgetGroup;
  onDelete: (group: BudgetGroup) => void;
  /**
   * IDs of the visible nodes that identify this history — the card's account
   * title and its currency badge. Seven of these tables sit on one page with
   * the same Date / Interval / Amount columns, so without a name they are
   * indistinguishable to anyone navigating by table. The card owns the ids
   * because it owns the visible identity, and the currency is part of it:
   * `groupBudgetEntries` keys a group by account *and* currency, so one
   * account can appear more than once.
   */
  ariaLabelledBy?: string;
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

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table aria-labelledby={ariaLabelledBy}>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-28">
              {t("page.budget.budgetDate")}
            </TableHead>
            <TableHead className="min-w-24">
              {t("page.budget.budgetInterval")}
            </TableHead>
            <TableHead className="min-w-28 text-right">
              {t("page.budget.budgetAmount")}
            </TableHead>
            {canWrite && (
              <TableHead className="w-14">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry, index) => {
            const interval = toIntervalEnum(entry.interval);
            return (
              <TableRow
                key={entry.entry_hash}
                className={index === 0 ? "group bg-muted/15" : "group"}
              >
                <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                  {entry.date}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {interval ? intervalLabels[interval] : entry.interval}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-right font-mono text-sm font-medium tabular-nums">
                  {entry.amount}
                </TableCell>
                {canWrite && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      onClick={() =>
                        onDelete({
                          ...group,
                          interval: entry.interval,
                          amount: entry.amount,
                          entry_hash: entry.entry_hash,
                          date: entry.date,
                        })
                      }
                      aria-label={t("common.delete")}
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
