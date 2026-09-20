import { useId } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useTranslations } from "@/common/hooks/use-translations";

/** A plotted point: a date and whatever units it holds. */
export interface ChartPeriodPoint {
  date: string;
  balance: Record<string, unknown>;
}

/**
 * The account charts draw their periods on a canvas, so their values were
 * reachable only by hovering — and at 390px the journal's Units, Change and
 * Balance columns are hidden, leaving no text alternative at all.
 *
 * This lists the same points the chart plots, one row per period, with every
 * unit that period holds. It never sums across commodities and never invents a
 * value: a period the report returned with no balances shows a dash, which is
 * not the same as an explicit zero.
 */
export function ChartPeriodTable({
  data,
  labelledBy,
}: {
  data: ChartPeriodPoint[];
  labelledBy: string;
}) {
  const { t } = useTranslations();
  const summaryId = useId();

  if (data.length === 0) return null;

  return (
    <details className="mt-4 rounded-lg border">
      <summary
        id={summaryId}
        className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {t("page.accountReport.periodData")}
      </summary>
      <div className="overflow-x-auto border-t">
        <Table aria-labelledby={`${labelledBy} ${summaryId}`}>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-28">
                {t("page.accountReport.period")}
              </TableHead>
              <TableHead className="min-w-28 text-right">
                {t("page.accountReport.periodAmount")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((point) => {
              const units = Object.entries(point.balance).filter(
                ([, value]) => value !== null && value !== undefined,
              );
              return (
                <TableRow key={point.date}>
                  <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                    {point.date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {units.length === 0
                      ? "—"
                      : units.map(([currency, value]) => (
                          <div key={currency} className="whitespace-nowrap">
                            {String(value)} {currency}
                          </div>
                        ))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
