import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { ChevronRight, Trash2 } from "lucide-react";
import {
  List,
  useDynamicRowHeight,
  type RowComponentProps,
} from "react-window";
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

/**
 * One definition of a result column, shared by the header and the body so a
 * presentation rule can never apply to only one of them. `whitespace-pre-wrap`
 * keeps a value's own line structure — a printed directive's newlines and the
 * indentation of its postings — and `break-words` wraps a line too long for
 * the column rather than clipping it.
 */
const COLUMN_CLASS =
  "min-w-[120px] flex-shrink-0 flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm whitespace-pre-wrap break-words";

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
    // One element per unit, as Holdings renders the same data: the CRLF-joined
    // text from the formatter is the CSV's shape, not the screen's.
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

type ResultTable = NonNullable<
  NonNullable<QueryShellQuery["queryShell"]>["table"]
>;

type ResultRowProps = { rows: ResultTable["rows"]; dtypes: string[] };

/**
 * Module-level so react-window keeps one memoized row type: an inline
 * component would be a new element type on every measurement pass and remount
 * every rendered row.
 */
function ResultRow({
  index,
  style,
  rows,
  dtypes,
}: RowComponentProps<ResultRowProps>) {
  return (
    <div
      role="row"
      aria-rowindex={index + 2}
      style={style}
      className="flex border-b last:border-b-0"
    >
      {rows[index].map((cell, cellIndex) => (
        <div key={cellIndex} role="cell" className={COLUMN_CLASS}>
          {renderQueryCell(cell, dtypes[cellIndex])}
        </div>
      ))}
    </div>
  );
}

/**
 * The virtualized result table.
 *
 * Owns the row-height measurement, so a card showing an error, a text result
 * or nothing at all allocates no observer, and a row measurement re-renders
 * this table rather than the whole card (its summary, export button and
 * chart).
 */
function QueryResultTable({ table }: { table: ResultTable }) {
  const { t } = useTranslations();
  const headers = useMemo(
    () => table.types?.map((type) => type.name) ?? [],
    [table.types],
  );
  const dtypes = useMemo(
    () => table.types?.map((type) => type.dtype) ?? [],
    [table.types],
  );
  const rows = useMemo(() => table.rows ?? [], [table.rows]);

  // Rows are measured rather than fixed at ROW_HEIGHT: a multi-unit Inventory
  // cell renders one line per unit, and a 36px row hid every unit past the
  // first. Re-keying on the row count drops heights that no longer describe
  // the rows at those indexes.
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: ROW_HEIGHT,
    key: rows.length,
  });

  // Stable identity: react-window rebuilds its cached row bounds whenever this
  // changes, which would otherwise happen on every measurement pass.
  const rowProps = useMemo(() => ({ rows, dtypes }), [rows, dtypes]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("page.bql.noDataReturnedFromQuery")}
      </div>
    );
  }

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
              <div key={header} role="columnheader" className={COLUMN_CLASS}>
                {header}
              </div>
            ))}
          </div>
          <List<ResultRowProps>
            role="rowgroup"
            rowCount={rows.length}
            rowHeight={rowHeight}
            rowProps={rowProps}
            // Declared from the same measurements the rows use: every row of a
            // result this short is rendered, so their average times their count
            // is the exact total, and anything taller is capped here anyway.
            style={{
              height: Math.min(
                rows.length * rowHeight.getAverageRowHeight(),
                CONTAINER_HEIGHT,
              ),
              width: "100%",
              // The wrapper above is the one horizontal scroll owner; a second
              // one here would slide the body out from under the header.
              overflowX: "hidden",
            }}
            rowComponent={ResultRow}
          />
        </div>
      </div>
    </div>
  );
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
    return <QueryResultTable table={result.table} />;
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
