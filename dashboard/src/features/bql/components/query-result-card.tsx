import { useEffect, useRef, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { ChevronRight, Trash2 } from "lucide-react";
import { List, useDynamicRowHeight } from "react-window";
import { cn } from "@/common/lib/utils/utils";
import {
  formatInventoryEntries,
  formatInventoryLikeCell,
} from "@/common/lib/format/inventory-cell";
import { parseQueryChart } from "../lib/chart-utils";
import { QueryResultChart } from "./query-result-chart";
import { QueryResultExport } from "./query-result-export";
import type { QueryShellQuery } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

/** Height of an ordinary one-line row, and the starting guess for measurement. */
const ROW_HEIGHT = 36;
const CONTAINER_HEIGHT = 600;
const COLUMN_MIN_WIDTH_PX = 120;

interface QueryResultCardProps {
  query: string;
  result: QueryShellQuery["queryShell"] | null;
  error?: Error | null;
  loading?: boolean;
  isInitiallyOpen?: boolean;
  onExecute: (query: string) => void;
  onDelete: (query: string) => void;
}

function renderQueryCell(
  cell: unknown,
  dtype: string | null | undefined,
): ReactNode {
  const inventoryText = formatInventoryLikeCell(cell, dtype);
  if (inventoryText !== null) {
    if (
      inventoryText === "" ||
      cell === null ||
      typeof cell !== "object" ||
      Array.isArray(cell)
    ) {
      return inventoryText;
    }
    const entries = formatInventoryEntries(cell);
    if (entries.length <= 1) {
      return inventoryText.replace(/\r\n/g, ", ");
    }
    return (
      <span className="inline-flex flex-col leading-tight">
        {entries.map(({ currency, amount }) => (
          <span key={currency}>
            {amount} {currency}
          </span>
        ))}
      </span>
    );
  }

  if (typeof cell === "object" && cell !== null) {
    // Unrecognized object shapes stay readable without crashing.
    return JSON.stringify(cell);
  }

  return String(cell ?? "");
}

export function QueryResultCard({
  query,
  result,
  error,
  loading,
  isInitiallyOpen = false,
  onExecute,
  onDelete,
}: QueryResultCardProps) {
  const { t } = useTranslations();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Rows are measured rather than fixed at ROW_HEIGHT. A multi-unit Inventory
  // cell stacks one line per unit, so a 36px row clipped every unit past the
  // first — the amounts were in the DOM and the CSV but not on screen. The
  // cache is keyed by the result identity so heights measured for one
  // execution never size the next one's table.
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: ROW_HEIGHT,
    key: `${query}:${result?.table?.rows?.length ?? 0}`,
  });

  useEffect(() => {
    if (detailsRef.current && isInitiallyOpen) {
      detailsRef.current.open = true;
    }
  }, [isInitiallyOpen]);

  const handleToggle = () => {
    const isOpen = detailsRef.current?.open || false;
    // If opening and no result yet, execute the query
    if (isOpen && !result && !error && !loading) {
      onExecute(query);
    }
  };

  const renderTableData = () => {
    if (!result?.table) return null;

    const { table } = result;
    const headers = table.types?.map((type) => type.name) || [];
    const dtypes = table.types?.map((type) => type.dtype) || [];
    const rows = table.rows || [];

    if (rows.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t("page.bql.noDataReturnedFromQuery")}
        </div>
      );
    }

    const columnMinWidthClass = "min-w-[120px] flex-shrink-0 flex-1";
    const contentMinWidth = Math.max(
      headers.length * COLUMN_MIN_WIDTH_PX,
      COLUMN_MIN_WIDTH_PX,
    );

    return (
      <div>
        <div className="mb-2 text-sm text-muted-foreground">
          {t("bql.rowCount", { count: rows.length })}
        </div>
        {/* One horizontal scroll owner wraps header + body so columns stay aligned. */}
        <div className="overflow-x-auto border rounded-lg">
          <div
            role="table"
            aria-label={t("page.bql.queryResult")}
            aria-rowcount={rows.length + 1}
            style={{ minWidth: contentMinWidth }}
          >
            <div
              role="row"
              aria-rowindex={1}
              className="flex border-b bg-muted/50 font-medium text-sm"
            >
              {headers.map((header) => (
                <div
                  key={header}
                  role="columnheader"
                  className={`${columnMinWidthClass} px-2 sm:px-3 py-1.5 sm:py-2`}
                >
                  {header}
                </div>
              ))}
            </div>
            <List<{ rows: typeof rows; dtypes: string[] }>
              role="rowgroup"
              rowCount={rows.length}
              rowHeight={rowHeight}
              rowProps={{ rows, dtypes }}
              style={{
                // The viewport is sized from the same measurements the rows
                // use, so a tall result is not squeezed into a 36px-per-row
                // box and a short one leaves no empty space below it.
                height: Math.min(
                  rows.length * rowHeight.getAverageRowHeight(),
                  CONTAINER_HEIGHT,
                ),
                width: "100%",
                overflowX: "hidden",
              }}
              rowComponent={({
                index,
                style,
                rows: bodyRows,
                dtypes: bodyDtypes,
              }) => {
                const row = bodyRows[index];
                return (
                  <div
                    role="row"
                    aria-rowindex={index + 2}
                    style={style}
                    className="flex border-b last:border-b-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <div
                        key={cellIndex}
                        role="cell"
                        // `truncate` used to flatten and ellipsize every cell,
                        // which collapsed a printed directive's newlines into
                        // one clipped line and hid its posting amounts.
                        // pre-wrap keeps the source line structure and its
                        // leading indentation; break-words wraps a line too
                        // long for the column instead of cutting it off. Rows
                        // are measured, so the row grows to fit.
                        className={`${columnMinWidthClass} px-2 sm:px-3 py-1.5 sm:py-2 text-sm whitespace-pre-wrap break-words`}
                      >
                        {renderQueryCell(cell, bodyDtypes[cellIndex])}
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTextData = () => {
    if (!result?.text) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium">{t("page.bql.queryResult")}:</h4>
        <pre className="bg-muted p-4 rounded-md overflow-auto text-sm max-h-96">
          {result.text.contents}
        </pre>
      </div>
    );
  };

  const chartConfig = result?.table ? parseQueryChart(result.table) : null;

  return (
    <details
      ref={detailsRef}
      onToggle={handleToggle}
      className={cn(
        "border rounded-lg overflow-hidden group",
        error && "border-destructive",
      )}
    >
      <summary className="flex items-start gap-2 p-3 hover:bg-muted/50 transition-colors cursor-pointer list-none">
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 transition-transform mt-0.5",
            "group-open:rotate-90",
          )}
        />
        <div className="flex-1 text-left">
          <pre className="text-sm font-mono whitespace-pre-wrap break-words">
            {query}
          </pre>
        </div>
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {result?.table && (
            <QueryResultExport result={result.table} queryString={query} />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(query)}
            className="gap-2"
            title={t("bql.deleteQuery")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </summary>

      <div className="border-t p-4 space-y-4">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            {t("bql.executing")}...
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
          </Alert>
        )}

        {result && !loading && (
          <>
            {chartConfig && (
              <div className="mb-4">
                <QueryResultChart chartConfig={chartConfig} />
              </div>
            )}

            {result.resultType === "table" && renderTableData()}
            {result.resultType === "text" && renderTextData()}
            {result.resultType !== "table" && result.resultType !== "text" && (
              <div className="text-center py-8 text-muted-foreground">
                {t("page.bql.unknownResultType")}: {result.resultType}
              </div>
            )}
          </>
        )}
      </div>
    </details>
  );
}
