import { useQuery } from "@apollo/client/react";
import { QueryShellDocument } from "@/graphql/definitions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Button } from "@/common/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/common/lib/utils/csv-export";
import React from "react";
import { tableToCSV, formatNumber } from "./utils";
import { formatInventoryEntries } from "@/common/lib/format/inventory-cell";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { toast } from "sonner";
import { ReportErrorState } from "@/common/components/state-components";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { getClickableRowProps } from "@/common/components/clickable-row";
import { Amount } from "@/common/components/amount";
import { useFormatCount } from "@/common/hooks/use-format-count";

interface DatasetTableProps {
  query: string;
  ledgerId: string;
  ariaLabel: string;
  rowsFilter?: (rows: unknown[][]) => unknown[][];
}

const renderObject = (obj: object) => {
  return formatInventoryEntries(obj).map(({ currency, amount }) => {
    return (
      <div key={currency} className="text-sm leading-relaxed">
        <Amount>
          <span>{amount}</span>
          <span className="text-muted-foreground ml-1">{currency}</span>
        </Amount>
      </div>
    );
  });
};

function isNumericCell(value: unknown): boolean {
  return (
    typeof value === "number" ||
    (typeof value === "string" &&
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))
  );
}

export const DatasetTable = React.memo(
  ({ query, ledgerId, ariaLabel, rowsFilter }: DatasetTableProps) => {
    const { t } = useTranslations();
    const formatCount = useFormatCount();
    const navigate = useNavigate();

    const { data, loading, error, refetch } = useQuery(QueryShellDocument, {
      variables: {
        ledgerId: ledgerId,
        query,
      },
      fetchPolicy: "cache-first",
    });
    // A failed read offers Try Again on this grouping's own query, and keeps
    // its error view while that retry runs (w4/337, as w4/m50).
    const { failure, retrying, retry } = useQueryRetry(error, refetch);

    const handleExportCSV = React.useCallback(() => {
      if (!data?.queryShell?.table) return;

      const { table } = data.queryShell;
      const headers = table.types?.map((type) => type.name) || [];
      let rows = table.rows || [];
      if (rowsFilter) {
        rows = rowsFilter(rows);
      }

      if (rows.length === 0) return;

      const csvContent = tableToCSV(headers, rows);
      const filename = `holdings-export-${new Date().toISOString().split("T")[0]}.csv`;
      // A refused download is reported here, with the table kept for another
      // try (w4/329).
      try {
        downloadCSV(csvContent, filename);
      } catch (error) {
        console.error("Failed to download holdings:", error);
        toast.error(t("common.downloadFailed"));
      }
    }, [data, rowsFilter, t]);

    const renderTableData = React.useMemo(() => {
      if (!data?.queryShell?.table) return null;

      const { table } = data.queryShell;
      const headers = table.types?.map((type) => type.name) || [];
      const accountColumnIndex = headers.findIndex(
        (header) => header.toLowerCase() === "account",
      );
      let rows = table.rows || [];
      if (rowsFilter) {
        rows = rowsFilter(rows);
      }
      // rows = rowsFilter ? rowsFilter(rows) : rows;
      const numericColumns = headers.map(
        (header, index) =>
          header.toLowerCase() !== "account" &&
          rows.some(
            (row) =>
              isNumericCell(row[index]) ||
              (typeof row[index] === "object" && row[index] !== null),
          ),
      );

      if (rows.length === 0) {
        return (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-sm font-medium">
              {t("page.holdings.noDataReturnedFromQuery")}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-foreground">
                {t("common.results")}
              </div>
              <div className="px-2 py-1 bg-muted rounded-md text-xs font-semibold text-muted-foreground">
                {formatCount(rows.length)}{" "}
                {rows.length === 1 ? t("page.holdings.row") : t("common.rows")}
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-fit"
            >
              <Download className="h-4 w-4" />
              <span>{t("page.holdings.exportCsv")}</span>
            </Button>
          </div>
          <div className="overflow-hidden w-full">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <Table aria-label={ariaLabel}>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {headers.map((header, index) => (
                      <TableHead
                        key={header}
                        className={cn(
                          "text-xs sm:text-sm text-foreground whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2",
                          numericColumns[index] && "text-end",
                        )}
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIndex) => {
                    const accountCell = row[accountColumnIndex];
                    const accountName =
                      accountColumnIndex >= 0
                        ? typeof accountCell === "string"
                          ? accountCell
                          : String(accountCell)
                        : null;
                    const rowProps = accountName
                      ? getClickableRowProps<HTMLTableRowElement>(
                          () => {
                            const { ledgerOwner, ledgerName } =
                              decodeLedgerId(ledgerId);
                            void navigate({
                              to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
                              params: {
                                ledgerOwner,
                                ledgerName,
                                accountName,
                              },
                            });
                          },
                          {
                            className: "hover:bg-muted/30 transition-colors",
                            preserveTableSemantics: true,
                          },
                        )
                      : { className: "hover:bg-muted/30 transition-colors" };

                    return (
                      <TableRow key={rowIndex} {...rowProps}>
                        {row.map((cell, cellIndex) => {
                          const headerName = headers[cellIndex];
                          const isAccountColumn =
                            headerName?.toLowerCase() === "account";
                          const cellValue =
                            typeof cell === "object" && cell !== null ? (
                              renderObject(cell)
                            ) : !isAccountColumn && isNumericCell(cell) ? (
                              <Amount>{formatNumber(cell, headerName)}</Amount>
                            ) : (
                              formatNumber(cell ?? "", headerName)
                            );

                          return (
                            <TableCell
                              key={cellIndex}
                              className={cn(
                                "text-xs sm:text-sm font-mono whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2",
                                isAccountColumn
                                  ? "font-medium text-primary"
                                  : "",
                                numericColumns[cellIndex] && "text-end",
                              )}
                            >
                              {isAccountColumn && accountName ? (
                                <button
                                  type="button"
                                  className="text-left font-medium text-primary hover:text-primary/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const { ledgerOwner, ledgerName } =
                                      decodeLedgerId(ledgerId);
                                    void navigate({
                                      to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
                                      params: {
                                        ledgerOwner,
                                        ledgerName,
                                        accountName,
                                      },
                                    });
                                  }}
                                >
                                  {cellValue}
                                </button>
                              ) : (
                                cellValue
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      );
    }, [
      data,
      handleExportCSV,
      ledgerId,
      navigate,
      t,
      formatCount,
      rowsFilter,
      ariaLabel,
    ]);

    const renderTextData = React.useMemo(() => {
      if (!data?.queryShell?.text) return null;

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">
              {t("page.holdings.queryResult")}
            </h4>
          </div>
          <div className="bg-muted/50 border rounded-lg overflow-hidden">
            <pre className="p-4 overflow-auto text-sm font-mono leading-relaxed text-foreground">
              {data.queryShell.text.contents}
            </pre>
          </div>
        </div>
      );
    }, [data, t]);

    if (failure) {
      return (
        <ReportErrorState error={failure} onRetry={retry} retrying={retrying} />
      );
    }

    if (loading) {
      return (
        <div>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-full sm:w-32" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      );
    }

    if (!data?.queryShell) {
      return (
        <div>
          <div className="text-center py-12">
            <div className="text-muted-foreground text-sm font-medium">
              {t("page.holdings.noQueryResultsAvailable")}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        {data.queryShell.resultType === "table" && renderTableData}
        {data.queryShell.resultType === "text" && renderTextData}
        {data.queryShell.resultType !== "table" &&
          data.queryShell.resultType !== "text" && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-sm font-medium">
                {t("page.holdings.unknownResultType")}:{" "}
                {data.queryShell.resultType}
              </div>
            </div>
          )}
      </div>
    );
  },
);

DatasetTable.displayName = "DatasetTable";
