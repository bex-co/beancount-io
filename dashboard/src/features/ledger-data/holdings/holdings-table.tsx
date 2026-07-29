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
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Button } from "@/common/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/common/lib/utils/csv-export";
import React from "react";
import { tableToCSV, formatNumber } from "./utils";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/common/lib/utils/utils";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { getClickableRowProps } from "@/common/components/clickable-row";

interface DatasetTableProps {
  query: string;
  ledgerId: string;
  rowsFilter?: (rows: unknown[][]) => unknown[][];
}

const renderObject = (obj: object) => {
  return Object.entries(obj).map(([key, value]) => {
    // Check if value is a valid number with more than two decimal places
    const displayValue = formatNumber(value);
    return (
      <div key={key} className="text-sm leading-relaxed">
        <span>{displayValue}</span>
        <span className="text-muted-foreground ml-1">{key}</span>
      </div>
    );
  });
};

export const DatasetTable = React.memo(
  ({ query, ledgerId, rowsFilter }: DatasetTableProps) => {
    const { t } = useTranslations();
    const navigate = useNavigate();

    const { data, loading, error } = useQuery(QueryShellDocument, {
      variables: {
        ledgerId: ledgerId,
        query,
      },
      fetchPolicy: "cache-first",
    });

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
      downloadCSV(csvContent, filename);
    }, [data, rowsFilter]);

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
                {rows.length}{" "}
                {rows.length === 1 ? t("page.holdings.row") : t("common.rows")}
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              size="sm"
              variant="outline"
              className="items-center gap-2 w-full hidden sm:flex sm:w-fit"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:block">
                {t("page.holdings.exportCsv")}
              </span>
            </Button>
          </div>
          <div className="overflow-hidden w-full">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {headers.map((header) => (
                      <TableHead
                        key={header}
                        className="text-xs sm:text-sm text-foreground whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2"
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
                            typeof cell === "object" && cell !== null
                              ? renderObject(cell)
                              : formatNumber(cell ?? "");

                          return (
                            <TableCell
                              key={cellIndex}
                              className={cn(
                                "text-xs sm:text-sm font-mono whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2",
                                isAccountColumn
                                  ? "font-medium text-primary hover:text-primary/80"
                                  : "",
                              )}
                            >
                              {cellValue}
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
    }, [data, handleExportCSV, ledgerId, navigate, t, rowsFilter]);

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

    if (error) {
      return (
        <Alert variant="destructive" className="border-destructive/50">
          <AlertDescription className="text-sm font-medium">
            {t(getErrorMessageKey(error))}
          </AlertDescription>
        </Alert>
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
