import { Amount } from "@/common/components/amount";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { fractionDigitsOf } from "@/common/lib/format/format-number";
import { ChartDataTable } from "../../../components/chart-data-table";

/** Final plotted slices/bars, including grouped Other and bar sorting. */
export function DistributionDataTable({
  data,
  unit,
  labelledBy,
  absoluteShare = false,
}: {
  data: Array<{ name: string; account?: string; value: number; exact: string }>;
  unit?: string | null;
  labelledBy: string;
  absoluteShare?: boolean;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  if (data.length === 0) return null;
  const total = data.reduce((sum, item) => sum + Math.abs(item.value), 0);
  return (
    <ChartDataTable
      labelledBy={labelledBy}
      summary={t("page.overview.chartBreakdown")}
    >
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("common.accountColumn")}</TableHead>
          <TableHead scope="col" className="text-end">
            {t("page.accountReport.periodAmount")}
          </TableHead>
          <TableHead scope="col" className="text-end">
            {t(
              absoluteShare
                ? "page.overview.chartMagnitudeShare"
                : "page.overview.chartShare",
            )}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={`${item.account ?? item.name}-${index}`}>
            <TableHead scope="row" className="font-normal">
              {item.account ?? item.name}
            </TableHead>
            <TableCell className="text-end font-mono text-sm tabular-nums">
              <Amount>
                {formatNum(
                  item.exact,
                  unit ?? undefined,
                  fractionDigitsOf(item.exact),
                )}
                {unit ? ` ${unit}` : ""}
              </Amount>
            </TableCell>
            <TableCell className="text-end font-mono text-sm tabular-nums">
              {total === 0 ? (
                t("page.statistics.percentageNotApplicable")
              ) : (
                <Amount>
                  {formatNum(
                    Number(((Math.abs(item.value) / total) * 100).toFixed(2)),
                  )}
                  %
                </Amount>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </ChartDataTable>
  );
}
