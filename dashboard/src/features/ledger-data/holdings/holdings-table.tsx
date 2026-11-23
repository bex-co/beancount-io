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
import { ChevronRight, Download } from "lucide-react";
import { downloadCSV } from "@/common/lib/utils/csv-export";
import React from "react";
import { tableToCSV, formatNumber } from "./utils";
import { formatInventoryEntries } from "@/common/lib/format/inventory-cell";
import { Link, useNavigate } from "@tanstack/react-router";
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

function isPercentColumn(headerName?: string): boolean {
  return Boolean(headerName && /pct|percent/i.test(headerName));
}

function formatColumnHeader(header: string): string {
  return header.replace(/_pct$/i, " (%)").replaceAll("_", " ");
}

function ScrollableTableFrame({
  scrollNextLabel,
  children,
}: {
  scrollNextLabel: string;
  children: React.ReactNode;
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const getScroller = React.useCallback((): HTMLElement | null => {
    const root = wrapperRef.current;
    if (!root) return null;
    return (
      root.querySelector<HTMLElement>('[data-slot="table-container"]') ?? root
    );
  }, []);

  const updateScrollCue = React.useCallback(() => {
    const scroller = getScroller();
    if (!scroller) return;
    setCanScrollRight(
      scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 2,
    );
  }, [getScroller]);

  React.useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;
    updateScrollCue();
    scroller.addEventListener("scroll", updateScrollCue, { passive: true });
    const table = scroller.querySelector("table");
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateScrollCue);
      ro.observe(scroller);
      if (table) ro.observe(table);
    }
    return () => {
      scroller.removeEventListener("scroll", updateScrollCue);
      ro?.disconnect();
    };
  }, [getScroller, updateScrollCue, children]);

  const handleScrollRight = () => {
    const scroller = getScroller();
    if (!scroller) return;
    scroller.scrollBy({ left: 260, behavior: "smooth" });
  };

  return (
    <div ref={wrapperRef} className="relative">
      {children}
      {canScrollRight && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-0 w-14 bg-gradient-to-l from-card via-card/85 to-transparent"
          />
          <button
            type="button"
            onClick={handleScrollRight}
            aria-label={scrollNextLabel}
            className="absolute end-1.5 top-1.5 z-10 inline-flex size-7 cursor-pointer items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
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
      const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

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
        <div className="overflow-clip rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="text-sm font-medium text-foreground">
                {t("common.results")}
              </div>
              <div className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {formatCount(rows.length)}{" "}
                {rows.length === 1 ? t("page.holdings.row") : t("common.rows")}
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-fit pointer-coarse:min-h-11"
            >
              <Download className="h-4 w-4" />
              <span>{t("page.holdings.exportCsv")}</span>
            </Button>
          </div>
          <ScrollableTableFrame scrollNextLabel={t("common.next")}>
            <Table aria-label={ariaLabel}>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {headers.map((header, index) => (
                    <TableHead
                      key={header}
                      className={cn(
                        "text-xs font-medium capitalize text-muted-foreground whitespace-nowrap px-2.5 lg:px-3 py-2.5",
                        numericColumns[index] && "text-end",
                      )}
                    >
                      {formatColumnHeader(header)}
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
                        const pct = isPercentColumn(headerName);
                        const num = isNumericCell(cell) ? Number(cell) : null;
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
                              "text-xs sm:text-sm font-mono whitespace-nowrap px-2.5 lg:px-3 py-2 tabular-nums",
                              isAccountColumn ? "font-medium text-primary" : "",
                              numericColumns[cellIndex] && "text-end",
                              pct && num !== null && num > 0 && "text-gain",
                              pct && num !== null && num < 0 && "text-loss",
                            )}
                          >
                            {isAccountColumn && accountName ? (
                              <Link
                                to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
                                params={{
                                  ledgerOwner,
                                  ledgerName,
                                  accountName,
                                }}
                                className="inline-flex min-h-6 items-center text-start font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {cellValue}
                              </Link>
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
          </ScrollableTableFrame>
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
        <div className="min-h-[75vh] overflow-clip rounded-xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-full sm:w-32" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
              >
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
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
